// components/BettingForm.tsx - Uses only real Overtime Markets data
import React, { useState, useEffect } from 'react';
import { isWalletConnected, getConnectedAccount } from '@/lib/web3';
import { Market, placeBet } from '@/lib/overtimeApi';

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
  
  // Check wallet connection status
  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        const connected = await isWalletConnected();
        setIsConnected(connected);
        
        if (connected) {
          const account = await getConnectedAccount();
          setWalletAddress(account);
        }
      } catch (err) {
        console.error('Error checking wallet connection:', err);
      }
    };
    
    checkWalletConnection();
    
    // Check connection status every 5 seconds
    const intervalId = setInterval(checkWalletConnection, 5000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Reset form when game changes
  useEffect(() => {
    if (game?.gameId) {
      setSelectedTeam(null);
      setBetAmount('');
      setBetResult(null);
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

  // If there's no game data, show a message
  if (!game) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center text-white mb-8">
        <p className="text-xl">No active game available for betting</p>
        <p className="text-gray-400 mt-2">Check back soon for upcoming games!</p>
      </div>
    );
  }
