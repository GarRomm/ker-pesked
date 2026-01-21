import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAuthToken } from "@/lib/middleware/authMiddleware"
import { UserInfoResponse } from "@/types/api"

export async function GET(req: NextRequest) {
  try {
    // Verify authentication token
    const authUser = await verifyAuthToken(req)

    // Get user information from database
    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    })

    if (!user) {
      const response: UserInfoResponse = {
        success: false,
        error: "Utilisateur non trouvé"
      }
      return NextResponse.json(response, { status: 404 })
    }

    // Return user information
    const response: UserInfoResponse = {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt.toISOString()
      }
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("Get user info error:", error)
    
    // Handle authentication errors
    if (error instanceof Error && 'status' in error && (error as Error & { status: number }).status === 401) {
      const response: UserInfoResponse = {
        success: false,
        error: error.message
      }
      return NextResponse.json(response, { status: 401 })
    }

    // Handle other errors
    const response: UserInfoResponse = {
      success: false,
      error: "Erreur lors de la récupération des informations utilisateur"
    }
    return NextResponse.json(response, { status: 500 })
  }
}
