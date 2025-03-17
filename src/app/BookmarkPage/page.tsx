"use client";

import { HiOutlineBookmark } from 'react-icons/hi';

import React, { useEffect } from "react";
import { useAppSelector, useAppDispatch } from "../../hooks/reduxhook";
import ContestCard from "../../components/ContestCard";
import { useTheme } from "../../components/ThemeProvider";
import { fetchContests, loadBookmarks } from "../../redux/reducer/ContestsSlice";

const BookmarkPage: React.FC = () => {
  const { isDark } = useTheme();
  const dispatch = useAppDispatch();
  const { contests, bookmarks, status, error } = useAppSelector(
    (state) => state.contests
  );

  useEffect(() => {
    dispatch(loadBookmarks());
    if (status !== "succeeded" && status !== "loading") {
      dispatch(fetchContests());
    }
  }, [dispatch, status]);

  const bookmarkedContests = contests.filter((c) => bookmarks.includes(c.id));
  const upcomingAndRunning = bookmarkedContests.filter(
    (c) => c.status === "UPCOMING" || c.status === "RUNNING"
  );
  const pastContests = bookmarkedContests.filter((c) => c.status === "PAST");

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark
          ? "bg-gradient-to-b from-gray-900 to-gray-800"
          : "bg-gradient-to-b from-gray-50 to-white"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center space-x-4 mb-8">
          <HiOutlineBookmark
            className={`h-10 w-10 ${isDark ? "text-blue-400" : "text-blue-600"}`}
          />
          <h1
            className={`text-4xl font-extrabold tracking-tight ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            My Bookmarks
          </h1>
        </div>

        {status === "loading" && (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
        {status === "failed" && (
          <div className="p-4 bg-red-100 border border-red-400 rounded-lg text-red-700 mb-4">
            {error}
          </div>
        )}

        {bookmarkedContests.length === 0 ? (
          <div
            className={`text-center py-16 ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            <HiOutlineBookmark className="mx-auto h-12 w-12 mb-4" />
            <p className="text-xl font-medium">No bookmarked contests yet</p>
            <p className="mt-2">
              Bookmark contests to keep track of them here
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {upcomingAndRunning.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2
                    className={`text-2xl font-bold ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Upcoming & Running Contests
                  </h2>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      isDark
                        ? "bg-blue-900/50 text-blue-200"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {upcomingAndRunning.length} contests
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingAndRunning.map((contest) => (
                    <ContestCard
                      key={contest.id}
                      contest={contest}
                      isDark={isDark}
                    />
                  ))}
                </div>
              </section>
            )}

            {pastContests.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2
                    className={`text-2xl font-bold ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Past Contests
                  </h2>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      isDark
                        ? "bg-gray-800 text-gray-200"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {pastContests.length} contests
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastContests.map((contest) => (
                    <ContestCard
                      key={contest.id}
                      contest={contest}
                      isDark={isDark}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookmarkPage;
