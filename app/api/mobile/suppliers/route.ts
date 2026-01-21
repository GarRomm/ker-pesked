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
import { supplierLight } from "@/lib/transformers"

// Validation schema for supplier creation
const supplierSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide").optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
})

// GET /api/mobile/suppliers - Liste tous les fournisseurs avec pagination, filtres et tri
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
      ['name', 'createdAt'],
      'name'
    )

    // Filtres
    const where: {
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        email?: { contains: string; mode: 'insensitive' };
        phone?: { contains: string; mode: 'insensitive' };
      }>;
    } = {}

    const search = searchParams.get('search')
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Version light
    const light = searchParams.get('light') === 'true'

    // Requête avec pagination
    const [suppliers, total] = await prisma.$transaction([
      prisma.supplier.findMany({
        where,
        include: {
          _count: {
            select: {
              products: true
            }
          }
        },
        orderBy: { [orderBy]: sortOrder },
        skip,
        take
      }),
      prisma.supplier.count({ where })
    ])

    // Format suppliers for response
    const formattedSuppliers = suppliers.map(supplier => ({
      id: supplier.id,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      productCount: supplier._count.products,
      createdAt: supplier.createdAt.toISOString()
    }))

    const data = light ? formattedSuppliers.map(supplierLight) : formattedSuppliers
    const meta = calculatePagination(total, page, limit)
    const cacheHeaders = getCacheHeaders(CACHE_TIMES.LONG)

    return Response.json(
      { success: true, data, meta },
      { status: 200, headers: cacheHeaders }
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

// POST /api/mobile/suppliers - Créer un fournisseur
// 🔐 Accessible : ADMIN uniquement
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuthToken(request)
    
    // Check permissions (ADMIN only)
    checkAdmin(user.role)

    // Parse and validate request body
    const body = await request.json()
    const validatedData = supplierSchema.parse(body)

    // Create supplier
    const supplier = await prisma.supplier.create({
      data: {
        name: validatedData.name,
        email: validatedData.email && validatedData.email !== '' ? validatedData.email : null,
        phone: validatedData.phone || null,
        address: validatedData.address || null,
      }
    })

    // Format response
    const formattedSupplier = {
      id: supplier.id,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      createdAt: supplier.createdAt.toISOString()
    }

    return successResponse(formattedSupplier, 201)
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
