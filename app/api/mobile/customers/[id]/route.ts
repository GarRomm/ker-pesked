import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { verifyAuthToken } from "@/lib/middleware/authMiddleware"
import { checkAdmin, checkAdminOrEmployee } from "@/lib/middleware/checkPermission"
import { 
  successResponse, 
  errorResponse, 
  unauthorizedResponse, 
  forbiddenResponse,
  notFoundResponse
} from "@/lib/apiResponse"

// Validation schema for customer update
const customerUpdateSchema = z.object({
  name: z.string().min(1, "Le nom est requis").optional(),
  email: z.string().email("Email invalide").optional().or(z.literal('')).nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
})

// GET /api/mobile/customers/[id] - Détails d'un client
// ✅ Accessible : ADMIN + EMPLOYEE
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const user = await verifyAuthToken(request)
    
    // Check permissions (ADMIN or EMPLOYEE)
    checkAdminOrEmployee(user.role)

    const { id } = await params

    // Get customer with orders
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          include: {
            orderItems: {
              include: {
                product: {
                  select: {
                    name: true,
                    unit: true
                  }
                }
              }
            }
          },
          orderBy: {
            orderDate: 'desc'
          },
          take: 20
        },
        _count: {
          select: {
            orders: true
          }
        }
      }
    })

    if (!customer) {
      return notFoundResponse("Client non trouvé")
    }

    // Calculate total spent
    const totalSpent = customer.orders.reduce((sum, order) => {
      if (order.status !== 'ANNULEE' && order.status !== 'CANCELLED') {
        return sum + order.total
      }
      return sum
    }, 0)

    // Format response
    const formattedCustomer = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
      totalOrders: customer._count.orders,
      totalSpent: Math.round(totalSpent * 100) / 100,
      recentOrders: customer.orders.map(order => ({
        id: order.id,
        orderDate: order.orderDate.toISOString(),
        status: order.status,
        total: Math.round(order.total * 100) / 100,
        items: order.orderItems.map(item => ({
          productName: item.product.name,
          quantity: item.quantity,
          unit: item.product.unit,
          price: item.price
        }))
      }))
    }

    return successResponse(formattedCustomer)
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

// PUT /api/mobile/customers/[id] - Modifier un client
// ✅ Accessible : ADMIN + EMPLOYEE
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const user = await verifyAuthToken(request)
    
    // Check permissions (ADMIN or EMPLOYEE)
    checkAdminOrEmployee(user.role)

    const { id } = await params

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { id }
    })

    if (!existingCustomer) {
      return notFoundResponse("Client non trouvé")
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = customerUpdateSchema.parse(body)

    // Update customer
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: validatedData.name,
        email: validatedData.email === '' ? null : validatedData.email,
        phone: validatedData.phone,
        address: validatedData.address,
      }
    })

    // Format response
    const formattedCustomer = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString()
    }

    return successResponse(formattedCustomer)
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'FORBIDDEN') {
        return forbiddenResponse()
      }
      if ('status' in error && (error as Error & { status: number }).status === 401) {
        return unauthorizedResponse(error.message)
      }
    }
    
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400)
    }
    
    console.error("API Error:", error)
    return errorResponse("Une erreur est survenue", 500)
  }
}

// DELETE /api/mobile/customers/[id] - Supprimer un client
// 🔐 Accessible : ADMIN uniquement
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const user = await verifyAuthToken(request)
    
    // Check permissions (ADMIN only)
    checkAdmin(user.role)

    const { id } = await params

    // Check if customer exists and has orders
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          where: {
            status: {
              in: ['EN_COURS', 'PENDING', 'READY']
            }
          }
        },
        _count: {
          select: {
            orders: true
          }
        }
      }
    })

    if (!customer) {
      return notFoundResponse("Client non trouvé")
    }

    // Check if customer has pending orders
    if (customer.orders.length > 0) {
      return errorResponse(
        "Ce client ne peut pas être supprimé car il a des commandes en cours",
        400
      )
    }

    // If customer has any orders (even completed), we should not delete
    if (customer._count.orders > 0) {
      return errorResponse(
        "Ce client ne peut pas être supprimé car il a des commandes associées. Vous pouvez archiver le client à la place.",
        400
      )
    }

    // Delete customer
    await prisma.customer.delete({
      where: { id }
    })

    return successResponse({ message: "Client supprimé avec succès" })
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
