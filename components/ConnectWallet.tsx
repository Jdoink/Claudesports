import React, { useState, useEffect } from 'react';
import { connectWallet, disconnectWallet, getConnectedAccount, isWalletConnected } from '@/lib/web3';

const ConnectWallet: React.FC = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Check wallet connection status on component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connected = await isWalletConnected();
        if (connected) {
          const account = await getConnectedAccount();
          setAddress(account);
        }
      } catch (err) {
        console.error('Error checking wallet connection:', err);
      }
    };
    
    checkConnection();
  }, []);
  
  // Handle connect wallet
  const handleConnect = async () => {
    try {
      setLoading(true);
      setError(null);
      const account = await connectWallet();
      setAddress(account);
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError('Failed to connect wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle disconnect wallet
  const handleDisconnect = async () => {
    try {
      setLoading(true);
      setError(null);
      await disconnectWallet();
      setAddress(null);
    } catch (err) {
      console.error('Error disconnecting wallet:', err);
      setError('Failed to disconnect wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Format the address for display (0x1234...5678)
  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="flex items-center justify-center p-4">
      {address ? (
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="bg-gray-800 text-white py-2 px-4 rounded-lg flex items-center">
            <div className="h-2 w-2 rounded-full bg-green-400 mr-2"></div>
            <span>{formatAddress(address)}</span>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50"
          >
            {loading ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={loading}
          className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg transition-colors duration-200 animate-pulse disabled:opacity-50"
        >
          {loading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
      
      {error && (
        <div className="text-red-500 text-sm mt-2">{error}</div>
      )}
    </div>
  );
};

export default ConnectWallet;
