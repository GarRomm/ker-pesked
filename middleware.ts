import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Handle CORS for mobile API routes only
  if (request.nextUrl.pathname.startsWith('/api/mobile') || 
      request.nextUrl.pathname.startsWith('/api/auth/mobile')) {
    
    const origin = request.headers.get('origin');
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
    
    const isAllowed = allowedOrigins.includes('*') || 
                      (origin && allowedOrigins.includes(origin));
    
    // OPTIONS request (preflight)
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': isAllowed ? (origin || '*') : '',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    
    // Add CORS headers to all responses
    const response = NextResponse.next();
    
    if (isAllowed) {
      response.headers.set('Access-Control-Allow-Origin', origin || '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/mobile/:path*', '/api/auth/mobile/:path*'],
};
