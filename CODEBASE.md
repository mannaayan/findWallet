# Codebase Documentation

## Project Structure

```
findWalletwithdocker/
├── index.js                        # Main entry point
├── service/
│   ├── provider.js                 # RPC blockchain connections
│   ├── ethWalletGenerator.js       # Ethereum wallet + balance
│   ├── SolWalletGenerator.js       # Solana wallet + balance
│   └── bitWalletGenerator.js       # Bitcoin wallet + balance (4 types)
├── Dockerfile                      # Docker image definition
├── docker-compose.yml              # Docker container config
├── package.json                    # Dependencies
├── .env                            # API keys (not committed)
└── output.txt                      # Results output (volume mounted)
```

---

## File Details

---

### `index.js` — Main Entry Point

**What it does:**
- Generates cryptographically secure BIP39 mnemonics using `generateMnemonic()`
- Spawns **8 Worker Threads** (capped at min of CPU cores or 8)
- Each worker runs an infinite loop generating and checking wallets
- Writes results to `output.txt` using **non-blocking async writes**

**Key functions:**

#### `appendToFile(message)`
Non-blocking async file write using `fs.appendFile` — does not block the event loop unlike `appendFileSync`.

#### `walletWorker(workerId)`
The core loop running inside each thread:
1. Generates a valid checksummed BIP39 mnemonic via `generateMnemonic()`
2. For account index 0, 1, 2:
   - Generates ETH, SOL wallets + all 4 BTC wallets **in parallel** via `Promise.all`
   - BTC seed is computed **once** for all 4 paths (not 4 times)
   - Checks ETH and SOL balances in parallel
   - If any balance > 0 → writes `peyechi` + full details to `output.txt`
   - If no balance → writes `Not Found` to `output.txt`

**Worker Thread Setup:**
```
Main Thread
   └── new Worker(__filename, { workerData: 0 })  ← Worker 0
   └── new Worker(__filename, { workerData: 1 })  ← Worker 1
   ...
   └── new Worker(__filename, { workerData: 7 })  ← Worker 7
```
Each worker auto-restarts if it crashes.

**Full parallel execution per mnemonic:**
```js
// Step 1 — all wallet generation in parallel (BTC seed computed once)
Promise.all([
  generateEthereumWallet(mnemonic, index),
  generateSolanaWallet(mnemonic, index),
  generateAllBitcoinWallets(mnemonic, index), // all 4 BTC paths + 4 balances inside
])

// Step 2 — ETH and SOL balance checks in parallel
Promise.all([GetEthBalance, GetSolBalance])
```

---

### `service/provider.js` — Blockchain RPC Connections

**What it does:**
Reads API keys from `.env` and creates reusable blockchain provider instances.

```
.env file:
  VITE_ETH_API_KEY = Alchemy or Infura RPC URL
  VITE_SOL_API_KEY = QuickNode or Helius RPC URL
```

**Exports:**
- `EthProvider` — `ethers.JsonRpcProvider` connected to Ethereum mainnet
- `SolProvider` — `@solana/web3.js Connection` connected to Solana mainnet

---

### `service/ethWalletGenerator.js` — Ethereum

**What it does:**
Derives an Ethereum wallet from a mnemonic and checks its balance.

**HD Wallet Derivation:**
```
mnemonic → seed (512-bit) → HD wallet tree → path: m/44'/60'/0'/index/0 → child wallet
```
- Coin type `60` = Ethereum (BIP44 standard)
- Returns `privateKey` and `address`

**Balance Check:**
```
address → Alchemy/Infura RPC → balance in Wei → formatEther() → ETH amount
                                                              → × ETH price → USD amount
```

**Optimizations:**
- ETH/USD price **cached for 60 seconds** (CoinGecko API)
- HTTP **keepAlive connection pooling** with `maxSockets: 50`
- Returns `null` on error — won't crash

**Exports:** `generateEthereumWallet`, `GetEthBalance`

---

### `service/SolWalletGenerator.js` — Solana

**What it does:**
Derives a Solana wallet from a mnemonic and checks its balance.

**HD Wallet Derivation:**
```
mnemonic → seed (512-bit) → path: m/44'/501'/index'/0' → ed25519 keypair
```
- Coin type `501` = Solana (BIP44 standard)
- Uses **ed25519** elliptic curve (Solana-specific)
- Private key encoded in Base58
- Public key encoded in Base58

**Balance Check:**
```
publicKey → SolProvider RPC → balance in lamports → ÷ 1,000,000,000 → SOL
```

**Exports:** `generateSolanaWallet`, `GetSolBalance`

---

### `service/bitWalletGenerator.js` — Bitcoin (4 Address Types)

**What it does:**
Derives 4 Bitcoin wallet types from one mnemonic using a **single seed computation**, fetches all 4 balances in parallel via **Blockstream API**.

**Key optimization — `generateAllBitcoinWallets(mnemonic, newId)`:**
```
mnemonic → seed (computed ONCE)
   → root HD tree
   ├── path m/44' → Legacy address (1...)     → getBitcoinBalance ─┐
   ├── path m/49' → Nested SegWit (3...)      → getBitcoinBalance  ├── Promise.all
   ├── path m/84' → Native SegWit (bc1q...)   → getBitcoinBalance  │
   └── path m/86' → Taproot (bc1p...)         → getBitcoinBalance ─┘
```

