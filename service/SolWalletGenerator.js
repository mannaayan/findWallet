const { mnemonicToSeedSync } = require("bip39");
const { derivePath } = require("ed25519-hd-key");
const { Keypair, PublicKey } = require("@solana/web3.js");
const nacl = require("tweetnacl");
const { SolProvider } = require("./provider");
const bs58 = require("bs58").default;

function generateSolanaWallet(mnemonic, newId) {
  ////console.log("Generating Solana wallet for index:", newId);

  const seed = mnemonicToSeedSync(mnemonic);
  const path = `m/44'/501'/${newId}'/0'`;
  const derivedSeed = derivePath(path, seed.toString("hex")).key;

  const keyPair = nacl.sign.keyPair.fromSeed(derivedSeed);
  const secretKey = new Uint8Array([...keyPair.secretKey]);

  const solanaKeypair = Keypair.fromSecretKey(secretKey);

  return {
    privateKey: bs58.encode(solanaKeypair.secretKey),
    publicKey: solanaKeypair.publicKey.toBase58(),
  };
}

async function GetSolBalance(walletAddress) {
  try {
    const publicKey = new PublicKey(walletAddress);
    // const balance = await solanaConnection.getBalance(publicKey);
    const balance = await SolProvider.getBalance(publicKey);
    const solBalance = balance / 1e9; // Convert lamports to SOL
    ////console.log(`SOL Balance for ${walletAddress}: ${solBalance} SOL`);
    return solBalance;
  } catch (error) {
    ////console.error("Error fetching SOL balance:", error);
    return null;
  }
}

module.exports = {
  generateSolanaWallet,
  GetSolBalance,
};
