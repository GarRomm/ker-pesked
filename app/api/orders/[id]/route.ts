import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { envoyerSmsCommande, genererMessageCommandePrete } from "@/lib/sms"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        orderItems: {
          include: {
            product: true,
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("Error fetching order:", error)
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { status, notes } = body

    // Get the order before updating to check if status is changing
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        orderItems: {
          include: {
            product: true,
          }
        }
      }
    })

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Update the order
    const order = await prisma.order.update({
      where: { id },
      data: {
        status,
        notes,
      },
      include: {
        customer: true,
        orderItems: {
          include: {
            product: true,
          }
        }
      }
    })

    // Send SMS if status changed to READY
    if (status === 'READY' && existingOrder.status !== 'READY') {
      const customerPhone = order.customer.phone
      
      if (customerPhone) {
        // Generate message with order details
        const orderItemsForMessage = order.orderItems.map(item => ({
          productName: item.product.name,
          quantity: item.quantity,
          unit: item.product.unit,
        }))
        
        const message = genererMessageCommandePrete(
          order.customer.name,
          orderItemsForMessage
        )

        // Send SMS asynchronously (don't wait for it to complete)
        envoyerSmsCommande(customerPhone, message, order.id).catch(error => {
          console.error("Failed to send SMS notification:", error)
        })
      } else {
        console.warn(`Order ${id} marked as READY but customer has no phone number`)
      }
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("Error updating order:", error)
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    
    // Restore stock before deleting
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: true
      }
    })

    if (order && order.status === 'PENDING') {
      for (const item of order.orderItems) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity
            }
          }
        })
      }
    }

    await prisma.order.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Order deleted successfully" })
  } catch (error) {
    console.error("Error deleting order:", error)
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 })
  }
}
