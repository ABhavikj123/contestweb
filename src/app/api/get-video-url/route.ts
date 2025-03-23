import { NextResponse } from "next/server";
import { headers } from 'next/headers';
import { checkRateLimit } from '@/lib/rate-limit';

// Cache types
interface CacheData {
  videoUrl: string | null;
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
const REQUEST_TIMEOUT = 5000; // 5 seconds timeout

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

// Utility to fetch with timeout
const fetchWithTimeout = async (url: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

export async function POST(request: Request): Promise<NextResponse> {
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

    // Parse the request body
    const body: RequestBody = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { videoUrl: null }, 
        { 
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    // Check cache
    const cacheKey = `video_${name}`;
    if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_TTL) {
      return NextResponse.json(cache[cacheKey].data, {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const TLE_CHANNEL = "tle eliminators - by priyansh";
    const normalizedBaseContestName = normalize(getBaseContestName(name));

    // Construct the YouTube search query with base contest name and channel
    const searchQuery = `"${getBaseContestName(name)}" "TLE Eliminators"`;
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;

    // Fetch YouTube search results with timeout
    const response = await fetchWithTimeout(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      console.error(`Fetch failed with status: ${response.status}`);
      throw new Error("Failed to fetch YouTube search results");
    }

    // Extract ytInitialData from the HTML
    const html = await response.text();
    const match = html.match(/var ytInitialData = ({.*?});<\/script>/);
    if (!match || !match[1]) {
      console.error("ytInitialData not found in HTML");
      return NextResponse.json(
        { videoUrl: null },
        { headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const data: YtInitialData = JSON.parse(match[1]);
    const contents =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

    if (contents.length === 0) {
      return NextResponse.json(
        { videoUrl: null },
        { headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Parse video results (optimized to only process first few results)
    const videos: { videoId: string; title: string; channel: string }[] = [];
    for (const section of contents.slice(0, 2)) { // Only process first 2 sections
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items.slice(0, 5)) { // Only process first 5 items per section
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
        { videoUrl: null },
        { headers: { 'Access-Control-Allow-Origin': '*' } }
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
      : { videoUrl: null };

    // Update cache
    cache[cacheKey] = {
      data: result,
      timestamp: Date.now()
    };

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error: unknown) {
    console.error("Error processing request:", (error as Error).message);
    return NextResponse.json(
      { videoUrl: null }, 
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}