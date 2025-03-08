// lib/overtimeApi.ts - Updated with correct Market interface
// Odds data structure from the API
export interface OddsData {
  american: number;
  decimal: number;
  normalizedImplied: number;
}

// Types for Overtime/Thales markets based on actual API response structure
export interface Market {
  address: string;
  gameId: string;
  sport: string;
  sportId: number;
  typeId: number;
  maturity: number;
  status: number;
  statusCode?: string;
  line?: number;
  playerId?: string | number;
  position?: number;
  homeTeam: string;
  awayTeam: string;
  leagueId?: number;
  leagueName?: string;
  networkId: number;
  isOpen?: boolean;
  isResolved?: boolean;
  isCancelled?: boolean;
  isOneSideMarket?: boolean;
  isPlayerPropsMarket?: boolean;
  isYesNoPlayerPropsMarket?: boolean;
  isOneSidePlayerPropsMarket?: boolean;
  isPaused?: boolean;
  odds: OddsData[]; // This is the actual structure from the API
  originalMarketName?: string;
  playerProps?: any;
  proof?: string[];
  childMarkets?: Market[];
  combinedPositions?: any[];
}

// Network IDs as seen in the documentation
const NETWORK_IDS = {
  OPTIMISM: 10,
  ARBITRUM: 42161,
  BASE: 8453
};

// NBA sportId - according to Thales documentation
const NBA_SPORT_ID = 9;

// Chain names for display
const CHAIN_NAMES: Record<number, string> = {
  [NETWORK_IDS.OPTIMISM]: 'Optimism',
  [NETWORK_IDS.ARBITRUM]: 'Arbitrum',
  [NETWORK_IDS.BASE]: 'Base'
};

// Contract addresses from SportsAMMV2 documentation
const CONTRACT_ADDRESSES: Record<number, {
  USDC: string;
  OVERTIME_AMM: string;
  SPORT_MARKETS_MANAGER: string;
}> = {
  // Optimism Mainnet
  [NETWORK_IDS.OPTIMISM]: {
    USDC: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
    OVERTIME_AMM: '0xad41C77d99E282267C1492cdEFe528D7d5044253',
    SPORT_MARKETS_MANAGER: '0x8606926e4c3Cfb9d4B6742A62e1923854F4026dc',
  },
  // Arbitrum Mainnet
  [NETWORK_IDS.ARBITRUM]: {
    USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    OVERTIME_AMM: '0x82872A82E70081D42f5c2610259324Bb463B2bC2',
    SPORT_MARKETS_MANAGER: '0xb3E8C659CF95BeA8c81d8D06407C5c7A2D75B1BC',
  },
  // Base Mainnet - From Overtime tweet
  [NETWORK_IDS.BASE]: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    OVERTIME_AMM: '0x80903Aa4d358542652c8D4B33cd942EA1Bf8fd41',
    SPORT_MARKETS_MANAGER: '0x3Ed830e92eFfE68C0d1216B2b5115B1bceBB087C',
  }
};

// Cache for markets data
let marketsCache: {
  timestamp: number;
  markets: Market[];
  networkId: number;
} = {
  timestamp: 0,
  markets: [],
  networkId: NETWORK_IDS.OPTIMISM // Default to Optimism
};

// Cache expiration in milliseconds (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

/**
 * Format American odds from a number value
 * @param americanOdds American odds as a number
 * @returns Formatted string with +/- prefix
 */
export function formatAmericanOdds(odds: OddsData | null | undefined): string {
  if (!odds || !odds.american || isNaN(odds.american)) {
    return 'N/A';
  }
  
  const americanOdds = odds.american;
  return americanOdds > 0 ? `+${Math.round(americanOdds)}` : `${Math.round(americanOdds)}`;
}

/**
 * Fetch data from the Overtime API with error handling
 * @param url API endpoint URL
 * @returns Promise with parsed data or null if failed
 */
