// lib/overtimeApi.ts - With NBA game filter and proper odds handling
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

// Sport IDs - NBA is sport ID 1 according to Overtime docs
const SPORT_IDS = {
  NBA: 1,
  SOCCER: 2,
  NFL: 3
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
 * Get all NBA markets from a specific network
 * @param networkId Network ID (10 for Optimism, 42161 for Arbitrum, etc)
 * @returns Array of markets or empty array if failed
 */
async function getNBAMarketsForNetwork(networkId: number): Promise<Market[]> {
  try {
    // Using the correct endpoint from documentation
    const url = `https://overtimemarketsv2.xyz/overtime-v2/networks/${networkId}/markets`;
    
    console.log(`Fetching markets from: ${url}`);
    const data = await fetchApi(url);
    
    if (!data) {
      console.log(`No data returned for network ${networkId}`);
      return [];
    }
    
    let allMarkets: Market[] = [];
    
    // API returns data grouped by sport and league - flatten it
    Object.keys(data).forEach(sport => {
      // Check if this is the NBA sport (Basketball)
      if (sport === 'Basketball' || parseInt(sport) === SPORT_IDS.NBA) {
        Object.keys(data[sport]).forEach(leagueId => {
          const leagueMarkets = data[sport][leagueId];
          if (Array.isArray(leagueMarkets)) {
            // Only include NBA games by checking league name
            const nbaMarkets = leagueMarkets.filter(market => {
              return (
                market.leagueName?.includes('NBA') || 
                market.homeTeam?.includes('Lakers') || 
                market.homeTeam?.includes('Celtics') || 
                market.homeTeam?.includes('Warriors') ||
                // Common NBA teams as fallback filters
                market.homeTeam?.includes('Knicks') ||
                market.homeTeam?.includes('Bulls')
              );
            });
            
            // Filter out markets with invalid odds
            const validMarkets = nbaMarkets.filter(market => {
              return (
                market.homeOdds && 
                !isNaN(market.homeOdds) && 
                market.awayOdds && 
                !isNaN(market.awayOdds)
              );
            });
            
            allMarkets = allMarkets.concat(validMarkets);
          }
        });
      }
    });
    
    console.log(`Found ${allMarkets.length} NBA markets on ${CHAIN_NAMES[networkId] || 'Unknown Chain'}`);
    return allMarkets;
  } catch (error) {
    console.error(`Error getting markets for network ${networkId}:`, error);
    return [];
  }
}

/**
 * Find NBA markets from all supported networks, prioritizing Base
 * @returns Object with markets array and the network ID they came from
 */
async function findNBAMarketsFromAllNetworks(): Promise<{ markets: Market[], networkId: number }> {
  // Try Base first, then Optimism, then Arbitrum
  const networks = [NETWORK_IDS.BASE, NETWORK_IDS.OPTIMISM, NETWORK_IDS.ARBITRUM];
  
  for (const networkId of networks) {
    try {
      const markets = await getNBAMarketsForNetwork(networkId);
      
      if (markets.length > 0) {
        console.log(`Using ${markets.length} NBA markets from ${CHAIN_NAMES[networkId]}`);
        return { markets, networkId };
      }
    } catch (error) {
      console.error(`Error getting NBA markets for network ${networkId}:`, error);
      // Continue to next network
    }
  }
  
  console.log("No NBA markets found on any network");
  return { markets: [], networkId: NETWORK_IDS.BASE };
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
      console.log(`Using cached markets from ${CHAIN_NAMES[marketsCache.networkId]}`);
      return marketsCache.markets;
    }
    
    console.log("Cache expired or empty, fetching fresh NBA data");
    
    // Find NBA markets from supported networks
    const { markets, networkId } = await findNBAMarketsFromAllNetworks();
    
    // Update cache
    marketsCache = {
      timestamp: now,
      markets,
      networkId
    };
    
    return markets;
  } catch (error) {
    console.error('Failed to fetch active NBA markets:', error);
    return [];
  }
}

/**
 * Get the "Big Game" - the NBA market with highest liquidity
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
    
    // Validate odds are numbers and not NaN
    if (topMarket && (isNaN(topMarket.homeOdds) || isNaN(topMarket.awayOdds))) {
      console.error("Invalid odds in top market:", topMarket);
      
      // Try to find a market with valid odds
      const validMarket = sortedMarkets.find(market => 
        !isNaN(market.homeOdds) && !isNaN(market.awayOdds)
      );
      
      if (validMarket) {
        console.log("Found alternative market with valid odds:", validMarket);
        return validMarket;
      }
    }
    
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
    // Ensure odds are valid
    const odds = [
      market.homeOdds || 1.95, 
      market.awayOdds || 1.95, 
      market.drawOdds || 0
    ];
    
    // Replace any NaN values with sensible defaults
    const validOdds = odds.map(odd => isNaN(odd) ? 1.95 : odd);
    
    // Format the trade data according to the API
    const tradeData = {
      buyInAmount: amount,
      tradeData: [{
        gameId: market.gameId,
        sportId: market.sportId || SPORT_IDS.NBA,
        typeId: market.typeId || 0,
        maturity: market.maturity,
        status: market.status || 0,
        line: market.line || 0,
        playerId: market.playerId || "",
        position: position,
        odds: validOdds,
        combinedPositions: ["", "", ""]
      }]
    };
    
    // Using the correct endpoint from the documentation
    const url = `https://overtimemarketsv2.xyz/overtime-v2/networks/${networkId}/quote`;
    
    console.log("Sending quote request with data:", JSON.stringify(tradeData));
    
    const response = await fetchApi(url, {
      method: 'POST',
      body: JSON.stringify(tradeData)
    });
    
    // Validate quote data
    if (response && response.quoteData && response.quoteData.totalQuote) {
      if (isNaN(response.quoteData.totalQuote.decimal)) {
        console.error("Invalid quote data received:", response);
        throw new Error("Received invalid quote data");
      }
    }
    
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
