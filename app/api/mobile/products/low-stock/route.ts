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

// Calculate stock status based on stock level and threshold
function getStockStatus(stock: number, threshold: number): "CRITICAL" | "WARNING" {
  // CRITICAL: stock <= lowStockThreshold * 0.2
  // WARNING: stock <= lowStockThreshold
  if (stock <= threshold * 0.2) {
    return "CRITICAL"
  }
  return "WARNING"
}

// GET /api/mobile/products/low-stock - Produits en stock faible
// ✅ Accessible : ADMIN + EMPLOYEE
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuthToken(request)
    
    // Check permissions (ADMIN or EMPLOYEE)
    checkAdminOrEmployee(user.role)

    // Get all products with their stock levels
    const allProducts = await prisma.product.findMany({
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        }
      },
      orderBy: {
        stock: 'asc' // Les plus critiques en premier
      }
    })

    // Filter products where stock <= lowStockThreshold (stockAlert in schema)
    const lowStockProducts = allProducts.filter(product => 
      product.stock <= product.stockAlert
    )

    // Format response with stockStatus
    const formattedProducts = lowStockProducts.map(product => ({
      id: product.id,
      name: product.name,
      stock: product.stock,
      lowStockThreshold: product.stockAlert,
      unit: product.unit,
      price: product.price,
      supplier: product.supplier,
      stockStatus: getStockStatus(product.stock, product.stockAlert)
    }))

    // Calculate meta counts
    const criticalCount = formattedProducts.filter(p => p.stockStatus === "CRITICAL").length
    const warningCount = formattedProducts.filter(p => p.stockStatus === "WARNING").length

    return successResponse({
      products: formattedProducts,
      meta: {
        total: formattedProducts.length,
        critical: criticalCount,
        warning: warningCount
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