async function fetchApi(url: string): Promise<any> {
  try {
    console.log(`Fetching from: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      console.error(`API returned status ${response.status}: ${response.statusText}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    return null;
  }
}

/**
 * Get all NBA markets from a specific network
 * @param networkId Network ID (10 for Optimism, 42161 for Arbitrum, etc)
 * @returns Array of markets or empty array if failed
 */
async function getMarketsForNetwork(networkId: number): Promise<Market[]> {
  try {
    // API endpoint
    const url = `https://overtimemarketsv2.xyz/overtime-v2/networks/${networkId}/markets`;
    
    console.log(`Attempting to fetch markets from network ${networkId} using URL: ${url}`);
    
    const data = await fetchApi(url);
    
    if (!data) {
      console.log(`No data returned for network ${networkId}`);
      return [];
    }
    
    // Filter for NBA markets only
    let nbaMarkets: Market[] = [];
    
    Object.keys(data).forEach(sport => {
      Object.keys(data[sport]).forEach(leagueId => {
        const leagueMarkets = data[sport][leagueId];
        if (Array.isArray(leagueMarkets) && leagueMarkets.length > 0) {
          const sampleMarket = leagueMarkets[0];
          
          // Filter for NBA or Basketball games
          if (
            sport.toLowerCase().includes('basket') ||
            sport.toLowerCase().includes('nba') ||
            sampleMarket.sport?.toLowerCase().includes('basket') ||
            sampleMarket.leagueName?.toLowerCase().includes('nba') ||
            sampleMarket.sportId === NBA_SPORT_ID
          ) {
            console.log(`Found NBA/Basketball markets in ${sport} league ${leagueId}`);
            nbaMarkets = nbaMarkets.concat(leagueMarkets);
          }
        }
      });
    });
    
    console.log(`Found ${nbaMarkets.length} NBA/Basketball markets on ${CHAIN_NAMES[networkId] || 'Unknown Chain'}`);
    
    if (nbaMarkets.length > 0) {
      // Log detailed data for sample market
      console.log("Sample NBA market:", nbaMarkets[0]);
    }
    
    return nbaMarkets;
  } catch (error) {
    console.error(`Error getting markets for network ${networkId}:`, error);
    return [];
  }
}

/**
 * Find NBA markets from all supported networks, prioritizing Base
 * @returns Object with markets array and the network ID they came from
 */
async function findMarketsFromAllNetworks(): Promise<{ markets: Market[], networkId: number }> {
  // Try Base first, then Optimism, then Arbitrum
  const networks = [NETWORK_IDS.BASE, NETWORK_IDS.OPTIMISM, NETWORK_IDS.ARBITRUM];
  
  for (const networkId of networks) {
    console.log(`Trying to fetch NBA markets from network ${networkId} (${CHAIN_NAMES[networkId] || 'Unknown'})`);
    const markets = await getMarketsForNetwork(networkId);
    
    if (markets.length > 0) {
      console.log(`Using ${markets.length} NBA markets from ${CHAIN_NAMES[networkId] || 'Unknown Chain'}`);
      return { markets, networkId };
    }
  }
  
  console.log("No NBA markets found on any network");
  return { markets: [], networkId: NETWORK_IDS.OPTIMISM };
}

/**
 * Get the highest liquidity active NBA markets
 * @returns Promise with array of markets
 */
export async function getActiveMarkets(): Promise<Market[]> {
  try {
    const now = Date.now();
    
    // Use cache if valid
    if (
      marketsCache.markets.length > 0 && 
      now - marketsCache.timestamp < CACHE_EXPIRATION
    ) {
      console.log(`Using cached NBA markets from ${CHAIN_NAMES[marketsCache.networkId] || 'Unknown Chain'}`);
      return marketsCache.markets;
    }
    
    console.log("Cache expired or empty, fetching fresh NBA market data");
    
    // Find markets from supported networks
    const { markets, networkId } = await findMarketsFromAllNetworks();
    
    // Update cache
    marketsCache = {
      timestamp: now,
      markets,
      networkId
    };
    
    return markets;
  } catch (error) {
    console.error('Failed to fetch active NBA markets:', error);
    
    // Return cached data if available, otherwise empty array
    return marketsCache.markets.length > 0 ? marketsCache.markets : [];
  }
}

/**
 * Get the "Big Game" - the market with highest liquidity
 * @returns Promise with the market or null if none found
 */
export async function getBigGame(): Promise<Market | null> {
  try {
    const markets = await getActiveMarkets();
    
    if (markets.length === 0) {
      console.log('No NBA markets available');
      return null;
    }
    
    // Find market with highest liquidity/interest
    const sortedMarkets = [...markets].sort((a, b) => {
      // Sort by status (prioritize active games)
      const statusDiff = (a.status || 0) - (b.status || 0);
      if (statusDiff !== 0) return statusDiff;
      
      // Then sort by maturity (closest game first)
      const now = Math.floor(Date.now() / 1000);
      const timeToGameA = (a.maturity || 0) - now;
      const timeToGameB = (b.maturity || 0) - now;
      
      if (timeToGameA > 0 && timeToGameB <= 0) return -1;
      if (timeToGameA <= 0 && timeToGameB > 0) return 1;
      
      return timeToGameA - timeToGameB;
    });
    
    const topMarket = sortedMarkets[0];
    console.log('Selected top NBA market:', topMarket);
    
    // Verify the odds are there
    if (topMarket && topMarket.odds) {
      console.log('Market odds:', topMarket.odds);
    }
    
    return topMarket;
  } catch (error) {
    console.error('Failed to get the big NBA game:', error);
    return null;
  }
}

/**
 * Get a quote for placing a bet 
 * @param market The market to bet on
 * @param position Which position to bet on (0=home, 1=away)
 * @param amount Amount to bet in USDC
 * @param networkId Network ID
 * @returns Quote data
 */
export async function getQuote(
  market: Market, 
  position: number, 
  amount: number,
  networkId: number
): Promise<any> {
  try {
    // Format the trade data according to the correct API format from the docs
    const tradeData = {
      buyInAmount: amount,
      tradeData: [{
        gameId: market.gameId,
        sportId: market.sportId,
        typeId: market.typeId,
        maturity: market.maturity,
        status: market.status,
        line: market.line || 0,
        playerId: market.playerId || 0,
        position: position,
        // Get the actual odds array from the market, or build it if needed
        odds: market.odds?.map(o => o.decimal) || [market.odds?.[0]?.decimal || 0, market.odds?.[1]?.decimal || 0, 0],
        combinedPositions: [[], [], []],
        live: false
      }],
      collateral: "USDC"  // Using USDC as default collateral
    };
    
    console.log('Sending quote request with data:', JSON.stringify(tradeData, null, 2));
    
    // Use our proxy endpoint to forward the request
    const response = await fetch('/api/quote', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        networkId: networkId,
        tradeData: tradeData
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error from quote API:', errorText);
      throw new Error(`Failed to get quote: ${response.statusText}`);
    }
    
    const quoteData = await response.json();
    console.log('Quote response:', quoteData);
    return quoteData;
  } catch (error) {
    console.error('Error getting quote:', error);
    throw error;
  }
}

/**
 * Place a bet using the Overtime Markets contract
 * @param market Market to bet on
 * @param amount Amount to bet in USDC
 * @param position Position to bet on (0=home, 1=away)
 * @param provider Ethereum provider from Coinbase Wallet
 * @returns Result of the bet placement
 */
export async function placeBet(
  market: Market,
  amount: string,
  position: number,
  provider: any
): Promise<{ success: boolean; message: string; txHash?: string }> {
  try {
    if (!provider) {
      throw new Error("Wallet not connected");
    }
    
    // Import necessary libraries
    const { ethers } = await import('ethers');
    const { CONTRACT_ADDRESSES, OVERTIME_MARKET_ABI, ERC20_ABI } = await import('./contractAbis');
    
    // Chain ID from the market
    const networkId = market.networkId;
    
    // Create provider and signer
    const ethersProvider = new ethers.BrowserProvider(provider);
    const signer = await ethersProvider.getSigner();
    
    // Check that user is on the correct network - using ethers v6 syntax
    const network = await ethersProvider.getNetwork();
    const chainId = Number(network.chainId);
    
    if (chainId !== networkId) {
      throw new Error(`Please switch to ${CHAIN_NAMES[networkId] || 'the correct'} network to place this bet`);
    }
    
    // Get contract addresses for the network
    // Use a type check to ensure TypeScript knows this is valid
    const contractAddresses = CONTRACT_ADDRESSES[networkId as keyof typeof CONTRACT_ADDRESSES];
    if (!contractAddresses) {
      throw new Error(`Unsupported network: ${networkId}`);
    }
    
    // Create contract instances
    const usdcContract = new ethers.Contract(contractAddresses.USDC, ERC20_ABI, signer);
    const sportsAMMContract = new ethers.Contract(contractAddresses.OVERTIME_AMM, OVERTIME_MARKET_ABI, signer);
    
    // Convert amount to USDC units (USDC has 6 decimals)
    const amountInWei = ethers.parseUnits(amount, 6);
    
    // Check USDC balance
    const balance = await usdcContract.balanceOf(await signer.getAddress());
    if (balance < amountInWei) {
      throw new Error(`Insufficient USDC balance. You have ${ethers.formatUnits(balance, 6)} USDC but need ${amount} USDC.`);
    }
    
    // Get quote for the bet - this determines expected payout
    const quoteResult = await getQuote(market, position, parseFloat(amount), networkId);
    console.log("Quote result:", quoteResult);
    
    if (!quoteResult || !quoteResult.quoteData || !quoteResult.quoteData.totalQuote) {
      throw new Error("Failed to get quote for this bet");
    }
    
    // Get the expected payout from the quote - this format is from the example API response
    const expectedPayout = quoteResult.quoteData.totalQuote.decimal || 0;
    
    // Approve USDC spending
    console.log("Approving USDC...");
    const approveTx = await usdcContract.approve(contractAddresses.OVERTIME_AMM, amountInWei);
    await approveTx.wait();
    console.log("USDC approved, transaction hash:", approveTx.hash);
    
    // Place the bet using the appropriate function from the contract
    console.log("Placing bet...", {
      market: market.address,
      position,
      amount: amountInWei.toString(),
      expectedPayout,
      collateral: contractAddresses.USDC
    });
    
    // Execute the trade transaction
    const betTx = await sportsAMMContract.buyFromAMMWithDifferentCollateralAndReferrer(
      market.address,            // market address
      position,                  // position (0 for home, 1 for away)
      amountInWei,               // amount of USDC to spend
      expectedPayout,            // expected payout from the quote
      contractAddresses.USDC,    // USDC address
      ethers.ZeroAddress         // no referrer
    );
    
    console.log("Bet transaction submitted:", betTx.hash);
    const receipt = await betTx.wait();
    console.log("Bet transaction confirmed:", receipt);
    
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
