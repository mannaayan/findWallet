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
├── word.txt                        # Word list input
└── output.txt                      # Results output (volume mounted)
```

---

## File Details

---

### `index.js` — Main Entry Point

**What it does:**
- Loads the official BIP39 English wordlist (2048 words)
- Spawns multiple Worker Threads (up to 4, one per CPU core)
- Each worker runs an infinite loop generating and checking wallets
- Writes results to `output.txt`

**Key functions:**

#### `getRandomMnemonic()`
Picks 12 random words from the official BIP39 wordlist to form a valid mnemonic phrase.
```
Example output: "apple bridge crane dust echo floor gate hill iron jump key lamp"
```

#### `walletWorker(workerId)`
The core loop running inside each thread:
1. Generates a random mnemonic
2. For account index 0, 1, 2:
   - Generates ETH, SOL, BTC wallets in parallel via `Promise.all`
   - Checks ETH and SOL balances in parallel
   - If any balance > 0 → writes full wallet details to `output.txt` with label `peyechi`
   - If no balance → writes `Not Found` entry to `output.txt`

**Worker Thread Setup:**
```
Main Thread
   └── new Worker(__filename, { workerData: 0 })  ← Worker 0
   └── new Worker(__filename, { workerData: 1 })  ← Worker 1
   └── new Worker(__filename, { workerData: 2 })  ← Worker 2
   └── new Worker(__filename, { workerData: 3 })  ← Worker 3
```
Each worker auto-restarts if it crashes.

**Parallelism:**
```js
// All 6 wallet generations run at the same time
Promise.all([generateEthereumWallet, generateSolanaWallet, generateBitcoinWallet x4])

// ETH and SOL balance checks run at the same time
Promise.all([GetEthBalance, GetSolBalance])
```

---

### `service/provider.js` — Blockchain RPC Connections

**What it does:**
Reads API keys from `.env` and creates reusable blockchain provider instances used across all services.

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
mnemonic → seed (512-bit) → HD tree → path: m/44'/60'/0'/index/0 → child wallet
```
- Coin type `60` = Ethereum (BIP44 standard)
- Returns `privateKey` and `address` (public key)

**Balance Check:**
```
address → Alchemy/Infura RPC → balance in Wei → formatEther() → ETH amount
                                                              → × ETH price → USD amount
```

