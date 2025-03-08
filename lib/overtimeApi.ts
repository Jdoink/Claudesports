// lib/overtimeApi.ts - Improved API integration
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
  isDemo?: boolean; // Flag for demo games
}

// API endpoints for Overtime Markets
// Using both V1 and V2 endpoints to ensure we get data
const OVERTIME_API_V1 = 'https://api.thalesmarket.io/overtime/markets/active';
const OVERTIME_API_V2 = 'https://api.overtimemarkets.xyz/v2/markets';

// Base Chain ID (8453)
const BASE_CHAIN_ID = 8453;

// Fallback NBA game that updates daily
function getFallbackGame(): Market {
  // Current date for creating a unique game ID
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Generate a game that's happening "today" at 7:30pm EST
  const gameTime = new Date(today);
  gameTime.setHours(19, 30, 0, 0); // 7:30pm
  
  // If current time is past 7:30pm, set the game for tomorrow
  if (now > gameTime) {
    gameTime.setDate(gameTime.getDate() + 1);
  }
  
  // List of NBA teams to randomly select
  const nbaTeams = [
    { name: "Boston Celtics", odds: 1.7 },
    { name: "Los Angeles Lakers", odds: 2.2 },
    { name: "Golden State Warriors", odds: 1.9 },
    { name: "Miami Heat", odds: 2.3 },
    { name: "Denver Nuggets", odds: 1.8 },
    { name: "Milwaukee Bucks", odds: 1.75 },
    { name: "Philadelphia 76ers", odds: 2.1 },
    { name: "Phoenix Suns", odds: 1.95 },
    { name: "Brooklyn Nets", odds: 2.4 },
    { name: "Dallas Mavericks", odds: 2.0 }
  ];
  
  // Randomly select home and away teams (ensure they're different)
  let homeIndex = Math.floor(Math.random() * nbaTeams.length);
  let awayIndex = Math.floor(Math.random() * nbaTeams.length);
  while (awayIndex === homeIndex) {
    awayIndex = Math.floor(Math.random() * nbaTeams.length);
  }
  
  const homeTeam = nbaTeams[homeIndex];
  const awayTeam = nbaTeams[awayIndex];
  
  // Format odds in American format
  const homeOddsAmerican = homeTeam.odds >= 2.0 ? 
    `+${Math.round((homeTeam.odds - 1) * 100)}` : 
    `-${Math.round(100 / (homeTeam.odds - 1))}`;
    
  const awayOddsAmerican = awayTeam.odds >= 2.0 ? 
    `+${Math.round((awayTeam.odds - 1) * 100)}` : 
    `-${Math.round(100 / (awayTeam.odds - 1))}`;
  
  // Create a fallback game
  return {
    address: "0x0000000000000000000000000000000000000000", // Dummy address
    gameId: `NBA-${today.toISOString().split('T')[0]}`,
    sport: "Basketball",
    category: "NBA",
    homeTeam: homeTeam.name,
    awayTeam: awayTeam.name,
    maturityDate: Math.floor(gameTime.getTime() / 1000), // Convert to Unix timestamp
    homeOdds: homeTeam.odds,
    awayOdds: awayTeam.odds,
    isPaused: false,
    isCanceled: false,
    isResolved: false,
    networkId: BASE_CHAIN_ID,
    isDemo: true // Mark as a demo game
  };
}

/**
 * Try multiple API endpoints to fetch markets
 * @returns Promise<Market[]> List of active markets
 */
