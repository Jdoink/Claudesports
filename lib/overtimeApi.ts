// lib/overtimeApi.ts - Clean implementation with real data only
import { ethers } from 'ethers';

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
const CHAIN_NAMES: Record<number, string> = {
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
  networkId: NETWORK_IDS.BASE
};

// Cache expiration in milliseconds (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

/**
 * Fetch data from the Overtime API with error handling
 */
async function fetchApi(url: string, options: RequestInit = {}): Promise<any> {
  try {
    console.log(`Fetching from: ${url}`);
    
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
      console.error(`API returned status ${response.status}: ${response.statusText}`);
      throw new Error(`API returned status ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    
    // Try via proxy if direct call fails
    try {
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
        throw new Error(`Proxy API returned status ${proxyResponse.status}`);
      }
      
      return await proxyResponse.json();
    } catch (proxyError) {
      console.error(`Proxy fetch error for ${url}:`, proxyError);
      throw error; // Re-throw the original error
    }
  }
}

/**
 * Get all markets from a specific network
 */
async function getMarketsForNetwork(networkId: number): Promise<Market[]> {
  // Use the official endpoint from Overtime API documentation
  const url = `https://api.overtimemarkets.xyz/v2/networks/${networkId}/markets?status=open`;
  
  console.log(`Fetching markets from: ${url}`);
  const data = await fetchApi(url);
  
  let markets: Market[] = [];
  
  // Parse API response
  Object.keys(data).forEach(sport => {
    Object.keys(data[sport]).forEach(leagueId => {
      const leagueMarkets = data[sport][leagueId];
      if (Array.isArray(leagueMarkets)) {
        markets = markets.concat(leagueMarkets);
      }
    });
  });
  
  // Ensure all addresses are properly checksummed
  markets = markets.map(market => ({
    ...market,
    address: ethers.getAddress(market.address) // Fix checksum format
  }));
  
  console.log(`Found ${markets.length} markets on ${CHAIN_NAMES[networkId] || 'Unknown Chain'}`);
  return markets;
}

/**
 * Find markets from all supported networks
 */
async function findMarketsFromAllNetworks(): Promise<{ markets: Market[], networkId: number }> {
  // Try networks in order of preference
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
  
  // If no markets found on any network, return empty array
  throw new Error("No markets found on any supported network");
}

/**
 * Get active markets
 */
export async function getActiveMarkets(): Promise<Market[]> {
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
}

/**
 * Get the "Big Game" - the market with highest liquidity
 */
export async function getBigGame(): Promise<Market | null> {
  const markets = await getActiveMarkets();
  
  if (markets.length === 0) {
    console.log('No markets available');
    throw new Error("No available markets found");
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
  console.log('Selected top market:', topMarket);
  
  return topMarket;
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
  // Format the trade data
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
  
  const url = `https://api.overtimemarkets.xyz/v2/networks/${networkId}/quote`;
  
  const response = await fetchApi(url, {
    method: 'POST',
    body: JSON.stringify(tradeData)
  });
  
  return response;
}

/**
 * Place a bet using the Overtime Markets contract
 */
export async function placeBet(
  market: Market,
  amount: string,
  position: number,
  provider: any
): Promise<{ success: boolean; message: string; txHash?: string }> {
  if (!provider) {
    throw new Error("Wallet not connected");
  }
  
  // Import necessary libraries
  const { ethers } = await import('ethers');
  const { CONTRACT_ADDRESSES, OVERTIME_MARKET_ABI, ERC20_ABI } = await import('@/lib/contractAbis');
  
  // Chain ID from the market
  const networkId = market.networkId;
  
  // Create provider and signer
  const ethersProvider = new ethers.BrowserProvider(provider);
  const signer = await ethersProvider.getSigner();
  
  // Check that user is on the correct network
  const chainId = await ethersProvider.getNetwork().then(network => Number(network.chainId));
  
  // Convert chainId to number for comparison
  if (chainId !== networkId) {
    throw new Error(`Please switch to ${CHAIN_NAMES[networkId]} network to place this bet`);
  }
  
  // Get contract addresses for the network
  const contractAddresses = CONTRACT_ADDRESSES[networkId];
  if (!contractAddresses) {
    throw new Error(`Unsupported network: ${networkId}`);
  }
  
  // Ensure market address is in correct checksum format
  const checksummedMarketAddress = ethers.getAddress(market.address);
  console.log(`Using checksummed market address: ${checksummedMarketAddress}`);
  
  // Create contract instances
  const usdcContract = new ethers.Contract(contractAddresses.USDC, ERC20_ABI, signer);
  const overtimeAMMContract = new ethers.Contract(contractAddresses.OVERTIME_AMM, OVERTIME_MARKET_ABI, signer);
  
  // Convert amount to USDC units (USDC has 6 decimals)
  const amountInWei = ethers.parseUnits(amount, 6);
  
  // Check USDC balance
  const balance = await usdcContract.balanceOf(await signer.getAddress());
  if (balance < amountInWei) {
    throw new Error(`Insufficient USDC balance. You have ${ethers.formatUnits(balance, 6)} USDC but need ${amount} USDC.`);
  }
  
  // Get quote for the bet - this determines expected payout
  const expectedOdds = position === 0 ? market.homeOdds : market.awayOdds;
  const expectedPayout = parseFloat(amount) * expectedOdds;
  const slippageAdjustedPayout = expectedPayout * 0.95; // 5% slippage protection
  
  // Approve USDC spending
  console.log("Approving USDC...");
  const approveTx = await usdcContract.approve(contractAddresses.OVERTIME_AMM, amountInWei);
  await approveTx.wait();
  
  // Place the bet using buyFromAMMWithDifferentCollateralAndReferrer function
  console.log("Placing bet...");
  const betTx = await overtimeAMMContract.buyFromAMMWithDifferentCollateralAndReferrer(
    checksummedMarketAddress,  // Use checksummed address
    position,                  // 0 for home, 1 for away
    amountInWei,               // amount of USDC to spend
    ethers.parseUnits(slippageAdjustedPayout.toString(), 6),  // minimum expected payout with slippage
    contractAddresses.USDC,    // USDC address
    ethers.ZeroAddress         // no referrer
  );
  
  const receipt = await betTx.wait();
  
  return {
    success: true,
    message: "Bet placed successfully!",
    txHash: receipt.hash
  };
}

/**
 * Get the current network ID being used
 */
export function getCurrentNetworkId(): number {
  return marketsCache.networkId;
}
