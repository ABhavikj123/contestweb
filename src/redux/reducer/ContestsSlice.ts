import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

const codeforceurl = "https://codeforces.com/api/contest.list";

export interface Contest {
  id: number | string;
  name: string;
  durationSeconds: number;
  startTimeSeconds: number;
  source: string;
  status: 'UPCOMING' | 'RUNNING' | 'PAST';
  url: string;
}

interface ContestSource {
  name: string;
  apiUrls: string[];
}

interface CodeforcesContest {
  id: number;
  name: string;
  startTimeSeconds: number;
  durationSeconds: number;
}

interface CodechefContest {
  contest_code: string;
  contest_name: string;
  contest_start_date_iso: string;
  contest_duration: string;
}

interface LeetCodeContest {
  titleSlug: string;
  title: string;
  duration?: number;
  startTime: number;
}

interface ContestsState {
  contests: Contest[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  filter: string;
  sources: ContestSource[];
  bookmarks: (number | string)[];
  selectedSources: string[];
}

const initialState: ContestsState = {
  contests: [],
  status: 'idle',
  error: null,
  filter: '',
  sources: [
    { name: 'Codeforces', apiUrls: [codeforceurl] },
    { name: 'Codechef', apiUrls: [ `/api/codechef/contests/future`, `/api/codechef/contests/past` ] },
    { name: 'LeetCode',  apiUrls: [ `/api/leetcode/contests`, `/api/leetcode/upcoming-contests` ] }
  ],
  bookmarks: [],
  selectedSources: []
};

function loadBookmarksFromStorage(): (number | string)[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('bookmarks');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function saveBookmarksToStorage(bookmarks: (number | string)[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
  }
}

export const fetchContests = createAsyncThunk(
  'contests/fetchContests',
  async (_, { rejectWithValue }) => {
    try {
      const sources: ContestSource[] = [
        { name: 'Codeforces', apiUrls: [codeforceurl] },
        { name: 'Codechef', apiUrls: [ `/api/codechef/contests/future`, `/api/codechef/contests/past` ] },
        { name: 'LeetCode',  apiUrls: [ `/api/leetcode/contests`, `/api/leetcode/upcoming-contests` ] }
      ];
      let allContests: Contest[] = [];
      const currentTime = Math.floor(Date.now() / 1000);

      for (const source of sources) {
        let contestsFromSource: Contest[] = [];

        const endpointPromises = source.apiUrls.map(url =>
          fetch(url).then(async (res) => {
            if (!res.ok) {
              throw new Error(`HTTP error from ${source.name} for ${url}: status ${res.status}`);
            }
            return res.json();
          })
        );

        const settledEndpoints = await Promise.allSettled(endpointPromises);

        for (const result of settledEndpoints) {
          if (result.status === 'fulfilled') {
            const data = result.value;
            let contestsData: Contest[] = [];

            if (source.name === 'Codeforces') {
              const cfData = data as { status: string; result: unknown[] };
              if (cfData.status !== 'OK' || !Array.isArray(cfData.result)) {
                continue;
              }
              contestsData = cfData.result.map((cfItem: unknown) => {
                const cf = cfItem as CodeforcesContest;
                const startTimeSeconds = cf.startTimeSeconds;
                const durationSeconds = cf.durationSeconds;
                const endTimeSeconds = startTimeSeconds + durationSeconds;
                let status: Contest['status'] = 'UPCOMING';
                if (currentTime > endTimeSeconds) status = 'PAST';
                else if (currentTime >= startTimeSeconds) status = 'RUNNING';
                return {
                  id: cf.id,
                  name: cf.name,
                  durationSeconds,
                  startTimeSeconds,
                  source: 'Codeforces',
                  status,
                  url: `https://codeforces.com/contest/${cf.id}`
                };
              });
            } else if (source.name === 'Codechef') {
              const ccData = data as { status: string; contests: unknown[] };
              if (ccData.status !== 'success' || !Array.isArray(ccData.contests)) {
                continue;
              }
              contestsData = ccData.contests.map((ccItem: unknown) => {
                const cc = ccItem as CodechefContest;
                const startTimeSeconds = Math.floor(new Date(cc.contest_start_date_iso).getTime() / 1000);
                const durationSeconds = parseInt(cc.contest_duration, 10) * 60;
                const endTimeSeconds = startTimeSeconds + durationSeconds;
                let status: Contest['status'] = 'UPCOMING';
                if (currentTime > endTimeSeconds) status = 'PAST';
                else if (currentTime >= startTimeSeconds) status = 'RUNNING';
                const name = cc.contest_name.replace(/\s*\(.*?\)/, '');
                return {
                  id: cc.contest_code,
                  name,
                  durationSeconds,
                  startTimeSeconds,
                  source: 'Codechef',
                  status,
                  url: `https://www.codechef.com/${cc.contest_code}`
                };
              });
            } else if (source.name === 'LeetCode') {
              let leetData: unknown[] = [];
              const lcData = data as { data?: { pastContests?: { data: unknown[] }, topTwoContests?: unknown[] } };
              if (lcData.data?.pastContests?.data && Array.isArray(lcData.data.pastContests.data)) {
                leetData = leetData.concat(lcData.data.pastContests.data);
              }
              if (lcData.data?.topTwoContests && Array.isArray(lcData.data.topTwoContests)) {
                leetData = leetData.concat(lcData.data.topTwoContests);
              }
              contestsData = leetData.map((lcItem: unknown) => {
                const lc = lcItem as LeetCodeContest;
                let status: Contest['status'] = 'PAST';
                if (lc.startTime > currentTime) status = 'UPCOMING';
                return {
                  id: lc.titleSlug,
                  name: lc.title,
                  durationSeconds: lc.duration ?? 0,
                  startTimeSeconds: lc.startTime,
                  source: 'LeetCode',
                  status,
                  url: `https://leetcode.com/contest/${lc.titleSlug}`
                };
              });
            }

            contestsFromSource = contestsFromSource.concat(contestsData);
          }
        }
        allContests = allContests.concat(contestsFromSource);
      }

      if (allContests.length === 0) {
        throw new Error('No contests could be fetched from any source');
      }
      allContests.sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);
      return allContests;
    } catch (err: unknown) {
      return rejectWithValue((err as Error).message);
    }
  }
);

export const contestsSlice = createSlice({
  name: 'contests',
  initialState,
  reducers: {
    setFilter(state, action: PayloadAction<string>) {
      state.filter = action.payload;
    },
    addSource(state, action: PayloadAction<ContestSource>) {
      state.sources.push(action.payload);
    },
    loadBookmarks(state) {
      state.bookmarks = loadBookmarksFromStorage();
    },
    toggleBookmark(state, action: PayloadAction<number | string>) {
      const contestId = action.payload;
      const index = state.bookmarks.indexOf(contestId);
      if (index === -1) {
        state.bookmarks.push(contestId);
      } else {
        state.bookmarks.splice(index, 1);
      }
      saveBookmarksToStorage(state.bookmarks);
    },
    toggleSourceFilter(state, action: PayloadAction<string>) {
      const source = action.payload;
      if (state.selectedSources.includes(source)) {
        state.selectedSources = state.selectedSources.filter((s) => s !== source);
      } else {
        state.selectedSources.push(source);
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchContests.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchContests.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.contests = action.payload;
      })
      .addCase(fetchContests.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  }
});

export const {
  setFilter,
  addSource,
  loadBookmarks,
  toggleBookmark,
  toggleSourceFilter
} = contestsSlice.actions;

export default contestsSlice.reducer;
