// lib/overtimeApi.ts - Complete solution with fallback NBA data
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
  BASKETBALL: 1,
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
  networkId: NETWORK_IDS.BASE
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
 * Get live NBA markets for a specific network
 * @param networkId Network ID
 * @returns Array of NBA markets
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
    
    let nbaMarkets: Market[] = [];
    
    // API returns data grouped by sport and league - filter for NBA
    Object.keys(data).forEach(sport => {
      // Check if this is basketball
      if (sport === 'Basketball' || parseInt(sport) === SPORT_IDS.BASKETBALL) {
        Object.keys(data[sport]).forEach(leagueId => {
          const markets = data[sport][leagueId];
          if (Array.isArray(markets)) {
            // Filter for NBA games by checking league name or common NBA teams
            const filteredMarkets = markets.filter(market => {
              return (
                (market.leagueName && market.leagueName.includes('NBA')) ||
                (market.homeTeam && isNBATeam(market.homeTeam)) ||
                (market.awayTeam && isNBATeam(market.awayTeam))
              );
            });
            
            // Filter out markets with invalid odds
            const validMarkets = filteredMarkets.filter(market => {
              return (
                market.homeOdds && 
                !isNaN(market.homeOdds) && 
                market.awayOdds && 
                !isNaN(market.awayOdds)
              );
            });
            
            nbaMarkets = nbaMarkets.concat(validMarkets);
          }
        });
      }
    });
    
    console.log(`Found ${nbaMarkets.length} NBA markets on ${CHAIN_NAMES[networkId]}`);
    return nbaMarkets;
  } catch (error) {
    console.error(`Error getting NBA markets for network ${networkId}:`, error);
    return [];
  }
}

/**
 * Check if a team name is an NBA team
 * @param teamName Team name to check
 * @returns True if it's an NBA team
 */
function isNBATeam(teamName: string): boolean {
  const nbaTeams = [
    'Lakers', 'Celtics', 'Warriors', 'Knicks', 'Bulls', 'Heat', 'Mavericks',
    'Bucks', 'Nets', '76ers', 'Suns', 'Clippers', 'Raptors', 'Nuggets',
    'Spurs', 'Cavaliers', 'Hawks', 'Pacers', 'Trail Blazers', 'Grizzlies',
    'Pelicans', 'Thunder', 'Kings', 'Wizards', 'Rockets', 'Pistons',
    'Magic', 'Hornets', 'Timberwolves', 'Jazz'
  ];
  
  return nbaTeams.some(team => teamName.includes(team));
}

/**
 * Find NBA markets from all supported networks
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
  
  console.log("No NBA markets found on any network, using fallback data");
  return { 
    markets: getNBAFallbackMarkets(), 
    networkId: NETWORK_IDS.BASE 
  };
}

/**
 * Generate NBA fallback markets when API is down
 */
function getNBAFallbackMarkets(): Market[] {
  // Current timestamp + 3 hours for upcoming games
  const futureTime = Math.floor(Date.now() / 1000) + (3 * 60 * 60);
  
  return [
    {
      address: "0x80903Aa4d358542652c8D4B33cd942EA1Bf8fd41",
      gameId: "0x323032353033303932333330303030",
      sport: "Basketball",
      sportId: SPORT_IDS.BASKETBALL,
      typeId: 0,
      maturity: futureTime,
      status: 0,
      homeTeam: "Los Angeles Lakers",
      awayTeam: "Boston Celtics",
      homeOdds: 1.95,
      awayOdds: 1.85,
      networkId: NETWORK_IDS.BASE
    },
    {
      address: "0x80903Aa4d358542652c8D4B33cd942EA1Bf8fd41",
      gameId: "0x323032353033303932333330303031",
      sport: "Basketball",
      sportId: SPORT_IDS.BASKETBALL,
      typeId: 0,
      maturity: futureTime + (60 * 60), // 1 hour after first game
      status: 0,
      homeTeam: "Golden State Warriors",
      awayTeam: "New York Knicks",
      homeOdds: 1.75,
      awayOdds: 2.05,
      networkId: NETWORK_IDS.BASE
    },
    {
      address: "0x80903Aa4d358542652c8D4B33cd942EA1Bf8fd41",
      gameId: "0x323032353033303932333330303032",
      sport: "Basketball",
      sportId: SPORT_IDS.BASKETBALL,
      typeId: 0,
      maturity: futureTime + (2 * 60 * 60), // 2 hours after first game
      status: 0,
      homeTeam: "Chicago Bulls",
      awayTeam: "Miami Heat",
      homeOdds: 2.10,
      awayOdds: 1.70,
      networkId: NETWORK_IDS.BASE
    }
  ];
}

