import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { verifyAuthToken } from "@/lib/middleware/authMiddleware"
import { checkAdmin, checkAdminOrEmployee } from "@/lib/middleware/checkPermission"
import { 
  successResponse,
  errorResponse, 
  unauthorizedResponse, 
  forbiddenResponse 
} from "@/lib/apiResponse"
import { getPaginationParams, calculatePagination, getSkipTake } from "@/lib/pagination"
import { getSortParams } from "@/lib/filters"
import { getCacheHeaders, CACHE_TIMES } from "@/lib/cacheHeaders"
import { productLight } from "@/lib/transformers"

// Validation schema for product creation
const productSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  price: z.number().positive("Le prix doit être positif"),
  stock: z.number().min(0, "Le stock ne peut pas être négatif"),
  unit: z.string().min(1, "L'unité est requise"),
  supplierId: z.string().optional(),
  lowStockThreshold: z.number().min(0).optional(),
  description: z.string().optional(),
})

// GET /api/mobile/products - Liste tous les produits avec pagination, filtres et tri
// ✅ Accessible : ADMIN + EMPLOYEE
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuthToken(request)
    
    // Check permissions (ADMIN or EMPLOYEE)
    checkAdminOrEmployee(user.role)

    const { searchParams } = new URL(request.url)

    // Pagination
    const { page, limit } = getPaginationParams(searchParams)
    const { skip, take } = getSkipTake(page, limit)

    // Tri
    const { orderBy, sortOrder } = getSortParams(
      searchParams,
      ['name', 'price', 'stock', 'createdAt'],
      'name'
    )

    // Filtres
    const where: {
      supplierId?: string;
      stock?: { gt: number } | { lte: number };
      name?: { contains: string; mode: 'insensitive' };
    } = {}

    const supplierId = searchParams.get('supplierId')
    if (supplierId) {
      where.supplierId = supplierId
    }

    const inStock = searchParams.get('inStock')
    if (inStock === 'true') {
      where.stock = { gt: 0 }
    } else if (inStock === 'false') {
      where.stock = { lte: 0 }
    }

    const search = searchParams.get('search')
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive'
      }
    }

    // Version light
    const light = searchParams.get('light') === 'true'

    // Requête avec pagination
    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        include: {
          supplier: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { [orderBy]: sortOrder },
        skip,
        take
      }),
      prisma.product.count({ where })
    ])

    // Format products for response
    const formattedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      unit: product.unit,
      lowStockThreshold: product.stockAlert,
      supplierId: product.supplierId,
      supplier: product.supplier
    }))

    const data = light ? formattedProducts.map(productLight) : formattedProducts
    const meta = calculatePagination(total, page, limit)
    const cacheHeaders = getCacheHeaders(CACHE_TIMES.MEDIUM)

    return Response.json(
      {
        success: true,
        data,
        meta
      },
      {
        status: 200,
        headers: cacheHeaders
      }
    )
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

// POST /api/mobile/products - Créer un produit
// 🔐 Accessible : ADMIN uniquement
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuthToken(request)
    
    // Check permissions (ADMIN only)
    checkAdmin(user.role)

    // Parse and validate request body
    const body = await request.json()
    const validatedData = productSchema.parse(body)

    // Create product
    const product = await prisma.product.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        price: Math.round(validatedData.price * 100) / 100, // Round to 2 decimals
        stock: validatedData.stock,
        unit: validatedData.unit,
        stockAlert: validatedData.lowStockThreshold || 5,
        supplierId: validatedData.supplierId || null,
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

    return successResponse(formattedProduct, 201)
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
