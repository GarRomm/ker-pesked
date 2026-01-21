import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { verifyAuthToken } from "@/lib/middleware/authMiddleware"
import { checkAdminOrEmployee } from "@/lib/middleware/checkPermission"
import { 
  successResponse, 
  errorResponse, 
  unauthorizedResponse, 
  forbiddenResponse,
  notFoundResponse
} from "@/lib/apiResponse"

// Validation schema for order item
const orderItemSchema = z.object({
  productId: z.string().min(1, "L'ID du produit est requis"),
  quantity: z.number().positive("La quantité doit être positive"),
  price: z.number().positive("Le prix doit être positif"),
})

// Validation schema for order creation
const orderSchema = z.object({
  customerId: z.string().min(1, "L'ID du client est requis"),
  items: z.array(orderItemSchema).min(1, "Au moins un article est requis"),
  status: z.enum(["EN_COURS", "LIVREE", "ANNULEE", "PENDING", "READY", "DELIVERED", "CANCELLED"]).optional(),
  notes: z.string().optional(),
})

// GET /api/mobile/orders - Liste toutes les commandes
// ✅ Accessible : ADMIN + EMPLOYEE
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuthToken(request)
    
    // Check permissions (ADMIN or EMPLOYEE)
    checkAdminOrEmployee(user.role)

    // Get all orders with relations, sorted by date descending
    const orders = await prisma.order.findMany({
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
                unit: true,
                price: true
              }
            }
          }
        }
      },
      orderBy: {
        orderDate: 'desc'
      }
    })

    // Format orders for response
    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderDate: order.orderDate.toISOString(),
      status: order.status,
      total: Math.round(order.total * 100) / 100,
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
      }))
    }))

    return successResponse(formattedOrders)
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

// POST /api/mobile/orders - Créer une commande
// ✅ Accessible : ADMIN + EMPLOYEE
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuthToken(request)
    
    // Check permissions (ADMIN or EMPLOYEE)
    checkAdminOrEmployee(user.role)

    // Parse and validate request body
    const body = await request.json()
    const validatedData = orderSchema.parse(body)

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: validatedData.customerId }
    })

    if (!customer) {
      return notFoundResponse("Client non trouvé")
    }

    // Verify all products exist and check stock availability
    let total = 0
    const productChecks = await Promise.all(
      validatedData.items.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId }
        })
        
        if (!product) {
          return { error: `Produit ${item.productId} non trouvé`, product: null }
        }
        
        if (product.stock < item.quantity) {
          return { 
            error: `Stock insuffisant pour ${product.name}. Disponible: ${product.stock}, demandé: ${item.quantity}`,
            product: null 
          }
        }
        
        return { error: null, product }
      })
    )

    // Check for errors
    for (const check of productChecks) {
      if (check.error) {
        return errorResponse(check.error, 400)
      }
    }

    // Calculate total
    for (const item of validatedData.items) {
      total += item.quantity * item.price
    }
    total = Math.round(total * 100) / 100

    // Create order with items and update stock atomically
    const order = await prisma.$transaction(async (tx) => {
      // Create order with items
      const newOrder = await tx.order.create({
        data: {
          customerId: validatedData.customerId,
          total,
          notes: validatedData.notes || null,
          status: validatedData.status || 'EN_COURS',
          orderItems: {
            create: validatedData.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: Math.round(item.price * 100) / 100,
            }))
          }
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

      // Update product stock
      for (const item of validatedData.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        })
      }

      return newOrder
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
      }))
    }

    return successResponse(formattedOrder, 201)
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
