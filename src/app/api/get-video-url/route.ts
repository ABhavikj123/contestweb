import { NextResponse } from "next/server";
import { headers } from 'next/headers';

// In-memory store for rate limiting
const rateLimit = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute (tighter limit)

// In-memory cache
interface CacheData {
  data: {
    videoUrl?: string;
    error?: string;
  };
  timestamp: number;
}
const cache = new Map<string, CacheData>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours (1 day)

// Type definitions for YouTube's ytInitialData structure
interface YtInitialData {
  contents?: {
    twoColumnSearchResultsRenderer?: {
      primaryContents?: {
        sectionListRenderer?: {
          contents?: Section[];
        };
      };
    };
  };
}

interface Section {
  itemSectionRenderer?: {
    contents?: Item[];
  };
}

interface Item {
  videoRenderer?: VideoRenderer;
}

interface VideoRenderer {
  videoId?: string;
  title?: {
    runs?: { text: string }[];
  };
  ownerText?: {
    runs?: { text: string }[];
  };
}

// Request body type
interface RequestBody {
  name: string;
}

// Validate API key
function validateApiKey(headersList: Headers): boolean {
  const apiKey = headersList.get('x-api-key');
  return apiKey === process.env.API_KEY;
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

// Utility to normalize strings (lowercase, trim, standardize parentheses, remove periods)
const normalize = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s*\(\s*/g, "(") // Remove spaces before "("
    .replace(/\s*\)\s*/g, ")") // Remove spaces after ")"
    .replace(/\./g, ""); // Remove periods
};

// Utility to get the base contest name without suffixes
const getBaseContestName = (name: string): string => {
  return name.replace(/\(rated for div\.\s*\d\)/i, "").trim();
};

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const headersList = await headers();
    
    // Validate API key
    if (!validateApiKey(headersList)) {
      console.warn('Invalid API key attempt');
      return NextResponse.json(
        { error: 'Invalid API key' },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
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
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
            'Access-Control-Max-Age': '86400',
            'Retry-After': '60',
          }
        }
      );
    }

    // Parse the request body
    const body: RequestBody = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
            'Access-Control-Max-Age': '86400',
          }
        }
      );
    }

    // Check cache
    const cacheKey = `video-url:${name}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      return NextResponse.json(cachedData.data, {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
          'X-Cache': 'HIT',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const TLE_CHANNEL = "tle eliminators - by priyansh";
    const normalizedBaseContestName = normalize(getBaseContestName(name));

    // Construct the YouTube search query with base contest name and channel
    const searchQuery = `"${getBaseContestName(name)}" "TLE Eliminators"`;
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;

    // Fetch YouTube search results
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "ContestWeb/1.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 86400 }, // Revalidate every 24 hours
    });

    if (!response.ok) {
      console.error(`Fetch failed with status: ${response.status}`);
      return NextResponse.json(
        { error: 'Failed to fetch YouTube search results' },
        { 
          status: response.status,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
            'Access-Control-Max-Age': '86400',
          }
        }
      );
    }

    // Extract ytInitialData from the HTML
    const html = await response.text();
    const match = html.match(/var ytInitialData = ({.*?});<\/script>/);
    if (!match || !match[1]) {
      console.error("ytInitialData not found in HTML");
      return NextResponse.json(
        { error: 'Invalid YouTube response format' },
        { 
          status: 502,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
            'Access-Control-Max-Age': '86400',
          }
        }
      );
    }

    const data: YtInitialData = JSON.parse(match[1]);
    const contents =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

    if (contents.length === 0) {
      return NextResponse.json(
        { error: 'No search results found' },
        { 
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
            'Access-Control-Max-Age': '86400',
          }
        }
      );
    }

    // Parse video results
    const videos: { videoId: string; title: string; channel: string }[] = [];
    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const vr = item?.videoRenderer;
        if (!vr?.videoId || !vr?.title?.runs || !vr?.ownerText?.runs) continue;

        const videoId = vr.videoId;
        const title = vr.title.runs.map((run) => run.text).join("").trim();
        const channel = vr.ownerText.runs[0].text.toLowerCase();
        videos.push({ videoId, title, channel });
      }
    }

    if (videos.length === 0) {
      return NextResponse.json(
        { error: 'No valid videos found' },
        { 
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
            'Access-Control-Max-Age': '86400',
          }
        }
      );
    }

    // Find a video where:
    // 1. The title contains the base contest name (after normalization)
    // 2. The title contains "| TLE Eliminators"
    // 3. The channel matches "tle eliminators - by priyansh"
    const matchingVideo = videos.find((v) => {
      const normalizedTitle = normalize(v.title);
      const hasExactContestName = normalizedTitle.includes(normalizedBaseContestName);
      const hasTLESignature = normalizedTitle.includes("| tle eliminators");
      const isTLEChannel = v.channel === TLE_CHANNEL;

      return hasExactContestName && hasTLESignature && isTLEChannel;
    });

    const result = matchingVideo 
      ? { videoUrl: `https://www.youtube.com/watch?v=${matchingVideo.videoId}` }
      : { error: 'No matching video found' };

    // Update cache
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    // Update response headers to include x-api-key
    const responseHeaders = {
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
      'X-Cache': 'MISS',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'",
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
      'Access-Control-Max-Age': '86400',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    };

    // Return response with security headers
    return NextResponse.json(result, {
      status: matchingVideo ? 200 : 404,
      headers: responseHeaders,
    });

  } catch (error: unknown) {
    console.error("Error processing request:", (error as Error).message);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
      'Access-Control-Max-Age': '86400',
    },
  });
}