// lib/contractAbis.ts - Complete file with correct contract information
// ABI for ERC20 token (USDC)
export const ERC20_ABI = [
  // Read-only functions
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  // Write functions
  {
    constant: false,
    inputs: [
      { name: '_spender', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      { name: '_owner', type: 'address' },
      { name: '_spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
];

// ABI for Overtime Sports Markets AMM V2 (simplified version)
export const OVERTIME_MARKET_ABI = [
  // buyFromAMMWithDifferentCollateralAndReferrer function
  {
    inputs: [
      { name: 'market', type: 'address' },
      { name: 'position', type: 'uint8' }, // 0 for home, 1 for away
      { name: 'amount', type: 'uint256' }, // amount of collateral to spend
      { name: 'expectedPayout', type: 'uint256' }, // minimum expected payout (slippage protection)
      { name: 'collateral', type: 'address' }, // collateral token address (USDC)
      { name: 'referrer', type: 'address' }, // referrer address (can be zero)
    ],
    name: 'buyFromAMMWithDifferentCollateralAndReferrer',
    outputs: [{ name: 'payout', type: 'uint256' }],
    type: 'function',
    stateMutability: 'nonpayable',
  },
  // buyFromAMM function
  {
    inputs: [
      { name: 'market', type: 'address' },
      { name: 'position', type: 'uint8' }, // 0 for home, 1 for away
      { name: 'amount', type: 'uint256' }, // amount of tokens to buy
      { name: 'expectedPayout', type: 'uint256' }, // expected payout (slippage protection)
      { name: 'additionalSlippage', type: 'uint256' }, // additional allowed slippage
    ],
    name: 'buyFromAMM',
    outputs: [{ name: 'payout', type: 'uint256' }],
    type: 'function',
    stateMutability: 'nonpayable',
  },
];

// Base chain contract addresses
export const CONTRACT_ADDRESSES = {
  // Base Mainnet
  8453: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    OVERTIME_AMM: '0x80903Aa4d358542652c8D4B33cd942EA1Bf8fd41', // Updated from the docs
    SPORT_MARKETS_MANAGER: '0x3Ed830e92eFfE68C0d1216B2b5115B1bceBB087C',
  },
  // Base Goerli (Testnet)
  84531: {
    USDC: '0xF175520C52418dfE19C8098071a252da48Cd1C19', // Testnet USDC address
    OVERTIME_AMM: '0x000000000000000000000000000000000000dEaD', // Replace with actual testnet address when available
    SPORT_MARKETS_MANAGER: '0x000000000000000000000000000000000000dEaD', // Replace with actual testnet address when available
  },
};