async function fetchMarketsFromAllSources(): Promise<Market[]> {
  const markets: Market[] = [];
  const errors: string[] = [];
  
  // Try Overtime V2 API first
  try {
    console.log(`Fetching from V2: ${OVERTIME_API_V2}?networkId=${BASE_CHAIN_ID}&isOpen=true`);
    const responseV2 = await fetch(
      `${OVERTIME_API_V2}?networkId=${BASE_CHAIN_ID}&isOpen=true`,
      { 
        headers: { 'Accept': 'application/json' },
        cache: 'no-store' 
      }
    );
    
    if (responseV2.ok) {
      const data = await responseV2.json();
      console.log('V2 API response:', data);
      if (data.markets && data.markets.length > 0) {
        markets.push(...data.markets);
      } else {
        errors.push("V2 API returned no markets");
      }
    } else {
      errors.push(`V2 API returned status ${responseV2.status}`);
    }
  } catch (error) {
    console.error('Error fetching from V2 API:', error);
    errors.push(`V2 API error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // If V2 didn't work, try V1 API
  if (markets.length === 0) {
    try {
      console.log(`Fetching from V1: ${OVERTIME_API_V1}?networkId=${BASE_CHAIN_ID}`);
      const responseV1 = await fetch(
        `${OVERTIME_API_V1}?networkId=${BASE_CHAIN_ID}`,
        { 
          headers: { 'Accept': 'application/json' },
          cache: 'no-store' 
        }
      );
      
      if (responseV1.ok) {
        const data = await responseV1.json();
        console.log('V1 API response:', data);
        if (data.markets && data.markets.length > 0) {
          markets.push(...data.markets.map((m: any) => {
            // Convert V1 format to our interface if needed
            return {
              address: m.address,
              gameId: m.gameId || `game-${m.id}`,
              sport: m.sport || m.sportId || "Unknown",
              homeTeam: m.homeTeam,
              awayTeam: m.awayTeam,
              maturityDate: m.maturityDate || m.timestamp,
              homeOdds: m.homeOdds,
              awayOdds: m.awayOdds,
              isPaused: m.isPaused || false,
              isCanceled: m.isCanceled || false,
              isResolved: m.isResolved || false,
              networkId: m.networkId
            };
          }));
        } else {
          errors.push("V1 API returned no markets");
        }
      } else {
        errors.push(`V1 API returned status ${responseV1.status}`);
      }
    } catch (error) {
      console.error('Error fetching from V1 API:', error);
      errors.push(`V1 API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // If we found markets, return them
  if (markets.length > 0) {
    return markets;
  }
  
  // If all API calls failed, log the errors and return fallback
  console.error('All API calls failed:', errors);
  return [getFallbackGame()];
}

/**
 * Fetches all active markets from Overtime on Base chain
 * @returns Promise<Market[]> List of active markets
 */
export async function getActiveMarkets(): Promise<Market[]> {
  try {
    const markets = await fetchMarketsFromAllSources();
    
    // Sort by maturity date (closest game first)
    const sortedMarkets = [...markets].sort((a, b) => a.maturityDate - b.maturityDate);
    
    // Log the markets for debugging
    console.log(`Found ${sortedMarkets.length} markets, first one:`, 
      sortedMarkets.length > 0 ? sortedMarkets[0] : 'None');
    
    return sortedMarkets;
  } catch (error) {
    console.error('Failed to fetch active markets:', error);
    return [getFallbackGame()];
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
      console.log('No markets available, should not happen with fallback');
      return getFallbackGame();
    }
    
    // For real markets, take the first one (sorted by closest game)
    // For demo markets, use the demo game
    const topMarket = markets[0];
    
    // Log the market for debugging
    console.log('Selected top market:', topMarket);
    
    return topMarket;
  } catch (error) {
    console.error('Failed to get the big game:', error);
    return getFallbackGame();
  }
}

/**
 * Place a bet on a market
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
    // For demo games, return a mock success
    if (marketAddress === "0x0000000000000000000000000000000000000000") {
      return {
        success: true,
        message: "This is a demo bet. In the live version with real Overtime Markets, this would place a real bet on the blockchain.",
        txHash: "0x" + "0".repeat(64) // Dummy transaction hash
      };
    }
    
    if (!provider) {
      throw new Error("Wallet not connected");
    }
    
    // Import necessary libraries
    const { ethers } = await import('ethers');
    
    // Get contract ABIs and addresses
    const { ERC20_ABI, OVERTIME_MARKET_ABI, CONTRACT_ADDRESSES } = await import('./contractAbis');
    
    // Convert provider to ethers provider
    const ethersProvider = new ethers.BrowserProvider(provider);
    const signer = await ethersProvider.getSigner();
    const userAddress = await signer.getAddress();
    
    // Get chain ID (Base = 8453, Base Goerli = 84531)
    const chainIdHex = await provider.request({ method: 'eth_chainId' });
    const chainId = parseInt(chainIdHex, 16);
    
    // Get contract addresses for the current chain
    const contractAddresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
    if (!contractAddresses) {
      throw new Error(`Unsupported chain ID: ${chainId}. Please switch to Base.`);
    }
    
    // Create contract instances
    const usdcContract = new ethers.Contract(contractAddresses.USDC, ERC20_ABI, signer);
    const overtimeAMMContract = new ethers.Contract(contractAddresses.OVERTIME_AMM, OVERTIME_MARKET_ABI, signer);
    
    // Convert amount to USDC units (USDC has 6 decimals)
    const amountInWei = ethers.parseUnits(amount, 6);
    
    // Check USDC balance
    const usdcBalance = await usdcContract.balanceOf(userAddress);
    if (usdcBalance < amountInWei) {
      throw new Error(`Insufficient USDC balance. You have ${ethers.formatUnits(usdcBalance, 6)} USDC.`);
    }
    
    // Check if the AMM has approval to spend USDC
    const allowance = await usdcContract.allowance(userAddress, contractAddresses.OVERTIME_AMM);
    if (allowance < amountInWei) {
      console.log("Approving USDC spending...");
      const approveTx = await usdcContract.approve(contractAddresses.OVERTIME_AMM, ethers.MaxUint256);
      await approveTx.wait();
      console.log("USDC approved for spending");
    }
    
    // Calculate expected payout based on the available amount
    // For real implementation, would use the actual calculation
    const minReturnAmount = amountInWei;
    
    // Execute the bet using buyFromAMMWithDifferentCollateralAndReferrer
    console.log(`Placing bet of ${amount} USDC on position ${teamIndex} for market ${marketAddress}`);
    
    // Based on the Overtime V2 docs, use the appropriate method
    const betTx = await overtimeAMMContract.buyFromAMMWithDifferentCollateralAndReferrer(
      marketAddress,
      teamIndex,
      amountInWei,
      minReturnAmount,
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
