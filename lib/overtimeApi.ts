// lib/overtimeApi.ts - Using only real Overtime Markets data
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

// Base Chain ID (8453)
const BASE_CHAIN_ID = 8453;

// Contract addresses on Base
const CONTRACT_ADDRESSES = {
  // Base Mainnet
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  OVERTIME_AMM: '0x80903Aa4d358542652c8D4B33cd942EA1Bf8fd41', 
  SPORT_MARKETS_MANAGER: '0x3Ed830e92eFfE68C0d1216B2b5115B1bceBB087C',
};

// In-memory cache with timestamp
let marketsCache: {
  timestamp: number;
  markets: Market[];
} = {
  timestamp: 0,
  markets: []
};

// Cache expiration in milliseconds (1 hour)
const CACHE_EXPIRATION = 60 * 60 * 1000;

/**
 * Fetches all active markets from Overtime on Base chain
 * @returns Promise<Market[]> List of active markets
 */
export async function getActiveMarkets(): Promise<Market[]> {
  try {
    const now = Date.now();
    
    // Check if cache is valid (not expired and has data)
    if (
      marketsCache.markets.length > 0 && 
      now - marketsCache.timestamp < CACHE_EXPIRATION
    ) {
      console.log("Using cached markets data");
      return marketsCache.markets;
    }
    
    console.log("Fetching fresh markets data from Overtime API");
    
    // Use the V2 API endpoint with the Base chainId
    const apiUrl = `${OVERTIME_API_V2}/markets?networkId=${BASE_CHAIN_ID}&isOpen=true`;
    console.log(`Fetching from API: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('API response data:', data);
    
    if (!data.markets || !Array.isArray(data.markets)) {
      throw new Error('Invalid API response format: missing markets array');
    }
    
    // Update cache
    marketsCache = {
      timestamp: now,
      markets: data.markets
    };
    
    console.log(`Fetched ${data.markets.length} markets from Overtime API`);
    return data.markets;
  } catch (error) {
    console.error('Failed to fetch markets from Overtime API:', error);
    // Return whatever is in the cache, even if expired
    return marketsCache.markets;
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
      console.log('No markets available from Overtime API');
      return null;
    }
    
    // Sort by liquidity (highest first)
    const sortedMarkets = [...markets].sort((a, b) => {
      const liquidityA = a.liquidity || 0;
      const liquidityB = b.liquidity || 0;
      return liquidityB - liquidityA;
    });
    
    const topMarket = sortedMarkets[0];
    console.log('Top liquidity market:', topMarket);
    
    return topMarket;
  } catch (error) {
    console.error('Failed to get the big game:', error);
    return null;
  }
}

/**
 * Place a bet on a market using the Overtime Markets AMM contract
 * @param marketAddress The address of the market contract
 * @param amount The amount to bet in USDC (in decimal form, e.g. 10 for $10)
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
    
    // Get chain ID to verify we're on Base
    const chainIdHex = await provider.request({ method: 'eth_chainId' });
    const chainId = parseInt(chainIdHex, 16);
    
    if (chainId !== BASE_CHAIN_ID) {
      throw new Error(`Please switch to Base chain. Current chain ID: ${chainId}`);
    }
    
    // Create contract instances
    const usdcContract = new ethers.Contract(CONTRACT_ADDRESSES.USDC, ERC20_ABI, signer);
    const overtimeAMMContract = new ethers.Contract(CONTRACT_ADDRESSES.OVERTIME_AMM, OVERTIME_AMM_ABI, signer);
    
    // Convert amount to USDC units (USDC has 6 decimals)
    const amountInWei = ethers.parseUnits(amount, 6);
    
    // Check USDC balance
    const usdcBalance = await usdcContract.balanceOf(userAddress);
    if (usdcBalance < amountInWei) {
      throw new Error(`Insufficient USDC balance. You have ${ethers.formatUnits(usdcBalance, 6)} USDC but need ${amount} USDC.`);
    }
    
    // Check if the AMM has approval to spend USDC
    const allowance = await usdcContract.allowance(userAddress, CONTRACT_ADDRESSES.OVERTIME_AMM);
    if (allowance < amountInWei) {
      console.log("Approving USDC spending...");
      const approveTx = await usdcContract.approve(CONTRACT_ADDRESSES.OVERTIME_AMM, ethers.MaxUint256);
      const approveReceipt = await approveTx.wait();
      console.log("USDC approved for spending", approveReceipt);
    }
    
    // Calculate expected payout - in a production environment, you would calculate this based on quotes
    // For simplicity, we're using a conservative estimate
    const expectedPayout = amountInWei; // Minimum expected payout (1:1)
    
    // Execute the bet
    console.log(`Placing bet of ${amount} USDC on position ${teamIndex} for market ${marketAddress}`);
    const betTx = await overtimeAMMContract.buyFromAMMWithDifferentCollateralAndReferrer(
      marketAddress,
      teamIndex,
      amountInWei,
      expectedPayout,
      CONTRACT_ADDRESSES.USDC,
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
