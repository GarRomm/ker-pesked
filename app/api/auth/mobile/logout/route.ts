import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { hashToken } from "@/lib/jwt"
import { verifyAuthToken } from "@/lib/middleware/authMiddleware"
import { LogoutResponse } from "@/types/api"

// Validation schema for logout request
const logoutSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token requis")
})

export async function POST(req: NextRequest) {
  try {
    // Verify authentication token
    await verifyAuthToken(req)

    // Parse and validate request body
    const body = await req.json()
    const validationResult = logoutSchema.safeParse(body)

    if (!validationResult.success) {
      const response: LogoutResponse = {
        success: false,
        error: validationResult.error.issues[0].message
      }
      return NextResponse.json(response, { status: 400 })
    }

    const { refreshToken } = validationResult.data

    // Hash the refresh token
    const hashedToken = hashToken(refreshToken)

    // Delete the refresh token from database
    await prisma.refreshToken.deleteMany({
      where: { token: hashedToken }
    })

    // Return success response
    const response: LogoutResponse = {
      success: true,
      data: {
        message: "Déconnexion réussie"
      }
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("Logout error:", error)
    
    // Handle authentication errors
    if (error instanceof Error && 'status' in error && (error as Error & { status: number }).status === 401) {
      const response: LogoutResponse = {
        success: false,
        error: error.message
      }
      return NextResponse.json(response, { status: 401 })
    }

    // Handle other errors
    const response: LogoutResponse = {
      success: false,
      error: "Erreur lors de la déconnexion"
    }
    return NextResponse.json(response, { status: 500 })
  }
}
