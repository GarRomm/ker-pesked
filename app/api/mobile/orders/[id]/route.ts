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

// Validation schema for order status update
const orderStatusSchema = z.object({
  status: z.enum(["EN_COURS", "LIVREE", "ANNULEE", "PENDING", "READY", "DELIVERED", "CANCELLED"]),
  notes: z.string().optional(),
})

// GET /api/mobile/orders/[id] - Détails d'une commande
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

    // Get order with all relations
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unit: true,
                price: true,
                stock: true
              }
            }
          }
        }
      }
    })

    if (!order) {
      return notFoundResponse("Commande non trouvée")
    }

    // Format response
    const formattedOrder = {
      id: order.id,
      orderDate: order.orderDate.toISOString(),
      status: order.status,
      total: Math.round(order.total * 100) / 100,
      notes: order.notes,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      customer: order.customer,
      items: order.orderItems.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productUnit: item.product.unit,
        currentPrice: item.product.price,
        currentStock: item.product.stock,
        quantity: item.quantity,
        price: item.price,
        subtotal: Math.round(item.quantity * item.price * 100) / 100
      }))
    }

    return successResponse(formattedOrder)
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

// PUT /api/mobile/orders/[id] - Modifier le statut d'une commande
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

    // Check if order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: true
      }
    })

    if (!existingOrder) {
      return notFoundResponse("Commande non trouvée")
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = orderStatusSchema.parse(body)

    // Handle status change to ANNULEE/CANCELLED - restore stock
    const shouldRestoreStock = 
      (validatedData.status === 'ANNULEE' || validatedData.status === 'CANCELLED') &&
      existingOrder.status !== 'ANNULEE' && 
      existingOrder.status !== 'CANCELLED'

    // Update order and restore stock atomically if needed
    const order = await prisma.$transaction(async (tx) => {
      // Restore stock if cancelling
      if (shouldRestoreStock) {
        for (const item of existingOrder.orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity
              }
            }
          })
        }
      }

      // Update order
      return await tx.order.update({
        where: { id },
        data: {
          status: validatedData.status,
          notes: validatedData.notes !== undefined ? validatedData.notes : existingOrder.notes,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  unit: true
                }
              }
            }
          }
        }
      })
    })

    // Format response
    const formattedOrder = {
      id: order.id,
      orderDate: order.orderDate.toISOString(),
      status: order.status,
      total: order.total,
      notes: order.notes,
      customer: order.customer,
      items: order.orderItems.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productUnit: item.product.unit,
        quantity: item.quantity,
        price: item.price,
        subtotal: Math.round(item.quantity * item.price * 100) / 100
      })),
      stockRestored: shouldRestoreStock
    }

    return successResponse(formattedOrder)
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

// DELETE /api/mobile/orders/[id] - Supprimer une commande
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

    // Get order with items
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: true
      }
    })

    if (!order) {
      return notFoundResponse("Commande non trouvée")
    }

    // Delete order and restore stock atomically
    await prisma.$transaction(async (tx) => {
      // Restore stock before deleting (unless already cancelled)
      if (order.status !== 'ANNULEE' && order.status !== 'CANCELLED') {
        for (const item of order.orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity
              }
            }
          })
        }
      }

      // Delete order (cascade will delete orderItems)
      await tx.order.delete({
        where: { id }
      })
    })

    return successResponse({ message: "Commande supprimée avec succès" })
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
