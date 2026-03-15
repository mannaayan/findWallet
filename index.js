const { generateMnemonic } = require("bip39");
const { Worker, isMainThread, workerData } = require("worker_threads");
const os = require("os");
const fs = require("fs");

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

// Non-blocking async file write
function appendToFile(message) {
  fs.appendFile(filePath, message + "\n", () => {});
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
