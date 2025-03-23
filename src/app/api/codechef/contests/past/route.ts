import { NextResponse } from "next/server";
import { headers } from 'next/headers';
import { checkRateLimit } from '@/lib/rate-limit';

// Cache types
interface CacheData {
  contests: Array<{
    name: string;
    startDate: string;
    endDate: string;
    url: string;
  }>;
}

interface CacheEntry {
  data: CacheData;
  timestamp: number;
}

interface Cache {
  [key: string]: CacheEntry;
}

// Simple in-memory cache
const cache: Cache = {};
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function GET() {
  try {
    // Get client IP for rate limiting
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || 'unknown';
    
    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { 
          status: 429,
          headers: {
            'Retry-After': '60',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // Check cache
    if (cache['past'] && Date.now() - cache['past'].timestamp < CACHE_TTL) {
      return NextResponse.json(cache['past'].data, {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const apiUrl = process.env.NEXT_PUBLIC_CODECHEF_PAST!;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: "Error fetching Codechef past contests" },
        { 
          status: response.status,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    const data = await response.json();
    
    // Update cache
    cache['past'] = {
      data,
      timestamp: Date.now()
    };

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error("Error fetching Codechef past contests:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { 
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}