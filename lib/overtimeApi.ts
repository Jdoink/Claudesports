// lib/overtimeApi.ts - Using the correct Overtime Markets API endpoint
// Types for Overtime/Thales markets based on official documentation
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
  odds?: Array<{
    american: number;
    decimal: number;
    normalizedImplied: number;
  }>;
}

// Network IDs as seen in the documentation
const NETWORK_IDS = {
  OPTIMISM: 10,
  ARBITRUM: 42161,
  BASE: 8453
};

// Chain names for display
const CHAIN_NAMES: {[key: number]: string} = {
  [NETWORK_IDS.OPTIMISM]: 'Optimism',
  [NETWORK_IDS.ARBITRUM]: 'Arbitrum',
  [NETWORK_IDS.BASE]: 'Base'
};

// Contract addresses from SportsAMMV2 documentation
const CONTRACT_ADDRESSES: {[key: number]: {[key: string]: string}} = {
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
 * Get all markets from a specific network
 * @param networkId Network ID (10 for Optimism, 42161 for Arbitrum, etc)
 * @returns Array of markets or empty array if failed
 */
async function getMarketsForNetwork(networkId: number): Promise<Market[]> {
  // Use the confirmed working URL format that you verified
  const url = `https://overtimemarketsv2.xyz/overtime-v2/networks/${networkId}/markets`;
  
  try {
    console.log(`Fetching markets from: ${url}`);
    const data = await fetchApi(url);
    
    if (!data) {
      console.log(`No data returned for network ${networkId}`);
      return [];
    }
    
    // Process the data based on the API response structure
    let markets: Market[] = [];
    
    // If API returns an array, use it directly
    if (Array.isArray(data)) {
      markets = data.map(market => ({...market, networkId}));
      console.log(`Found ${markets.length} markets in array format`);
    } 
    // If API returns an object with sports/leagues structure
    else if (typeof data === 'object') {
      console.log('API returned object format, processing nested data');
      
      Object.keys(data).forEach(sport => {
        if (typeof data[sport] === 'object') {
          Object.keys(data[sport]).forEach(leagueId => {
            if (Array.isArray(data[sport][leagueId])) {
              // Map each market and ensure it has the networkId property
              const leagueMarkets = data[sport][leagueId].map((market: any) => ({
                ...market,
                networkId: networkId
              }));
              markets = markets.concat(leagueMarkets);
            }
          });
        }
      });
      
      console.log(`Found ${markets.length} markets in nested format`);
    }
    
    // Add debug output for the first market if available
    if (markets.length > 0) {
      console.log('Sample of first market:', JSON.stringify(markets[0]).substring(0, 200) + '...');
    }
    
    return markets;
  } catch (error) {
    console.error(`Error getting markets for network ${networkId}:`, error);
    return [];
  }
}

/**
 * Try the proxy route if direct API call fails
 * @param networkId Network ID to fetch markets for
 * @returns Array of markets
 */
async function tryProxyRoute(networkId: number): Promise<Market[]> {
  const url = `/api/proxy?url=${encodeURIComponent(`https://overtimemarketsv2.xyz/overtime-v2/networks/${networkId}/markets`)}`;
  
  try {
    console.log(`Trying proxy route: ${url}`);
    const data = await fetchApi(url);
    
    if (!data) {
      return [];
    }
    
    let markets: Market[] = [];
    
    // Process data similar to getMarketsForNetwork
    if (Array.isArray(data)) {
      markets = data.map(market => ({...market, networkId}));
    } else if (typeof data === 'object') {
      Object.keys(data).forEach(sport => {
        if (typeof data[sport] === 'object') {
          Object.keys(data[sport]).forEach(leagueId => {
            if (Array.isArray(data[sport][leagueId])) {
              const leagueMarkets = data[sport][leagueId].map((market: any) => ({
                ...market,
                networkId: networkId
              }));
              markets = markets.concat(leagueMarkets);
            }
          });
        }
      });
    }
    
    return markets;
  } catch (error) {
    console.error(`Error using proxy route for network ${networkId}:`, error);
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
    // First try direct API endpoint
    let markets = await getMarketsForNetwork(networkId);
    
    // If direct endpoint fails, try via proxy
    if (markets.length === 0) {
      markets = await tryProxyRoute(networkId);
    }
    
    if (markets.length > 0) {
      console.log(`Using ${markets.length} markets from ${CHAIN_NAMES[networkId]}`);
      return { markets, networkId };
    }
  }
  
  console.error("No markets found on any network");
  return { markets: [], networkId: NETWORK_IDS.OPTIMISM };
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
    
    // Update cache if we found markets
    if (markets.length > 0) {
      marketsCache = {
        timestamp: now,
        markets,
        networkId
      };
    }
    
    return markets;
  } catch (error) {
    console.error('Failed to fetch active markets:', error);
    
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
      console.log('No markets available');
      return null;
    }
    
    // Find market with highest liquidity/interest
    // Sort by status (prioritize active games) and maturity (closest game first)
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
        odds: market.odds ? market.odds.map(o => o.decimal) : [market.homeOdds, market.awayOdds, market.drawOdds || 0],
        combinedPositions: ["", "", ""]
      }]
    };
    
    // Try both the direct endpoint and the proxy
    const directUrl = `https://overtimemarketsv2.xyz/overtime-v2/networks/${networkId}/quote`;
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(directUrl)}`;
    
    const urls = [directUrl, proxyUrl];
    
    for (const url of urls) {
      try {
        console.log(`Trying to get quote from: ${url}`);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(tradeData)
        });
        
        if (response.ok) {
          const quoteData = await response.json();
          return quoteData;
        }
      } catch (err) {
        console.error(`Error getting quote from ${url}:`, err);
      }
    }
    
    throw new Error("Failed to get quote from any of the API endpoints");
  } catch (error) {
    console.error('Error getting quote:', error);
    throw error; // Re-throw to handle in the UI
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
    
    // Chain ID from the market
    const networkId = market.networkId;
    
    // Define ABI for the SportsAMMV2 contract - from the SportsAMMV2.sol
    const SPORTS_AMM_ABI = [
      "function trade(tuple(bytes32 gameId, bytes32 sportId, bytes32 typeId, uint maturity, bytes32 status, int line, bytes32 playerId, uint position, uint[] odds, string[] combinedPositions)[] _tradeData, uint _buyInAmount, uint _expectedQuote, uint _additionalSlippage, address _referrer, address _collateral, bool _isEth) payable returns (address)"
    ];
    
    // ABI for ERC20 (USDC)
    const ERC20_ABI = [
      "function approve(address spender, uint256 amount) returns (bool)",
      "function balanceOf(address owner) view returns (uint256)"
    ];
    
    // Get contract addresses for the network
    const contractAddresses = CONTRACT_ADDRESSES[networkId];
    if (!contractAddresses) {
      throw new Error(`Unsupported network: ${networkId}`);
    }
    
    // Create provider and signer
    const ethersProvider = new ethers.BrowserProvider(provider);
    const signer = await ethersProvider.getSigner();
    
    // Check that user is on the correct network - Fixed for ethers v6
    const network = await ethersProvider.getNetwork();
    const chainId = Number(network.chainId);
    if (chainId !== networkId) {
      throw new Error(`Please switch to ${CHAIN_NAMES[networkId]} network to place this bet`);
    }
    
    // Create contract instances
    const usdcContract = new ethers.Contract(contractAddresses.USDC, ERC20_ABI, signer);
    const sportsAMMContract = new ethers.Contract(contractAddresses.OVERTIME_AMM, SPORTS_AMM_ABI, signer);
    
    // Convert amount to USDC units (USDC has 6 decimals)
    const amountInWei = ethers.parseUnits(amount, 6);
    
    // Check USDC balance
    const balance = await usdcContract.balanceOf(await signer.getAddress());
    if (balance < amountInWei) {
      throw new Error(`Insufficient USDC balance. You have ${ethers.formatUnits(balance, 6)} USDC but need ${amount} USDC.`);
    }
    
    // Get quote for the bet - this determines expected payout
    const quote = await getQuote(market, position, parseFloat(amount), networkId);
    if (!quote || !quote.quoteData || !quote.quoteData.totalQuote) {
      throw new Error("Failed to get quote for this bet");
    }
    
    // Approve USDC spending
    console.log("Approving USDC...");
    const approveTx = await usdcContract.approve(contractAddresses.OVERTIME_AMM, amountInWei);
    await approveTx.wait();
    
    // Format trade data according to contract requirements
    const tradeData = [{
      gameId: market.gameId,
      sportId: market.sportId || 0,
      typeId: market.typeId || 0,
      maturity: market.maturity || 0,
      status: market.status || 0,
      line: market.line || 0,
      playerId: market.playerId || ethers.ZeroHash,
      position: position,
      odds: market.odds ? market.odds.map(o => o.decimal) : [market.homeOdds, market.awayOdds, market.drawOdds || 0],
      combinedPositions: ["", "", ""]
    }];
    
    // Place the bet
    console.log("Placing bet...");
    const betTx = await sportsAMMContract.trade(
      tradeData,
      amountInWei,
      quote.quoteData.totalQuote.decimal || 0,
      ethers.parseUnits("0.02", 18), // 2% slippage allowed
      ethers.ZeroAddress, // No referrer
      contractAddresses.USDC, // Using USDC
      false // Not using ETH
    );
    
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
