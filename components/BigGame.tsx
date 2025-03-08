// components/BigGame.tsx - With correct odds access
import React, { useEffect, useState } from 'react';
import { getBigGame, Market, getCurrentNetworkId } from '@/lib/overtimeApi';

// Chain names mapping
const CHAIN_NAMES: Record<number, string> = {
  8453: 'Base',
  10: 'Optimism',
  42161: 'Arbitrum'
};

// Define an interface for the odds structure in the API
interface OddsData {
  american: number;
  decimal: number;
  normalizedImplied: number;
}

const BigGame: React.FC = () => {
  const [game, setGame] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [networkId, setNetworkId] = useState<number>(8453); // Default to Base
  const [homeOdds, setHomeOdds] = useState<OddsData | null>(null);
  const [awayOdds, setAwayOdds] = useState<OddsData | null>(null);
  
  useEffect(() => {
    const fetchBigGame = async () => {
      try {
        setLoading(true);
        const bigGame = await getBigGame();
        console.log("BigGame component received game data:", bigGame);
        
        setGame(bigGame);
        setNetworkId(getCurrentNetworkId());
        
        // Extract odds from the correct nested structure
        if (bigGame && bigGame.odds && Array.isArray(bigGame.odds) && bigGame.odds.length >= 2) {
          setHomeOdds(bigGame.odds[0]);
          setAwayOdds(bigGame.odds[1]);
          console.log("Home odds:", bigGame.odds[0]);
          console.log("Away odds:", bigGame.odds[1]);
        } else {
          console.warn("Odds data not available in the expected format:", bigGame?.odds);
        }
        
        setError(null);
      } catch (err) {
        setError('Failed to load the big game. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBigGame();
    
    // Refresh the game data every 5 minutes
    const intervalId = setInterval(fetchBigGame, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Format American odds for display
  const formatAmericanOdds = (odds: OddsData | null): string => {
    if (!odds || !odds.american || isNaN(odds.american)) {
      return 'N/A';
    }
    
    const americanOdds = odds.american;
    return americanOdds > 0 ? `+${Math.round(americanOdds)}` : `${Math.round(americanOdds)}`;
  };
  
  // Format date from timestamp
  const formatGameTime = (timestamp: number) => {
    if (!timestamp) return "TBD";
    
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
                {formatAmericanOdds(homeOdds)}
              </div>
            </div>
          </div>
          
          {/* VS section */}
          <div className="flex flex-col items-center">
            <div className="text-yellow-500 font-bold text-xl mb-2">VS</div>
            <div className="text-sm text-gray-400">{formatGameTime(game.maturity)}</div>
            <div className="mt-2 bg-gray-800 px-3 py-1 rounded-full text-xs">
              {game.sport && game.sport.toUpperCase() || "BASKETBALL"}
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
                {formatAmericanOdds(awayOdds)}
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
