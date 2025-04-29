import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Leaderboard } from '../components/Leaderboard';
import { LeaderboardFilters } from '../components/LeaderboardFilters';
import { supabase } from '../config/supabase';

const LeaderboardPage: React.FC = () => {
  const [timeFrame, setTimeFrame] = useState<'current' | 'previous' | 'all-time'>('current');
  const [genre, setGenre] = useState<string | undefined>(undefined);
  const [genres, setGenres] = useState<string[]>([]);
  const [weeklyReset, setWeeklyReset] = useState('');

  // Fetch available genres
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const { data, error } = await supabase
          .from('bookmarks')
          .select('genre')
          .not('genre', 'is', null);
          
        if (error) throw error;
        
        // Extract unique genres
        const uniqueGenres = Array.from(new Set(data.map(item => item.genre).filter(Boolean)));
        setGenres(uniqueGenres);
      } catch (err) {
        console.error('Error fetching genres:', err);
      }
    };
    
    fetchGenres();
  }, []);

  // Calculate time until weekly reset (Sunday)
  useEffect(() => {
    const calculateTimeUntilReset = () => {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
      const nextSunday = new Date(now);
      nextSunday.setDate(now.getDate() + daysUntilSunday);
      nextSunday.setHours(0, 0, 0, 0);
      
      const timeUntilReset = nextSunday.getTime() - now.getTime();
      const days = Math.floor(timeUntilReset / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeUntilReset % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      return `${days}d ${hours}h until next leaderboard`;
    };
    
    setWeeklyReset(calculateTimeUntilReset());
    const interval = setInterval(() => {
      setWeeklyReset(calculateTimeUntilReset());
    }, 3600000); // Update every hour
    
    return () => clearInterval(interval);
  }, []);

  const handleFilterChange = (filters: { timeFrame: 'current' | 'previous' | 'all-time'; genre?: string }) => {
    setTimeFrame(filters.timeFrame);
    setGenre(filters.genre);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="py-4 px-6 bg-white shadow mb-6">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Bookmarks Leaderboard</h1>
          <div className="flex space-x-4">
            <Link
              to="/bookmarks"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Browse Bookmarks
            </Link>
            <Link
              to="/add-bookmark"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              Add New Bookmark
            </Link>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto">
        <div className="bg-blue-50 text-blue-700 p-4 rounded-md mb-6">
          <p className="text-sm font-medium">{weeklyReset}</p>
          <p className="text-xs mt-1">Leaderboards are finalized every Sunday at midnight UTC</p>
        </div>
        
        <LeaderboardFilters 
          onFilterChange={handleFilterChange}
          genres={genres}
        />
        
        <div className="bg-white rounded-lg shadow p-6">
          <Leaderboard 
            timeFrame={timeFrame}
            genre={genre}
            limit={20}
          />
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;