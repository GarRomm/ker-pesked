import { NextRequest, NextResponse } from "next/server"
import { compare } from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenExpiration,
  getAccessTokenExpiration
} from "@/lib/jwt"
import { LoginResponse } from "@/types/api"

// Validation schema for login request
const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis")
})

export async function POST(req: NextRequest) {
  try {
    // Parse and validate request body
    const body = await req.json()
    const validationResult = loginSchema.safeParse(body)

    if (!validationResult.success) {
      const response: LoginResponse = {
        success: false,
        error: validationResult.error.issues[0].message
      }
      return NextResponse.json(response, { status: 400 })
    }

    const { email, password } = validationResult.data

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      const response: LoginResponse = {
        success: false,
        error: "Email ou mot de passe incorrect"
      }
      return NextResponse.json(response, { status: 401 })
    }

    // Verify password
    const isPasswordValid = await compare(password, user.password)

    if (!isPasswordValid) {
      const response: LoginResponse = {
        success: false,
        error: "Email ou mot de passe incorrect"
      }
      return NextResponse.json(response, { status: 401 })
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email, user.role)
    const refreshToken = generateRefreshToken()
    const hashedRefreshToken = hashToken(refreshToken)

    // Store refresh token in database
    const expiresAt = new Date(Date.now() + getRefreshTokenExpiration())
    await prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        userId: user.id,
        expiresAt
      }
    })

    // Return success response with tokens
    const response: LoginResponse = {
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresIn: getAccessTokenExpiration(),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("Login error:", error)
    const response: LoginResponse = {
      success: false,
      error: "Erreur lors de la connexion"
    }
    return NextResponse.json(response, { status: 500 })
  }
}
