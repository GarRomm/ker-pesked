import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true, // Enable gzip compression
  
  async headers() {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
    
    // Static headers configuration - only effective for wildcard origin
    // For multiple origins, the middleware handles dynamic origin matching
    const corsOriginValue = allowedOrigins.includes('*') ? '*' : allowedOrigins[0];
    
    return [
      {
        // Apply CORS only to mobile API routes
        source: '/api/mobile/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: corsOriginValue
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400' // 24 hours
          },
        ],
      },
      {
        // Headers for mobile authentication
        source: '/api/auth/mobile/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: corsOriginValue
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400'
          },
        ],
      },
    ];
  },
};

export default nextConfig;
