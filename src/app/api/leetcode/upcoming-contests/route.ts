import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const graphqlQuery = {
      operationName: 'topTwoContests',
      query: `
        query topTwoContests {
          topTwoContests {
            title
            titleSlug
            startTime
            cardImg
            duration
          }
        }
      `,
      variables: {},
    };

    const response = await fetch('https://leetcode.com/graphql/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(graphqlQuery),
    });

    if (!response.ok) {
      throw new Error(
        `LeetCode topTwoContests fetch failed with status: ${response.status}`
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching LeetCode topTwoContests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LeetCode upcoming contests' },
      { status: 500 }
    );
  }
}