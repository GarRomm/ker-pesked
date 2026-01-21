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

// Validation schema for quick order item (simplified - no price required)
const quickOrderItemSchema = z.object({
  productId: z.string().min(1, "L'ID du produit est requis"),
  quantity: z.number().positive("La quantité doit être positive"),
})

// Validation schema for quick order creation
const quickOrderSchema = z.object({
  customerId: z.string().min(1, "L'ID du client est requis"),
  items: z.array(quickOrderItemSchema).min(1, "Au moins un article est requis"),
})

// POST /api/mobile/orders/quick - Création rapide de commande
// ✅ Accessible : ADMIN + EMPLOYEE
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuthToken(request)
    
    // Check permissions (ADMIN or EMPLOYEE)
    checkAdminOrEmployee(user.role)

    // Parse and validate request body
    const body = await request.json()
    const validatedData = quickOrderSchema.parse(body)
    const { customerId, items } = validatedData

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    })

    if (!customer) {
      return notFoundResponse("Client non trouvé")
    }

    // Récupérer les produits pour obtenir les prix actuels
    const productIds = items.map(item => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } }
    })

    // Verify all products exist and check stock availability
    const enrichedItems: Array<{
      productId: string
      quantity: number
      price: number
    }> = []

    for (const item of items) {
      const product = products.find(p => p.id === item.productId)
      
      if (!product) {
        return notFoundResponse(`Produit ${item.productId} non trouvé`)
      }
      
      if (product.stock < item.quantity) {
        return errorResponse(
          `Stock insuffisant pour ${product.name}. Disponible: ${product.stock}, demandé: ${item.quantity}`,
          400
        )
      }
      
      enrichedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price
      })
    }

    // Calculer le total
    const total = enrichedItems.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    )

    // Créer la commande en une transaction
    const order = await prisma.$transaction(async (tx) => {
      // Créer la commande avec status EN_COURS par défaut
      const newOrder = await tx.order.create({
        data: {
          customerId,
          total: Math.round(total * 100) / 100,
          status: 'EN_COURS',
          orderItems: {
            create: enrichedItems.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: Math.round(item.price * 100) / 100
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
                  unit: true,
                  price: true
                }
              }
            }
          }
        }
      })
      
      // Déduire les stocks
      for (const item of enrichedItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity }
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
