import { Address, encodeFunctionData, parseUnits, zeroAddress } from "viem";
import { polygon } from "viem/chains";

// Constants from examples
export const SAFE_FACTORY_ADDRESS = "0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b" as Address;
export const SAFE_MULTISEND_ADDRESS = "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761" as Address;
export const USDC_ADDRESS = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174" as Address;
export const USDCE_DIGITS = 6;
export const SAFE_FACTORY_NAME = "Polymarket Contract Proxy Factory";
export const CHAIN_ID = polygon.id;

// Safe Factory ABI (simplified)
export const SAFE_FACTORY_ABI = [
  {
    inputs: [
      { name: "paymentToken", type: "address" },
      { name: "payment", type: "uint256" },
      { name: "paymentReceiver", type: "address" },
      { name: "signature", type: "bytes" },
    ],
    name: "createProxy",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "computeProxyAddress",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Safe ABI (simplified - key functions)
export const SAFE_ABI = [
  {
    inputs: [],
    name: "nonce",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "operation", type: "uint8" },
      { name: "safeTxGas", type: "uint256" },
      { name: "baseGas", type: "uint256" },
      { name: "gasPrice", type: "uint256" },
      { name: "gasToken", type: "address" },
      { name: "refundReceiver", type: "address" },
      { name: "nonce", type: "uint256" },
    ],
    name: "getTransactionHash",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "operation", type: "uint8" },
      { name: "safeTxGas", type: "uint256" },
      { name: "baseGas", type: "uint256" },
      { name: "gasPrice", type: "uint256" },
      { name: "gasToken", type: "address" },
      { name: "refundReceiver", type: "address" },
      { name: "signatures", type: "bytes" },
    ],
    name: "execTransaction",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// ERC20 ABI
export const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export interface SafeTransaction {
  to: Address;
  value: bigint;
  data: `0x${string}`;
  operation: 0 | 1; // 0 = Call, 1 = DelegateCall
}

/**
 * Calculate Safe wallet address deterministically
 * Note: This is a simplified version. The actual calculation is more complex.
 * For production, you should use the Safe SDK or query the factory.
 */
export function calculateSafeAddress(owner: Address): Address {
  // This is a placeholder - actual calculation requires the Safe factory's logic
  // In production, you should query the factory or use the Safe SDK
  return zeroAddress;
}

/**
 * Encode ERC20 approve function call
 */
export function encodeERC20Approve(spender: Address, amount: bigint): `0x${string}` {
  return encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "approve",
    args: [spender, amount],
  });
}

/**
 * Encode ERC20 transfer function call
 */
export function encodeERC20Transfer(to: Address, amount: bigint): `0x${string}` {
  return encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [to, amount],
  });
}

/**
 * Parse USDC amount (6 decimals)
 */
export function parseUSDC(amount: string): bigint {
  return parseUnits(amount, USDCE_DIGITS);
}

/**
 * Format USDC amount (6 decimals)
 */
export function formatUSDC(amount: bigint): string {
  return (Number(amount) / 10 ** USDCE_DIGITS).toFixed(USDCE_DIGITS);
}

