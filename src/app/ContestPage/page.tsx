"use client";

import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../hooks/reduxhook";
import {
  fetchContests,
  loadBookmarks,
  toggleSourceFilter,
} from "../../redux/reducer/ContestsSlice";
import ContestList from "../../components/ContestList";
import { useTheme } from "../../components/ThemeProvider";

const ContestPage: React.FC = () => {
  const { isDark } = useTheme();
  const dispatch = useAppDispatch();
  const { status, error, sources, selectedSources } = useAppSelector(
    (state) => state.contests
  );
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    dispatch(loadBookmarks());
    dispatch(fetchContests());
  }, [dispatch]);

  const handleToggleSource = (source: string) => {
    dispatch(toggleSourceFilter(source));
  };

  return (
    <div
      className={`min-h-screen p-6 transition-colors duration-300 ${
        isDark ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800"
      }`}
    >
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Programming Contests</h1>

        <div className="flex flex-col gap-4 mb-8">
          <div className="flex justify-start w-full">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center px-4 py-2 rounded-lg border shadow-sm transition-colors duration-200 ${
                isDark
                  ? "bg-gray-800 hover:bg-gray-700 text-white"
                  : "bg-white hover:bg-gray-50 text-gray-800"
              }`}
            >
              {showFilters ? "Hide Filters" : "Filter by Source"}
            </button>
          </div>
          {showFilters && (
            <div className="flex flex-wrap gap-2">
              {sources.map((src) => {
                const isActive = selectedSources.includes(src.name);
                return (
                  <button
                    key={src.name}
                    onClick={() => handleToggleSource(src.name)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors duration-200 ${
                      isActive
                        ? "bg-blue-500 text-white"
                        : isDark
                        ? "bg-gray-700 hover:bg-gray-600 text-white"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-800"
                    }`}
                  >
                    {src.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {status === "loading" && (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
        {status === "failed" && (
          <div className="p-4 bg-red-100 border border-red-400 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {status === "succeeded" && (
          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <span className="mr-2">🔥</span> Running Contests
              </h2>
              <ContestList type="RUNNING" />
            </section>
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <span className="mr-2">📅</span> Upcoming Contests
              </h2>
              <ContestList type="UPCOMING" />
            </section>
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <span className="mr-2">📚</span> Past Contests
              </h2>
              <ContestList type="PAST" reverse={true} />
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContestPage;
