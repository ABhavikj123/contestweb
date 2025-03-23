import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

// In-memory store for rate limiting
const rateLimit = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute (tighter limit)

// In-memory cache
interface CacheData {
  data: LeetCodeResponse;
  timestamp: number;
}
let cache: CacheData | null = null;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours (1 day)

interface LeetCodeResponse {
  data: {
    pastContests: {
      data: {
        title: string;
        titleSlug: string;
        startTime: number;
      }[];
    };
  };
}

// Validate request origin
function validateOrigin(headersList: Headers) {
  const origin = headersList.get('origin') || headersList.get('referer') || '';
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  
  // Allow requests with no origin (like direct browser requests)
  if (!origin) return true;
  
  // Log for debugging
  console.log('Request origin:', origin);
  console.log('Allowed origins:', allowedOrigins);
  
  // Strict origin checking for production
  return allowedOrigins.some(allowed => {
    const normalizedOrigin = origin.toLowerCase().trim();
    const normalizedAllowed = allowed.toLowerCase().trim();
    return normalizedOrigin === normalizedAllowed || 
           normalizedOrigin === normalizedAllowed.replace('https://', 'http://');
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
function validateApiResponse(data: unknown): data is LeetCodeResponse {
  try {
    const response = data as LeetCodeResponse;
    return Boolean(
      response?.data?.pastContests?.data && 
      Array.isArray(response.data.pastContests.data)
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

    const graphqlQuery = {
      operationName: 'pastContests',
      query: `
        query pastContests($pageNo: Int, $numPerPage: Int) {
          pastContests(pageNo: $pageNo, numPerPage: $numPerPage) {
            data {
              title
              titleSlug
              startTime
            }
          }
        }
      `,
      variables: {
        pageNo: 1,
        numPerPage: 50,
      },
    };

    const url = process.env.NEXT_PUBLIC_LEETCODE!;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'ContestWeb/1.0',
        'Accept': 'application/json',
      },
      body: JSON.stringify(graphqlQuery),
      next: { revalidate: 86400 }, // Revalidate every 24 hours
    });

    if (!response.ok) {
      console.error(`LeetCode fetch failed with status: ${response.status}`);
      return NextResponse.json(
        { error: 'Failed to fetch LeetCode contests' },
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

    const data: LeetCodeResponse = await response.json();
    
    // Validate API response
    if (!validateApiResponse(data)) {
      console.error('Invalid LeetCode API response format');
      return NextResponse.json(
        { error: 'Invalid response format from LeetCode' },
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
  } catch (error: unknown) {
    console.error('Error fetching LeetCode contests:', error);
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