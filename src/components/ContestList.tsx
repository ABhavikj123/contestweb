import React, { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '../hooks/reduxhook';
import { Contest } from '../redux/reducer/ContestsSlice';
import ContestCard from './ContestCard';
import { useTheme } from '../components/ThemeProvider';

const PAGE_SIZE = 12;

interface ContestListProps {
  type: 'UPCOMING' | 'RUNNING' | 'PAST';
  reverse?: boolean;
}

const ContestList: React.FC<ContestListProps> = ({ type, reverse = false }) => {
  const { isDark } = useTheme();
  const { contests, filter, selectedSources } = useAppSelector((state) => state.contests);
  const [page, setPage] = useState(1);

  let filtered = contests.filter((c: Contest) => {
    const nameMatch =
      c.name.toLowerCase().includes(filter.toLowerCase()) ||
      c.source.toLowerCase().includes(filter.toLowerCase());
    const typeMatch = c.status === type;
    return nameMatch && typeMatch;
  });

  if (selectedSources.length > 0) {
    filtered = filtered.filter((c: Contest) => selectedSources.includes(c.source));
  }

  filtered = [...filtered].sort((a, b) => {
    if (type === 'PAST' && reverse) {
      return b.startTimeSeconds - a.startTimeSeconds;
    }
    return a.startTimeSeconds - b.startTimeSeconds;
  });

  const paginated = filtered.slice(0, page * PAGE_SIZE);

  const handleLoadMore = useCallback(() => {
    if (paginated.length < filtered.length) {
      setPage((prev) => prev + 1);
    }
  }, [paginated.length, filtered.length]);

  useEffect(() => {
    const onScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 50) {
        handleLoadMore();
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [handleLoadMore]);

  return (
    <div className="w-full mx-auto">
      {paginated.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginated.map((contest) => (
              <ContestCard key={contest.id} contest={contest} isDark={isDark} />
            ))}
          </div>
          {paginated.length < filtered.length && (
            <div className="flex justify-center mt-8">
              <button
                onClick={handleLoadMore}
                className={`px-6 py-2 rounded-md font-semibold ${
                  isDark
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                Load More
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="text-center text-xl mt-4">
          No {type.toLowerCase()} contests available.
        </p>
      )}
    </div>
  );
};

export default ContestList;