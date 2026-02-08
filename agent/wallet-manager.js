const { ethers } = require("ethers");
const { PRIVATE_KEY, BASE_SEPOLIA_RPC } = require("./config");

// ── Provider (shared singleton) ────────────────────────────────────
let _provider = null;

function getProvider() {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
  }
  return _provider;
}

// ── Wallet from private key ────────────────────────────────────────

let _wallet = null;

function getWallet() {
  if (!_wallet) {
    _wallet = new ethers.Wallet(PRIVATE_KEY, getProvider());
  }
  return _wallet;
}

// Keep compatibility with index.js calls
function getCurrentWallet(_shellIndex) {
  return getWallet();
}

function getNextWallet(_shellIndex) {
  // For hackathon: agent stays on same wallet, molt is narrative-only
  return getWallet();
}

/**
 * Fetch the ETH balance of an address (returns BigInt wei).
 */
async function getBalance(address) {
  const provider = getProvider();
  return provider.getBalance(address);
}

/**
 * Pretty-format a wei amount to ETH string with fixed decimals.
 */
function formatEth(wei, decimals = 6) {
  return parseFloat(ethers.formatEther(wei)).toFixed(decimals);
}

module.exports = {
  getProvider,
  getWallet,
  getCurrentWallet,
  getNextWallet,
  getBalance,
  formatEth,
};
