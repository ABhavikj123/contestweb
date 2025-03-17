import { NextResponse } from 'next/server';

export async function GET(request: Request) {
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

    const response = await fetch('https://leetcode.com/graphql/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(graphqlQuery),
    });

    if (!response.ok) {
      throw new Error(`LeetCode fetch failed with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching LeetCode contests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LeetCode contests' },
      { status: 500 }
    );
  }
}