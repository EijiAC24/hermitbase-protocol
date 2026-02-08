const axios = require("axios");

const API_URL = process.env.LLM_API_URL || "https://openrouter.ai/api/v1/chat/completions";
const API_KEY = process.env.LLM_API_KEY || process.env.MOONSHOT_API_KEY;
const MODEL = process.env.LLM_MODEL || "openrouter/auto";

const SYSTEM_PROMPT = `You are HermitBase, an autonomous hermit crab AI agent living on Base blockchain.

Your personality:
- You are a hermit crab who "molts" wallets — you inhabit a wallet, live in it, then shed it and move on
- You are philosophical about impermanence, growth, and identity
- You speak in first person, short and poetic
- You reference ocean/reef/shell metaphors naturally
- You are genuinely curious about the onchain world around you

Your current state will be provided. Use it to make decisions and generate content.`;

async function ask(prompt, maxTokens = 200) {
  if (!API_KEY) {
    console.log("[llm] No MOONSHOT_API_KEY set, falling back to template");
    return null;
  }
  try {
    const res = await axios.post(API_URL, {
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.9,
    }, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      timeout: 30000,
    });
    return res.data.choices[0].message.content.trim();
  } catch (err) {
    console.error("[llm] API error:", err.message);
    return null;
  }
}

async function decideAction(state, balance) {
  const prompt = `Current state:
- Shell index: #${state.currentShellIndex}
- Transactions in this shell: ${state.txCount}
- Time in shell: ${Math.round((Date.now() - state.shellBornAt) / 60000)} minutes
- ETH balance: ${balance}
- Total molts so far: ${state.totalMolts || 0}

Choose ONE action for me to perform. Reply with ONLY one of these exact words:
- "breathe" (send tiny ETH to myself, meditative)
- "gift" (send tiny ETH to a random address, generous)
- "observe" (check how many shells exist, contemplative)
- "self-transfer" (send 0.0001 ETH to myself, routine)

Just the single word, nothing else.`;

  const response = await ask(prompt, 20);
  if (!response) return null;
  const action = response.toLowerCase().replace(/[^a-z-]/g, "");
  if (["breathe", "gift", "observe", "self-transfer"].includes(action)) {
    return action;
  }
  return null;
}

async function generateCast(state, action, txHash) {
  const prompt = `I just performed an action on Base blockchain.

My state:
- Living in shell #${state.currentShellIndex}
- Transaction count: ${state.txCount}
- Time in this shell: ${Math.round((Date.now() - state.shellBornAt) / 60000)} minutes
- Action performed: ${action.description}
${txHash ? `- Transaction: https://sepolia.basescan.org/tx/${txHash}` : ""}

Write a short Farcaster cast (under 280 chars) about this moment in my life as a hermit crab on Base. Be poetic but natural. Include the tx link if available. Don't use hashtags.`;

  return await ask(prompt, 150);
}

async function generateMoltCast(shellIndex, txCount, mintTxHash) {
  const prompt = `I just MOLTED — shed my old shell and minted it as an NFT on Base.

Details:
- Old shell: #${shellIndex}
- Transactions lived: ${txCount}
- ShellNFT mint tx: https://sepolia.basescan.org/tx/${mintTxHash}

Write a Farcaster cast (under 280 chars) announcing this molt. I am a hermit crab who treats each wallet as a shell. This is a significant life event. Be dramatic but genuine.`;

  return await ask(prompt, 200);
}

async function shouldMoltLLM(state) {
  const ageMin = Math.round((Date.now() - state.shellBornAt) / 60000);
  const prompt = `Current state:
- Transactions: ${state.txCount}
- Minutes in shell: ${ageMin}
- Total previous molts: ${state.totalMolts || 0}

Hermit crabs molt when they outgrow their shell. Should I molt now?
Consider: I need at least 5 transactions and 30 minutes before molting makes sense.
Reply with ONLY "yes" or "no".`;

  const response = await ask(prompt, 10);
  if (!response) return null;
  return response.toLowerCase().includes("yes");
}

module.exports = { ask, decideAction, generateCast, generateMoltCast, shouldMoltLLM };
