import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { verifyAuthToken } from "@/lib/middleware/authMiddleware"
import { checkAdminOrEmployee } from "@/lib/middleware/checkPermission"
import { 
  successResponse, 
  errorResponse, 
  unauthorizedResponse, 
  forbiddenResponse 
} from "@/lib/apiResponse"
import { getPaginationParams, calculatePagination, getSkipTake } from "@/lib/pagination"
import { getSortParams } from "@/lib/filters"
import { getCacheHeaders, CACHE_TIMES } from "@/lib/cacheHeaders"
import { customerLight } from "@/lib/transformers"

// Validation schema for customer creation
const customerSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide").optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
})

// GET /api/mobile/customers - Liste tous les clients avec pagination, filtres et tri
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
    const [customers, total] = await prisma.$transaction([
      prisma.customer.findMany({
        where,
        include: {
          _count: {
            select: {
              orders: true
            }
          }
        },
        orderBy: { [orderBy]: sortOrder },
        skip,
        take
      }),
      prisma.customer.count({ where })
    ])

    // Format customers for response
    const formattedCustomers = customers.map(customer => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      orderCount: customer._count.orders,
      createdAt: customer.createdAt.toISOString()
    }))

    const data = light ? formattedCustomers.map(customerLight) : formattedCustomers
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

// POST /api/mobile/customers - Créer un client
// ✅ Accessible : ADMIN + EMPLOYEE
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuthToken(request)
    
    // Check permissions (ADMIN or EMPLOYEE)
    checkAdminOrEmployee(user.role)

    // Parse and validate request body
    const body = await request.json()
    const validatedData = customerSchema.parse(body)

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        name: validatedData.name,
        email: validatedData.email && validatedData.email !== '' ? validatedData.email : null,
        phone: validatedData.phone || null,
        address: validatedData.address || null,
      }
    })

    // Format response
    const formattedCustomer = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      createdAt: customer.createdAt.toISOString()
    }

    return successResponse(formattedCustomer, 201)
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
