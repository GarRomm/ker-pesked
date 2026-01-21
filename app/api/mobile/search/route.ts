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

// Type definitions for search results
interface ProductResult {
  id: string
  name: string
  price: number
  stock: number
  unit: string
  type: "product"
}

interface CustomerResult {
  id: string
  name: string
  email: string | null
  phone: string | null
  type: "customer"
}

interface OrderResult {
  id: string
  total: number
  status: string
  createdAt: string
  customer: {
    id: string
    name: string
  }
  type: "order"
}

interface SearchResults {
  products?: ProductResult[]
  customers?: CustomerResult[]
  orders?: OrderResult[]
}

// GET /api/mobile/search - Recherche globale
// ✅ Accessible : ADMIN + EMPLOYEE
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuthToken(request)
    
    // Check permissions (ADMIN or EMPLOYEE)
    checkAdminOrEmployee(user.role)

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    const type = searchParams.get('type') || 'all'
    const limit = parseInt(searchParams.get('limit') || '5')

    // Validate query length
    if (query.length < 2) {
      return errorResponse("Le terme de recherche doit contenir au moins 2 caractères", 400)
    }

    // Validate type
    const validTypes = ['all', 'products', 'customers', 'orders']
    if (!validTypes.includes(type)) {
      return errorResponse("Type de recherche invalide. Utilisez: all, products, customers, orders", 400)
    }

    const results: SearchResults = {}
    let totalResults = 0

    // Recherche dans les produits
    if (type === 'all' || type === 'products') {
      const products = await prisma.product.findMany({
        where: {
          name: {
            contains: query
          }
        },
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
          unit: true
        },
        take: limit
      })

      results.products = products.map(p => ({
        ...p,
        type: "product" as const
      }))
      totalResults += products.length
    }

    // Recherche dans les clients
    if (type === 'all' || type === 'customers') {
      const customers = await prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { email: { contains: query } },
            { phone: { contains: query } }
          ]
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true
        },
        take: limit
      })

      results.customers = customers.map(c => ({
        ...c,
        type: "customer" as const
      }))
      totalResults += customers.length
    }

    // Recherche dans les commandes (par nom client)
    if (type === 'all' || type === 'orders') {
      const orders = await prisma.order.findMany({
        where: {
          customer: {
            name: {
              contains: query
            }
          }
        },
        include: {
          customer: {
            select: { id: true, name: true }
          }
        },
        take: limit,
        orderBy: { createdAt: 'desc' }
      })

      results.orders = orders.map(o => ({
        id: o.id,
        total: Math.round(o.total * 100) / 100,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
        customer: o.customer,
        type: "order" as const
      }))
      totalResults += orders.length
    }

    return successResponse({
      ...results,
      meta: {
        query,
        totalResults
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
