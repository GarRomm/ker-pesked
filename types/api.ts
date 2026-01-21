// Standard API response types for mobile authentication

export interface ApiSuccessResponse<T = unknown> {
  success: true
  data: T
}

export interface ApiErrorResponse {
  success: false
  error: string
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

// Login response types
export interface LoginData {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: {
    id: string
    email: string
    name: string
    role: string
  }
}

export type LoginResponse = ApiResponse<LoginData>

// Refresh token response types
export interface RefreshTokenData {
  accessToken: string
  expiresIn: number
}

export type RefreshTokenResponse = ApiResponse<RefreshTokenData>

// User info response types
export interface UserData {
  id: string
  email: string
  name: string
  role: string
  createdAt: string
}

export type UserInfoResponse = ApiResponse<UserData>

// Logout response types
export interface LogoutData {
  message: string
}

export type LogoutResponse = ApiResponse<LogoutData>

// JWT payload type
export interface JwtPayload {
  userId: string
  email: string
  role: string
  iat?: number
  exp?: number
}

// Auth user type (extracted from JWT)
export interface AuthUser {
  userId: string
  email: string
  role: string
}
