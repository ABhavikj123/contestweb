import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

// In-memory store for rate limiting
const rateLimit = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute (tighter limit)

// In-memory cache
let cache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours (1 day)

// Validate request origin
function validateOrigin(headersList: Headers) {
  const origin = headersList.get('origin') || '';
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  
  // Strict origin checking for production
  return allowedOrigins.some(allowed => 
    origin === allowed || origin === allowed.replace('https://', 'http://')
  );
}

// Rate limiting middleware
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userLimit = rateLimit.get(ip);

  if (!userLimit) {
    rateLimit.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (now - userLimit.timestamp > RATE_LIMIT_WINDOW) {
    rateLimit.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (userLimit.count >= MAX_REQUESTS) {
    return false;
  }

  userLimit.count++;
  return true;
}

// Validate API response
function validateApiResponse(data: any): boolean {
  try {
    // Add your validation logic here
    return data && typeof data === 'object' && Array.isArray(data.contests);
  } catch (error) {
    console.error('API response validation failed:', error);
    return false;
  }
}

export async function GET() {
  try {
    const headersList = await headers();
    
    // Validate origin
    if (!validateOrigin(headersList)) {
      console.warn('Unauthorized origin attempt:', headersList.get('origin'));
      return NextResponse.json(
        { error: 'Unauthorized origin' },
        { 
          status: 403,
          headers: {
            'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS?.split(',')[0] || '',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
          }
        }
      );
    }

    // Get client IP
    const ip = headersList.get('x-forwarded-for') || 'unknown';
    
    // Check rate limit
    if (!checkRateLimit(ip)) {
      console.warn('Rate limit exceeded for IP:', ip);
      return NextResponse.json(
        { error: 'Too many requests' },
        { 
          status: 429,
          headers: {
            'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS?.split(',')[0] || '',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
            'Retry-After': '60',
          }
        }
      );
    }

    // Check cache
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json(cache.data, {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
          'X-Cache': 'HIT',
          'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS?.split(',')[0] || '',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const apiUrl = process.env.NEXT_PUBLIC_CODECHEF_FUTURE!;
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ContestWeb/1.0',
      },
      next: { revalidate: 86400 }, // Revalidate every 24 hours to match cache duration
    });
    
    if (!response.ok) {
      console.error('Codechef API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Error fetching Codechef future contests' },
        { 
          status: response.status,
          headers: {
            'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS?.split(',')[0] || '',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
          }
        }
      );
    }

    const data = await response.json();
    
    // Validate API response
    if (!validateApiResponse(data)) {
      console.error('Invalid API response format');
      return NextResponse.json(
        { error: 'Invalid response format from Codechef' },
        { 
          status: 502,
          headers: {
            'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS?.split(',')[0] || '',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
          }
        }
      );
    }
    
    // Update cache
    cache = {
      data,
      timestamp: Date.now(),
    };

    // Return response with security headers
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
        'X-Cache': 'MISS',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'self'",
        'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS?.split(',')[0] || '',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      },
    });
  } catch (error) {
    console.error('Error fetching Codechef future contests:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS?.split(',')[0] || '',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        }
      }
    );
  }
}
