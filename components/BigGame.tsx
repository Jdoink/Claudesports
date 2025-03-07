import React, { useEffect, useState } from 'react';
import { getBigGame, Market } from '@/lib/overtimeApi';

const BigGame: React.FC = () => {
  const [game, setGame] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchBigGame = async () => {
      try {
        setLoading(true);
        const bigGame = await getBigGame();
        setGame(bigGame);
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
  
  // Format the odds to be more readable (e.g., +150, -200)
  const formatOdds = (odds: number) => {
    if (odds >= 2) {
      return `+${Math.round((odds - 1) * 100)}`;
    } else {
      return `-${Math.round(100 / (odds - 1))}`;
    }
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
                {formatOdds(game.homeOdds)}
              </div>
            </div>
          </div>
          
          {/* VS section */}
          <div className="flex flex-col items-center">
            <div className="text-yellow-500 font-bold text-xl mb-2">VS</div>
            <div className="text-sm text-gray-400">{formatGameTime(game.startTime)}</div>
            <div className="mt-2 bg-gray-800 px-3 py-1 rounded-full text-xs">
              {game.sport.toUpperCase()}
            </div>
            <div className="mt-2 bg-blue-600 px-3 py-1 rounded-full text-xs flex items-center">
              <svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
                <path d="M16 0C7.164 0 0 7.164 0 16s7.164 16 16 16 16-7.164 16-16S24.836 0 16 0z" fill="#0052FF"/>
                <path d="M16 6.82c-5.065 0-9.18 4.115-9.18 9.18s4.115 9.18 9.18 9.18 9.18-4.115 9.18-9.18-4.115-9.18-9.18-9.18zm0 15.842c-3.67 0-6.661-2.992-6.661-6.661S12.33 9.339 16 9.339s6.661 2.992 6.661 6.661-2.991 6.661-6.661 6.661z" fill="white"/>
                <path d="M19.254 12.982h-6.508v3.345H19.254v-3.345z" fill="white"/>
              </svg>
              Base Chain
            </div>
          </div>
          
          {/* Away team */}
          <div className="w-full md:w-2/5 text-center">
            <div className="bg-gray-800 p-4 rounded-lg h-full flex flex-col justify-between">
              <h3 className="text-xl font-bold mb-2">{game.awayTeam}</h3>
              <div className="bg-yellow-500 text-black font-bold text-xl py-2 px-4 rounded-md inline-block animate-pulse">
                {formatOdds(game.awayOdds)}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Liquidity indicator */}
      <div className="bg-gray-800 p-2 text-center text-gray-400 text-sm">
        Market Liquidity: ${Math.round(game.liquidity).toLocaleString()} USDC
      </div>
    </div>
  );
};

export default BigGame;
