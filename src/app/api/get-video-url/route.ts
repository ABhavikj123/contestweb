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

// Utility to normalize strings (lowercase and remove non-alphanumeric characters)
const normalize = (str: string): string =>
  str.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // Parse the request body
    const body: RequestBody = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ videoUrl: null }, { status: 400 });
    }

    // Construct the YouTube search query
    const searchQuery = `${name} solution`;
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;


    // Fetch YouTube search results
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if(!response.ok){
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
        if (!vr?.videoId || !vr?.title?.runs) continue;

        const videoId = vr.videoId;
        const title = vr.title.runs.map((run) => run.text).join("").trim();
        const channel = vr.ownerText?.runs?.[0]?.text?.toLowerCase() || "";
        videos.push({ videoId, title, channel });
      }
    }

    console.log(
      "Parsed videos:",
      videos.map((v) => ({ title: v.title, channel: v.channel }))
    );

    if (videos.length === 0) {
      console.log("No valid video entries found");
      return NextResponse.json({ videoUrl: null });
    }

    // Normalize the contest name
    const normalizedName = normalize(name);

    // 1. First priority: Find a video from "TLE Eliminators" where the title starts with the contest name
    const tleVideo = videos.find(
      (v) =>
        v.channel === "tle eliminators" && // Note: Adjusted case to match normalization
        normalize(v.title).startsWith(normalizedName)
    );

    if (tleVideo) {
      return NextResponse.json({
        videoUrl: `https://www.youtube.com/watch?v=${tleVideo.videoId}`,
      });
    }

    // 2. Existing fallback: Find any video with the contest name and "solution"
    const otherVideo = videos.find(
      (v) =>
        normalize(v.title).includes(normalizedName) &&
        normalize(v.title).includes("solution")
    );

    if (otherVideo) {
      return NextResponse.json({
        videoUrl: `https://www.youtube.com/watch?v=${otherVideo.videoId}`,
      });
    }

    // 3. New fallback: Find any video with the exact contest name and a solution-related keyword
    const solutionKeywords = ["solution", "explanation", "tutorial", "walkthrough"];
    const fallbackVideo = videos.find((v) => {
      const normalizedTitle = normalize(v.title);
      const hasContestName = normalizedTitle.includes(normalizedName);
      const hasKeyword = solutionKeywords.some((keyword) =>
        normalizedTitle.includes(keyword)
      );
      return hasContestName && hasKeyword;
    });

    if (fallbackVideo) {
      return NextResponse.json({
        videoUrl: `https://www.youtube.com/watch?v=${fallbackVideo.videoId}`,
      });
    }

    // 4. No video found
    
    return NextResponse.json({ videoUrl: null });

  } catch (error: unknown) {
    console.error("Error processing request:", (error as Error).message);
    return NextResponse.json({ videoUrl: null }, { status: 500 });
  }
}
