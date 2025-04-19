import React from 'react';
import { Link } from 'react-router-dom';
import BookmarkDetail from '../components/BookmarkDetail';

const BookmarkDetailPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="py-4 px-6 bg-white shadow mb-6">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Bookmark Details</h1>
          <div className="flex space-x-4">
            <Link
              to="/bookmarks"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              All Bookmarks
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
      
      <BookmarkDetail />
    </div>
  );
};

export default BookmarkDetailPage;