**ETH Price Caching:**
- Fetches ETH/USD price from CoinGecko API
- Caches it for 60 seconds to avoid rate limiting
- If API fails, returns `null` (won't crash)

**HTTP Connection Pooling:**
- Uses `keepAlive: true` with `maxSockets: 50`
- Reuses TCP connections instead of opening new ones each request

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
- Solana uses **ed25519** elliptic curve (different from ETH/BTC which use secp256k1)
- Private key encoded in Base58
- Public key encoded in Base58

**Balance Check:**
```
publicKey → SolProvider RPC → balance in lamports → ÷ 1,000,000,000 → SOL amount
```
- 1 SOL = 1,000,000,000 lamports

**Exports:** `generateSolanaWallet`, `GetSolBalance`

---

### `service/bitWalletGenerator.js` — Bitcoin (4 Address Types)

**What it does:**
Derives 4 different Bitcoin wallet address types from the same mnemonic and checks each for balance.

**HD Wallet Derivation:**
```
mnemonic → seed → BIP32 HD tree → derivation path → child key → address
```

**4 Address Types:**

| Function | Path | Address Type | Format | Payment Script |
|---|---|---|---|---|
| `generateBitcoinWalletpath44` | `m/44'/0'/index'/0/0` | Legacy | `1...` | `p2pkh` |
| `generateBitcoinWalletpath49` | `m/49'/0'/index'/0/0` | Nested SegWit | `3...` | `p2sh(p2wpkh)` |
| `generateBitcoinWalletpath84` | `m/84'/0'/index'/0/0` | Native SegWit | `bc1q...` | `p2wpkh` |
| `generateBitcoinWalletpath86` | `m/86'/0'/index'/0/0` | Taproot | `bc1p...` | `p2tr` |

**Why 4 types?**
Different wallets (Ledger, Trezor, MetaMask, etc.) use different derivation paths. The same seed phrase generates a completely different address on each path.

**Balance Check:**
```
address → blockchain.info API → balance in satoshis → ÷ 100,000,000 → BTC amount
```
- 1 BTC = 100,000,000 satoshis

**Each function returns:**
```js
{
  privateKey: string,  // WIF format
  publicKey: string,   // hex format
  address: string,     // Bitcoin address
  balance: number      // BTC amount
}
```

**Exports:** `generateBitcoinWalletpath44`, `generateBitcoinWalletpath49`, `generateBitcoinWalletpath84`, `generateBitcoinWalletpath86`, `getBitcoinBalance`

---

### `Dockerfile` — Docker Image

**What it does:**
Defines how to build the Node.js application into a Docker container.

```dockerfile
FROM node:20-alpine          # Node 20 required (@solana/web3.js needs >=20)
RUN apk add python3 make g++ gcc   # Build tools for tiny-secp256k1 (C++ native module)
COPY package*.json ./        # Copy dependency list first (layer cache)
RUN npm ci && npm rebuild    # Install exact versions from lock file, compile native modules
COPY . .                     # Copy application code
CMD ["npm", "start"]         # Run node index.js
```

**Why `npm ci` instead of `npm install`?**
- `npm ci` uses `package-lock.json` directly — faster and deterministic
- `npm install` resolves dependencies from scratch — slower

**Why build tools (python3, make, g++, gcc)?**
- `tiny-secp256k1` contains C++ code that must be compiled for the target platform
- Alpine Linux doesn't include compilers by default

---

### `docker-compose.yml` — Container Configuration

**What it does:**
Configures how the Docker container runs in production.

```yaml
restart: always          # Auto-restart if container crashes or Docker restarts
volumes:
  - ./output.txt:/app/output.txt   # Host file ↔ Container file (live sync)
  - ./.env:/app/.env               # Inject API keys without baking into image
environment:
  - NODE_ENV=production
deploy:
  resources:
    limits:
      cpus: "1.5"        # Max 1.5 CPU cores
      memory: 1024M      # Max 1GB RAM
```

**Volume mounts** mean changes inside the container to `output.txt` instantly appear on your local machine.

---

### `package.json` — Dependencies

| Package | Purpose |
|---|---|
| `bip39` | Mnemonic generation and BIP39 wordlist |
| `bip32` | HD wallet key derivation tree (BIP32) |
| `ethers` | Ethereum wallet derivation + RPC balance check |
| `@solana/web3.js` | Solana wallet + RPC balance check |
| `bitcoinjs-lib` | Bitcoin address generation (p2pkh, p2wpkh, p2sh, p2tr) |
| `tiny-secp256k1` | secp256k1 elliptic curve crypto (required by bip32) |
| `tweetnacl` | ed25519 crypto (required for Solana key derivation) |
| `ed25519-hd-key` | HD key derivation for ed25519 (Solana path derivation) |
| `bs58` | Base58 encoding for Solana keys |
| `bs58check` | Base58Check encoding |
| `axios` | HTTP client for blockchain.info + CoinGecko API calls |
| `dotenv` | Load `.env` file into `process.env` |

---

## Data Flow (End to End)

```
word.txt / BIP39 wordlist
        ↓
getRandomMnemonic()  →  "apple bridge crane ..."  (12 words)
        ↓
For account index 0, 1, 2:
        ↓
  ┌─────────────────────────────────────────────────────┐
  │              Promise.all (parallel)                  │
  │  generateEthereumWallet()  →  ETH address + privKey │
  │  generateSolanaWallet()    →  SOL address + privKey │
  │  generateBitcoinWallet44() →  BTC 1... + privKey    │
  │  generateBitcoinWallet49() →  BTC 3... + privKey    │
  │  generateBitcoinWallet84() →  BTC bc1q + privKey    │
  │  generateBitcoinWallet86() →  BTC bc1p + privKey    │
  └─────────────────────────────────────────────────────┘
        ↓
  ┌─────────────────────────────┐
  │    Promise.all (parallel)    │
  │  GetEthBalance(ethAddress)  │  → ETH amount + USD
  │  GetSolBalance(solAddress)  │  → SOL amount
  └─────────────────────────────┘
  (BTC balance fetched inside each generateBitcoinWallet function)
        ↓
  Any balance > 0?
     YES → write "peyechi" + full details → output.txt
     NO  → write "Not Found" + details   → output.txt
        ↓
  Loop forever (while true)
```

---

## Concepts Used

### BIP39 — Mnemonic Phrases
A standard for generating human-readable backup phrases (12 or 24 words) from a fixed wordlist of 2048 words. The phrase encodes a 128-bit or 256-bit random number.

### BIP32 — HD Wallets (Hierarchical Deterministic)
A standard for deriving a tree of key pairs from a single seed. One seed = unlimited wallets.

### BIP44 — Multi-Account HD Wallet Structure
Defines the derivation path structure:
```
m / purpose' / coin_type' / account' / change / address_index
```
Coin types: `60` = ETH, `501` = SOL, `0` = BTC

### secp256k1 vs ed25519
- **secp256k1** — elliptic curve used by Bitcoin and Ethereum
- **ed25519** — elliptic curve used by Solana (faster, different math)

### Wei / Lamports / Satoshis
Smallest units of each currency:
- `1 ETH = 1,000,000,000,000,000,000 Wei` (10^18)
- `1 SOL = 1,000,000,000 lamports` (10^9)
- `1 BTC = 100,000,000 satoshis` (10^8)
