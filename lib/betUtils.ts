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
    const contractAbis = await import('@/lib/contractAbis');
    
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
    
    // Get contract addresses for the network using a type-safe approach
    let contractAddresses;
    
    switch(networkId) {
      case 8453: // Base
        contractAddresses = {
          USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          OVERTIME_AMM: '0x80903Aa4d358542652c8D4B33cd942EA1Bf8fd41',
          SPORT_MARKETS_MANAGER: '0x3Ed830e92eFfE68C0d1216B2b5115B1bceBB087C',
        };
        break;
      case 10: // Optimism
        contractAddresses = {
          USDC: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
          OVERTIME_AMM: '0xad41C77d99E282267C1492cdEFe528D7d5044253',
          SPORT_MARKETS_MANAGER: '0x8606926e4c3Cfb9d4B6742A62e1923854F4026dc',
        };
        break;
      case 42161: // Arbitrum
        contractAddresses = {
          USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
          OVERTIME_AMM: '0x82872A82E70081D42f5c2610259324Bb463B2bC2',
          SPORT_MARKETS_MANAGER: '0xb3E8C659CF95BeA8c81d8D06407C5c7A2D75B1BC',
        };
        break;
      default:
        throw new Error(`Unsupported network: ${networkId}`);
    }
    
    // FIX: Ensure market address is properly checksummed
    const checksummedMarketAddress = ethers.getAddress(market.address);
    console.log("Using checksummed market address:", checksummedMarketAddress);
    
    // Create contract instances
    const usdcContract = new ethers.Contract(contractAddresses.USDC, contractAbis.ERC20_ABI, signer);
    const overtimeAMMContract = new ethers.Contract(contractAddresses.OVERTIME_AMM, contractAbis.OVERTIME_MARKET_ABI, signer);
    
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
