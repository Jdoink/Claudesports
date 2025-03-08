// components/ErrorHandler.tsx
import React from 'react';

interface ErrorHandlerProps {
  errorMessage: string | null;
  retryAction?: () => void;
}

const ErrorHandler: React.FC<ErrorHandlerProps> = ({ errorMessage, retryAction }) => {
  if (!errorMessage) return null;

  return (
    <div className="bg-red-900 text-white p-4 rounded-lg mb-4 shadow-lg animate-pulse">
      <div className="flex items-start">
        <div className="text-red-500 mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-medium">Error</p>
          <p className="text-sm text-red-200 mt-1">{errorMessage}</p>
          
          {retryAction && (
            <button 
              onClick={retryAction}
              className="mt-3 bg-red-700 hover:bg-red-800 text-white text-sm py-1 px-3 rounded transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorHandler;
