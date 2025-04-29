import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../config/supabase';

interface LeaderboardItem {
  id: string;
  title: string;
  author: string;
  cover_image: string;
  total_votes: number;
  rank: number;
  change: number; // Change in rank compared to previous week
}

interface LeaderboardProps {
  timeFrame?: 'current' | 'previous' | 'all-time';
  genre?: string;
  limit?: number;
}

export function Leaderboard({ timeFrame = 'current', genre, limit = 10 }: LeaderboardProps) {
  const [bookmarks, setBookmarks] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weekNumber, setWeekNumber] = useState(0);

  // Get current week number (1-52)
  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    const currentWeek = Math.floor(diff / oneWeek) + 1;
    setWeekNumber(currentWeek);
  }, []);

  // Fetch leaderboard data
  useEffect(() => {
    if (weekNumber === 0) return;

    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        setError('');

        // Determine which week to fetch
        let targetWeek = weekNumber;
        if (timeFrame === 'previous') {
          targetWeek = weekNumber - 1;
        }

        // For now, we'll simulate the leaderboard by querying the stakes table
        // In a real implementation, we would have a dedicated leaderboards table
        let query = supabase
          .from('stakes')
          .select(`
            amount,
            bookmark_id,
            bookmarks (
              id,
              title,
              author,
              cover_image
            )
          `)
          .order('amount', { ascending: false });

        if (genre) {
          query = query.eq('bookmarks.genre', genre);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        // Process the data to create a leaderboard
        const bookmarkMap = new Map<string, { votes: number, bookmark: any }>();
        
        data?.forEach(item => {
          if (!item.bookmark_id || !item.bookmarks) return;
          
          const bookmarkId = item.bookmark_id;
          const votes = item.amount || 0;
          
          if (bookmarkMap.has(bookmarkId)) {
            const existing = bookmarkMap.get(bookmarkId)!;
            bookmarkMap.set(bookmarkId, {
              votes: existing.votes + votes,
              bookmark: existing.bookmark
            });
          } else {
            bookmarkMap.set(bookmarkId, {
              votes,
              bookmark: item.bookmarks
            });
          }
        });

        // Convert to array and sort by votes
        const leaderboardItems: LeaderboardItem[] = Array.from(bookmarkMap.entries())
          .map(([id, { votes, bookmark }], index) => ({
            id,
            title: bookmark.title,
            author: bookmark.author,
            cover_image: bookmark.cover_image,
            total_votes: votes,
            rank: index + 1,
            change: 0 // We would calculate this from previous week's data
          }))
          .slice(0, limit);

        setBookmarks(leaderboardItems);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError('Failed to load leaderboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [weekNumber, timeFrame, genre, limit]);

  const getTimeFrameTitle = () => {
    switch (timeFrame) {
      case 'current':
        return `Week ${weekNumber} Leaderboard`;
      case 'previous':
        return `Week ${weekNumber - 1} Leaderboard`;
      case 'all-time':
        return 'All-Time Leaderboard';
      default:
        return 'Leaderboard';
    }
  };

  return (
    <div className="leaderboard">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">{getTimeFrameTitle()}</h2>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Loading leaderboard...</p>
        </div>
      ) : bookmarks.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Votes</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookmarks.map((bookmark) => (
                <tr key={bookmark.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {bookmark.rank}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {bookmark.cover_image && (
                        <div className="flex-shrink-0 h-10 w-10 mr-4">
                          <img className="h-10 w-10 rounded-sm object-cover" src={bookmark.cover_image} alt={bookmark.title} />
                        </div>
                      )}
                      <div>
                        <Link to={`/bookmark/${bookmark.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                          {bookmark.title}
                        </Link>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {bookmark.author}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {bookmark.total_votes.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {bookmark.change > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        ↑ {bookmark.change}
                      </span>
                    ) : bookmark.change < 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        ↓ {Math.abs(bookmark.change)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        -
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-gray-50 p-6 rounded-lg text-center">
          <p className="text-gray-500">No bookmarks found for this leaderboard.</p>
        </div>
      )}
    </div>
  );
}