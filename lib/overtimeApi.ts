// lib/overtimeApi.ts - Using real games data
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
  isDemo?: boolean; // Flag for demo games
}

// Base Chain ID (8453)
const BASE_CHAIN_ID = 8453;

// Fetch real games happening today/tonight
async function fetchRealGames(): Promise<Market[]> {
  // Hard-coded real games (for March 7, 2024)
  const todaysGames = [
    {
      homeTeam: "Dallas Mavericks",
      awayTeam: "Miami Heat",
      sportName: "Basketball",
      league: "NBA",
      startTime: new Date("2024-03-07T19:30:00-06:00").getTime() / 1000, // CDT time
      homeOdds: 1.65, // -154
      awayOdds: 2.25, // +125
    },
    {
      homeTeam: "Indiana Pacers",
      awayTeam: "Minnesota Timberwolves",
      sportName: "Basketball",
      league: "NBA",
      startTime: new Date("2024-03-07T19:00:00-05:00").getTime() / 1000, // EST time
      homeOdds: 2.45, // +145
      awayOdds: 1.55, // -182
    },
    {
      homeTeam: "New York Knicks",
      awayTeam: "Atlanta Hawks",
      sportName: "Basketball",
      league: "NBA",
      startTime: new Date("2024-03-07T19:30:00-05:00").getTime() / 1000, // EST time
      homeOdds: 1.47, // -213
      awayOdds: 2.75, // +175
    },
    {
      homeTeam: "Boston Bruins",
      awayTeam: "Toronto Maple Leafs",
      sportName: "Hockey",
      league: "NHL",
      startTime: new Date("2024-03-07T19:00:00-05:00").getTime() / 1000, // EST time
      homeOdds: 1.80, // -125
      awayOdds: 2.00, // +100
    }
  ];
  
  // Convert to Market format with dummy blockchain addresses
  const markets: Market[] = todaysGames.map((game, index) => {
    return {
      address: `0x${index + 1}000000000000000000000000000000000000000`, // Dummy address
      gameId: `${game.league}-${game.homeTeam.replace(/\s+/g, '')}-${game.awayTeam.replace(/\s+/g, '')}-${Math.floor(game.startTime)}`,
      sport: game.sportName,
      category: game.league,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      maturityDate: game.startTime,
      homeOdds: game.homeOdds,
      awayOdds: game.awayOdds,
      isPaused: false,
      isCanceled: false,
      isResolved: false,
      networkId: BASE_CHAIN_ID,
      isDemo: true // Still mark as demo since we can't place real bets yet
    };
  });
  
  return markets;
}

/**
 * Fetches all active markets
 * @returns Promise<Market[]> List of games
 */
export async function getActiveMarkets(): Promise<Market[]> {
  try {
    // Get real games happening today
    const markets = await fetchRealGames();
    
    // Sort by start time (nearest first)
    const sortedMarkets = [...markets].sort((a, b) => a.maturityDate - b.maturityDate);
    
    console.log(`Found ${sortedMarkets.length} real games for today`);
    return sortedMarkets;
  } catch (error) {
    console.error('Failed to fetch games:', error);
    return [];
  }
}

/**
 * Gets the "Big Game" of the day
 * @returns Promise<Market | null> The featured game
 */
export async function getBigGame(): Promise<Market | null> {
  try {
    const markets = await getActiveMarkets();
    
    if (markets.length === 0) {
      console.log('No games available');
      return null;
    }
    
    // For simplicity, take the first game (closest to starting)
    const topGame = markets[0];
    
    // Log the game for debugging
    console.log('Selected top game:', topGame);
    
    return topGame;
  } catch (error) {
    console.error('Failed to get the big game:', error);
    return null;
  }
}

/**
 * Place a bet on a market (demo function)
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
  // This is a demo implementation
  return {
    success: true,
    message: "This is a demo bet. When Overtime Markets on Base has more liquidity, this would place a real bet on the blockchain.",
    txHash: "0x" + "0".repeat(64) // Dummy transaction hash
  };
}
