# FindWallet

A multi-chain HD wallet scanner that generates valid BIP39 mnemonics and checks balances across Ethereum, Solana, and Bitcoin networks. Runs in Docker with parallel worker threads for maximum throughput.

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

---

## API Keys Setup

### 1. Ethereum RPC — Alchemy (Free)

1. Go to [https://www.alchemy.com](https://www.alchemy.com) and create a free account
2. Click **Create App**
3. Select:
   - Chain: **Ethereum**
   - Network: **Mainnet**
4. Click your app → **API Key** → copy the **HTTPS** URL
5. It looks like:
   ```
   https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
   ```

> Alternative: [Infura](https://infura.io) → Create project → Copy Mainnet HTTPS endpoint

---

### 2. Solana RPC — QuickNode (Free)

1. Go to [https://www.quicknode.com](https://www.quicknode.com) and create a free account
2. Click **Create Endpoint**
3. Select:
   - Chain: **Solana**
   - Network: **Mainnet**
4. Copy the **HTTP Provider** URL
5. It looks like:
   ```
   https://your-endpoint.solana-mainnet.quiknode.pro/YOUR_TOKEN/
   ```

> Alternative: [Helius](https://helius.dev) → Create account → Copy RPC URL

---

## Environment Setup

Create a `.env` file in the project root:

```env
VITE_ETH_API_KEY=https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
VITE_SOL_API_KEY=https://your-endpoint.solana-mainnet.quiknode.pro/YOUR_TOKEN/
```

> The `.env` file is never committed to git. Keep your keys private.

---

## Create Required Files

Before starting, make sure these files exist in the project root:

```bash
# Create empty output file (required for Docker volume mount)
touch output.txt
```

---

## Build and Run with Docker

### Start the container

```bash
docker-compose up --build -d
```

- `--build` — builds the Docker image
- `-d` — runs in background (detached mode)

### Check it is running

```bash
docker ps
```

### View live output

```bash
tail -f output.txt
```

### View container logs

```bash
docker-compose logs -f
```

### Stop the container

```bash
docker-compose down
```

### Restart after code changes

```bash
docker-compose down && docker-compose up --build -d
```

---

## Run Multiple Containers (Scale Up)

Each container runs up to 4 worker threads. Scale horizontally:

```bash
# Run 4 containers (= up to 16 worker threads total)
docker-compose up --scale findwallet=4 -d
```

> All containers write to the same `output.txt` on your host machine.

---

## Output File

Results are written to `output.txt` in the project root.

### Found wallet (balance > 0)
```
peyechi
  Mnemonic is->>: word1 word2 word3 ...
  Account ->> 0
  Eth Publickey ->> 0x...
  Eth private key ->> 0x...
  Eth Balance USD ->> 1234.56
  Eth Balance eth ->> 0.5
  Sol Publickey ->> ABC...
  Sol private key ->> XYZ...
  Sol Balance ->> 2.5
  bitWallet44 address ->> 1ABC...
  bitWallet49 address ->> 3DEF...
  bitWallet84 address ->> bc1q...
  bitWallet86 address ->> bc1p...
```

### Not found (balance = 0)
```
Not Found
  Mnemonic is->>: word1 word2 word3 ...
  ...wallet details...
```

---

## Run Without Docker (Local)

### Requirements
- Node.js v20 or higher

### Install and start

```bash
npm install
npm start
```

---

## Hosting on a VPS / Cloud Server

### Recommended Free Providers
- [Oracle Cloud](https://cloud.oracle.com) — **Always Free** ARM VM (4 cores, 24GB RAM)
- [Railway](https://railway.app) — $5 credit/month
- [Fly.io](https://fly.io) — 3 shared VMs free

### Setup on Ubuntu VPS

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl start docker && systemctl enable docker
apt install docker-compose -y

# Clone repo
git clone https://github.com/mannaayan/findWallet.git
cd findWallet

# Create .env with your API keys
nano .env

# Create output file
touch output.txt

# Start
docker-compose up --build -d
```

### View output remotely

```bash
ssh root@YOUR_SERVER_IP "tail -f /root/findWallet/output.txt"
```

### Copy output to local machine

```bash
scp root@YOUR_SERVER_IP:/root/findWallet/output.txt ./output.txt
```

---

## How It Works

```
generateMnemonic()           ← cryptographically secure, valid BIP39 checksum
        ↓
For account index 0, 1, 2:
        ↓
  Promise.all (parallel):
    ETH wallet → check balance via Alchemy RPC
    SOL wallet → check balance via QuickNode RPC
    BTC x4     → check balance via blockchain.info
        ↓
  balance > 0?  →  write "peyechi" to output.txt
  balance = 0?  →  write "Not Found" to output.txt
        ↓
  repeat forever across 4 worker threads
```

---

## Project Structure

```
findWalletwithdocker/
├── index.js                  # Main entry point + worker threads
├── service/
│   ├── provider.js           # Blockchain RPC connections
│   ├── ethWalletGenerator.js # Ethereum wallet + balance
│   ├── SolWalletGenerator.js # Solana wallet + balance
│   └── bitWalletGenerator.js # Bitcoin wallet + balance (4 types)
├── Dockerfile                # Docker image definition
├── docker-compose.yml        # Container configuration
├── package.json              # Dependencies
├── .env                      # API keys (never commit this)
├── output.txt                # Scan results (volume mounted)
└── CODEBASE.md               # Detailed code documentation
```

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `VITE_ETH_API_KEY` | Ethereum RPC URL (Alchemy/Infura) | `https://eth-mainnet.g.alchemy.com/v2/abc123` |
| `VITE_SOL_API_KEY` | Solana RPC URL (QuickNode/Helius) | `https://xyz.solana-mainnet.quiknode.pro/token/` |

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js 20 | Runtime |
| Worker Threads | Parallel execution across CPU cores |
| ethers.js v6 | Ethereum wallet derivation + RPC |
| @solana/web3.js | Solana wallet + RPC |
| bitcoinjs-lib v6 | Bitcoin address generation |
| bip39 | Mnemonic generation (BIP39 standard) |
| bip32 | HD wallet derivation (BIP32 standard) |
| Docker | Containerization |
| Docker Compose | Container orchestration |
