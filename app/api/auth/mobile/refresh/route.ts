import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  generateAccessToken,
  hashToken,
  getAccessTokenExpiration
} from "@/lib/jwt"
import { RefreshTokenResponse } from "@/types/api"

// Validation schema for refresh token request
const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token requis")
})

export async function POST(req: NextRequest) {
  try {
    // Parse and validate request body
    const body = await req.json()
    const validationResult = refreshSchema.safeParse(body)

    if (!validationResult.success) {
      const response: RefreshTokenResponse = {
        success: false,
        error: validationResult.error.issues[0].message
      }
      return NextResponse.json(response, { status: 400 })
    }

    const { refreshToken } = validationResult.data

    // Hash the refresh token to compare with stored hash
    const hashedToken = hashToken(refreshToken)

    // Find the refresh token in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: hashedToken },
      include: { user: true }
    })

    if (!storedToken) {
      const response: RefreshTokenResponse = {
        success: false,
        error: "Refresh token invalide ou expiré"
      }
      return NextResponse.json(response, { status: 401 })
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      // Delete expired token
      await prisma.refreshToken.delete({
        where: { id: storedToken.id }
      })

      const response: RefreshTokenResponse = {
        success: false,
        error: "Refresh token invalide ou expiré"
      }
      return NextResponse.json(response, { status: 401 })
    }

    // Generate new access token
    const accessToken = generateAccessToken(
      storedToken.user.id,
      storedToken.user.email,
      storedToken.user.role
    )

    // Return success response with new access token
    const response: RefreshTokenResponse = {
      success: true,
      data: {
        accessToken,
        expiresIn: getAccessTokenExpiration()
      }
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("Refresh token error:", error)
    const response: RefreshTokenResponse = {
      success: false,
      error: "Erreur lors du rafraîchissement du token"
    }
    return NextResponse.json(response, { status: 500 })
  }
}
