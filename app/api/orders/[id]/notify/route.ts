import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { envoyerSmsCommande, genererMessageCommandePrete } from "@/lib/sms"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    
    // Get the order with customer and items
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

    const customerPhone = order.customer.phone
    
    if (!customerPhone) {
      return NextResponse.json(
        { error: "Customer has no phone number" },
        { status: 400 }
      )
    }

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

    // Send SMS
    const result = await envoyerSmsCommande(customerPhone, message, order.id)

    if (result.success) {
      return NextResponse.json({ 
        message: "SMS notification sent successfully",
        phone: customerPhone 
      })
    } else {
      return NextResponse.json(
        { error: result.error || "Failed to send SMS" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error sending notification:", error)
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    )
  }
}
