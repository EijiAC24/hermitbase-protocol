const { ethers } = require("ethers");
const {
  TX_THRESHOLD_MIN,
  TX_THRESHOLD_MAX,
  TIME_THRESHOLD_MIN_MS,
  TIME_THRESHOLD_MAX_MS,
  SHELL_NFT_ADDRESS,
  SHELL_NFT_ABI,
} = require("./config");
const { getBalance, formatEth } = require("./wallet-manager");

// ── Helpers ────────────────────────────────────────────────────────

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Molt condition check ───────────────────────────────────────────

/**
 * Decide whether it's time to molt. Uses randomised thresholds so the
 * agent doesn't molt at perfectly predictable intervals.
 *
 * Returns { shouldMolt: boolean, reason: string }
 */
function shouldMolt(state) {
  const now = Date.now();
  const age = now - state.shellBornAt;
  const txCount = state.txCount;

  // Pick thresholds with some randomness each check
  const txThreshold = randomInt(TX_THRESHOLD_MIN, TX_THRESHOLD_MAX);
  const timeThreshold = randomInt(TIME_THRESHOLD_MIN_MS, TIME_THRESHOLD_MAX_MS);

  // Must meet BOTH a minimum tx count (at least TX_THRESHOLD_MIN) AND
  // a minimum time (at least TIME_THRESHOLD_MIN) before molt can trigger.
  // After that, either threshold being exceeded triggers molt with randomness.
  if (txCount < TX_THRESHOLD_MIN && age < TIME_THRESHOLD_MIN_MS) {
    return { shouldMolt: false, reason: "Too young and too few transactions" };
  }

  if (txCount >= txThreshold) {
    return {
      shouldMolt: true,
      reason: `Transaction threshold reached (${txCount} >= ${txThreshold})`,
    };
  }

  if (age >= timeThreshold) {
    return {
      shouldMolt: true,
      reason: `Time threshold reached (${Math.round(age / 60000)}min >= ${Math.round(timeThreshold / 60000)}min)`,
    };
  }

  return { shouldMolt: false, reason: "Not yet time" };
}

// ── Molt execution ─────────────────────────────────────────────────

/**
 * Execute a full molt:
 *  1. Collect stats from old wallet
 *  2. Migrate remaining ETH to new wallet
 *  3. Mint a ShellNFT of the old wallet
 *  4. Return molt summary
 *
 * @param {object} state       Current agent state
 * @param {Wallet} oldWallet   The wallet being shed
 * @param {Wallet} newWallet   The new wallet to inhabit
 * @returns {object} Molt summary
 */
async function molt(state, oldWallet, newWallet) {
  console.log("[molt] Beginning molt procedure...");
  console.log(`[molt] Old shell: ${oldWallet.address}`);
  console.log(`[molt] New shell: ${newWallet.address}`);

  // 1. Collect stats
  const oldBalance = await getBalance(oldWallet.address);
  const stats = {
    shellIndex: state.currentShellIndex,
    address: oldWallet.address,
    bornAt: state.shellBornAt,
    txCount: state.txCount,
    totalValueMoved: state.totalValueMoved,
    finalBalance: oldBalance,
  };

  console.log(`[molt] Old shell stats: ${stats.txCount} txs, balance ${formatEth(oldBalance)} ETH`);

  // 2. Mint ShellNFT (agent wallet has mint permission)
  let migrationTxHash = null;
  let mintTxHash = null;
  let shellTokenId = null;

  try {
    const contract = new ethers.Contract(SHELL_NFT_ADDRESS, SHELL_NFT_ABI, oldWallet);

    const lifeSummary = buildLifeSummary(stats);
    console.log(`[molt] Minting ShellNFT for old wallet...`);

    const mintTx = await contract.mintShell(
      stats.address,
      BigInt(Math.floor(stats.bornAt / 1000)),       // unix seconds
      BigInt(stats.txCount),
      BigInt(stats.totalValueMoved),
      lifeSummary
    );
    const receipt = await mintTx.wait();
    mintTxHash = receipt.hash;

    // Try to extract tokenId from logs
    try {
      const iface = new ethers.Interface(SHELL_NFT_ABI);
      // Look for Transfer event (ERC721) to get tokenId
      for (const log of receipt.logs) {
        try {
          // ERC721 Transfer: Transfer(address,address,uint256)
          if (log.topics[0] === ethers.id("Transfer(address,address,uint256)")) {
            shellTokenId = BigInt(log.topics[3]).toString();
            break;
          }
        } catch (_) { /* skip non-matching logs */ }
      }
    } catch (_) { /* tokenId extraction is best-effort */ }

    console.log(`[molt] ShellNFT minted! tx: ${mintTxHash}, tokenId: ${shellTokenId || "unknown"}`);
  } catch (err) {
    console.error("[molt] ShellNFT mint failed:", err.message);
  }

  // 4. Build summary
  const summary = {
    oldShellIndex: stats.shellIndex,
    newShellIndex: stats.shellIndex + 1,
    oldAddress: stats.address,
    newAddress: newWallet.address,
    txCount: stats.txCount,
    totalValueMoved: stats.totalValueMoved,
    migrationTxHash,
    mintTxHash,
    shellTokenId,
    lifeSummary: buildLifeSummary(stats),
  };

  console.log("[molt] Molt complete.");
  return summary;
}

// ── Life summary text ──────────────────────────────────────────────

function buildLifeSummary(stats) {
  const ageMs = Date.now() - stats.bornAt;
  const ageHours = (ageMs / (1000 * 60 * 60)).toFixed(1);
  const ethMoved = formatEth(BigInt(stats.totalValueMoved));
  return `Shell #${stats.shellIndex} lived ${ageHours}h, made ${stats.txCount} transactions, moved ${ethMoved} ETH. Born ${new Date(stats.bornAt).toISOString()}.`;
}

module.exports = { shouldMolt, molt };
