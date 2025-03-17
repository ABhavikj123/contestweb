"use client";

import React from "react";
import { useAppDispatch, useAppSelector } from "../hooks/reduxhook";
import { toggleBookmark, Contest } from "../redux/reducer/ContestsSlice";

import {
  HiOutlineLink,
  HiOutlineBookmark,
  HiOutlineClock,
  HiOutlineCalendar,
} from "react-icons/hi";
import { fetchSolutionVideoUrl } from "../redux/reducer/linkSlice";

interface ContestCardProps {
  contest: Contest;
  isDark: boolean;
}

const ContestCard: React.FC<ContestCardProps> = ({ contest, isDark }) => {
  const dispatch = useAppDispatch();
  const { bookmarks } = useAppSelector((state) => state.contests);
  const isBookmarked = bookmarks.includes(contest.id);

  const handleBookmark = () => {
    dispatch(toggleBookmark(contest.id));
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours === 0 ? `${minutes} minutes` : minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "RUNNING":
        return "bg-green-500";
      case "UPCOMING":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const showSolutionButton = contest.status === "PAST";

  const handleViewSolution = async () => {
    const videoUrl = await fetchSolutionVideoUrl(contest.source, contest.name);
    if (videoUrl) {
      window.open(videoUrl, "_blank", "noopener,noreferrer");
    } else {
      alert("No solution video found for this contest!");
    }
  };

  return (
    <div
      className={`rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:scale-105 hover:shadow-xl ${
        isDark ? "bg-gray-800 text-white" : "bg-white text-gray-800"
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-bold leading-tight flex-grow">
          {contest.name}
        </h3>
        <span
          className={`ml-2 text-sm px-3 py-1 rounded-full font-medium ${getStatusColor(
            contest.status
          )} text-white`}
        >
          {contest.status}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm">
          <div
            className={`px-2 py-1 rounded ${
              isDark ? "bg-gray-700" : "bg-gray-100"
            }`}
          >
            {contest.source}
          </div>
        </div>
        <div className="flex items-center text-sm">
          <HiOutlineClock className="h-4 w-4 mr-2 opacity-70" />
          <span>Duration: {formatDuration(contest.durationSeconds)}</span>
        </div>
        <div className="flex items-center text-sm">
          <HiOutlineCalendar className="h-4 w-4 mr-2 opacity-70" />
          <span>
            Starts:{" "}
            {new Date(contest.startTimeSeconds * 1000).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap justify-end items-center gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <a
          href={contest.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
            isDark
              ? "bg-gray-700 hover:bg-gray-600 text-white"
              : "bg-gray-100 hover:bg-gray-200 text-gray-800"
          }`}
        >
          <HiOutlineLink className="h-4 w-4" />
          Visit Contest
        </a>

        {showSolutionButton && (
          <button
            onClick={handleViewSolution}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
              isDark
                ? "bg-green-700 hover:bg-green-600 text-white"
                : "bg-green-100 hover:bg-green-200 text-green-800"
            }`}
          >
            View Solutions
          </button>
        )}

        <button
          onClick={handleBookmark}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
            isBookmarked
              ? "bg-blue-500 hover:bg-blue-600 text-white"
              : isDark
              ? "bg-gray-700 hover:bg-gray-600 text-white"
              : "bg-gray-100 hover:bg-gray-200 text-gray-800"
          }`}
        >
          <HiOutlineBookmark className="h-4 w-4" />
          {isBookmarked ? "Bookmarked" : "Bookmark"}
        </button>
      </div>
    </div>
  );
};

export default ContestCard;
