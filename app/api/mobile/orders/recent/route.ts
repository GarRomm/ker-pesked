import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAuthToken } from "@/lib/middleware/authMiddleware"
import { checkAdminOrEmployee } from "@/lib/middleware/checkPermission"
import { 
  successResponse, 
  errorResponse, 
  unauthorizedResponse, 
  forbiddenResponse 
} from "@/lib/apiResponse"

// Pagination constants
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

// GET /api/mobile/orders/recent - Commandes récentes avec pagination
// ✅ Accessible : ADMIN + EMPLOYEE
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuthToken(request)
    
    // Check permissions (ADMIN or EMPLOYEE)
    checkAdminOrEmployee(user.role)

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE)), MAX_PAGE_SIZE)
    const status = searchParams.get('status') || undefined

    // Validate page number
    if (page < 1) {
      return errorResponse("Le numéro de page doit être supérieur à 0", 400)
    }

    // Validate limit
    if (limit < 1) {
      return errorResponse("La limite doit être supérieure à 0", 400)
    }

    const skip = (page - 1) * limit

    // Build where clause for status filter
    const whereClause = status ? { status } : undefined

    // Execute queries in transaction for consistency
    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where: whereClause,
        include: {
          customer: {
            select: { id: true, name: true, phone: true }
          },
          orderItems: {
            include: {
              product: {
                select: { id: true, name: true, unit: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.order.count({
        where: whereClause
      })
    ])

    // Calculate pagination meta
    const totalPages = Math.ceil(total / limit)
    const hasNext = page < totalPages
    const hasPrev = page > 1

    // Format orders response
    const formattedOrders = orders.map(order => ({
      id: order.id,
      status: order.status,
      total: Math.round(order.total * 100) / 100,
      createdAt: order.createdAt.toISOString(),
      customer: order.customer,
      orderItems: order.orderItems.map(item => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        product: item.product
      })),
      itemCount: order.orderItems.length
    }))

    return successResponse({
      orders: formattedOrders,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext,
        hasPrev
      }
    })
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'FORBIDDEN') {
        return forbiddenResponse()
      }
      if ('status' in error && (error as Error & { status: number }).status === 401) {
        return unauthorizedResponse(error.message)
      }
    }
    
    console.error("API Error:", error)
    return errorResponse("Une erreur est survenue", 500)
  }
}
