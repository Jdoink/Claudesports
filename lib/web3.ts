// lib/web3.ts - Complete file with improved network switching
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';

// Add WalletConnect Project ID - We'll use this in environment variables
const WALLET_CONNECT_PROJECT_ID = '71e0d4048c5540358264c232399afa31';

// Define chain information for Base
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

// Define chain information for Base Goerli (testnet)
const BASE_GOERLI = {
  chainId: '0x14a33', // 84531 in hex
  chainName: 'Base Goerli',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['https://goerli.base.org'],
  blockExplorerUrls: ['https://goerli.basescan.org'],
};

// Default to use Base Mainnet
const DEFAULT_CHAIN = BASE_MAINNET;

// App configuration
const APP_NAME = 'DailyBet';
const APP_LOGO_URL = 'https://www.svgrepo.com/show/475623/bet-color.svg';

// Coinbase Wallet singleton instance
let coinbaseWallet: CoinbaseWalletSDK | null = null;
let provider: any = null;

/**
 * Initialize the Coinbase Wallet SDK
 */
export function initCoinbaseWallet(): CoinbaseWalletSDK {
  if (!coinbaseWallet) {
    coinbaseWallet = new CoinbaseWalletSDK({
      appName: APP_NAME,
      appLogoUrl: APP_LOGO_URL,
      darkMode: true,
      overrideIsMetaMask: false,
      // Note: walletConnectProjectId is not used here, as it's not a valid option
    });
  }
  return coinbaseWallet;
}

/**
 * Get the Ethereum provider from Coinbase Wallet
 */
export function getProvider(): any {
  if (!provider) {
    const wallet = initCoinbaseWallet();
    provider = wallet.makeWeb3Provider(DEFAULT_CHAIN.rpcUrls[0], parseInt(DEFAULT_CHAIN.chainId, 16));
  }
  return provider;
}

/**
 * Connect to Coinbase Wallet
 * @returns Promise<string> Connected wallet address
 */
export async function connectWallet(): Promise<string> {
  try {
    const ethProvider = getProvider();
    const accounts = await ethProvider.request({ method: 'eth_requestAccounts' });
    
    // Switch to Base chain if not already on it
    await switchToBaseChain();
    
    return accounts[0];
  } catch (error) {
    console.error('Error connecting wallet:', error);
    throw error;
  }
}

/**
 * Disconnect from Coinbase Wallet
 */
export async function disconnectWallet(): Promise<void> {
  if (provider) {
    try {
      await provider.close();
      provider = null;
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
    return accounts.length > 0;
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
    return accounts[0] || null;
  } catch (error) {
    console.error('Error getting connected account:', error);
    return null;
  }
}

/**
 * Get current chain ID
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
 * Switch to Base chain
 * @returns Promise<boolean> True if successful
 */
export async function switchToBaseChain(): Promise<boolean> {
  try {
    const ethProvider = getProvider();
    const currentChainId = await getChainId();
    
    // If already on Base, no need to switch
    if (currentChainId === DEFAULT_CHAIN.chainId) {
      return true;
    }
    
    // Try to switch to Base
    try {
      await ethProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: DEFAULT_CHAIN.chainId }],
      });
      
      // Verify the switch was successful
      const newChainId = await getChainId();
      return newChainId === DEFAULT_CHAIN.chainId;
      
    } catch (switchError: any) {
      // This error code indicates that the chain hasn't been added to the wallet
      if (switchError.code === 4902) {
        await ethProvider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: DEFAULT_CHAIN.chainId,
              chainName: DEFAULT_CHAIN.chainName,
              nativeCurrency: DEFAULT_CHAIN.nativeCurrency,
              rpcUrls: DEFAULT_CHAIN.rpcUrls,
              blockExplorerUrls: DEFAULT_CHAIN.blockExplorerUrls,
            },
          ],
        });
        
        // Check again after adding
        const newChainId = await getChainId();
        return newChainId === DEFAULT_CHAIN.chainId;
      } else {
        throw switchError;
      }
    }
  } catch (error) {
    console.error('Error switching to Base chain:', error);
    throw error;
  }
}
