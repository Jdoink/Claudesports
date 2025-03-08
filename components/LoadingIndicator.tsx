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
