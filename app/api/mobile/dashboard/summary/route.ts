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

// GET /api/mobile/dashboard/summary - Résumé dashboard mobile
// ✅ Accessible : ADMIN + EMPLOYEE
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuthToken(request)
    
    // Check permissions (ADMIN or EMPLOYEE)
    checkAdminOrEmployee(user.role)

    // Get today's date at midnight
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get all products to calculate low stock count
    const allProducts = await prisma.product.findMany({
      select: {
        id: true,
        stock: true,
        stockAlert: true
      }
    })

    // Calculate low stock products count
    const lowStockCount = allProducts.filter(p => p.stock <= p.stockAlert).length

    // Execute all queries in parallel for performance
    const [
      todayOrdersCount,
      todayRevenueResult,
      pendingOrdersCount,
      totalProductsCount,
      totalCustomersCount,
      totalSuppliersCount
    ] = await Promise.all([
      // Commandes du jour
      prisma.order.count({
        where: {
          createdAt: { gte: today }
        }
      }),
      
      // Revenu du jour (commandes livrées uniquement)
      prisma.order.aggregate({
        where: {
          createdAt: { gte: today },
          status: { in: ['LIVREE', 'DELIVERED'] }
        },
        _sum: { total: true }
      }),
      
      // Commandes en attente
      prisma.order.count({
        where: { 
          status: { in: ['EN_COURS', 'PENDING'] }
        }
      }),

      // Total produits
      prisma.product.count(),

      // Total clients
      prisma.customer.count(),

      // Total fournisseurs
      prisma.supplier.count()
    ])

    // Get the revenue value safely
    const todayRevenue = todayRevenueResult._sum.total || 0

    const dashboardData = {
      today: {
        orders: todayOrdersCount,
        revenue: Math.round(todayRevenue * 100) / 100
      },
      alerts: {
        lowStock: lowStockCount,
        pendingOrders: pendingOrdersCount
      },
      quickStats: {
        totalProducts: totalProductsCount,
        totalCustomers: totalCustomersCount,
        totalSuppliers: totalSuppliersCount
      },
      timestamp: new Date().toISOString()
    }

    return successResponse(dashboardData)
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
