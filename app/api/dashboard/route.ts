import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get low stock products
    const lowStockProducts = await prisma.product.findMany({
      where: {
        stock: {
          lte: prisma.product.fields.stockAlert
        }
      },
      include: {
        supplier: true
      }
    })

    // Get best-selling products
    const bestSellingProducts = await prisma.orderItem.groupBy({
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

    const bestSellingWithDetails = await Promise.all(
      bestSellingProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          include: { supplier: true }
        })
        return {
          product,
          totalQuantity: item._sum.quantity
        }
      })
    )

    // Get order statistics
    const totalOrders = await prisma.order.count()
    const pendingOrders = await prisma.order.count({
      where: { status: 'PENDING' }
    })
    const deliveredOrders = await prisma.order.count({
      where: { status: 'DELIVERED' }
    })
    const cancelledOrders = await prisma.order.count({
      where: { status: 'CANCELLED' }
    })

    // Get total revenue
    const orders = await prisma.order.findMany({
      where: { status: 'DELIVERED' }
    })
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0)

    // Get recent orders
    const recentOrders = await prisma.order.findMany({
      take: 10,
      orderBy: {
        orderDate: 'desc'
      },
      include: {
        customer: true,
        orderItems: {
          include: {
            product: true
          }
        }
      }
    })

    return NextResponse.json({
      lowStockProducts,
      bestSellingProducts: bestSellingWithDetails,
      orderStatistics: {
        total: totalOrders,
        pending: pendingOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders,
      },
      totalRevenue,
      recentOrders
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard statistics" }, { status: 500 })
  }
}
