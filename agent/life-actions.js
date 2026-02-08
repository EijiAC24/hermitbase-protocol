const { ethers } = require("ethers");
const { SHELL_NFT_ADDRESS, SHELL_NFT_ABI } = require("./config");
const { getProvider, formatEth } = require("./wallet-manager");

// ── Helpers ────────────────────────────────────────────────────────

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomAddress() {
  return ethers.Wallet.createRandom().address;
}

const MICRO_ETH = ethers.parseEther("0.0001");

// ── Life actions ───────────────────────────────────────────────────

/**
 * Send micro ETH to self — a meditative loop transaction.
 */
async function sendMicroEthToSelf(wallet) {
  const tx = await wallet.sendTransaction({
    to: wallet.address,
    value: MICRO_ETH,
  });
  const receipt = await tx.wait();
  return {
    description: `Sent 0.0001 ETH to self (reflection loop)`,
    txHash: receipt.hash,
    value: MICRO_ETH,
  };
}

/**
 * Send micro ETH to a random address — a small gift to the void.
 */
async function sendMicroEthToRandom(wallet) {
  const to = randomAddress();
  const tx = await wallet.sendTransaction({
    to,
    value: MICRO_ETH,
  });
  const receipt = await tx.wait();
  return {
    description: `Sent 0.0001 ETH to ${to.slice(0, 8)}...${to.slice(-4)} (gift to the void)`,
    txHash: receipt.hash,
    value: MICRO_ETH,
  };
}

/**
 * Read totalShells from ShellNFT contract — observing the shell graveyard.
 * This is a read-only call, no tx produced. We still consider it an "action"
 * for flavour, but it won't count as a transaction.
 */
async function readTotalShells(wallet) {
  const contract = new ethers.Contract(SHELL_NFT_ADDRESS, SHELL_NFT_ABI, wallet);
  try {
    const total = await contract.totalShells();
    return {
      description: `Observed the shell graveyard: ${total.toString()} shells rest there`,
      txHash: null,
      value: 0n,
    };
  } catch (err) {
    return {
      description: `Tried to observe the shell graveyard but the mist was too thick`,
      txHash: null,
      value: 0n,
    };
  }
}

/**
 * Send a tiny varying amount of ETH to self — breathing.
 */
async function breathe(wallet) {
  const gwei = randomInt(1000, 50000); // 0.000001 - 0.00005 ETH
  const value = ethers.parseUnits(gwei.toString(), "gwei");
  const tx = await wallet.sendTransaction({
    to: wallet.address,
    value,
  });
  const receipt = await tx.wait();
  return {
    description: `Took a deep breath (${formatEth(value)} ETH circulated)`,
    txHash: receipt.hash,
    value,
  };
}

// ── Action registry ────────────────────────────────────────────────

const ACTIONS = [
  { fn: sendMicroEthToSelf, weight: 3, name: "self-transfer" },
  { fn: sendMicroEthToRandom, weight: 2, name: "random-gift" },
  { fn: readTotalShells, weight: 2, name: "observe-shells" },
  { fn: breathe, weight: 3, name: "breathe" },
];

const ACTION_MAP = {
  "self-transfer": ACTIONS.find(a => a.name === "self-transfer"),
  "gift": ACTIONS.find(a => a.name === "random-gift"),
  "observe": ACTIONS.find(a => a.name === "observe-shells"),
  "breathe": ACTIONS.find(a => a.name === "breathe"),
};

/**
 * Pick an action and execute it. If llmChoice is given, use that.
 * Returns { description, txHash, value, actionName }.
 */
async function performRandomAction(wallet, llmChoice) {
  let chosen;
  if (llmChoice && ACTION_MAP[llmChoice]) {
    chosen = ACTION_MAP[llmChoice];
  } else {
    const pool = [];
    for (const action of ACTIONS) {
      for (let i = 0; i < action.weight; i++) {
        pool.push(action);
      }
    }
    chosen = pool[randomInt(0, pool.length - 1)];
  }

  console.log(`[life] Performing action: ${chosen.name}`);
  const result = await chosen.fn(wallet);
  return { ...result, actionName: chosen.name };
}

module.exports = { performRandomAction };
