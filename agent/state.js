const fs = require("fs");
const path = require("path");

const STATE_FILE = path.join(__dirname, "state.json");

const DEFAULT_STATE = {
  currentShellIndex: 0,
  shellBornAt: Date.now(),
  txCount: 0,
  totalValueMoved: "0", // stored as string because wei values are large
  actionsSinceCast: 0,
  totalMolts: 0,
  lastMentionTimestamp: null, // ISO string of last processed mention
  repliedHashes: [],          // cast hashes we already replied to
};

/**
 * Load persisted state from disk. Returns default state if file
 * doesn't exist or is corrupt.
 */
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch (err) {
    console.warn("[state] Failed to load state file, using defaults:", err.message);
  }
  return { ...DEFAULT_STATE };
}

/**
 * Persist state to disk as formatted JSON.
 */
function saveState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("[state] Failed to save state:", err.message);
  }
}

module.exports = { loadState, saveState };
