// components/BigGame.tsx - Fixed odds display
import React, { useEffect, useState } from 'react';
import { getBigGame, Market, getCurrentNetworkId } from '@/lib/overtimeApi';

// Chain names mapping
const CHAIN_NAMES: {[key: number]: string} = {
  8453: 'Base',
  10: 'Optimism',
  42161: 'Arbitrum'
};

const BigGame: React.FC = () => {
  const [game, setGame] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [networkId, setNetworkId] = useState<number>(8453); // Default to Base
  
  useEffect(() => {
    const fetchBigGame = async () => {
      try {
        setLoading(true);
        setError(null);
        const bigGame = await getBigGame();
        setGame(bigGame);
        setNetworkId(getCurrentNetworkId());
        
        // Debug log to check the odds values
        if (bigGame) {
          console.log('Game odds debug:', {
            homeOdds: bigGame.homeOdds,
            awayOdds: bigGame.awayOdds,
            oddsArray: bigGame.odds
          });
        }
        
      } catch (err) {
        setError('Failed to load the big game. Please try again later.');
        console.error('Error fetching big game:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBigGame();
    
    // Refresh the game data every 5 minutes
    const intervalId = setInterval(fetchBigGame, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Format the odds to be more readable American format
  const formatOdds = (odds: number | undefined): string => {
    // If odds are not available or invalid, return placeholder
    if (odds === undefined || isNaN(odds)) {
      // Check if we have odds array from the API
      if (game?.odds && game.odds.length > 0) {
        // Try to use the odds from the odds array instead
        return formatAmericanOdds(game.odds[0].american, game.odds[1].american);
      }
      return 'N/A'; // Fallback if no odds are available
    }
    
    // Format regular decimal odds to American format
    if (odds >= 2) {
      return `+${Math.round((odds - 1) * 100)}`;
    } else {
      return `-${Math.round(100 / (odds - 1))}`;
    }
  };
  
  // Format directly from American odds format if available
  const formatAmericanOdds = (homeAmerican: number, awayAmerican: number): string => {
    // This just returns the American odds as they are already in the correct format
    return homeAmerican.toString();
  };
  
  // Format date from timestamp
  const formatGameTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };
  
  // Get network name from ID
  const getNetworkName = (id: number) => {
    return CHAIN_NAMES[id] || `Chain ${id}`;
  };
  
  // Get network color
  const getNetworkColor = (id: number) => {
    switch(id) {
      case 8453: return 'bg-blue-600'; // Base
      case 10: return 'bg-red-600';    // Optimism
      case 42161: return 'bg-indigo-600'; // Arbitrum
      default: return 'bg-gray-600';
    }
  };
  
  // Get odds directly from the odds array
  const getOdds = (position: 'home' | 'away'): string => {
    if (!game) return 'N/A';
    
    // Check if we have the odds array
    if (game.odds && game.odds.length >= 2) {
      // Home is index 0, Away is index 1
      const index = position === 'home' ? 0 : 1;
      const americanOdds = game.odds[index].american;
      
      // Return the formatted American odds
      return americanOdds.toString();
    }
    
    // Fallback to the older format
    const odds = position === 'home' ? game.homeOdds : game.awayOdds;
    return formatOdds(odds);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }
  
  if (error || !game) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center text-white">
        <p className="text-red-400">{error || 'No games available right now. Check back soon!'}</p>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl mb-8 border-2 border-yellow-500 relative">
      {/* "BIG GAME" header with flashing effect */}
      <div className="bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 text-black p-3 text-center relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-full bg-yellow-400 opacity-50 animate-pulse"></div>
        </div>
        <h2 className="text-2xl font-bold relative z-10 animate-bounce">🔥 TODAY'S BIG GAME 🔥</h2>
      </div>
      
      {/* Game details */}
      <div className="p-6 text-white">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Home team */}
          <div className="w-full md:w-2/5 text-center">
            <div className="bg-gray-800 p-4 rounded-lg h-full flex flex-col justify-between">
              <h3 className="text-xl font-bold mb-2">{game.homeTeam}</h3>
              <div className="bg-yellow-500 text-black font-bold text-xl py-2 px-4 rounded-md inline-block animate-pulse">
                {getOdds('home')}
              </div>
            </div>
          </div>
          
          {/* VS section */}
          <div className="flex flex-col items-center">
            <div className="text-yellow-500 font-bold text-xl mb-2">VS</div>
            <div className="text-sm text-gray-400">{formatGameTime(game.maturity)}</div>
            <div className="mt-2 bg-gray-800 px-3 py-1 rounded-full text-xs">
              {game.sport.toUpperCase()}
            </div>
            <div className={`mt-2 ${getNetworkColor(networkId)} px-3 py-1 rounded-full text-xs flex items-center`}>
              {getNetworkName(networkId)} Chain
            </div>
          </div>
          
          {/* Away team */}
          <div className="w-full md:w-2/5 text-center">
            <div className="bg-gray-800 p-4 rounded-lg h-full flex flex-col justify-between">
              <h3 className="text-xl font-bold mb-2">{game.awayTeam}</h3>
              <div className="bg-yellow-500 text-black font-bold text-xl py-2 px-4 rounded-md inline-block animate-pulse">
                {getOdds('away')}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Game info */}
      <div className="bg-gray-800 p-2 text-center text-gray-400 text-sm">
        Game ID: {game.gameId ? game.gameId.slice(0, 16) + '...' : 'N/A'}
      </div>
    </div>
  );
};

export default BigGame;
