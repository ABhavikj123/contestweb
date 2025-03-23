import { NextResponse } from 'next/server';

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

export async function GET() {
  try {
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
    const url=process.env.NEXT_PUBLIC_LEETCODE!;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(graphqlQuery),
    });

    if (!response.ok) {
      throw new Error(`LeetCode fetch failed with status: ${response.status}`);
    }

    const data: LeetCodeResponse = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Error fetching LeetCode contests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LeetCode contests' },
      { status: 500 }
    );
  }
}