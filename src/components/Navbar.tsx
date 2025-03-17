"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import {
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineBookmark,
  HiOutlineStop,
} from "react-icons/hi";

const Navbar: React.FC = () => {
  const { isDark, toggleDarkMode } = useTheme();
  const pathname = usePathname();

  const getIconContainerClasses = (path: string) => {
    const baseClasses = "p-3 rounded-full transition-colors duration-300";
    if (pathname === path) {
      return isDark
        ? `${baseClasses} bg-gray-700 text-gray-100`
        : `${baseClasses} bg-gray-300 text-gray-800`;
    }
    return isDark
      ? `${baseClasses} bg-gray-800 text-gray-100 hover:bg-gray-700`
      : `${baseClasses} bg-gray-200 text-gray-800 hover:bg-gray-300`;
  };

  const labelClasses = "mt-1 text-xs font-medium";
  const navItemClasses = "flex flex-col items-center";

  return (
    <nav
      className={`fixed w-full top-0 z-50 backdrop-blur-lg shadow-md transition-colors duration-300 ${
        isDark ? "bg-gray-900/80" : "bg-white/80"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex justify-between items-center">
          <Link
            href="/"
            className="text-2xl font-bold transition-transform transform hover:scale-105"
          >
            Contest Tracker
          </Link>

          <div className="flex items-center space-x-6">
            <span className={navItemClasses}>
              <Link
                href="/BookmarkPage"
                className={getIconContainerClasses("/BookmarkPage")}
              >
                <HiOutlineBookmark className="h-6 w-6" />
              </Link>
              <span className={labelClasses}>Bookmarks</span>
            </span>

            <span className={navItemClasses}>
              <Link
                href="/ContestPage"
                className={getIconContainerClasses("/ContestPage")}
                title="Contests"
              >
                <HiOutlineStop className="h-6 w-6" />
              </Link>
              <span className={labelClasses}>Contests</span>
            </span>

            <span className={navItemClasses}>
              <button
                onClick={toggleDarkMode}
                className={`p-3 rounded-full transition-colors duration-300 ${
                  isDark
                    ? "bg-gray-800 text-gray-100 hover:bg-gray-700"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
              >
                {isDark ? (
                  <HiOutlineSun className="h-6 w-6 text-yellow-400" />
                ) : (
                  <HiOutlineMoon className="h-6 w-6" />
                )}
              </button>
              <span className={labelClasses}>{isDark ? "Light" : "Dark"}</span>
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
