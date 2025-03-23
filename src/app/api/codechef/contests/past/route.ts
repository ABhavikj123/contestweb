import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

// In-memory store for rate limiting
const rateLimit = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute (tighter limit)

// In-memory cache
interface CacheData {
  data: CodechefResponse;
  timestamp: number;
}
let cache: CacheData | null = null;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours (1 day)

interface CodechefResponse {
  contests: Array<{
    name: string;
    startDate: string;
    endDate: string;
    url: string;
  }>;
}

// Validate request origin
function validateOrigin(headersList: Headers) {
  const origin = headersList.get('origin') || headersList.get('referer') || '';
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  
  // Log for debugging
  console.log('Request origin:', origin);
  console.log('Allowed origins:', allowedOrigins);
  
  // If no origin, check if it's a direct request from our frontend
  if (!origin) {
    const userAgent = headersList.get('user-agent') || '';
    return userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari');
  }
  
  // Validate against allowed origins
  return allowedOrigins.some(allowed => {
    const normalizedOrigin = origin.toLowerCase().trim();
    const normalizedAllowed = allowed.toLowerCase().trim();
    
    // Check exact match
    if (normalizedOrigin === normalizedAllowed) return true;
    
    // Check without protocol
    const originWithoutProtocol = normalizedOrigin.replace(/^https?:\/\//, '');
    const allowedWithoutProtocol = normalizedAllowed.replace(/^https?:\/\//, '');
    if (originWithoutProtocol === allowedWithoutProtocol) return true;
    
    // Check with www prefix
    const originWithWWW = `www.${originWithoutProtocol}`;
    const allowedWithWWW = `www.${allowedWithoutProtocol}`;
    if (originWithWWW === allowedWithWWW) return true;
    
    return false;
  });
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
function validateApiResponse(data: unknown): data is CodechefResponse {
  try {
    const response = data as CodechefResponse;
    return Boolean(
      response?.contests && 
      Array.isArray(response.contests)
    );
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
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const apiUrl = process.env.NEXT_PUBLIC_CODECHEF_PAST!;
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
        { error: 'Error fetching Codechef past contests' },
        { 
          status: response.status,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      },
    });
  } catch (error) {
    console.error('Error fetching Codechef past contests:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        }
      }
    );
  }
}

// Add OPTIONS handler for CORS preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}