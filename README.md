# FindWallet

A multi-chain HD wallet scanner that generates valid BIP39 mnemonics and checks balances across Ethereum, Solana, and Bitcoin. Runs in Docker with 8 parallel worker threads for maximum throughput.

---

## Supported Chains

| Chain | Networks | Address Types |
|---|---|---|
| Ethereum | Mainnet | Standard (`0x...`) |
| Solana | Mainnet | Standard (Base58) |
| Bitcoin | Mainnet | Legacy (`1...`), Nested SegWit (`3...`), Native SegWit (`bc1q...`), Taproot (`bc1p...`) |

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- An **Alchemy** or **Infura** API key (Ethereum RPC)
- A **QuickNode** or **Helius** API key (Solana RPC)
- Bitcoin: **No API key needed** (uses Blockstream — free, no rate limits)

---

## API Keys Setup

### 1. Ethereum RPC — Alchemy (Free)

1. Go to [https://www.alchemy.com](https://www.alchemy.com) → Create free account
2. Click **Create App** → Chain: **Ethereum** → Network: **Mainnet**
3. Click your app → **API Key** → copy the **HTTPS** URL:
   ```
   https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
   ```

> Alternative: [Infura](https://infura.io) → Create project → Copy Mainnet HTTPS endpoint

---

### 2. Solana RPC — QuickNode (Free)

1. Go to [https://www.quicknode.com](https://www.quicknode.com) → Create free account
2. Click **Create Endpoint** → Chain: **Solana** → Network: **Mainnet**
3. Copy the **HTTP Provider** URL:
   ```
   https://your-endpoint.solana-mainnet.quiknode.pro/YOUR_TOKEN/
   ```

> Alternative: [Helius](https://helius.dev) → Create account → Copy RPC URL

### 3. Bitcoin — No Setup Needed
Bitcoin balance checks use **Blockstream API** — completely free, no API key, no rate limits.

---

## Environment Setup

Create a `.env` file in the project root:

```env
VITE_ETH_API_KEY=https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
VITE_SOL_API_KEY=https://your-endpoint.solana-mainnet.quiknode.pro/YOUR_TOKEN/
```

> Never commit `.env` — it's already in `.gitignore`.

---

## Create Required Files

```bash
touch output.txt
```

---

## Build and Run with Docker

```bash
# Build and start
docker-compose up --build -d

# Check running
docker ps

# View live output
tail -f output.txt

# View container logs
docker-compose logs -f

# Stop
docker-compose down

# Restart after code changes
docker-compose down && docker-compose up --build -d
```

---

## Scale Up (Multiple Containers)

Each container runs 8 worker threads. Run multiple containers:

```bash
# 4 containers = up to 32 worker threads
docker-compose up --scale findwallet=4 -d
```

---

## Output File

### Found wallet (`peyechi`)
```
peyechi
  Mnemonic is->>: word1 word2 ...
  Account ->> 0
  Eth Publickey  ->> 0x...
  Eth private key ->> 0x...
  Eth Balance USD ->> 1234.56
  Eth Balance eth ->> 0.5
  Sol Publickey ->> ABC...
  Sol private key ->> XYZ...
  Sol Balance ->> 2.5
  bitWallet44 address ->> 1ABC...  (Legacy)
  bitWallet49 address ->> 3DEF...  (Nested SegWit)
  bitWallet84 address ->> bc1q...  (Native SegWit)
  bitWallet86 address ->> bc1p...  (Taproot)
```

### Not found
```
Not Found
  Mnemonic is->>: word1 word2 ...
  ...wallet details with 0 balances...
```

---

## Run Without Docker

```bash
# Requires Node.js v20+
npm install
npm start
```

---

## Hosting for 24/7 (PC off)

Codespaces and local PC stop when idle/off. For true 24/7 use a cloud VPS:

### Oracle Cloud — Free Forever

1. Signup at [cloud.oracle.com](https://cloud.oracle.com) (credit card for verification only)
2. Create **VM Instance** → **Ampere ARM** → Always Free
3. SSH in and run:

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu

# Clone repo
git clone https://github.com/mannaayan/findWallet.git
cd findWallet

# Setup
touch output.txt
nano .env   # paste your API keys

# Start
docker-compose up --build -d
```

### Other options
| Provider | Cost |
|---|---|
| Hetzner | €3.29/month |
| DigitalOcean | $4/month |
| AWS EC2 t2.micro | Free 1 year |

---

## GitHub Codespaces Setup

```bash
# Remove .env if it was created as directory
rm -rf .env

# Create .env from Codespace secrets (set secrets in GitHub Settings → Codespaces)
echo "VITE_ETH_API_KEY=$VITE_ETH_API_KEY" > .env
echo "VITE_SOL_API_KEY=$VITE_SOL_API_KEY" >> .env

# Create output file
touch output.txt

# Start
docker-compose up --build -d
```

> Set secrets at: **GitHub → Settings → Codespaces → Secrets**

---

## How It Works

```
generateMnemonic()              ← cryptographically secure, valid BIP39 checksum
        ↓
For account index 0, 1, 2:
        ↓
  Promise.all (parallel):
    ETH wallet → GetEthBalance (Alchemy RPC)
    SOL wallet → GetSolBalance (QuickNode RPC)
    BTC x4     → seed computed ONCE → 4 addresses → 4 balances (Blockstream, parallel)
        ↓
  balance > 0?  →  write "peyechi" to output.txt  (async)
  balance = 0?  →  write "Not Found" to output.txt (async)
        ↓
  repeat forever across 8 worker threads
```

---

## Performance

| Feature | Detail |
|---|---|
| Worker threads | 8 (uses all CPU cores up to 8) |
| BTC API | Blockstream — no rate limits |
| BTC seed | Computed once per mnemonic (not 4×) |
| BTC balances | Fetched in parallel |
| File writes | Non-blocking async |
| ETH price | Cached 60 seconds |
| HTTP connections | Pooled with keepAlive |

---

## Project Structure

```
findWalletwithdocker/
├── index.js                  # Main entry + 8 worker threads
├── service/
│   ├── provider.js           # RPC connections
│   ├── ethWalletGenerator.js # ETH wallet + balance
│   ├── SolWalletGenerator.js # SOL wallet + balance
│   └── bitWalletGenerator.js # BTC wallets (4 types) + Blockstream balance
├── Dockerfile
├── docker-compose.yml
├── package.json
├── .env                      # API keys (never commit)
├── output.txt                # Results
└── CODEBASE.md               # Full code documentation
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_ETH_API_KEY` | Ethereum RPC URL (Alchemy/Infura) |
| `VITE_SOL_API_KEY` | Solana RPC URL (QuickNode/Helius) |

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js 20 | Runtime |
| Worker Threads | 8 parallel workers |
| ethers.js v6 | Ethereum |
| @solana/web3.js | Solana |
| bitcoinjs-lib v6 | Bitcoin (4 address types) |
| Blockstream API | Bitcoin balance (free, no limits) |
| bip39 / bip32 | HD wallet standards |
| Docker + Compose | Containerization |
