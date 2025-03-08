// components/LoadingIndicator.tsx
import React from 'react';

interface LoadingIndicatorProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  message = 'Loading...', 
  size = 'medium' 
}) => {
  const sizeClasses = {
    small: 'h-4 w-4 border-2',
    medium: 'h-8 w-8 border-2',
    large: 'h-16 w-16 border-4'
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className={`animate-spin rounded-full ${sizeClasses[size]} border-t-yellow-500 border-b-yellow-500 border-r-transparent border-l-transparent`}></div>
      {message && <p className="mt-3 text-gray-400">{message}</p>}
    </div>
  );
};

export default LoadingIndicator;

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

// components/DefaultBettingValues.ts
export const DEFAULT_ODDS = {
  SOCCER: {
    HOME: 2.2,
    AWAY: 3.1,
    DRAW: 3.5
  },
  BASKETBALL: {
    HOME: 1.9,
    AWAY: 1.9,
    DRAW: 0
  },
  DEFAULT: {
    HOME: 2.0,
    AWAY: 2.0,
    DRAW: 3.0
  }
};

export const formatOdds = (odds: number) => {
  if (odds >= 2) {
    return `+${Math.round((odds - 1) * 100)}`;
  } else {
    return `-${Math.round(100 / (odds - 1))}`;
  }
};

export const formatCurrency = (amount: number, currency: string = 'USDC') => {
  return `${amount.toFixed(2)} ${currency}`;
};
