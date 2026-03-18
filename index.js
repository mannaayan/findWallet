const { generateMnemonic } = require("bip39");
const { Worker, isMainThread, workerData } = require("worker_threads");
const os = require("os");
const fs = require("fs");
const https = require("https");
const nodemailer = require("nodemailer");

const {
  generateEthereumWallet,
  GetEthBalance,
} = require("./service/ethWalletGenerator");
const {
  generateSolanaWallet,
  GetSolBalance,
} = require("./service/SolWalletGenerator");
const { generateAllBitcoinWallets } = require("./service/bitWalletGenerator");

const filePath = "output.txt";
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";

// Email transporter (Gmail SMTP)
const emailTransporter = (process.env.EMAIL_FROM && process.env.EMAIL_APP_PASSWORD)
  ? nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    })
  : null;

async function sendEmail(walletData) {
  if (!emailTransporter || !process.env.EMAIL_TO) return;
  try {
    const { mnemonic, account, ethWallet, ethBalance, solWallet, solBalance, btc } = walletData;
    const text = `
💰 WALLET FOUND!
================

🔑 Mnemonic: ${mnemonic}
👤 Account Index: ${account}

━━━━━━━━━━━━━━━━━━━━
ETHEREUM
━━━━━━━━━━━━━━━━━━━━
Address:     ${ethWallet.publicKey}
Private Key: ${ethWallet.privateKey}
Balance ETH: ${ethBalance?.eth ?? "N/A"}
Balance USD: $${ethBalance?.usd ?? "N/A"}

━━━━━━━━━━━━━━━━━━━━
SOLANA
━━━━━━━━━━━━━━━━━━━━
Address:     ${solWallet.publicKey}
Private Key: ${solWallet.privateKey}
Balance SOL: ${solBalance}

━━━━━━━━━━━━━━━━━━━━
BITCOIN (BIP44 - Legacy)
━━━━━━━━━━━━━━━━━━━━
Address:     ${btc.wallet44.address}
Private Key: ${btc.wallet44.privateKey}
Balance BTC: ${btc.wallet44.balance}

━━━━━━━━━━━━━━━━━━━━
BITCOIN (BIP49 - Nested SegWit)
━━━━━━━━━━━━━━━━━━━━
Address:     ${btc.wallet49.address}
Private Key: ${btc.wallet49.privateKey}
Balance BTC: ${btc.wallet49.balance}

━━━━━━━━━━━━━━━━━━━━
BITCOIN (BIP84 - Native SegWit)
━━━━━━━━━━━━━━━━━━━━
Address:     ${btc.wallet84.address}
Private Key: ${btc.wallet84.privateKey}
Balance BTC: ${btc.wallet84.balance}

━━━━━━━━━━━━━━━━━━━━
BITCOIN (BIP86 - Taproot)
━━━━━━━━━━━━━━━━━━━━
Address:     ${btc.wallet86.address}
Private Key: ${btc.wallet86.privateKey}
Balance BTC: ${btc.wallet86.balance}
`;
    await emailTransporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_TO,
      subject: "💰 Wallet Found! - FindWallet Alert",
      text,
    });
    console.log("📧 Email sent!");
  } catch (err) {
    console.error("❌ Email error:", err.message);
  }
}

// Non-blocking async file write
function appendToFile(message) {
  fs.appendFile(filePath, message + "\n", () => {});
}

// Send Discord notification — works on Render (no file system needed)
function sendDiscordNotification(message) {
  if (!DISCORD_WEBHOOK_URL) return;
  try {
    const url = new URL(DISCORD_WEBHOOK_URL);
    const body = JSON.stringify({ content: "```\n" + message.slice(0, 1900) + "\n```" });
    const req = https.request(
      { hostname: url.hostname, path: url.pathname + url.search, method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } },
      () => {}
    );
    req.on("error", () => {});
    req.write(body);
    req.end();
  } catch (_) {}
}

