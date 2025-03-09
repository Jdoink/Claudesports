// lib/betUtils.ts - Separate file for contract interactions
import { Market } from './overtimeApi';

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
    const { CONTRACT_ADDRESSES, OVERTIME_MARKET_ABI, ERC20_ABI } = await import('@/lib/contractAbis');
    
    // Chain ID from the market
    const networkId = market.networkId || 8453; // Default to Base if not specified
    
    // Create provider and signer
    const ethersProvider = new ethers.BrowserProvider(provider);
    const signer = await ethersProvider.getSigner();
    
    // Check that user is on the correct network
    const chainId = await ethersProvider.getNetwork().then(network => Number(network.chainId));
    
    // Convert chainId to number for comparison
    if (chainId !== networkId) {
      throw new Error(`Please switch to the correct network to place this bet`);
    }
    
    // Get contract addresses for the network
    const contractAddresses = CONTRACT_ADDRESSES[networkId];
    if (!contractAddresses) {
      throw new Error(`Unsupported network: ${networkId}`);
    }
    
    // FIX: Ensure market address is properly checksummed
    const checksummedMarketAddress = ethers.getAddress(market.address);
    console.log("Using checksummed market address:", checksummedMarketAddress);
    
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
    // For simplicity, let's use a hardcoded slippage of 5%
    const expectedPayout = parseFloat(amount) * (position === 0 ? market.homeOdds : market.awayOdds);
    const slippageAdjustedPayout = expectedPayout * 0.95; // 5% slippage
    
    // Approve USDC spending
    console.log("Approving USDC...");
    const approveTx = await usdcContract.approve(contractAddresses.OVERTIME_AMM, amountInWei);
    await approveTx.wait();
    
    // Place the bet using buyFromAMMWithDifferentCollateralAndReferrer function
    console.log("Placing bet...");
    const betTx = await overtimeAMMContract.buyFromAMMWithDifferentCollateralAndReferrer(
      checksummedMarketAddress,  // Use checksummed address instead of market.address
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
  } catch (error) {
    console.error('Failed to place bet:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Convert American odds format to decimal odds
 * @param americanOdds American odds value (e.g. +200, -150)
 * @returns Decimal odds value
 */
export function americanToDecimal(americanOdds: number): number {
  if (americanOdds > 0) {
    return 1 + (americanOdds / 100);
  } else {
    return 1 + (100 / Math.abs(americanOdds));
  }
}

/**
 * Convert decimal odds to American format
 * @param decimalOdds Decimal odds value
 * @returns American odds value
 */
export function decimalToAmerican(decimalOdds: number): number {
  if (decimalOdds >= 2) {
    return Math.round((decimalOdds - 1) * 100);
  } else {
    return Math.round(-100 / (decimalOdds - 1));
  }
}

/**
 * Calculate potential win amount
 * @param betAmount Bet amount
 * @param odds Odds value (decimal format)
 * @returns Potential win amount
 */
export function calculateWinAmount(betAmount: number, odds: number): number {
  return betAmount * odds;
}
