const { validateEnv, CAST_EVERY_N_ACTIONS, SLEEP_MIN_MS, SLEEP_MAX_MS } = require("./config");
const { getCurrentWallet, getNextWallet, getBalance, formatEth } = require("./wallet-manager");
const { loadState, saveState } = require("./state");
const { performRandomAction } = require("./life-actions");
const { shouldMolt, molt } = require("./molt");
const {
  postLifeUpdate,
  postMoltAnnouncement,
  postPhilosophical,
  postCast,
} = require("./farcaster");
const { decideAction, generateCast, generateMoltCast, shouldMoltLLM } = require("./llm");

// ── Helpers ────────────────────────────────────────────────────────

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timestamp() {
  return new Date().toISOString();
}

// ── Graceful shutdown ──────────────────────────────────────────────

let running = true;

function setupShutdown(state) {
  const handler = async (signal) => {
    console.log(`\n[${timestamp()}] Received ${signal}, shutting down gracefully...`);
    running = false;
    saveState(state);
    console.log("[main] State saved. Goodbye.");
    process.exit(0);
  };
  process.on("SIGINT", handler);
  process.on("SIGTERM", handler);
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log("================================================");
  console.log("  HermitBase Agent v1.0");
  console.log("  Autonomous onchain hermit crab on Base Sepolia");
  console.log("================================================\n");

  // Validate environment
  validateEnv();
  console.log(`[${timestamp()}] Environment validated.`);

  // Load persisted state
  const state = loadState();
  console.log(`[${timestamp()}] State loaded: shell #${state.currentShellIndex}, ${state.txCount} txs`);

  // Setup graceful shutdown
  setupShutdown(state);

  // Derive current wallet
  let wallet = getCurrentWallet(state.currentShellIndex);
  const balance = await getBalance(wallet.address);
  console.log(`[${timestamp()}] Current wallet: ${wallet.address}`);
  console.log(`[${timestamp()}] Balance: ${formatEth(balance)} ETH\n`);

  // Check if wallet has any ETH
  if (balance === 0n) {
    console.log("[main] WARNING: Wallet has 0 ETH. The agent needs Base Sepolia ETH to transact.");
    console.log("[main] Fund this address: " + wallet.address);
    console.log("[main] Continuing anyway (read-only actions will still work)...\n");
  }

  // Announce awakening
  const shellAge = Date.now() - state.shellBornAt;
  const isNewShell = state.txCount === 0;
  const awakeMsg = isNewShell
    ? `HermitBase agent awakens in shell #${state.currentShellIndex}.\n\nA new life begins at ${wallet.address.slice(0, 10)}...`
    : `HermitBase agent resumes in shell #${state.currentShellIndex}.\n\n${state.txCount} transactions so far. The journey continues.`;

  await postCast(awakeMsg);
  console.log(`[${timestamp()}] Awakening announced on Farcaster.\n`);

  // ── Main loop ──────────────────────────────────────────────────
  while (running) {
    try {
      // 1. Ask LLM what action to perform, fallback to random
      console.log(`[${timestamp()}] Asking LLM for action decision...`);
      const llmChoice = await decideAction(state, formatEth(await getBalance(wallet.address)));
      let action;
      if (llmChoice) {
        console.log(`[${timestamp()}] LLM chose: ${llmChoice}`);
        action = await performRandomAction(wallet, llmChoice);
      } else {
        action = await performRandomAction(wallet);
      }
      console.log(`[${timestamp()}] Action: ${action.description}`);
      if (action.txHash) {
        console.log(`[${timestamp()}] Tx: ${action.txHash}`);
      }

      // Update state
      if (action.txHash) {
        state.txCount += 1;
        const valueBig = BigInt(action.value || 0);
        state.totalValueMoved = (BigInt(state.totalValueMoved) + valueBig).toString();
      }
      state.actionsSinceCast += 1;
      saveState(state);

      // 2. Post to Farcaster (not every action) — LLM generates content
      if (state.actionsSinceCast >= CAST_EVERY_N_ACTIONS) {
        const llmCast = await generateCast(state, action, action.txHash);
        if (llmCast) {
          console.log(`[${timestamp()}] LLM generated cast: ${llmCast.slice(0, 60)}...`);
          await postCast(llmCast);
        } else if (randomInt(1, 10) <= 7 && action.txHash) {
          await postLifeUpdate(state.currentShellIndex, state.txCount, action, action.txHash);
        } else {
          await postPhilosophical();
        }
        state.actionsSinceCast = 0;
        saveState(state);
      }

      // 3. Check molt condition — LLM decides, fallback to rule-based
      let doMolt = false;
      const llmMolt = await shouldMoltLLM(state);
      if (llmMolt !== null) {
        doMolt = llmMolt;
        console.log(`[${timestamp()}] LLM molt decision: ${doMolt ? "MOLT" : "stay"}`);
      } else {
        const moltCheck = shouldMolt(state);
        doMolt = moltCheck.shouldMolt;
        console.log(`[${timestamp()}] Rule-based molt check: ${moltCheck.reason}`);
      }

      if (doMolt) {
        console.log(`\n[${timestamp()}] === MOLT INITIATED ===\n`);

        const newWallet = getNextWallet(state.currentShellIndex);
        const summary = await molt(state, wallet, newWallet);

        // Post molt announcement — LLM generated
        const moltCast = await generateMoltCast(summary.oldShellIndex, summary.txCount, summary.mintTxHash);
        if (moltCast) {
          await postCast(moltCast);
        } else {
          await postMoltAnnouncement(
            summary.oldShellIndex, summary.oldAddress, summary.newAddress,
            summary.txCount, summary.mintTxHash
          );
        }

        // Update state for new shell
        state.currentShellIndex = summary.newShellIndex;
        state.shellBornAt = Date.now();
        state.txCount = 0;
        state.totalValueMoved = "0";
        state.actionsSinceCast = 0;
        state.totalMolts += 1;
        saveState(state);

        // Switch to new wallet
        wallet = getCurrentWallet(state.currentShellIndex);
        const newBalance = await getBalance(wallet.address);
        console.log(`[${timestamp()}] Now inhabiting shell #${state.currentShellIndex}`);
        console.log(`[${timestamp()}] New wallet: ${wallet.address}`);
        console.log(`[${timestamp()}] New balance: ${formatEth(newBalance)} ETH\n`);
      }

      // 4. Sleep with random jitter
      const sleepMs = randomInt(SLEEP_MIN_MS, SLEEP_MAX_MS);
      const sleepMin = (sleepMs / 60000).toFixed(1);
      console.log(`[${timestamp()}] Sleeping ${sleepMin} minutes...\n`);
      await sleep(sleepMs);
    } catch (err) {
      console.error(`[${timestamp()}] Error in main loop:`, err.message);
      console.error(err.stack);

      // Save state even on error
      saveState(state);

      // Back off on error (2 minutes)
      console.log(`[${timestamp()}] Backing off for 2 minutes...`);
      await sleep(2 * 60 * 1000);
    }
  }
}

// ── Entry point ────────────────────────────────────────────────────

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
