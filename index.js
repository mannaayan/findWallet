const { generateMnemonic } = require("bip39");
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
  getBitcoinBalance,
} = require("./service/bitWalletGenerator");

const filePath = "output.txt"; // File to store the output

async function getRandomWordsFromFile(filename) {
  try {
    const data = await fs.promises.readFile(filename, "utf8");
    let words = [...new Set(data.split(/\s+/).map((word) => word.trim()))];

    if (words.length < 12) {
      throw new Error("Not enough unique words in the file.");
    }

    let newList = words.sort(() => 0.5 - Math.random()).slice(0, 12);
    return newList.join(" ");
  } catch (err) {
    //console.error('Error:', err.message);
  }
}

(async function generateWallets() {
  while (true) {
    // const mnemonic = await generateMnemonic();
    const mnemonic = await getRandomWordsFromFile("word.txt");
    // const mnemonic =      "review iron volcano chest antique mimic cable already grab stairs pistol income";
    //console.log("m->", mnemonic);

    let index = 0;

    while (index !== 3) {
      let Account = index;
      const bitPrivateKey = [];
      const ethWallet = await generateEthereumWallet(mnemonic, index);
      const ethPrivateKey = ethWallet.privateKey;
      const ethPublicKey = ethWallet.publicKey;
      const ethBalance = await GetEthBalance(ethPublicKey);

      const solWallet = await generateSolanaWallet(mnemonic, index);
      const solPrivateKey = solWallet.privateKey;
      const solPublicKey = solWallet.publicKey;
      const solBalance = await GetSolBalance(solPublicKey);

      const bitWallet44 = await generateBitcoinWalletpath44(mnemonic, index);
      const bitWallet49 = await generateBitcoinWalletpath49(mnemonic, index);
      const bitWallet84 = await generateBitcoinWalletpath84(mnemonic, index);
      const bitWallet86 = await generateBitcoinWalletpath86(mnemonic, index);

      //console.log("bitWallet44", bitWallet44);
      //console.log("bitWallet44", bitWallet49);
      //console.log("bitWallet44", bitWallet84);
      //console.log("bitWallet44", bitWallet86);

      // const bitPrivateKey = bitWallet.privateKey;
      // const bitPublicKey = bitWallet.publicKey;
      // const bitAddress = bitWallet.address;
      // //console.log("bitWallet", bitWallet);

      // const bitBalance = await getBitcoinBalance(bitAddress);

      //console.log("solBalance-->", solBalance);
      //console.log("ethBalance-->", ethBalance.usd);
      //console.log("ethBalance-->", ethBalance.eth);
      // //console.log("bitBalance-->", bitBalance);
      // const clog = ` bit privateKey is->>${bitPrivateKey}\n
      // bit publicKey is ->${bitPublicKey}\n
      // bit address is ->${bitAddress}\n`;
      // //console.log(clog);

      if (
        (ethBalance && ethBalance.eth > 0) ||
        solBalance > 0 ||
        bitWallet44.balance > 0 ||
        bitWallet49.balance > 0 ||
        bitWallet84.address > 0 ||
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
        bitWallet49 is->>${bitWallet49.privateKey}\n,
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
        //console.log(logMessage);
        fs.appendFileSync(filePath, logMessage + "\n");
      } else {
        const logMessage = ` Not Found\n
        Mnemonic is->>: ${mnemonic},
        
        Sol Balance is->>${solBalance}\n
        bitWallet44 is->>${bitWallet44.privateKey}\n, 
        bitWallet44 is->>${bitWallet44.publicKey}\n, 
        bitWallet44 is->>${bitWallet44.address}\n, 
        bitWallet44 is->>${bitWallet44.balance}\n, 
        bitWallet49 is->>${bitWallet49.privateKey}\n,
        bitWallet49 is->>${bitWallet49.privateKey}\n,
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
        // //console.log(logMessage);
        fs.appendFileSync(filePath, logMessage + "\n");
      }

      index++;
    }
  }
})();

// while (true) {
//     const logMessage = `Count: ${count}\n`;
//     //console.log(logMessage);
//     fs.appendFileSync(filePath, logMessage); // Write to file
//     count++;
// }

// //console.log("Loop completed. Check output.txt for results.");
