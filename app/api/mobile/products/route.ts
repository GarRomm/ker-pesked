import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAuthToken } from "@/lib/middleware/authMiddleware"
import { ApiResponse } from "@/types/api"

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  stock: number
  unit: string
  stockAlert: number
  supplier: {
    id: string
    name: string
  } | null
}

export async function GET(req: NextRequest) {
  try {
    // Verify authentication token
    await verifyAuthToken(req)

    // Get all products from database
    const products = await prisma.product.findMany({
      include: {
        supplier: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Format products for response
    const formattedProducts: Product[] = products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      unit: product.unit,
      stockAlert: product.stockAlert,
      supplier: product.supplier
    }))

    // Return success response
    const response: ApiResponse<Product[]> = {
      success: true,
      data: formattedProducts
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("Get products error:", error)
    
    // Handle authentication errors
    if (error instanceof Error && 'status' in error && (error as Error & { status: number }).status === 401) {
      const response: ApiResponse<Product[]> = {
        success: false,
        error: error.message
      }
      return NextResponse.json(response, { status: 401 })
    }

    // Handle other errors
    const response: ApiResponse<Product[]> = {
      success: false,
      error: "Erreur lors de la récupération des produits"
    }
    return NextResponse.json(response, { status: 500 })
  }
}
