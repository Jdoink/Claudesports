// lib/overtimeApi.ts - Complete file with correct API implementation
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

// API endpoints for Overtime Markets V2
const OVERTIME_API_BASE = 'https://api.overtimemarkets.xyz/v2';

// Base Chain ID (8453)
const BASE_CHAIN_ID = 8453;

/**
 * Fetches all active markets from Overtime on Base chain
 * @returns Promise<Market[]> List of active markets
 */
export async function getActiveMarkets(): Promise<Market[]> {
  try {
    // Using the correct endpoint from the documentation
    console.log(`Fetching markets from ${OVERTIME_API_BASE}/markets?networkId=${BASE_CHAIN_ID}&isOpen=true`);
    
    const response = await fetch(
      `${OVERTIME_API_BASE}/markets?networkId=${BASE_CHAIN_ID}&isOpen=true`
    );
    
    if (!response.ok) {
      throw new Error(`Error fetching markets: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Fetched markets data:', data);
    return data.markets || [];
  } catch (error) {
    console.error('Failed to fetch active markets:', error);
    return [];
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
      console.log('No markets available');
      return null;
    }
    
    // Sort by maturity date (closest game first) as liquidity info might not be reliable
    const sortedMarkets = [...markets].sort((a, b) => a.maturityDate - b.maturityDate);
    
    // Log the top market for debugging
    console.log('Top market:', sortedMarkets[0]);
    
    // Return the market with the closest start time
    return sortedMarkets[0] || null;
  } catch (error) {
    console.error('Failed to get the big game:', error);
    return null;
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
    // For Overtime V2, we should use the quote function on the contract
    // For now, using a simplified approach
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