Previously: seed computed **4 times** (once per function). Now: computed **once**.

**4 Address Types:**

| Path | Type | Format | Script |
|---|---|---|---|
| `m/44'/0'/index'/0/0` | Legacy | `1...` | `p2pkh` |
| `m/49'/0'/index'/0/0` | Nested SegWit | `3...` | `p2sh(p2wpkh)` |
| `m/84'/0'/index'/0/0` | Native SegWit | `bc1q...` | `p2wpkh` |
| `m/86'/0'/index'/0/0` | Taproot | `bc1p...` | `p2tr` |

**Balance API — Blockstream (upgraded from blockchain.info):**
```
GET https://blockstream.info/api/address/{address}

Response:
{
  chain_stats: {
    funded_txo_sum: 5000000,  ← satoshis received
    spent_txo_sum: 1000000    ← satoshis spent
  }
}

balance = (funded_txo_sum - spent_txo_sum) / 1e8  → BTC
```
- **No API key required**
- **No rate limiting** (unlike blockchain.info which returns 429)
- Works for all 4 address formats

**Exports:** `generateAllBitcoinWallets`, `generateBitcoinWalletpath44`, `generateBitcoinWalletpath49`, `generateBitcoinWalletpath84`, `generateBitcoinWalletpath86`, `getBitcoinBalance`

---

### `Dockerfile` — Docker Image

```dockerfile
FROM node:20-alpine          # Node 20 required (@solana/web3.js needs >=20)
RUN apk add python3 make g++ gcc   # Build tools for tiny-secp256k1 (C++ native)
COPY package*.json ./
RUN npm ci && npm rebuild    # Fast deterministic install + compile native modules
COPY . .
CMD ["npm", "start"]
```

---

### `docker-compose.yml` — Container Configuration

```yaml
restart: always              # Auto-restart on crash or Docker restart
volumes:
  - ./output.txt:/app/output.txt   # Live sync to host machine
  - ./.env:/app/.env               # API keys injected at runtime
deploy:
  resources:
    limits:
      cpus: "1.5"
      memory: 1024M
```

---

### `package.json` — Dependencies

| Package | Purpose |
|---|---|
| `bip39` | `generateMnemonic()` — cryptographically secure valid mnemonics |
| `bip32` | HD wallet key derivation tree |
| `ethers` | Ethereum wallet derivation + RPC |
| `@solana/web3.js` | Solana wallet + RPC |
| `bitcoinjs-lib` | Bitcoin address generation (p2pkh, p2wpkh, p2sh, p2tr) |
| `tiny-secp256k1` | secp256k1 elliptic curve crypto |
| `tweetnacl` | ed25519 crypto for Solana |
| `ed25519-hd-key` | HD key derivation for Solana |
| `bs58` | Base58 encoding for Solana keys |
| `axios` | HTTP client for Blockstream + CoinGecko APIs |
| `dotenv` | Load `.env` into `process.env` |

---

## Full Data Flow

```
generateMnemonic()  →  "apple bridge crane ..."  (valid BIP39 checksum)
        ↓
For account index 0, 1, 2:
        ↓
  ┌─────────────────────────────────────────────────────────────┐
  │                  Promise.all (parallel)                      │
  │                                                              │
  │  generateEthereumWallet()  →  ETH address + privKey         │
  │                                                              │
  │  generateSolanaWallet()    →  SOL address + privKey         │
  │                                                              │
  │  generateAllBitcoinWallets()                                 │
  │    → seed computed ONCE                                      │
  │    → 4 addresses derived                                     │
  │    → 4 balances fetched in parallel (Blockstream API)        │
  └─────────────────────────────────────────────────────────────┘
        ↓
  ┌──────────────────────────────┐
  │     Promise.all (parallel)   │
  │  GetEthBalance → ETH + USD   │
  │  GetSolBalance → SOL         │
  └──────────────────────────────┘
        ↓
  Any balance > 0?
     YES → appendToFile("peyechi" + full details)  ← async, non-blocking
     NO  → appendToFile("Not Found" + details)     ← async, non-blocking
        ↓
  Loop forever across 8 worker threads
```

---

## Performance Summary

| Optimization | Before | After |
|---|---|---|
| BTC API | blockchain.info (429 errors) | Blockstream (no limits) |
| BTC seed computation | 4× per mnemonic | 1× per mnemonic |
| BTC balance fetches | Sequential | Parallel (Promise.all) |
| File writes | Blocking (appendFileSync) | Non-blocking (appendFile) |
| Worker threads | 4 | 8 |

---

## Concepts

### BIP39
Standard for 12/24-word mnemonic phrases. 2048-word English wordlist. Last word contains checksum — only 1 in 16 random combinations is valid. `generateMnemonic()` always produces valid ones.

### BIP32 / BIP44
HD wallet derivation: one seed → unlimited wallets via path `m/purpose'/coin'/account'/change/index`.
Coin types: `60`=ETH, `501`=SOL, `0`=BTC.

### secp256k1 vs ed25519
- **secp256k1** — Bitcoin, Ethereum
- **ed25519** — Solana (faster verification)

### Units
- `1 ETH = 10^18 Wei`
- `1 SOL = 10^9 lamports`
- `1 BTC = 10^8 satoshis`
