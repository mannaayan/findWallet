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
const {
  generateBitcoinWalletpath44,
  generateBitcoinWalletpath49,
  generateBitcoinWalletpath84,
  generateBitcoinWalletpath86,
} = require("./service/bitWalletGenerator");

const filePath = "output.txt";

// Worker thread function for parallel wallet generation
async function walletWorker(workerId) {
  console.log(`🔄 Worker ${workerId} started`);

  while (true) {
    try {
      // Generate cryptographically secure valid BIP39 mnemonic
      const mnemonic = generateMnemonic();

      for (let index = 0; index < 3; index++) {
        let Account = index;

        // All wallet generation + balance checks in parallel
        const [ethWallet, solWallet, bitWallet44, bitWallet49, bitWallet84, bitWallet86] =
          await Promise.all([
            generateEthereumWallet(mnemonic, index),
            generateSolanaWallet(mnemonic, index),
            generateBitcoinWalletpath44(mnemonic, index),
            generateBitcoinWalletpath49(mnemonic, index),
            generateBitcoinWalletpath84(mnemonic, index),
            generateBitcoinWalletpath86(mnemonic, index),
          ]);

        const ethPrivateKey = ethWallet.privateKey;
        const ethPublicKey = ethWallet.publicKey;
        const solPrivateKey = solWallet.privateKey;
        const solPublicKey = solWallet.publicKey;

        const [ethBalance, solBalance] = await Promise.all([
          GetEthBalance(ethPublicKey),
          GetSolBalance(solPublicKey),
        ]);

        if (
          (ethBalance && ethBalance.eth > 0) ||
          solBalance > 0 ||
          bitWallet44.balance > 0 ||
          bitWallet49.balance > 0 ||
          bitWallet84.balance > 0 ||
          (bitWallet86 && bitWallet86.balance > 0)
        ) {
          const logMessage = ` peyechi 
        Mnemonic is->>: ${mnemonic},\n
        Account is->>${Account}\n
        Eth Publickey is->>${ethPublicKey}\n,
        Eth private key is->>${ethPrivateKey}\n
        Eth Balance USDis->>${ethBalance.usd}\n
        Eth Balance eth  is->>${ethBalance.eth}\n
        Sol Publickey is->>${solPublicKey}\n, 
        Sol private key is->>${solPrivateKey}\n
        Sol Balance is->>${solBalance}\n
        bitWallet44 is->>${bitWallet44.privateKey}\n, 
        bitWallet44 is->>${bitWallet44.publicKey}\n, 
        bitWallet44 is->>${bitWallet44.address}\n, 
        bitWallet44 is->>${bitWallet44.balance}\n, 
        bitWallet49 is->>${bitWallet49.privateKey}\n,
        bitWallet49 is->>${bitWallet49.publicKey}\n,
        bitWallet49 is->>${bitWallet49.address}\n,
        bitWallet49 is->>${bitWallet49.balance}\n,
        bitWallet84 is->>${bitWallet84.privateKey}\n,
        bitWallet84 is->>${bitWallet84.publicKey}\n,
        bitWallet84 is->>${bitWallet84.address}\n,
        bitWallet84 is->>${bitWallet84.balance}\n,
        bitWallet86 is->>${bitWallet86.privateKey}\n,
        bitWallet86 is->>${bitWallet86.publicKey}\n,
        bitWallet86 is->>${bitWallet86.address}\n,
        bitWallet86 is->>${bitWallet86.balance}\n,
        `;
          fs.appendFileSync(filePath, logMessage + "\n");
          console.log(`✅ Worker ${workerId} found valid wallet!`);
        } else {
          const logMessage = ` Not Found\n
        Mnemonic is->>: ${mnemonic},
        
        Sol Balance is->>${solBalance}\n
        bitWallet44 is->>${bitWallet44.privateKey}\n, 
        bitWallet44 is->>${bitWallet44.publicKey}\n, 
        bitWallet44 is->>${bitWallet44.address}\n, 
        bitWallet44 is->>${bitWallet44.balance}\n, 
        bitWallet49 is->>${bitWallet49.privateKey}\n,
        bitWallet49 is->>${bitWallet49.publicKey}\n,
        bitWallet49 is->>${bitWallet49.address}\n,
        bitWallet49 is->>${bitWallet49.balance}\n,
        bitWallet84 is->>${bitWallet84.privateKey}\n,
        bitWallet84 is->>${bitWallet84.publicKey}\n,
        bitWallet84 is->>${bitWallet84.address}\n,
        bitWallet84 is->>${bitWallet84.balance}\n,
        bitWallet86 is->>${bitWallet86.privateKey}\n,
        bitWallet86 is->>${bitWallet86.publicKey}\n,
        bitWallet86 is->>${bitWallet86.address}\n,
        bitWallet86 is->>${bitWallet86.balance}\n,`;
          fs.appendFileSync(filePath, logMessage + "\n");
        }
      }
    } catch (error) {
      console.error(`❌ Worker ${workerId} error:`, error.message);
    }
  }
}

// Main entry point - spawn worker threads
if (isMainThread) {
  const numCPUs = os.cpus().length;
  const numWorkers = Math.min(numCPUs, 4);

  console.log(`🚀 Starting ${numWorkers} worker threads (${numCPUs} CPU cores available)`);
  console.log(`📝 Using official BIP39 wordlist (2048 valid words)`);
  console.log(`🔄 All API calls have connection pooling + price caching\n`);

  for (let i = 0; i < numWorkers; i++) {
    const worker = new Worker(__filename, { workerData: i });
    worker.on("error", (err) => console.error(`Worker ${i} error:`, err));
    worker.on("exit", (code) => {
      console.log(`Worker ${i} exited with code ${code}, restarting...`);
      // Auto restart crashed worker
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
