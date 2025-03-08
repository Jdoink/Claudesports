// lib/overtimeApi.ts - Multi-chain support
// Types for Overtime/Thales markets
export interface Market {
  address: string;
  gameId: string;
  sport: string;
  category?: string;
  subcategory?: string;
  homeTeam: string;
  awayTeam: string;
  maturityDate: number;
  tags?: string[];
  homeOdds: number;
  awayOdds: number;
  drawOdds?: number;
  homeScore?: number;
  awayScore?: number;
  isPaused: boolean;
  isCanceled: boolean;
  isResolved: boolean;
  finalResult?: number;
  homeOddsWithBias?: number;
  awayOddsWithBias?: number;
  drawOddsWithBias?: number;
  liquidity?: number;
  networkId: number;
}

// API endpoints for Overtime Markets
const OVERTIME_API_V2 = 'https://api.overtimemarkets.xyz/v2';

// Chain IDs for supported networks
const CHAIN_IDS = {
  BASE: 8453,
  OPTIMISM: 10,
  ARBITRUM: 42161
};

// Chain names for display
const CHAIN_NAMES = {
  [CHAIN_IDS.BASE]: 'Base',
  [CHAIN_IDS.OPTIMISM]: 'Optimism',
  [CHAIN_IDS.ARBITRUM]: 'Arbitrum'
};

// Contract addresses for each network
const CONTRACT_ADDRESSES = {
  // Base Mainnet
  [CHAIN_IDS.BASE]: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    OVERTIME_AMM: '0x80903Aa4d358542652c8D4B33cd942EA1Bf8fd41', 
    SPORT_MARKETS_MANAGER: '0x3Ed830e92eFfE68C0d1216B2b5115B1bceBB087C',
  },
  // Optimism Mainnet
  [CHAIN_IDS.OPTIMISM]: {
    USDC: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
    OVERTIME_AMM: '0xad41C77d99E282267C1492cdEFe528D7d5044253',
    SPORT_MARKETS_MANAGER: '0x8606926e4c3Cfb9d4B6742A62e1923854F4026dc',
  },
  // Arbitrum Mainnet
  [CHAIN_IDS.ARBITRUM]: {
    USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    OVERTIME_AMM: '0x82872A82E70081D42f5c2610259324Bb463B2bC2',
    SPORT_MARKETS_MANAGER: '0xb3E8C659CF95BeA8c81d8D06407C5c7A2D75B1BC',
  }
};

// Cache for markets data with timestamp
let marketsCache: {
  timestamp: number;
  markets: Market[];
  networkId: number;
} = {
  timestamp: 0,
  markets: [],
  networkId: CHAIN_IDS.BASE // Default to Base
};

// Cache expiration in milliseconds (15 minutes)
const CACHE_EXPIRATION = 15 * 60 * 1000;

/**
 * Fetches markets from a specific network
 * @param networkId The chain ID to fetch markets from
 * @returns Promise<Market[]> List of markets
 */
