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

// GET /api/mobile/dashboard - Statistiques complètes
// ✅ Accessible : ADMIN + EMPLOYEE
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuthToken(request)
    
    // Check permissions (ADMIN or EMPLOYEE)
    checkAdminOrEmployee(user.role)

    // Get all stats in parallel for better performance
    const [
      allProducts,
      totalOrdersCount,
      deliveredOrders,
      recentOrders,
      topProductsData
    ] = await Promise.all([
      // Get all products for stock analysis
      prisma.product.findMany({
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
          unit: true,
          stockAlert: true,
          supplier: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      
      // Total orders count
      prisma.order.count(),
      
      // Delivered orders for revenue calculation
      prisma.order.findMany({
        where: { 
          status: { 
            in: ['DELIVERED', 'LIVREE'] 
          } 
        },
        select: {
          total: true
        }
      }),
      
      // Recent orders (10 last)
      prisma.order.findMany({
        take: 10,
        orderBy: {
          orderDate: 'desc'
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
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
      }),
      
      // Top products by quantity sold
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: {
          quantity: true
        },
        orderBy: {
          _sum: {
            quantity: 'desc'
          }
        },
        take: 5
      })
    ])

    // Calculate total revenue from delivered orders
    const totalRevenue = deliveredOrders.reduce((sum, order) => sum + order.total, 0)

    // Calculate low stock products
    const lowStockProducts = allProducts.filter(p => p.stock <= p.stockAlert)
    
    // Get product details for top products
    const topProducts = await Promise.all(
      topProductsData.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            name: true,
            price: true,
            unit: true,
            stock: true
          }
        })
        return {
          product,
          totalQuantitySold: item._sum.quantity || 0
        }
      })
    )

    // Format response according to specification
    const dashboardData = {
      stats: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrders: totalOrdersCount,
        totalProducts: allProducts.length,
        lowStockProducts: lowStockProducts.length
      },
      recentOrders: recentOrders.map(order => ({
        id: order.id,
        orderDate: order.orderDate.toISOString(),
        status: order.status,
        total: Math.round(order.total * 100) / 100,
        customer: order.customer,
        items: order.orderItems.map(item => ({
          productId: item.productId,
          productName: item.product.name,
          productUnit: item.product.unit,
          quantity: item.quantity,
          price: item.price
        }))
      })),
      topProducts: topProducts.filter(tp => tp.product !== null).map(tp => ({
        id: tp.product!.id,
        name: tp.product!.name,
        price: tp.product!.price,
        unit: tp.product!.unit,
        currentStock: tp.product!.stock,
        totalQuantitySold: tp.totalQuantitySold
      })),
      criticalStock: lowStockProducts.map(product => ({
        id: product.id,
        name: product.name,
        price: product.price,
        stock: product.stock,
        unit: product.unit,
        lowStockThreshold: product.stockAlert,
        supplier: product.supplier
      }))
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
