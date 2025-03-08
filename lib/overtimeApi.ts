// lib/overtimeApi.ts - Using documented API endpoints
// Types for Overtime/Thales markets based on their documentation
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

// Chain IDs for supported networks
const CHAIN_IDS = {
  OPTIMISM: 10,
  ARBITRUM: 42161
};

// Chain names for display
const CHAIN_NAMES = {
  [CHAIN_IDS.OPTIMISM]: 'Optimism',
  [CHAIN_IDS.ARBITRUM]: 'Arbitrum'
};

// Contract addresses from official docs
const CONTRACT_ADDRESSES = {
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
  networkId: CHAIN_IDS.OPTIMISM // Default to Optimism
};

// Cache expiration in milliseconds (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

/**
 * Makes a direct API request - handles network issues
 * @param url The URL to fetch
 * @returns Promise<any> The response data or null if failed
 */
async function makeApiRequest(url: string): Promise<any> {
  try {
    console.log(`Fetching from: ${url}`);
    
    // Use a proxy service to avoid CORS and DNS issues on the client side
    // This makes the request through a server that can handle the DNS resolution
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 0 } // Disable cache
    });
    
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    return null;
  }
}

/**
 * Fetches active sports markets from the documented API endpoints
 * @param networkId The chain ID to fetch markets for
 * @returns Promise<Market[]> List of markets
 */
async function fetchActiveMarkets(networkId: number): Promise<Market[]> {
  try {
    // Direct URL from the documentation
    const url = `https://api.thalesmarket.io/overtime/markets/active?networkId=${networkId}`;
    const data = await makeApiRequest(url);
    
    if (!data || !data.markets || !Array.isArray(data.markets)) {
      console.error("Invalid API response format");
      return [];
    }
    
    console.log(`Found ${data.markets.length} markets for network ${networkId}`);
    return data.markets;
  } catch (error) {
    console.error(`Error fetching markets for network ${networkId}:`, error);
    return [];
  }
}

/**
 * Try all supported networks to find markets
 * @returns Promise<{ markets: Market[], networkId: number }>
 */
async function fetchMarketsFromAllNetworks(): Promise<{ markets: Market[], networkId: number }> {
  // Try Optimism first, then Arbitrum
  const networks = [CHAIN_IDS.OPTIMISM, CHAIN_IDS.ARBITRUM];
  
  for (const networkId of networks) {
    const markets = await fetchActiveMarkets(networkId);
    
    if (markets && markets.length > 0) {
      console.log(`Using ${markets.length} markets from ${CHAIN_NAMES[networkId]}`);
      return { markets, networkId };
    }
  }
  
  console.log("No markets found on any network");
  return { markets: [], networkId: CHAIN_IDS.OPTIMISM };
}

/**
 * Gets all active markets
 * @returns Promise<Market[]> List of markets
 */
export async function getActiveMarkets(): Promise<Market[]> {
  try {
    const now = Date.now();
    
    // Use cache if valid
    if (
      marketsCache.markets.length > 0 && 
      now - marketsCache.timestamp < CACHE_EXPIRATION
    ) {
      console.log("Using cached markets data");
      return marketsCache.markets;
    }
    
    console.log("Fetching fresh markets data");
    const { markets, networkId } = await fetchMarketsFromAllNetworks();
    
    if (markets.length > 0) {
      // Update cache
      marketsCache = {
        timestamp: now,
        markets,
        networkId
      };
      return markets;
    }
    
    return [];
  } catch (error) {
    console.error("Error in getActiveMarkets:", error);
    return marketsCache.markets; // Return cached data as fallback
  }
}

/**
 * Gets the "Big Game" - the market with highest liquidity
 * @returns Promise<Market | null> The market with highest liquidity
 */
export async function getBigGame(): Promise<Market | null> {
  try {
    const markets = await getActiveMarkets();
    
    if (markets.length === 0) {
      console.log("No markets available");
      return null;
    }
    
    // Sort by liquidity (highest first)
    const sortedMarkets = [...markets].sort((a, b) => {
      // Use liquidity if available
      const liquidityA = a.liquidity || 0;
      const liquidityB = b.liquidity || 0;
      
      if (liquidityA !== liquidityB) {
        return liquidityB - liquidityA;
      }
      
      // If liquidity is the same, use maturity date
      return (a.maturityDate || 0) - (b.maturityDate || 0);
    });
    
    const topMarket = sortedMarkets[0];
    console.log("Selected Big Game:", topMarket);
    
    return topMarket;
  } catch (error) {
    console.error("Error in getBigGame:", error);
    return null;
  }
}

