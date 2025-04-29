import { useState } from 'react';

interface LeaderboardFiltersProps {
  onFilterChange: (filters: {
    timeFrame: 'current' | 'previous' | 'all-time';
    genre?: string;
  }) => void;
  genres: string[];
}

export function LeaderboardFilters({ onFilterChange, genres }: LeaderboardFiltersProps) {
  const [timeFrame, setTimeFrame] = useState<'current' | 'previous' | 'all-time'>('current');
  const [genre, setGenre] = useState<string | undefined>(undefined);

  const handleTimeFrameChange = (newTimeFrame: 'current' | 'previous' | 'all-time') => {
    setTimeFrame(newTimeFrame);
    onFilterChange({ timeFrame: newTimeFrame, genre });
  };

  const handleGenreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGenre = e.target.value === 'all' ? undefined : e.target.value;
    setGenre(newGenre);
    onFilterChange({ timeFrame, genre: newGenre });
  };

  return (
    <div className="leaderboard-filters bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="mb-4 md:mb-0">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Time Period</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => handleTimeFrameChange('current')}
              className={`px-3 py-1 text-sm rounded-md ${
                timeFrame === 'current'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Current Week
            </button>
            <button
              onClick={() => handleTimeFrameChange('previous')}
              className={`px-3 py-1 text-sm rounded-md ${
                timeFrame === 'previous'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Previous Week
            </button>
            <button
              onClick={() => handleTimeFrameChange('all-time')}
              className={`px-3 py-1 text-sm rounded-md ${
                timeFrame === 'all-time'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Time
            </button>
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Genre</h3>
          <select
            value={genre || 'all'}
            onChange={handleGenreChange}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All Genres</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}