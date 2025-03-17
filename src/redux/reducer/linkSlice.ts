

export async function fetchSolutionVideoUrl(
  source: string,
  name: string
): Promise<string | null> {
  try {
    const response = await fetch('/api/get-video-url', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ source, name }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.videoUrl ?? null;
  } catch (error) {
    console.error("Error fetching video URL:", error);
    return null;
  }
}
