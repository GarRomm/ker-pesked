import { NextRequest } from 'next/server'
import { verifyAccessToken } from '@/lib/jwt'
import { AuthUser } from '@/types/api'

/**
 * Verify authentication token from request headers
 * @param request - Next.js request object
 * @returns Authenticated user information
 * @throws Error with status code if authentication fails
 */
export async function verifyAuthToken(request: NextRequest): Promise<AuthUser> {
  // Extract Authorization header
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader) {
    const error = new Error('Token d\'authentification manquant') as Error & { status?: number }
    error.status = 401
    throw error
  }

  // Check if it's a Bearer token
  if (!authHeader.startsWith('Bearer ')) {
    const error = new Error('Format de token invalide. Utilisez: Bearer <token>') as Error & { status?: number }
    error.status = 401
    throw error
  }

  // Extract the token
  const token = authHeader.substring(7) // Remove "Bearer " prefix

  if (!token) {
    const error = new Error('Token d\'authentification manquant') as Error & { status?: number }
    error.status = 401
    throw error
  }

  try {
    // Verify and decode the JWT
    const payload = verifyAccessToken(token)
    
    // Return user information
    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    }
  } catch (error) {
    const authError = new Error(
      error instanceof Error ? error.message : 'Token invalide'
    ) as Error & { status?: number }
    authError.status = 401
    throw authError
  }
}

/**
 * Check if user has required role
 * @param user - Authenticated user
 * @param allowedRoles - Array of allowed roles
 * @returns True if user has required role
 * @throws Error if user doesn't have required role
 */
export function requireRole(user: AuthUser, allowedRoles: string[]): boolean {
  if (!allowedRoles.includes(user.role)) {
    const error = new Error('Accès non autorisé') as Error & { status?: number }
    error.status = 403
    throw error
  }
  return true
}