async function fetchMarketsForNetwork(networkId: number): Promise<Market[]> {
  try {
    console.log(`Fetching markets for network ${networkId} (${CHAIN_NAMES[networkId] || 'Unknown'})`);
    
    const apiUrl = `${OVERTIME_API_V2}/markets?networkId=${networkId}&isOpen=true`;
    console.log(`API URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.error(`API returned status ${response.status} for network ${networkId}`);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.markets || !Array.isArray(data.markets)) {
      console.error(`Invalid API response format for network ${networkId}`);
      return [];
    }
    
    console.log(`Found ${data.markets.length} markets on ${CHAIN_NAMES[networkId] || 'Unknown'}`);
    return data.markets;
  } catch (error) {
    console.error(`Error fetching markets for network ${networkId}:`, error);
    return [];
  }
}

/**
 * Fetches markets from multiple networks, prioritizing in order
 * @returns Promise<{ markets: Market[], networkId: number }> Markets and the network they came from
 */
async function fetchMarketsFromAllNetworks(): Promise<{ markets: Market[], networkId: number }> {
  // Priority order: Base, Optimism, Arbitrum
  const networks = [CHAIN_IDS.BASE, CHAIN_IDS.OPTIMISM, CHAIN_IDS.ARBITRUM];
  
  for (const networkId of networks) {
    const markets = await fetchMarketsForNetwork(networkId);
    
    if (markets.length > 0) {
      console.log(`Using markets from ${CHAIN_NAMES[networkId]}`);
      return { markets, networkId };
    }
  }
  
  // No markets found on any network
  console.log('No markets found on any network');
  return { markets: [], networkId: CHAIN_IDS.BASE };
}

/**
 * Fetches all active markets, trying multiple networks if needed
 * @returns Promise<Market[]> List of active markets
 */
export async function getActiveMarkets(): Promise<Market[]> {
  try {
    const now = Date.now();
    
    // Check if cache is valid
    if (
      marketsCache.markets.length > 0 && 
      now - marketsCache.timestamp < CACHE_EXPIRATION
    ) {
      console.log(`Using cached markets from ${CHAIN_NAMES[marketsCache.networkId]}`);
      return marketsCache.markets;
    }
    
    console.log("Cache expired or empty, fetching fresh data");
    
    // Fetch fresh data from multiple networks
    const { markets, networkId } = await fetchMarketsFromAllNetworks();
    
    // Update cache
    marketsCache = {
      timestamp: now,
      markets,
      networkId
    };
    
    return markets;
  } catch (error) {
    console.error('Failed to fetch markets:', error);
    return marketsCache.markets; // Return cached data even if expired
  }
}

/**
 * Gets the market with the highest liquidity (the "Big Game")
 * @returns Promise<Market | null> The market with highest liquidity or null
 */
export async function getBigGame(): Promise<Market | null> {
  try {
    const markets = await getActiveMarkets();
    
    if (markets.length === 0) {
      console.log('No markets available');
      return null;
    }
    
    // Sort by liquidity (highest first)
    const sortedMarkets = [...markets].sort((a, b) => {
      const liquidityA = a.liquidity || 0;
      const liquidityB = b.liquidity || 0;
      return liquidityB - liquidityA;
    });
    
    const topMarket = sortedMarkets[0];
    console.log('Selected top market:', topMarket);
    
    return topMarket;
  } catch (error) {
    console.error('Failed to get the big game:', error);
    return null;
  }
}

/**
 * Place a bet on a market
 * @param marketAddress The address of the market contract
 * @param amount The amount to bet in USDC
 * @param teamIndex 0 for home team, 1 for away team
 * @param provider The Ethereum provider from Coinbase Wallet
 */
export async function placeBet(
  marketAddress: string,
  amount: string,
  teamIndex: number,
  provider: any
): Promise<{ success: boolean; message: string; txHash?: string }> {
  try {
    if (!provider) {
      throw new Error("Wallet not connected");
    }
    
    // Import necessary libraries
    const { ethers } = await import('ethers');
    
    // Define ERC20 (USDC) ABI - minimal version for what we need
    const ERC20_ABI = [
      "function balanceOf(address owner) view returns (uint256)",
      "function approve(address spender, uint256 amount) returns (bool)",
      "function allowance(address owner, address spender) view returns (uint256)"
    ];
    
    // Define Overtime Markets AMM ABI - minimal version for placing bets
    const OVERTIME_AMM_ABI = [
      "function buyFromAMMWithDifferentCollateralAndReferrer(address market, uint8 position, uint256 amount, uint256 expectedPayout, address collateral, address referrer) returns (uint256)"
    ];
    
    // Convert provider to ethers provider
    const ethersProvider = new ethers.BrowserProvider(provider);
    const signer = await ethersProvider.getSigner();
    const userAddress = await signer.getAddress();
    
    // Get chain ID
    const chainIdHex = await provider.request({ method: 'eth_chainId' });
    const chainId = parseInt(chainIdHex, 16);
    
    // Get network name for better error messages
    const networkName = CHAIN_NAMES[chainId] || `Chain ID ${chainId}`;
    
    // Check if the chain is supported
    if (!CONTRACT_ADDRESSES[chainId]) {
      throw new Error(`Unsupported chain: ${networkName}. Please switch to ${CHAIN_NAMES[marketsCache.networkId]}.`);
    }
    
    // If the user is on a different chain than the market
    if (chainId !== marketsCache.networkId) {
      throw new Error(`You are connected to ${networkName}, but the market is on ${CHAIN_NAMES[marketsCache.networkId]}. Please switch networks.`);
    }
    
    // Create contract instances
    const contractAddresses = CONTRACT_ADDRESSES[chainId];
    const usdcContract = new ethers.Contract(contractAddresses.USDC, ERC20_ABI, signer);
    const overtimeAMMContract = new ethers.Contract(contractAddresses.OVERTIME_AMM, OVERTIME_AMM_ABI, signer);
    
    // Convert amount to USDC units (USDC has 6 decimals)
    const amountInWei = ethers.parseUnits(amount, 6);
    
    // Check USDC balance
    const usdcBalance = await usdcContract.balanceOf(userAddress);
    if (usdcBalance < amountInWei) {
      throw new Error(`Insufficient USDC balance. You have ${ethers.formatUnits(usdcBalance, 6)} USDC but need ${amount} USDC.`);
    }
    
    // Check if the AMM has approval to spend USDC
    const allowance = await usdcContract.allowance(userAddress, contractAddresses.OVERTIME_AMM);
    if (allowance < amountInWei) {
      console.log("Approving USDC spending...");
      const approveTx = await usdcContract.approve(contractAddresses.OVERTIME_AMM, ethers.MaxUint256);
      const approveReceipt = await approveTx.wait();
      console.log("USDC approved for spending", approveReceipt);
    }
    
    // Use a simple minimum expected payout (could be improved with actual calculations)
    const expectedPayout = amountInWei;
    
    // Execute the bet
    console.log(`Placing bet of ${amount} USDC on position ${teamIndex} for market ${marketAddress}`);
    const betTx = await overtimeAMMContract.buyFromAMMWithDifferentCollateralAndReferrer(
      marketAddress,
      teamIndex,
      amountInWei,
      expectedPayout,
      contractAddresses.USDC,
      ethers.ZeroAddress // No referrer
    );
    
    // Wait for transaction confirmation
    const receipt = await betTx.wait();
    
    return {
      success: true,
      message: "Bet placed successfully!",
      txHash: receipt.hash
    };
  } catch (error) {
    console.error('Failed to place bet:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Get the current network ID being used
 * @returns The network ID (chain ID) being used for markets
 */
export function getCurrentNetworkId(): number {
  return marketsCache.networkId;
}