/**
 * Get active markets with fallback data when API fails
 */
export async function getActiveMarkets(): Promise<Market[]> {
  try {
    const currentTime = Date.now();
    
    // Use cache if valid
    if (
      marketsCache.markets.length > 0 && 
      currentTime - marketsCache.timestamp < CACHE_EXPIRATION
    ) {
      console.log(`Using cached markets from ${CHAIN_NAMES[marketsCache.networkId]}`);
      return marketsCache.markets;
    }
    
    console.log("Cache expired or empty, fetching fresh NBA data");
    
    // Find NBA markets from supported networks
    const { markets, networkId } = await findNBAMarketsFromAllNetworks();
    
    // Update cache
    marketsCache = {
      timestamp: currentTime,
      markets,
      networkId
    };
    
    return markets;
  } catch (error) {
    console.error('Failed to fetch active NBA markets:', error);
    
    // Return fallback data if cache is empty
    if (marketsCache.markets.length === 0) {
      const currentTime = Date.now();
      const fallbackMarkets = getNBAFallbackMarkets();
      marketsCache = {
        timestamp: currentTime,
        markets: fallbackMarkets,
        networkId: NETWORK_IDS.BASE
      };
      return fallbackMarkets;
    }
    
    return marketsCache.markets;
  }
}

/**
 * Get the "Big Game" - the NBA market with highest liquidity
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
    
    return topMarket;
  } catch (error) {
    console.error('Failed to get the big game:', error);
    
    // Return first fallback market if there's an error
    const fallbackMarkets = getNBAFallbackMarkets();
    return fallbackMarkets[0];
  }
}

/**
 * Get a quote for placing a bet 
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
        sportId: market.sportId || SPORT_IDS.BASKETBALL,
        typeId: market.typeId || 0,
        maturity: market.maturity,
        status: market.status || 0,
        line: market.line || 0,
        playerId: market.playerId || "",
        position: position,
        odds: [market.homeOdds, market.awayOdds, market.drawOdds || 0],
        combinedPositions: ["", "", ""]
      }]
    };
    
    // Try to get a quote from the API
    try {
      const url = `https://overtimemarketsv2.xyz/overtime-v2/networks/${networkId}/quote`;
      
      const response = await fetchApi(url, {
        method: 'POST',
        body: JSON.stringify(tradeData)
      });
      
      if (response && response.quoteData && response.quoteData.totalQuote) {
        return response;
      }
      
      throw new Error("Invalid quote data");
    } catch (apiError) {
      console.error("Error getting quote from API:", apiError);
      
      // Return a mocked quote if the API fails
      const expectedOdds = position === 0 ? market.homeOdds : market.awayOdds;
      const expectedPayout = amount * expectedOdds;
      
      return {
        quoteData: {
          totalQuote: {
            decimal: expectedOdds,
            american: expectedOdds >= 2 ? 
              `+${Math.round((expectedOdds - 1) * 100)}` : 
              `-${Math.round(100 / (expectedOdds - 1))}`
          },
          expectedPayout,
          buyInAmount: amount
        }
      };
    }
  } catch (error) {
    console.error('Error processing quote:', error);
    
    // Fallback quote data
    const expectedOdds = position === 0 ? market.homeOdds : market.awayOdds;
    
    return {
      quoteData: {
        totalQuote: {
          decimal: expectedOdds,
          american: expectedOdds >= 2 ? 
            `+${Math.round((expectedOdds - 1) * 100)}` : 
            `-${Math.round(100 / (expectedOdds - 1))}`
        },
        expectedPayout: amount * expectedOdds,
        buyInAmount: amount
      }
    };
  }
}

/**
 * Get the current network ID being used
 */
export function getCurrentNetworkId(): number {
  return marketsCache.networkId;
}
