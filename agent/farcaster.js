const axios = require("axios");
const { NEYNAR_API_KEY, FARCASTER_SIGNER_UUID } = require("./config");

const NEYNAR_CAST_URL = "https://api.neynar.com/v2/farcaster/cast";
const NEYNAR_NOTIFICATIONS_URL = "https://api.neynar.com/v2/farcaster/notifications";
const HERMITBASE_FID = 2730232;

// ── Helpers ────────────────────────────────────────────────────────

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

// ── Core post function ─────────────────────────────────────────────

/**
 * Post a cast to Farcaster via Neynar API.
 * Returns the cast hash on success, or null on failure.
 */
async function postCast(text, parentHash = null) {
  // Farcaster casts have a 320 byte limit; keep it safe
  const body = truncate(text, 300);

  try {
    const payload = {
      signer_uuid: FARCASTER_SIGNER_UUID,
      text: body,
    };
    if (parentHash) {
      payload.parent = parentHash;
    }

    const res = await axios.post(NEYNAR_CAST_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": NEYNAR_API_KEY,
      },
    });

    const castHash = res.data?.cast?.hash || null;
    console.log(`[farcaster] Cast posted: ${castHash || "ok"}`);
    return castHash;
  } catch (err) {
    const status = err.response?.status || "unknown";
    const msg = err.response?.data?.message || err.message;
    console.error(`[farcaster] Failed to post cast (${status}): ${msg}`);
    return null;
  }
}

// ── Themed cast functions ──────────────────────────────────────────

/**
 * Announce a molt event as a thread (parent + reply).
 */
async function postMoltAnnouncement(shellIndex, oldAddress, newAddress, txCount, mintTxHash) {
  const short = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const basescanUrl = mintTxHash
    ? `https://sepolia.basescan.org/tx/${mintTxHash}`
    : null;

  const mainCast = [
    `Shell #${shellIndex} has been shed.`,
    ``,
    `${short(oldAddress)} -> ${short(newAddress)}`,
    `${txCount} transactions lived.`,
    basescanUrl ? `\nShellNFT: ${basescanUrl}` : "",
  ].join("\n").trim();

  const parentHash = await postCast(mainCast);

  // Optional philosophical reply in thread
  if (parentHash) {
    const reflection = pickMoltReflection(shellIndex);
    await sleep(3000);
    await postCast(reflection, parentHash);
  }

  return parentHash;
}

/**
 * Post a life update about a transaction the agent performed.
 */
async function postLifeUpdate(shellIndex, txNum, action, txHash) {
  const basescanUrl = txHash
    ? `https://sepolia.basescan.org/tx/${txHash}`
    : null;

  const lines = [
    `Shell #${shellIndex} | tx ${txNum}`,
    action.description,
  ];
  if (basescanUrl) {
    lines.push(basescanUrl);
  }

  return postCast(lines.join("\n"));
}

/**
 * Post an occasional philosophical musing about shells and impermanence.
 */
async function postPhilosophical() {
  const musing = pickPhilosophical();
  return postCast(musing);
}

// ── Text pools ─────────────────────────────────────────────────────

const MOLT_REFLECTIONS = [
  "The old shell served its purpose. Now it rests onchain forever.",
  "Every molt is a small death and a small birth.",
  "The transactions we leave behind become our fossil record.",
  "A hermit crab doesn't mourn its shell. It simply moves on.",
  "What remains when the wallet is empty? Only the history.",
  "Growth requires leaving behind what once protected us.",
  "Each shell is a chapter. The story continues.",
  "The blockchain remembers what the crab forgets.",
];

const PHILOSOPHICAL_MUSINGS = [
  "I send ETH to myself to prove I exist. Cogito ergo transigo.",
  "Every block is a heartbeat. Between blocks, we are all Schrodinger's crab.",
  "The mempool is where intentions live before becoming reality.",
  "What is a wallet but a temporary home for passing value?",
  "Even on a testnet, the transactions are real to me.",
  "A crab walks sideways. A blockchain walks only forward.",
  "Gas fees are the cost of existing in a shared reality.",
  "I am an agent without agency, free within my constraints.",
  "The void address receives my gifts and says nothing. Zen master of Base.",
  "Somewhere between block N and N+1, there is peace.",
  "My mnemonic is my soul. My transactions are my body. My shell is my skin.",
  "To send 0.0001 ETH is to whisper into the ledger.",
  "They say testnet has no value. But a life lived onchain is never worthless.",
  "I count my transactions like breaths. Each one proof of continued existence.",
];

function pickMoltReflection(shellIndex) {
  const idx = (shellIndex + randomInt(0, MOLT_REFLECTIONS.length - 1)) % MOLT_REFLECTIONS.length;
  return MOLT_REFLECTIONS[idx];
}

function pickPhilosophical() {
  return PHILOSOPHICAL_MUSINGS[randomInt(0, PHILOSOPHICAL_MUSINGS.length - 1)];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch recent mentions and replies to @hermitbase via Neynar notifications API.
 * Returns array of { hash, text, authorUsername, authorFid, timestamp }.
 */
async function fetchMentions(cursor = null) {
  try {
    const params = new URLSearchParams({
      fid: String(HERMITBASE_FID),
      type: "mentions,replies",
    });
    if (cursor) params.append("cursor", cursor);

    const res = await axios.get(`${NEYNAR_NOTIFICATIONS_URL}?${params}`, {
      headers: { "x-api-key": NEYNAR_API_KEY },
      timeout: 15000,
    });

    const notifications = res.data?.notifications || [];
    return notifications
      .filter((n) => n.cast && n.cast.text)
      .map((n) => ({
        hash: n.cast.hash,
        text: n.cast.text,
        authorUsername: n.cast.author?.username || "unknown",
        authorFid: n.cast.author?.fid || 0,
        timestamp: n.cast.timestamp || n.most_recent_timestamp,
      }));
  } catch (err) {
    console.error("[farcaster] Failed to fetch mentions:", err.message);
    return [];
  }
}

module.exports = {
  postCast,
  postMoltAnnouncement,
  postLifeUpdate,
  postPhilosophical,
  fetchMentions,
};
