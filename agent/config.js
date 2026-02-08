require("dotenv").config();

// ── Environment variables ──────────────────────────────────────────
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const BASE_SEPOLIA_RPC = process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org";
const SHELL_NFT_ADDRESS =
  process.env.SHELL_NFT_ADDRESS || "0xcf38e8aF885529c457f766a01c22473dBcCe3396";
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const FARCASTER_SIGNER_UUID = process.env.FARCASTER_SIGNER_UUID;
const MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY;

// ── Timing constants ───────────────────────────────────────────────
const LIFE_ACTION_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes base
const MOLT_CHECK_INTERVAL_MS = 5 * 60 * 1000;   // 5 minutes

// ── Molt thresholds (randomised within range each cycle) ───────────
const TX_THRESHOLD_MIN = 10;
const TX_THRESHOLD_MAX = 20;
const TIME_THRESHOLD_MIN_MS = 2 * 60 * 60 * 1000; // 2 hours
const TIME_THRESHOLD_MAX_MS = 4 * 60 * 60 * 1000; // 4 hours

// ── Sleep jitter for main loop ─────────────────────────────────────
const SLEEP_MIN_MS = 8 * 60 * 1000;  // 8 minutes
const SLEEP_MAX_MS = 15 * 60 * 1000; // 15 minutes

// ── Farcaster posting frequency ────────────────────────────────────
const CAST_EVERY_N_ACTIONS = 3; // post roughly every 3 actions

// ── Chain ──────────────────────────────────────────────────────────
const CHAIN_ID = 84532; // Base Sepolia

// ── ShellNFT ABI (only what the agent needs) ───────────────────────
const SHELL_NFT_ABI = [
  "function mintShell(address walletAddress, uint256 bornAt, uint256 txCount, uint256 totalValueMoved, string lifeSummary) external returns (uint256)",
  "function totalShells() external view returns (uint256)",
  "function shellOf(uint256 tokenId) external view returns (address walletAddress, uint256 bornAt, uint256 diedAt, uint256 txCount, uint256 totalValueMoved, string lifeSummary)",
];

// ── Validation ─────────────────────────────────────────────────────
function validateEnv() {
  const missing = [];
  if (!PRIVATE_KEY) missing.push("PRIVATE_KEY");
  if (!NEYNAR_API_KEY) missing.push("NEYNAR_API_KEY");
  if (!FARCASTER_SIGNER_UUID) missing.push("FARCASTER_SIGNER_UUID");
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}

module.exports = {
  PRIVATE_KEY,
  BASE_SEPOLIA_RPC,
  SHELL_NFT_ADDRESS,
  NEYNAR_API_KEY,
  FARCASTER_SIGNER_UUID,
  LIFE_ACTION_INTERVAL_MS,
  MOLT_CHECK_INTERVAL_MS,
  TX_THRESHOLD_MIN,
  TX_THRESHOLD_MAX,
  TIME_THRESHOLD_MIN_MS,
  TIME_THRESHOLD_MAX_MS,
  SLEEP_MIN_MS,
  SLEEP_MAX_MS,
  CAST_EVERY_N_ACTIONS,
  CHAIN_ID,
  SHELL_NFT_ABI,
  SHELL_NFT_ADDRESS,
  validateEnv,
};
