import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAuthToken } from "@/lib/middleware/authMiddleware"
import { checkAdminOrEmployee } from "@/lib/middleware/checkPermission"
import { 
  errorResponse, 
  unauthorizedResponse, 
  forbiddenResponse 
} from "@/lib/apiResponse"
import { getCacheHeaders, CACHE_TIMES } from "@/lib/cacheHeaders"

// GET /api/mobile/dashboard/stats - Statistiques par période
// ✅ Accessible : ADMIN + EMPLOYEE
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuthToken(request)
    
    // Check permissions (ADMIN or EMPLOYEE)
    checkAdminOrEmployee(user.role)

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'week'

    // Calculer les dates de début/fin selon la période
    const now = new Date()
    const startDate = new Date()

    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }

    // Statistiques
    const [
      ordersCount,
      revenue,
      deliveredOrders,
      pendingOrders,
      cancelledOrders
    ] = await prisma.$transaction([
      // Nombre de commandes
      prisma.order.count({
        where: { createdAt: { gte: startDate } }
      }),

      // Revenu total (commandes livrées)
      prisma.order.aggregate({
        where: {
          createdAt: { gte: startDate },
          status: { in: ['LIVREE', 'DELIVERED'] }
        },
        _sum: { total: true }
      }),

      // Commandes livrées
      prisma.order.count({
        where: {
          createdAt: { gte: startDate },
          status: { in: ['LIVREE', 'DELIVERED'] }
        }
      }),

      // Commandes en cours
      prisma.order.count({
        where: {
          createdAt: { gte: startDate },
          status: { in: ['EN_COURS', 'PENDING', 'READY'] }
        }
      }),

      // Commandes annulées
      prisma.order.count({
        where: {
          createdAt: { gte: startDate },
          status: { in: ['ANNULEE', 'CANCELLED'] }
        }
      })
    ])

    // Produits les plus vendus (using Prisma groupBy instead of raw query for SQLite compatibility)
    const topProductsData = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          createdAt: { gte: startDate }
        }
      },
      _sum: {
        quantity: true
      },
      _count: {
        orderId: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: 5
    })

    // Get product details for top products
    const topProducts = await Promise.all(
      topProductsData.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            name: true
          }
        })
        return {
          id: product?.id,
          name: product?.name,
          totalQuantity: item._sum.quantity || 0,
          orderCount: item._count.orderId || 0
        }
      })
    )

    const cacheHeaders = getCacheHeaders(CACHE_TIMES.SHORT)

    return Response.json(
      {
        success: true,
        data: {
          period,
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
          stats: {
            totalOrders: ordersCount,
            revenue: revenue._sum.total || 0,
            deliveredOrders,
            pendingOrders,
            cancelledOrders
          },
          topProducts: topProducts.filter(tp => tp.id !== undefined)
        }
      },
      {
        status: 200,
        headers: cacheHeaders
      }
    )
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