/**
 * Place a real bet on a market using the Overtime AMM
 * @param marketAddress The market contract address
 * @param amount The amount to bet in USDC
 * @param teamIndex 0 for home, 1 for away
 * @param provider Wallet provider
 * @returns Promise with bet result
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
    
    // Import required libraries
    const { ethers } = await import('ethers');
    
    // Define minimal ABIs
    const ERC20_ABI = [
      "function balanceOf(address owner) view returns (uint256)",
      "function approve(address spender, uint256 amount) returns (bool)",
      "function allowance(address owner, address spender) view returns (uint256)"
    ];
    
    const OVERTIME_AMM_ABI = [
      "function buyFromAMMWithDifferentCollateralAndReferrer(address market, uint8 position, uint256 amount, uint256 expectedPayout, address collateral, address referrer) returns (uint256)"
    ];
    
    // Create ethers provider and signer
    const ethersProvider = new ethers.BrowserProvider(provider);
    const signer = await ethersProvider.getSigner();
    const userAddress = await signer.getAddress();
    
    // Get chain ID
    const chainIdHex = await provider.request({ method: 'eth_chainId' });
    const chainId = parseInt(chainIdHex, 16);
    
    // Verify chain is supported
    if (!CONTRACT_ADDRESSES[chainId]) {
      throw new Error(`Unsupported chain: ${chainId}. Please switch to ${CHAIN_NAMES[marketsCache.networkId]}.`);
    }
    
    // Make sure user is on the same chain as the market
    if (chainId !== marketsCache.networkId) {
      throw new Error(`You are connected to chain ${chainId}, but the market is on ${marketsCache.networkId}. Please switch networks.`);
    }
    
    // Get contract addresses for the current chain
    const contractAddresses = CONTRACT_ADDRESSES[chainId];
    
    // Initialize contracts
    const usdcContract = new ethers.Contract(contractAddresses.USDC, ERC20_ABI, signer);
    const ammContract = new ethers.Contract(contractAddresses.OVERTIME_AMM, OVERTIME_AMM_ABI, signer);
    
    // Convert amount to USDC units (6 decimals)
    const amountInWei = ethers.parseUnits(amount, 6);
    
    // Check user's USDC balance
    const balance = await usdcContract.balanceOf(userAddress);
    if (balance < amountInWei) {
      throw new Error(`Insufficient USDC balance. You have ${ethers.formatUnits(balance, 6)} USDC.`);
    }
    
    // Check and approve USDC spending if needed
    const allowance = await usdcContract.allowance(userAddress, contractAddresses.OVERTIME_AMM);
    if (allowance < amountInWei) {
      console.log("Approving USDC spending...");
      const approveTx = await usdcContract.approve(contractAddresses.OVERTIME_AMM, ethers.MaxUint256);
      await approveTx.wait();
      console.log("USDC approved for spending");
    }
    
    // Calculate expected payout (simplified)
    const expectedPayout = amountInWei; // Minimum payout of 1:1
    
    // Place the bet
    console.log(`Placing bet of ${amount} USDC on position ${teamIndex} for market ${marketAddress}`);
    const betTx = await ammContract.buyFromAMMWithDifferentCollateralAndReferrer(
      marketAddress,
      teamIndex,
      amountInWei,
      expectedPayout,
      contractAddresses.USDC,
      ethers.ZeroAddress // No referrer
    );
    
    // Wait for transaction to confirm
    const receipt = await betTx.wait();
    
    return {
      success: true,
      message: "Bet placed successfully!",
      txHash: receipt.hash
    };
  } catch (error) {
    console.error("Error placing bet:", error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Get the current network ID
 * @returns The chain ID being used
 */
export function getCurrentNetworkId(): number {
  return marketsCache.networkId;
}
