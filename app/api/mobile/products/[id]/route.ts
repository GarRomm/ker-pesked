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

// Validation schema for product update
const productUpdateSchema = z.object({
  name: z.string().min(1, "Le nom est requis").optional(),
  price: z.number().positive("Le prix doit être positif").optional(),
  stock: z.number().min(0, "Le stock ne peut pas être négatif").optional(),
  unit: z.string().min(1, "L'unité est requise").optional(),
  supplierId: z.string().optional().nullable(),
  lowStockThreshold: z.number().min(0).optional(),
  description: z.string().optional().nullable(),
})

// GET /api/mobile/products/[id] - Détails d'un produit
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

    // Get product with all relations
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        orderItems: {
          include: {
            order: {
              select: {
                id: true,
                orderDate: true,
                status: true
              }
            }
          },
          take: 10,
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!product) {
      return notFoundResponse("Produit non trouvé")
    }

    // Format response
    const formattedProduct = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      unit: product.unit,
      lowStockThreshold: product.stockAlert,
      supplier: product.supplier,
      recentOrders: product.orderItems.map(item => ({
        orderId: item.order.id,
        orderDate: item.order.orderDate.toISOString(),
        status: item.order.status,
        quantity: item.quantity,
        price: item.price
      }))
    }

    return successResponse(formattedProduct)
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

// PUT /api/mobile/products/[id] - Modifier un produit
// 🔐 Accessible : ADMIN uniquement
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const user = await verifyAuthToken(request)
    
    // Check permissions (ADMIN only)
    checkAdmin(user.role)

    const { id } = await params

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    })

    if (!existingProduct) {
      return notFoundResponse("Produit non trouvé")
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = productUpdateSchema.parse(body)

    // Update product
    const product = await prisma.product.update({
      where: { id },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        price: validatedData.price !== undefined 
          ? Math.round(validatedData.price * 100) / 100 
          : undefined,
        stock: validatedData.stock,
        unit: validatedData.unit,
        stockAlert: validatedData.lowStockThreshold,
        supplierId: validatedData.supplierId === '' ? null : validatedData.supplierId,
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Format response
    const formattedProduct = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      unit: product.unit,
      lowStockThreshold: product.stockAlert,
      supplier: product.supplier
    }

    return successResponse(formattedProduct)
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

// DELETE /api/mobile/products/[id] - Supprimer un produit
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

    // Check if product exists and has associated orders
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        orderItems: true
      }
    })

    if (!product) {
      return notFoundResponse("Produit non trouvé")
    }

    // Check if product has orders
    if (product.orderItems.length > 0) {
      return errorResponse(
        "Ce produit ne peut pas être supprimé car il est associé à des commandes existantes",
        400
      )
    }

    // Delete product
    await prisma.product.delete({
      where: { id }
    })

    return successResponse({ message: "Produit supprimé avec succès" })
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
