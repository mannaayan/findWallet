# FindWallet

A multi-chain HD wallet scanner that generates wallets from BIP39 mnemonics and checks balances across Ethereum, Solana, and Bitcoin networks. Runs in Docker with parallel worker threads.

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

```bash
# Create the file
touch .env
```

Add your API keys:

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

`word.txt` should already exist with your word list.

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

You should see `findwallet_app` with status `Up`.

### View live output

```bash
# Watch output file update in real time
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
docker-compose up --build -d
```

---

## Run Multiple Containers (Scale Up)

Each container runs up to 4 worker threads. You can scale horizontally:

```bash
# Run 4 containers (= up to 16 worker threads total)
docker-compose up --scale findwallet=4 -d
```

> Note: All containers write to the same `output.txt` on your host machine.

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
- npm

### Install dependencies

```bash
npm install
```

### Start

```bash
npm start
```

### Dev mode (auto-restart on file change)

```bash
npm run dev
```

---

## Hosting on a VPS / Cloud Server

### Recommended Providers
- [DigitalOcean](https://www.digitalocean.com) — Droplet ($6/month, 1 vCPU, 1GB RAM minimum)
- [Vultr](https://www.vultr.com) — Cloud Compute ($5/month)
- [AWS EC2](https://aws.amazon.com/ec2/) — t3.micro (free tier eligible)
- [Hetzner](https://www.hetzner.com) — cheapest option (€3.29/month)

### Setup on Ubuntu VPS

**Step 1 — Connect to your server**
```bash
ssh root@YOUR_SERVER_IP
```

**Step 2 — Install Docker**
```bash
curl -fsSL https://get.docker.com | sh
systemctl start docker
systemctl enable docker
```

**Step 3 — Install Docker Compose**
```bash
apt install docker-compose -y
```

**Step 4 — Clone or upload your project**
```bash
# Option A: Git clone
git clone YOUR_REPO_URL
cd findWalletwithdocker

# Option B: SCP upload from your local machine
scp -r ./findWalletwithdocker root@YOUR_SERVER_IP:/root/
```

**Step 5 — Create .env file on the server**
```bash
nano .env
```
Paste your API keys, save with `Ctrl+X` → `Y` → `Enter`

**Step 6 — Create output.txt**
```bash
touch output.txt
```

**Step 7 — Start**
```bash
docker-compose up --build -d
```

**Step 8 — View output remotely**
```bash
tail -f output.txt
```

### Keep running after SSH disconnect

The container has `restart: always` in `docker-compose.yml` — it will:
- Auto-start when the server reboots
- Auto-restart if the app crashes

### View output from your local machine

```bash
# SSH and tail in one command
ssh root@YOUR_SERVER_IP "tail -f /root/findWalletwithdocker/output.txt"
```

Or copy the output file to your local machine:
```bash
scp root@YOUR_SERVER_IP:/root/findWalletwithdocker/output.txt ./output.txt
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
├── word.txt                  # Word list
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
| bitcoinjs-lib | Bitcoin address generation |
| bip39 | Mnemonic generation (BIP39 standard) |
| bip32 | HD wallet derivation (BIP32 standard) |
| Docker | Containerization |
| Docker Compose | Container orchestration |
