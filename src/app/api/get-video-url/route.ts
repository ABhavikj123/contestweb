import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { name } = body;
    if (!name) {
      console.log("No title provided");
      return NextResponse.json({ videoUrl: null });
    }
    
    const searchQuery = `"${name}" "TLE Eliminators"`;
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    
    if (!response.ok) {
      console.error(`HTTP error! Status: ${response.status}`);
      throw new Error("Failed to fetch search results");
    }
    
    const html = await response.text();
    const match = html.match(/var ytInitialData = ({.*?});<\/script>/);
    if (!match || !match[1]) {
      console.error("No ytInitialData found");
      return NextResponse.json({ videoUrl: null });
    }
    
    let data: unknown;
    try {
      data = JSON.parse(match[1]);
    } catch (error: unknown) {
      console.error("Failed to parse ytInitialData:", (error as Error).message);
      return NextResponse.json({ videoUrl: null });
    }
    
    
    const contents = ((data as { contents?: any })?.contents?.twoColumnSearchResultsRenderer?.primaryContents
        ?.sectionListRenderer?.contents) || [];
    const results: { vid: string; videoTitle: string; channelName: string }[] = [];
    
    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const videoRenderer = item.videoRenderer;
        if (!videoRenderer) continue;
        
        const vid = videoRenderer.videoId;
        const titleRuns = videoRenderer.title?.runs;
        const channelName = videoRenderer.ownerText?.runs?.[0]?.text?.toLowerCase() || "";
        if (!vid || !titleRuns) continue;
        
        const videoTitle = titleRuns.map((run: { text: string }) => run.text).join("").trim();
        results.push({ vid, videoTitle, channelName });
      }
    }
    
    if (results.length === 0) {
      console.log(`No video results found for "${name}"`);
      return NextResponse.json({ videoUrl: null });
    }
    
    const tleExactMatch = results.find(
      (x) =>
        x.channelName.includes("tle eliminators") &&
        x.videoTitle.toLowerCase() === name.toLowerCase()
    );
    
    if (tleExactMatch) {
      console.log(`Found exact TLE Eliminators match: ${tleExactMatch.videoTitle}`);
      return NextResponse.json({ videoUrl: `https://www.youtube.com/watch?v=${tleExactMatch.vid}` });
    }
    
    const tleNearMatch = results.find(
      (x) =>
        x.channelName.includes("tle eliminators") &&
        x.videoTitle.toLowerCase().replace(/[-\s|]+/g, "").includes(name.toLowerCase().replace(/[-\s|]+/g, ""))
    );
    
    if (tleNearMatch) {
      return NextResponse.json({ videoUrl: `https://www.youtube.com/watch?v=${tleNearMatch.vid}` });
    }
    
    const anyExactMatch = results.find(
      (x) => x.videoTitle.toLowerCase() === name.toLowerCase()
    );
    
    if (anyExactMatch) {
      return NextResponse.json({ videoUrl: `https://www.youtube.com/watch?v=${anyExactMatch.vid}` });
    }
    
    return NextResponse.json({ videoUrl: null });
    
  } catch (error: unknown) {
    console.error("Error in get-video-url:", (error as Error).message);
    return NextResponse.json({ videoUrl: null }, { status: 500 });
  }
}