# Contest Web Application

[Watch the sample video](./sample.mp4)
## Overview
This project is a web application built with Next.js that aggregates programming contest data from multiple sources. Contests are fetched from Codeforces, Codechef, and LeetCode. Users can view contests that are running, upcoming, or past and even filter the contests by source. In addition, contests can be bookmarked (stored locally in the browser).

## Tech Stack
- **Next.js 13** (App Router)
- **React** (with functional components and hooks)
- **Redux Toolkit** for state management
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Docker** (optional, for containerization)
- **LocalStorage** for persisting bookmarks

## Features
- **Contest Listing:** Displays contests segregated by status – Running, Upcoming, and Past.
- **Filtering:** Provides a filter option for contest sources (Codeforces, Codechef, LeetCode).
- **Bookmarking:** Allows users to store bookmarked contests locally.
- **Theming:** Supports dark/light themes using a custom Theme Provider.
- **Consistent Layout:** Uses a common layout with a persistent navbar across all pages.

## Data Flow
1. **Data Fetching:**  
   - The `fetchContests` thunk in the Redux slice fetches contest data from different sources.
   - For each source, multiple API endpoints are defined (e.g. Codechef future and past endpoints are merged into a single Codechef option).
   - The thunk uses concurrent fetching (with `Promise.allSettled`) so that if one endpoint fails, data from the others can still be used.
   - Once fetched, contests are processed based on the source and their contest times to determine if they are running, upcoming, or past.

2. **State Management:**  
   - The Redux store (configured with Redux Toolkit) holds all contest data, filter preferences, and bookmarks.
   - Reducers handle actions such as toggling source filters and loading bookmarks.
   - The UI components (e.g. `ContestPage`, `ContestList`) use custom hooks (`useAppDispatch` and `useAppSelector`) to access and manipulate the state.

3. **UI Rendering:**  
   - The main page (`ContestPage/page.tsx`) triggers the data fetching thunks on mount (via `useEffect`) and displays a loading spinner until the contests are successfully fetched.
   - Filtering options are toggled via a button. The available sources are rendered as buttons and update the `selectedSources` in the Redux store.
   - The contests are displayed in sections divided by status (Running, Upcoming, Past) using the `ContestList` component.
   - A consistent layout with a Navbar is provided via the `CommonLayout` component and applied in `layout.tsx`.

## Folder Structure
```
contestweb/
├── src/
│   ├── app/
│   │   ├── ContestPage/
│   │   │   └── page.tsx         # Main contest page (set as home page)
│   │   ├── BookmarkPage/
│   │   │   └── page.tsx         # Page for bookmarked contests
│   │   ├── api/                # API routes (Codechef, LeetCode, get-video-url)
│   │   │   ├── codechef/
│   │   │   │   ├── contests/
│   │   │   │   │   ├── past/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── future/
│   │   │   │   │       └── route.ts
│   │   │   ├── leetcode/
│   │   │   │   ├── contests/     (fetches LeetCode contest data)
│   │   │   │   └── upcoming-contests/
│   │   │   │       └── route.ts
│   │   │   └── get-video-url/    (fetches video URLs for contest solutions)
│   │   │       └── route.ts
│   │   └── layout.tsx           # Root layout with global providers and CommonLayout
│   ├── components/
│   │   ├── Navbar.tsx           # Navbar component (persistent across pages)
│   │   ├── CommonLayout.tsx     # Wraps pages with Navbar and provides padding/margin
│   │   ├── ContestList.tsx      # Renders list of contests based on status
│   │   ├── ThemeProvider.tsx    # Provides dark/light theme logic
│   │   └── ClientProvider.tsx   # Enables client-side functionality (e.g., Redux Provider)
│   ├── hooks/
│   │   └── reduxhook.ts         # Custom hooks for Redux (useAppDispatch, useAppSelector)
│   └── redux/
│       └── reducer/
│           └── ContestsSlice.ts # Redux slice with contest fetching, filtering, bookmarking logic
├── Dockerfile                 # Docker configuration file for container builds
├── package.json               # Project dependencies and scripts
└── README.md                  # This documentation file
```

## Getting Started
1. **Install Dependencies:**  
   In your project folder, run:
   ```bash
   npm install
   ```

2. **Run in Development Mode:**  
   Start the Next.js development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. **Build for Production:**  
   Create an optimized production build and start the server:
   ```bash
   npm run build
   npm start
   ```

4. **Using Docker (Optional):**  
   Build the Docker image:
   ```bash
   docker build -t contestweb .
   ```
   Run the container:
   ```bash
   docker run -p 3000:3000 contestweb
   ```

## Summary
This application displays programming contests collected from multiple sources using a robust asynchronous data-fetching approach with Redux Toolkit. It offers filtering and bookmarking features with a clean, responsive UI powered by Next.js and Tailwind CSS.

Feel free to extend or modify the project as needed, and thanks for checking it out!