async function walletWorker(workerId) {
  console.log(`🔄 Worker ${workerId} started`);

  while (true) {
    try {
      const mnemonic = generateMnemonic();

      for (let index = 0; index < 3; index++) {
        const Account = index;

        // All wallets + BTC balances generated in parallel, seed computed once
        const [ethWallet, solWallet, btcWallets] = await Promise.all([
          generateEthereumWallet(mnemonic, index),
          generateSolanaWallet(mnemonic, index),
          generateAllBitcoinWallets(mnemonic, index),
        ]);

        const { wallet44, wallet49, wallet84, wallet86 } = btcWallets;

        const [ethBalance, solBalance] = await Promise.all([
          GetEthBalance(ethWallet.publicKey),
          GetSolBalance(solWallet.publicKey),
        ]);

        if (
          (ethBalance && ethBalance.eth > 0) ||
          solBalance > 0 ||
          wallet44.balance > 0 ||
          wallet49.balance > 0 ||
          wallet84.balance > 0 ||
          wallet86.balance > 0
        ) {
          const logMessage = ` peyechi
        Mnemonic is->>: ${mnemonic},\n
        Account is->>${Account}\n
        Eth Publickey is->>${ethWallet.publicKey}\n,
        Eth private key is->>${ethWallet.privateKey}\n
        Eth Balance USD is->>${ethBalance.usd}\n
        Eth Balance eth is->>${ethBalance.eth}\n
        Sol Publickey is->>${solWallet.publicKey}\n,
        Sol private key is->>${solWallet.privateKey}\n
        Sol Balance is->>${solBalance}\n
        bitWallet44 is->>${wallet44.privateKey}\n,
        bitWallet44 is->>${wallet44.publicKey}\n,
        bitWallet44 is->>${wallet44.address}\n,
        bitWallet44 is->>${wallet44.balance}\n,
        bitWallet49 is->>${wallet49.privateKey}\n,
        bitWallet49 is->>${wallet49.publicKey}\n,
        bitWallet49 is->>${wallet49.address}\n,
        bitWallet49 is->>${wallet49.balance}\n,
        bitWallet84 is->>${wallet84.privateKey}\n,
        bitWallet84 is->>${wallet84.publicKey}\n,
        bitWallet84 is->>${wallet84.address}\n,
        bitWallet84 is->>${wallet84.balance}\n,
        bitWallet86 is->>${wallet86.privateKey}\n,
        bitWallet86 is->>${wallet86.publicKey}\n,
        bitWallet86 is->>${wallet86.address}\n,
        bitWallet86 is->>${wallet86.balance}\n,
        `;
          appendToFile(logMessage);
          sendDiscordNotification(logMessage);
          sendEmail({ mnemonic, account: Account, ethWallet, ethBalance, solWallet, solBalance, btc: { wallet44, wallet49, wallet84, wallet86 } });
          console.log(`✅ Worker ${workerId} found valid wallet!`);
        } else {
          const logMessage = ` Not Found\n`;
          appendToFile(logMessage);
        }
      }
    } catch (error) {
      console.error(`❌ Worker ${workerId} error:`, error.message);
    }
  }
}

if (isMainThread) {
  const numCPUs = os.cpus().length;
  const numWorkers = Math.min(numCPUs, 8); // Increased from 4 to 8

  console.log(`🚀 Starting ${numWorkers} worker threads (${numCPUs} CPU cores available)`);
  console.log(`📝 Using cryptographically secure BIP39 mnemonics`);
  console.log(`⚡ BTC: Blockstream API | Seed computed once per mnemonic`);
  console.log(`🔄 Non-blocking async file writes\n`);

  for (let i = 0; i < numWorkers; i++) {
    const worker = new Worker(__filename, { workerData: i });
    worker.on("error", (err) => console.error(`Worker ${i} error:`, err));
    worker.on("exit", (code) => {
      console.log(`Worker ${i} exited with code ${code}, restarting...`);
      const newWorker = new Worker(__filename, { workerData: i });
      newWorker.on("error", (err) => console.error(`Worker ${i} error:`, err));
    });
  }
} else {
  walletWorker(workerData).catch((err) => console.error(`Worker crashed:`, err));
}

// while (true) {
//     const logMessage = `Count: ${count}\n`;
//     //console.log(logMessage);
//     fs.appendFileSync(filePath, logMessage); // Write to file
//     count++;
// }

// //console.log("Loop completed. Check output.txt for results.");
