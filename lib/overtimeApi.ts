// lib/overtimeApi.ts - Using the exact endpoints from documentation
// Import the placeBet function from betUtils
export { placeBet } from './betUtils';

export interface Market {
  address: string;
  gameId: string;
  sport: string;
  sportId: number;
  typeId: number;
  maturity: number;
  status: number;
  line?: number;
  playerId?: string;
  position?: number;
  homeTeam: string;
  awayTeam: string;
  homeOdds: number;
  awayOdds: number;
  drawOdds?: number;
  leagueId?: number;
  leagueName?: string;
  networkId: number;
}

// Network IDs as seen in the documentation
const NETWORK_IDS = {
  OPTIMISM: 10,
  ARBITRUM: 42161,
  BASE: 8453
};

// Chain names for display
const CHAIN_NAMES = {
  [NETWORK_IDS.OPTIMISM]: 'Optimism',
  [NETWORK_IDS.ARBITRUM]: 'Arbitrum',
  [NETWORK_IDS.BASE]: 'Base'
};

// Cache for markets data
let marketsCache: {
  timestamp: number;
  markets: Market[];
  networkId: number;
} = {
  timestamp: 0,
  markets: [],
  networkId: NETWORK_IDS.BASE // Default to Base
};

// Cache expiration in milliseconds (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

/**
 * Fetch data from the API with error handling
 * @param url API endpoint URL
 * @returns Promise with parsed data or null if failed
 */
async function fetchApi(url: string, options: RequestInit = {}): Promise<any> {
  try {
    console.log(`Fetching from: ${url}`);
    
    // First try direct fetch
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        console.error(`Direct API call returned status ${response.status}: ${response.statusText}`);
        throw new Error(`API returned status ${response.status}`);
      }
      
      return await response.json();
    } catch (directFetchError) {
      console.log("Direct fetch failed, trying via proxy...");
      
      // Fallback to proxy
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
      
      const proxyResponse = await fetch(proxyUrl, {
        ...options,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      if (!proxyResponse.ok) {
        console.error(`Proxy API call returned status ${proxyResponse.status}: ${proxyResponse.statusText}`);
        throw new Error(`Proxy API returned status ${proxyResponse.status}`);
      }
      
      return await proxyResponse.json();
    }
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    throw error;
  }
}

/**
 * Get all markets from a specific network
 * @param networkId Network ID (10 for Optimism, 42161 for Arbitrum, etc)
 * @returns Array of markets or empty array if failed
 */
async function getMarketsForNetwork(networkId: number): Promise<Market[]> {
  try {
    // Using EXACTLY the endpoint from the screenshots
    const url = `https://overtimemarketsv2.xyz/overtime-v2/networks/${networkId}/markets`;
    
    console.log(`Fetching markets from: ${url}`);
    const data = await fetchApi(url);
    
    if (!data) {
      console.log(`No data returned for network ${networkId}`);
      return [];
    }
    
    // Restructure data if needed based on the response format
    let markets: Market[] = [];
    
    // API returns data grouped by sport and league - flatten it
    Object.keys(data).forEach(sport => {
      Object.keys(data[sport]).forEach(leagueId => {
        // Add each market to the array
        const leagueMarkets = data[sport][leagueId];
        if (Array.isArray(leagueMarkets)) {
          markets = markets.concat(leagueMarkets);
        }
      });
    });
    
    console.log(`Found ${markets.length} markets on ${CHAIN_NAMES[networkId] || 'Unknown Chain'}`);
    return markets;
  } catch (error) {
    console.error(`Error getting markets for network ${networkId}:`, error);
    return [];
  }
}

/**
 * Find markets from all supported networks, prioritizing Base
 * @returns Object with markets array and the network ID they came from
 */
async function findMarketsFromAllNetworks(): Promise<{ markets: Market[], networkId: number }> {
  // Try Base first, then Optimism, then Arbitrum
  const networks = [NETWORK_IDS.BASE, NETWORK_IDS.OPTIMISM, NETWORK_IDS.ARBITRUM];
  
  for (const networkId of networks) {
    try {
      const markets = await getMarketsForNetwork(networkId);
      
      if (markets.length > 0) {
        console.log(`Using ${markets.length} markets from ${CHAIN_NAMES[networkId]}`);
        return { markets, networkId };
      }
    } catch (error) {
      console.error(`Error getting markets for network ${networkId}:`, error);
      // Continue to next network
    }
  }
  
  console.log("No markets found on any network");
  return { markets: [], networkId: NETWORK_IDS.BASE };
}

/**
 * Get the highest liquidity active markets
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
      console.log(`Using cached markets from ${CHAIN_NAMES[marketsCache.networkId]}`);
      return marketsCache.markets;
    }
    
    console.log("Cache expired or empty, fetching fresh data");
    
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
    console.error('Failed to fetch active markets:', error);
    return [];
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
      console.log('No markets available');
      return null;
    }
    
    // Find market with highest liquidity/interest
    // Note: sorting logic may need to be adjusted based on actual data structure
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
    console.log('Selected top market:', topMarket);
    
    return topMarket;
  } catch (error) {
    console.error('Failed to get the big game:', error);
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
    // Format the trade data according to the API
    const tradeData = {
      buyInAmount: amount,
      tradeData: [{
        gameId: market.gameId,
        sportId: market.sportId,
        typeId: market.typeId,
        maturity: market.maturity,
        status: market.status,
        line: market.line || 0,
        playerId: market.playerId || "",
        position: position,
        odds: [market.homeOdds, market.awayOdds, market.drawOdds || 0],
        combinedPositions: ["", "", ""]
      }]
    };
    
    // Using EXACTLY the endpoint from the screenshots
    const url = `https://overtimemarketsv2.xyz/overtime-v2/networks/${networkId}/quote`;
    
    const response = await fetchApi(url, {
      method: 'POST',
      body: JSON.stringify(tradeData)
    });
    
    return response;
  } catch (error) {
    console.error('Error getting quote:', error);
    throw error;
  }
}

/**
 * Get the current network ID being used
 * @returns The network ID (chain ID) being used for markets
 */
export function getCurrentNetworkId(): number {
  return marketsCache.networkId;
}
