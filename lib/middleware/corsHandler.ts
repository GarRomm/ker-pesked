/**
 * CORS Handler for mobile API routes
 * Handles Cross-Origin Resource Sharing for Flutter mobile app requests
 */

export function handleCORS(request: Request) {
  const origin = request.headers.get('origin');
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
  
  // Check if the origin is allowed
  const isAllowed = allowedOrigins.includes('*') || 
                    (origin && allowedOrigins.includes(origin));
  
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': isAllowed ? (origin || '*') : '',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
  
  return headers;
}

export function corsResponse(headers: Record<string, string>) {
  return new Response(null, { status: 204, headers });
}
