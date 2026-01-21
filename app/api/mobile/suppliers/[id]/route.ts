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

// Validation schema for supplier update
const supplierUpdateSchema = z.object({
  name: z.string().min(1, "Le nom est requis").optional(),
  email: z.string().email("Email invalide").optional().or(z.literal('')).nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
})

// GET /api/mobile/suppliers/[id] - Détails d'un fournisseur
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

    // Get supplier with products
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            price: true,
            stock: true,
            unit: true,
            stockAlert: true
          },
          orderBy: {
            name: 'asc'
          }
        },
        _count: {
          select: {
            products: true
          }
        }
      }
    })

    if (!supplier) {
      return notFoundResponse("Fournisseur non trouvé")
    }

    // Format response
    const formattedSupplier = {
      id: supplier.id,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      createdAt: supplier.createdAt.toISOString(),
      updatedAt: supplier.updatedAt.toISOString(),
      totalProducts: supplier._count.products,
      products: supplier.products.map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        stock: product.stock,
        unit: product.unit,
        lowStockThreshold: product.stockAlert,
        isLowStock: product.stock <= product.stockAlert
      }))
    }

    return successResponse(formattedSupplier)
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

// PUT /api/mobile/suppliers/[id] - Modifier un fournisseur
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

    // Check if supplier exists
    const existingSupplier = await prisma.supplier.findUnique({
      where: { id }
    })

    if (!existingSupplier) {
      return notFoundResponse("Fournisseur non trouvé")
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = supplierUpdateSchema.parse(body)

    // Update supplier
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: validatedData.name,
        email: validatedData.email === '' ? null : validatedData.email,
        phone: validatedData.phone,
        address: validatedData.address,
      }
    })

    // Format response
    const formattedSupplier = {
      id: supplier.id,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      createdAt: supplier.createdAt.toISOString(),
      updatedAt: supplier.updatedAt.toISOString()
    }

    return successResponse(formattedSupplier)
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

// DELETE /api/mobile/suppliers/[id] - Supprimer un fournisseur
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

    // Check if supplier exists and has products
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true
          }
        }
      }
    })

    if (!supplier) {
      return notFoundResponse("Fournisseur non trouvé")
    }

    // Check if supplier has products
    if (supplier._count.products > 0) {
      return errorResponse(
        "Ce fournisseur ne peut pas être supprimé car il a des produits associés",
        400
      )
    }

    // Delete supplier
    await prisma.supplier.delete({
      where: { id }
    })

    return successResponse({ message: "Fournisseur supprimé avec succès" })
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
