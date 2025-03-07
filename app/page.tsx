'use client';

import React, { useState, useEffect } from 'react';
import ConnectWallet from '@/components/ConnectWallet';
import BigGame from '@/components/BigGame';
import BettingForm from '@/components/BettingForm';
import { getBigGame, Market } from '@/lib/overtimeApi';

export default function Home() {
  const [game, setGame] = useState<Market | null>(null);
  
  useEffect(() => {
    const fetchGame = async () => {
      const bigGame = await getBigGame();
      setGame(bigGame);
    };
    
    fetchGame();
  }, []);

  return (
      <main className="min-h-screen bg-gray-950 text-white">
        {/* Background Effects */}
        <div className="fixed inset-0 overflow-hidden z-0">
          <div className="absolute w-full h-full bg-[url('/assets/noise.png')] opacity-5"></div>
          <div className="absolute top-0 left-0 w-64 h-64 bg-purple-700 rounded-full filter blur-3xl opacity-10 -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-yellow-700 rounded-full filter blur-3xl opacity-10 translate-x-1/2 translate-y-1/2"></div>
        </div>
        
        {/* Header */}
        <header className="relative z-10 py-4 border-b border-gray-800 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between">
              <div className="text-yellow-500 font-bold text-2xl">DailyBet</div>
              <ConnectWallet />
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <div className="container mx-auto px-4 py-8 relative z-10">
          {/* Casino-style flashing header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 animate-pulse">
              DAILY SPORTS BETS
            </h1>
            <p className="mt-2 text-gray-400">
              Place your bets on today's biggest game with the highest liquidity
            </p>
          </div>
          
          {/* Game and Betting Section */}
          <div className="max-w-4xl mx-auto">
            <BigGame />
            <BettingForm game={game} />
          </div>
          
          {/* Footer */}
          <footer className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
            <p>Powered by Overtime Markets & Thales Protocol</p>
            <p className="mt-2">© {new Date().getFullYear()} DailyBet - All rights reserved</p>
          </footer>
        </div>
      </main>
