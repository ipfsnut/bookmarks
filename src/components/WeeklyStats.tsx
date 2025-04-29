import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

export function WeeklyStats() {
  const [totalVotes, setTotalVotes] = useState(0);
  const [totalBookmarks, setTotalBookmarks] = useState(0);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [weekNumber, setWeekNumber] = useState(0);
  const [loading, setLoading] = useState(true);

  // Get current week number (1-52)
  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    const currentWeek = Math.floor(diff / oneWeek) + 1;
    setWeekNumber(currentWeek);
  }, []);

  // Fetch weekly statistics
  useEffect(() => {
    if (weekNumber === 0) return;

    const fetchStats = async () => {
      try {
        setLoading(true);

        // Get total votes
        const { data: votesData, error: votesError } = await supabase
          .from('stakes')
          .select('amount');
          
        if (votesError) throw votesError;
        
        const votes = votesData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
        setTotalVotes(votes);

        // Get total bookmarks with votes
        const { count: bookmarksCount, error: bookmarksError } = await supabase
          .from('stakes')
          .select('bookmark_id', { count: 'exact', head: true })
          .not('amount', 'is', null);
          
        if (bookmarksError) throw bookmarksError;
        
        setTotalBookmarks(bookmarksCount || 0);

        // Get total participants
        const { count: participantsCount, error: participantsError } = await supabase
          .from('stakes')
          .select('user_id', { count: 'exact', head: true })
          .not('amount', 'is', null);
          
        if (participantsError) throw participantsError;
        
        setTotalParticipants(participantsCount || 0);
      } catch (err) {
        console.error('Error fetching weekly stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [weekNumber]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-3 gap-4">
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Week {weekNumber} Statistics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-700 mb-1">Total Votes</h3>
          <p className="text-3xl font-bold text-blue-900">{totalVotes.toLocaleString()}</p>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-purple-700 mb-1">Active Bookmarks</h3>
          <p className="text-3xl font-bold text-purple-900">{totalBookmarks.toLocaleString()}</p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-green-700 mb-1">Participants</h3>
          <p className="text-3xl font-bold text-green-900">{totalParticipants.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}