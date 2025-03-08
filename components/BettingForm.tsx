// components/BettingForm.tsx - With correct odds access
import React, { useState, useEffect } from 'react';
import { isWalletConnected, getConnectedAccount } from '@/lib/web3';
import { Market, placeBet } from '@/lib/overtimeApi';

// Define an interface for the odds structure in the API
interface OddsData {
  american: number;
  decimal: number;
  normalizedImplied: number;
}

interface BettingFormProps {
  game: Market | null;
}

const BettingForm: React.FC<BettingFormProps> = ({ game }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'away' | null>(null);
  const [betAmount, setBetAmount] = useState<string>('');
  const [isPlacingBet, setIsPlacingBet] = useState<boolean>(false);
  const [betResult, setBetResult] = useState<{ success: boolean; message: string; txHash?: string } | null>(null);
  const [homeOdds, setHomeOdds] = useState<OddsData | null>(null);
  const [awayOdds, setAwayOdds] = useState<OddsData | null>(null);
  
  // Check wallet connection status
  useEffect(() => {
    const checkWalletConnection = async () => {
      const connected = await isWalletConnected();
      setIsConnected(connected);
      
      if (connected) {
        const account = await getConnectedAccount();
        setWalletAddress(account);
      }
    };
    
    checkWalletConnection();
    
    // Check connection status every 5 seconds
    const intervalId = setInterval(checkWalletConnection, 5000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Update odds when game changes
  useEffect(() => {
    if (game?.gameId) {
      // Reset form
      setSelectedTeam(null);
      setBetAmount('');
      setBetResult(null);
      
      // Extract odds from the correct nested structure
      if (game.odds && Array.isArray(game.odds) && game.odds.length >= 2) {
        setHomeOdds(game.odds[0]);
        setAwayOdds(game.odds[1]);
        console.log("Betting form - Home odds:", game.odds[0]);
        console.log("Betting form - Away odds:", game.odds[1]);
      } else {
        console.warn("Odds data not available in the expected format:", game?.odds);
        setHomeOdds(null);
        setAwayOdds(null);
      }
    }
  }, [game?.gameId]);

  // Predefined bet amounts
  const predefinedAmounts = [10, 50, 100, 500];

  const handleTeamSelect = (team: 'home' | 'away') => {
    setSelectedTeam(team);
    setBetResult(null);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numeric input with up to 2 decimal places
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setBetAmount(value);
    }
  };

  const handlePredefinedAmount = (amount: number) => {
    setBetAmount(amount.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!game || !selectedTeam || !betAmount || parseFloat(betAmount) <= 0) {
      setBetResult({
        success: false,
        message: 'Please select a team and enter a valid bet amount.'
      });
      return;
    }
    
    try {
      setIsPlacingBet(true);
      setBetResult(null);
      
      // Get provider from Coinbase Wallet
      const { getProvider } = await import('@/lib/web3');
      const provider = getProvider();
      
      // Team index: 0 for home team, 1 for away team
      const teamIndex = selectedTeam === 'home' ? 0 : 1;
      
      console.log('Placing bet:', {
        market: game,
        amount: betAmount,
        position: teamIndex
      });
      
      // Call the placeBet function with the actual provider
      const result = await placeBet(
        game, // Pass the entire game/market object
        betAmount,
        teamIndex,
        provider
      );
      
      setBetResult(result);
      
      // Clear bet amount on success
      if (result.success) {
        setBetAmount('');
        setSelectedTeam(null);
      }
    } catch (error) {
      console.error('Error placing bet:', error);
      setBetResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsPlacingBet(false);
    }
  };

  if (!game) {
    return null;
  }

  // If wallet is not connected, show connect wallet message
  if (!isConnected) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center text-white mb-8">
        <p className="text-xl">Connect your wallet to place bets</p>
        <p className="text-gray-400 mt-2">You'll need to connect your wallet to place bets on the Big Game</p>
      </div>
    );
  }

  // Format American odds for display
  const formatAmericanOdds = (odds: OddsData | null): string => {
    if (!odds || !odds.american || isNaN(odds.american)) {
      return 'N/A';
    }
    
    const americanOdds = odds.american;
    return americanOdds > 0 ? `+${Math.round(americanOdds)}` : `${Math.round(americanOdds)}`;
  };

  // Calculate potential winnings using the decimal odds from the nested structure
  const calculateWinnings = () => {
    if (!selectedTeam || !betAmount || parseFloat(betAmount) <= 0) {
      return 0;
    }
    
    const odds = selectedTeam === 'home' ? homeOdds : awayOdds;
    if (!odds || !odds.decimal || isNaN(odds.decimal) || odds.decimal <= 0) {
      return 0;
    }
    
    // Use the decimal odds to calculate winnings
    return parseFloat(betAmount) * odds.decimal;
  };

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl mb-8 border-2 border-yellow-500">
      <div className="bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-600 text-white p-3 text-center">
        <h2 className="text-2xl font-bold">Place Your Bet</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 text-white">
        {/* Team Selection */}
        <div className="mb-6">
          <label className="block text-gray-400 mb-2 text-sm font-medium">Select your team</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              className={`p-4 rounded-lg border-2 ${
                selectedTeam === 'home'
                  ? 'border-yellow-500 bg-gray-800'
                  : 'border-gray-700 bg-gray-900 hover:border-gray-500'
              }`}
              onClick={() => handleTeamSelect('home')}
            >
              <div className="font-bold mb-1">{game.homeTeam}</div>
              <div className="text-yellow-500 font-medium">
                {formatAmericanOdds(homeOdds)}
              </div>
            </button>
            
            <button
              type="button"
              className={`p-4 rounded-lg border-2 ${
                selectedTeam === 'away'
                  ? 'border-yellow-500 bg-gray-800'
                  : 'border-gray-700 bg-gray-900 hover:border-gray-500'
              }`}
              onClick={() => handleTeamSelect('away')}
            >
              <div className="font-bold mb-1">{game.awayTeam}</div>
              <div className="text-yellow-500 font-medium">
                {formatAmericanOdds(awayOdds)}
              </div>
            </button>
          </div>
        </div>
        
        {/* Bet Amount */}
        <div className="mb-6">
          <label htmlFor="betAmount" className="block text-gray-400 mb-2 text-sm font-medium">
            Bet amount (USDC)
          </label>
          <input
            type="text"
            id="betAmount"
            value={betAmount}
            onChange={handleAmountChange}
            className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-900 text-xl"
            placeholder="0.00"
          />
          
          {/* Predefined Amounts */}
          <div className="flex flex-wrap gap-2 mt-3">
            {predefinedAmounts.map(amount => (
              <button
                key={amount}
                type="button"
                onClick={() => handlePredefinedAmount(amount)}
                className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded-md text-sm"
              >
                ${amount}
              </button>
            ))}
          </div>
        </div>
        
        {/* Potential Winnings */}
        {selectedTeam && betAmount && parseFloat(betAmount) > 0 && (
          <div className="mb-6 p-3 bg-gray-800 rounded-lg">
            <p className="text-gray-400 text-sm">Potential Winnings:</p>
            <p className="text-xl font-medium text-green-400">
              ${calculateWinnings().toFixed(2)} USDC
            </p>
          </div>
        )}
        
        {/* Submit Button */}
        <button
          type="submit"
          disabled={!selectedTeam || !betAmount || parseFloat(betAmount) <= 0 || isPlacingBet}
          className={`w-full py-3 px-4 rounded-lg font-bold text-lg ${
            !selectedTeam || !betAmount || parseFloat(betAmount) <= 0 || isPlacingBet
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black hover:from-yellow-600 hover:to-yellow-700 animate-pulse'
          }`}
        >
          {isPlacingBet ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black mr-2"></div>
              Processing...
            </div>
          ) : (
            'Place Bet'
          )}
        </button>
        
        {/* Bet Result Message */}
        {betResult && (
          <div className={`mt-4 p-3 rounded-lg ${
            betResult.success ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
          }`}>
            {betResult.message}
            {betResult.txHash && betResult.txHash !== "0x" + "0".repeat(64) && (
              <div className="mt-2">
                <a 
                  href={`https://basescan.org/tx/${betResult.txHash}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-300 underline"
                >
                  View transaction on BaseScan
                </a>
              </div>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-6 text-xs text-gray-500 text-center">
          By placing a bet, you acknowledge that you are familiar with the risks involved 
          and agree to the terms of service. Bet responsibly.
        </div>
      </form>
    </div>
  );
};

export default BettingForm;
