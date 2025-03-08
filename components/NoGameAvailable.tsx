// components/NoGameAvailable.tsx
import React from 'react';

interface NoGameAvailableProps {
  message?: string;
}

const NoGameAvailable: React.FC<NoGameAvailableProps> = ({ 
  message = 'No games available right now. Check back soon!' 
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-6 text-center animate-pulse">
      <div className="text-yellow-500 mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <p className="text-xl text-gray-200 font-medium">{message}</p>
      <p className="text-gray-400 mt-2">Come back later for more exciting betting opportunities!</p>
    </div>
  );
};

export default NoGameAvailable;
