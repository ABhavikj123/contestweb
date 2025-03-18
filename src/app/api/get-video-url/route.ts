import { NextResponse } from "next/server";

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

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // Parse the request body
    const body: RequestBody = await request.json();
    const { name } = body;

    if (!name) {
      console.log("No contest name provided");
      return NextResponse.json({ videoUrl: null }, { status: 400 });
    }

    const TLE_CHANNEL = "tle eliminators - by priyansh";
    const normalizedContestName = normalize(name);

    // Construct the YouTube search query with contest name and channel
    const searchQuery = `"${name}" "TLE Eliminators"`;
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;

    // Fetch YouTube search results
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
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
      return NextResponse.json({ videoUrl: null });
    }

    const data: YtInitialData = JSON.parse(match[1]);
    const contents =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

    if (contents.length === 0) {
      console.log("No search results found");
      return NextResponse.json({ videoUrl: null });
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
      console.log("No valid video entries found");
      return NextResponse.json({ videoUrl: null });
    }

    

    // Find a video where:
    // 1. The title contains the exact contest name (after normalization)
    // 2. The title contains "| TLE Eliminators"
    // 3. The channel matches "tle eliminators - by priyansh"
    const matchingVideo = videos.find((v) => {
      const normalizedTitle = normalize(v.title);
      const hasExactContestName = normalizedTitle.includes(normalizedContestName);
      const hasTLESignature = normalizedTitle.includes("| tle eliminators");
      const isTLEChannel = v.channel === TLE_CHANNEL;
      return hasExactContestName && hasTLESignature && isTLEChannel;
    });

    if (matchingVideo) {
      console.log(`Found matching video: "${matchingVideo.title}" from "${matchingVideo.channel}"`);
      return NextResponse.json({
        videoUrl: `https://www.youtube.com/watch?v=${matchingVideo.videoId}`,
      });
    }

    console.log(`No video found with title containing "${name}" and "| TLE Eliminators" from "${TLE_CHANNEL}"`);
    return NextResponse.json({ videoUrl: null });

  } catch (error: unknown) {
    console.error("Error processing request:", (error as Error).message);
    return NextResponse.json({ videoUrl: null }, { status: 500 });
  }
}