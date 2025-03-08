// lib/web3.ts - Fixed wallet connection issues
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';

// Default to use Base Mainnet
const BASE_MAINNET = {
  chainId: '0x2105', // 8453 in hex
  chainName: 'Base Mainnet',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['https://mainnet.base.org'],
  blockExplorerUrls: ['https://basescan.org'],
};

// App configuration
const APP_NAME = 'DailyBet';
const APP_LOGO_URL = 'https://www.svgrepo.com/show/475623/bet-color.svg';
const DEFAULT_RPC_URL = 'https://mainnet.base.org';

// Coinbase Wallet singleton instance
let coinbaseWallet: CoinbaseWalletSDK | null = null;
let provider: any = null;

/**
 * Initialize the Coinbase Wallet SDK with error handling
 */
export function initCoinbaseWallet(): CoinbaseWalletSDK {
  try {
    if (!coinbaseWallet) {
      console.log("Initializing Coinbase Wallet SDK...");
      coinbaseWallet = new CoinbaseWalletSDK({
        appName: APP_NAME,
        appLogoUrl: APP_LOGO_URL,
        darkMode: true
      });
    }
    return coinbaseWallet;
  } catch (error) {
    console.error("Error initializing Coinbase Wallet:", error);
    throw new Error("Failed to initialize wallet. Please refresh and try again.");
  }
}

/**
 * Get the Ethereum provider from Coinbase Wallet
 */
export function getProvider(): any {
  try {
    if (!provider) {
      const wallet = initCoinbaseWallet();
      provider = wallet.makeWeb3Provider(DEFAULT_RPC_URL, 8453);
    }
    return provider;
  } catch (error) {
    console.error("Error getting provider:", error);
    throw new Error("Failed to connect to blockchain. Please refresh and try again.");
  }
}

/**
 * Connect to Coinbase Wallet with improved error handling
 * @returns Promise<string> Connected wallet address
 */
export async function connectWallet(): Promise<string> {
  try {
    console.log("Connecting to wallet...");
    const ethProvider = getProvider();
    
    // Request accounts with timeout
    const accountsPromise = ethProvider.request({ method: 'eth_requestAccounts' });
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Connection request timed out")), 30000)
    );
    
    const accounts = await Promise.race([accountsPromise, timeoutPromise]);
    console.log("Connected accounts:", accounts);
    
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts returned");
    }
    
    // Switch to Base chain if not already on it
    await switchToBaseChain();
    
    return accounts[0];
  } catch (error: any) {
    console.error('Error connecting wallet:', error);
    // Handle specific errors
    if (error.message && error.message.includes("User rejected")) {
      throw new Error("Connection rejected. Please try again.");
    } else if (error.message && error.message.includes("already pending")) {
      throw new Error("Connection request already pending. Please check your wallet.");
    } else {
      throw new Error(`Failed to connect wallet: ${error.message || "Unknown error"}`);
    }
  }
}

/**
 * Disconnect from Coinbase Wallet
 */
export async function disconnectWallet(): Promise<void> {
  if (provider) {
    try {
      // For Coinbase Wallet SDK, we can't actually call close()
      // Instead, we null out our references
      provider = null;
      console.log("Wallet disconnected");
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  }
}

/**
 * Check if wallet is connected
 * @returns Promise<boolean>
 */
export async function isWalletConnected(): Promise<boolean> {
  try {
    const ethProvider = getProvider();
    const accounts = await ethProvider.request({ method: 'eth_accounts' });
    return accounts && accounts.length > 0;
  } catch (error) {
    console.error('Error checking wallet connection:', error);
    return false;
  }
}

/**
 * Get connected wallet address
 * @returns Promise<string | null>
 */
export async function getConnectedAccount(): Promise<string | null> {
  try {
    const ethProvider = getProvider();
    const accounts = await ethProvider.request({ method: 'eth_accounts' });
    return accounts && accounts.length > 0 ? accounts[0] : null;
  } catch (error) {
    console.error('Error getting connected account:', error);
    return null;
  }
}

/**
 * Get current chain ID with better error handling
 * @returns Promise<string>
 */
export async function getChainId(): Promise<string> {
  try {
    const ethProvider = getProvider();
    return await ethProvider.request({ method: 'eth_chainId' });
  } catch (error) {
    console.error('Error getting chain ID:', error);
    return '';
  }
}

/**
 * Switch to Base chain with improved error handling
 */
export async function switchToBaseChain(): Promise<void> {
  try {
    console.log("Attempting to switch to Base chain...");
    const ethProvider = getProvider();
    const currentChainId = await getChainId();
    
    // If already on Base, no need to switch
    if (currentChainId === BASE_MAINNET.chainId) {
      console.log("Already on Base chain");
      return;
    }
    
    try {
      // Try to switch to Base
      console.log("Requesting chain switch to Base...");
      await ethProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_MAINNET.chainId }],
      });
      console.log("Successfully switched to Base chain");
    } catch (switchError: any) {
      console.error("Error switching chains:", switchError);
      
      // If the chain hasn't been added to the wallet, add it
      if (switchError.code === 4902) {
        console.log("Base chain not found, adding it...");
        await ethProvider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: BASE_MAINNET.chainId,
              chainName: BASE_MAINNET.chainName,
              nativeCurrency: BASE_MAINNET.nativeCurrency,
              rpcUrls: BASE_MAINNET.rpcUrls,
              blockExplorerUrls: BASE_MAINNET.blockExplorerUrls,
            },
          ],
        });
        console.log("Base chain added successfully");
      } else {
        throw switchError;
      }
    }
  } catch (error: any) {
    console.error('Error switching to Base chain:', error);
    throw new Error(`Failed to switch to Base network: ${error.message || "Unknown error"}`);
  }
}
