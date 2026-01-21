import jwt, { Secret } from 'jsonwebtoken'
import crypto from 'crypto'
import { JwtPayload } from '@/types/api'

// Get JWT configuration from environment variables
const JWT_SECRET: Secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h'
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'

/**
 * Generate an access token (JWT) for a user
 * @param userId - User ID
 * @param email - User email
 * @param role - User role
 * @returns JWT token string
 */
export function generateAccessToken(userId: string, email: string, role: string): string {
  const payload = {
    userId,
    email,
    role
  }

  // Type assertion to work around TypeScript type inference issues
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  } as jwt.SignOptions)
}

/**
 * Generate a secure random refresh token
 * @returns Random token string
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex')
}

/**
 * Verify and decode an access token (JWT)
 * @param token - JWT token to verify
 * @returns Decoded JWT payload
 * @throws Error if token is invalid or expired
 */
export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    return decoded
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Token invalide')
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expiré')
    }
    throw new Error('Erreur de vérification du token')
  }
}

/**
 * Hash a refresh token for secure storage in database
 * @param token - Refresh token to hash
 * @returns Hashed token
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Get the expiration time for refresh tokens in milliseconds
 * @returns Expiration time in milliseconds
 */
export function getRefreshTokenExpiration(): number {
  const expiresIn = REFRESH_TOKEN_EXPIRES_IN
  
  // Parse the expiration time (e.g., "7d", "24h", "60m")
  const match = expiresIn.match(/^(\d+)([dhm])$/)
  if (!match) {
    // Default to 7 days if format is invalid
    return 7 * 24 * 60 * 60 * 1000
  }

  const value = parseInt(match[1], 10)
  const unit = match[2]

  switch (unit) {
    case 'd':
      return value * 24 * 60 * 60 * 1000
    case 'h':
      return value * 60 * 60 * 1000
    case 'm':
      return value * 60 * 1000
    default:
      return 7 * 24 * 60 * 60 * 1000
  }
}

/**
 * Get the expiration time for access tokens in seconds
 * @returns Expiration time in seconds
 */
export function getAccessTokenExpiration(): number {
  const expiresIn = JWT_EXPIRES_IN
  
  // Parse the expiration time (e.g., "1h", "60m", "3600s")
  const match = expiresIn.match(/^(\d+)([dhms])$/)
  if (!match) {
    // Default to 1 hour if format is invalid
    return 3600
  }

  const value = parseInt(match[1], 10)
  const unit = match[2]

  switch (unit) {
    case 'd':
      return value * 24 * 60 * 60
    case 'h':
      return value * 60 * 60
    case 'm':
      return value * 60
    case 's':
      return value
    default:
      return 3600
  }
}
