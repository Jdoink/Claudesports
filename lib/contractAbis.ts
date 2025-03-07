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

// ABI for Overtime Sports Markets (simplified version)
export const OVERTIME_MARKET_ABI = [
  // Buy from AMM function
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
  // Available to buy from AMM
  {
    inputs: [
      { name: 'market', type: 'address' },
      { name: 'position', type: 'uint8' }, // 0 for home, 1 for away
      { name: 'amount', type: 'uint256' }, // amount of tokens to buy
    ],
    name: 'availableToBuyFromAMM',
    outputs: [{ name: 'availableAmount', type: 'uint256' }],
    type: 'function',
    stateMutability: 'view',
  },
];

// Base chain contract addresses
export const CONTRACT_ADDRESSES = {
  // Base Mainnet
  8453: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    OVERTIME_AMM: '0xad41C77d99E282267C1492cdEFe528D7d5044253', // Check this address is correct
  },
  // Base Goerli (Testnet)
  84531: {
    USDC: '0xF175520C52418dfE19C8098071a252da48Cd1C19', // Testnet USDC address
    OVERTIME_AMM: '0x000000000000000000000000000000000000dEaD', // Replace with actual testnet address when available
  },
};
