import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiUrl =
    process.env.NEXT_PUBLIC_CODECHEF_PAST!;
    const response = await fetch(apiUrl);
    if (!response.ok) {
      return NextResponse.json(
        { error: "Error fetching Codechef past contests" },
        { status: response.status }
      );
    }
    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error fetching Codechef past contests:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}