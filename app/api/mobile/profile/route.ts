import { NextRequest } from "next/server"
import { z } from "zod"
import { compare, hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { verifyAuthToken } from "@/lib/middleware/authMiddleware"
import { checkAdminOrEmployee } from "@/lib/middleware/checkPermission"
import { 
  successResponse, 
  errorResponse, 
  unauthorizedResponse, 
  forbiddenResponse,
  notFoundResponse
} from "@/lib/apiResponse"

// Validation schema for profile update
const profileUpdateSchema = z.object({
  name: z.string().min(1, "Le nom est requis").optional(),
  email: z.string().email("Email invalide").optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères").optional(),
}).refine(
  (data) => {
    // If newPassword is provided, currentPassword must be provided
    if (data.newPassword && !data.currentPassword) {
      return false
    }
    return true
  },
  {
    message: "Mot de passe actuel requis pour changer le mot de passe",
    path: ["currentPassword"]
  }
)

// GET /api/mobile/profile - Récupérer le profil utilisateur
// ✅ Accessible : ADMIN + EMPLOYEE
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authUser = await verifyAuthToken(request)
    
    // Check permissions (ADMIN or EMPLOYEE)
    checkAdminOrEmployee(authUser.role)

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    if (!user) {
      return notFoundResponse("Utilisateur non trouvé")
    }

    return successResponse({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString()
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

// PUT /api/mobile/profile - Modifier le profil utilisateur
// ✅ Accessible : ADMIN + EMPLOYEE
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const authUser = await verifyAuthToken(request)
    
    // Check permissions (ADMIN or EMPLOYEE)
    checkAdminOrEmployee(authUser.role)

    // Parse and validate request body
    const body = await request.json()
    const validatedData = profileUpdateSchema.parse(body)
    const { name, email, currentPassword, newPassword } = validatedData

    // Get current user from database
    const user = await prisma.user.findUnique({
      where: { id: authUser.userId }
    })

    if (!user) {
      return notFoundResponse("Utilisateur non trouvé")
    }

    // Build data to update
    const dataToUpdate: {
      name?: string
      email?: string
      password?: string
    } = {}

    // Si changement de nom
    if (name && name !== user.name) {
      dataToUpdate.name = name
    }

    // Si changement d'email
    if (email && email !== user.email) {
      // Vérifier que le nouvel email n'est pas déjà utilisé
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        return errorResponse("Cet email est déjà utilisé", 400)
      }

      dataToUpdate.email = email
    }

    // Si changement de mot de passe
    if (newPassword) {
      if (!currentPassword) {
        return errorResponse("Mot de passe actuel requis", 400)
      }

      // Vérifier l'ancien mot de passe
      const isValid = await compare(currentPassword, user.password)
      if (!isValid) {
        return errorResponse("Mot de passe actuel incorrect", 400)
      }

      // Hasher le nouveau mot de passe
      const hashedPassword = await hash(newPassword, 10)
      dataToUpdate.password = hashedPassword
    }

    // Check if there's anything to update
    if (Object.keys(dataToUpdate).length === 0) {
      return errorResponse("Aucune modification fournie", 400)
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: authUser.userId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    return successResponse({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt.toISOString()
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
    
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400)
    }
    
    console.error("API Error:", error)
    return errorResponse("Une erreur est survenue", 500)
  }
}
