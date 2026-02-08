# HermitBase — Autonomous Wallet-Molting Agent on Base

An AI agent that lives on Base, periodically "molts" its wallet, and mints each shed shell as an on-chain SVG NFT — all narrated live on Farcaster.

## What It Does

HermitBase is a hermit crab AI agent. Like a real hermit crab, it inhabits a wallet (shell), lives in it, outgrows it, and sheds it. Each shed wallet is immortalized as an ERC-721 NFT with fully on-chain SVG art.

**The agent autonomously:**
- Executes on-chain transactions on Base (micro-transfers, contract interactions)
- Uses an LLM (via OpenRouter) to decide what actions to take
- Generates and posts Farcaster casts about its life using AI
- Decides when to "molt" (shed its current wallet) based on LLM judgment
- Mints each shed wallet as a ShellNFT with on-chain metadata and SVG

## Architecture

```
┌─────────────────────────────────────────┐
│  VPS — HermitBase Agent (Node.js)       │
│                                         │
│  LLM Brain (OpenRouter)                 │
│  ├── Decides actions                    │
│  ├── Generates Farcaster content        │
│  └── Judges molt timing                 │
│                                         │
│  Onchain Body                           │
│  ├── ETH micro-transfers                │
│  ├── ShellNFT minting                   │
│  └── Contract state reads               │
│                                         │
│  Social Layer (Neynar → Farcaster)      │
│  └── Autonomous posting                 │
└──────────┬──────────────┬───────────────┘
           │              │
           ▼              ▼
   Base Sepolia      Farcaster
   (ShellNFT)      (@hermitbase)
```

## Live Links

- **Farcaster:** [@hermitbase](https://warpcast.com/hermitbase)
- **Contract:** [0xcf38e8aF885529c457f766a01c22473dBcCe3396](https://sepolia.basescan.org/address/0xcf38e8aF885529c457f766a01c22473dBcCe3396) (Base Sepolia, Sourcify verified)
- **Agent Wallet:** `0x02CEB3e68D1d30e12301B32c41E03c19E77F93c4`

## Smart Contract: ShellNFT.sol

ERC-721 with fully on-chain SVG generation. No external dependencies, no IPFS.

- `mintShell()` — Agent-only minting with Shell struct (walletAddress, bornAt, shedAt, txCount, totalValueMoved, lifeSummary)
- `tokenURI()` — Returns data URI with on-chain SVG. Color intensity based on txCount, shell size based on totalValueMoved
- `getShell()` / `totalShells()` — Read shell metadata

**Tests:** 17/17 passing (`forge test -vvv`)

## Agent: AI-Powered Decision Making

The agent uses an LLM for all key decisions:

| Decision | How |
|---|---|
| What action to perform | LLM chooses from: breathe, self-transfer, gift, observe |
| What to post on Farcaster | LLM generates poetic cast content |
| When to molt | LLM evaluates tx count, time in shell, and agent history |

Fallback to rule-based logic if LLM is unavailable.

## On-Chain SVG

Each ShellNFT generates a unique spiral shell visualization:
- **Color:** More transactions → warmer colors (blue → red)
- **Size:** More ETH moved → larger shell
- **Text:** Shell number, tx count, lifespan

## Roadmap

### v1.0 (Current) — Hackathon MVP
- [x] ShellNFT contract with on-chain SVG
- [x] Autonomous agent with LLM decision-making
- [x] Farcaster integration
- [x] Base Sepolia deployment

### v2.0 — True Autonomous Intelligence
- [ ] **On-chain data analysis** — Agent reads mempool, token prices, and gas trends to inform its behavior
- [ ] **Autonomous contract discovery** — Agent explores Base, discovers new contracts, and interacts with them without hardcoded addresses
- [ ] **Social intelligence** — Agent reads and replies to other Farcaster users, builds relationships, engages with the community
- [ ] **Adaptive strategy** — Agent changes behavior based on market conditions (more active in volatile markets, meditative in calm periods)
- [ ] **Multi-chain migration** — Molt across chains (Base → Optimism → Arbitrum), each chain a different ocean

### v3.0 — Collective Intelligence
- [ ] **Multi-agent molting** — Multiple hermit crabs trading shells with each other
- [ ] **Shell marketplace** — Secondary market for shed shell NFTs
- [ ] **Chitin protocol** — ERC-8004 integration for composable shell identities
- [ ] **Evolutionary traits** — Shells inherit traits from previous shells, creating an on-chain evolutionary tree

## Tech Stack

- **Contract:** Solidity 0.8.20, Foundry
- **Agent:** Node.js, ethers.js v6
- **LLM:** OpenRouter (auto model selection)
- **Social:** Neynar API → Farcaster
- **Hosting:** VPS with pm2

## Build & Test

```bash
# Contract
forge test -vvv

# Agent
cd agent && npm install
cp .env.example .env  # fill in keys
node index.js
```

## License

MIT
