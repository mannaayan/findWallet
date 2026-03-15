// const { mnemonicToSeedSync } = require("bip39");
// const { BIP32Factory } = require("bip32");
// const { payments, networks } = require("bitcoinjs-lib");
// const ecc = require("tiny-secp256k1");
// const bs58 = require("bs58");
// const axios = require("axios");
// const bip32 = BIP32Factory(ecc);

// function generateBitcoinWallet(mnemonic, newId) {
//   const seed = mnemonicToSeedSync(mnemonic);
//   const root = bip32.fromSeed(seed, networks.bitcoin);
//   const path = `m/44'/0'/${newId}'/0/0`;
//   const child = root.derivePath(path);

//   //console.log("Seed: " + seed,"child", child, "Path: " + path);

//   const { address } = payments.p2pkh({ pubkey: child.publicKey, network: networks.bitcoin });
//   //console.log("Address: " + address);

//   // const privateKey = bs58.encode(child.toWIF());

//   // return {
//   //   privateKey: privateKey,
//   //   publicKey: child.publicKey.toString("hex"),
//   //   address: address,
//   // };
//   return {
//     privateKey: child.toWIF(), // No need for bs58 encoding
//     publicKey: child.publicKey.toString("hex"),
//     address: address,
//   };
// }

// async function getBitcoinBalance(address) {
//   try {
//     const response = await axios.get(`https://blockchain.info/q/addressbalance/${address}`);
//     //console.log("response: " + response.data);

//     return response.data / 1e8; // Convert Satoshi to BTC
//   } catch (error) {
//     return 0;
//   }
// }

// module.exports = { generateBitcoinWallet, getBitcoinBalance };

/*Working Fine */
//
const { mnemonicToSeedSync } = require("bip39");
const { BIP32Factory } = require("bip32");
const { payments, networks, initEccLib } = require("bitcoinjs-lib");
const ecc = require("tiny-secp256k1");
const axios = require("axios");

initEccLib(ecc); // Required by bitcoinjs-lib v6 for p2wpkh, p2tr
const bip32 = BIP32Factory(ecc);

async function getBitcoinBalance(address) {
  try {
    const response = await axios.get(
      `https://blockstream.info/api/address/${address}`,
    );
    const { funded_txo_sum, spent_txo_sum } = response.data.chain_stats;
    return (funded_txo_sum - spent_txo_sum) / 1e8; // Convert satoshis to BTC
  } catch (error) {
    return 0;
  }
}

// Derive all 4 BTC wallets from a single seed computation
async function generateAllBitcoinWallets(mnemonic, newId) {
  // Compute seed only once for all 4 paths
  const seed = mnemonicToSeedSync(mnemonic);
  const root = bip32.fromSeed(seed, networks.bitcoin);

  const child44 = root.derivePath(`m/44'/0'/${newId}'/0/0`);
  const child49 = root.derivePath(`m/49'/0'/${newId}'/0/0`);
  const child84 = root.derivePath(`m/84'/0'/${newId}'/0/0`);
  const child86 = root.derivePath(`m/86'/0'/${newId}'/0/0`);

  const addr44 = payments.p2pkh({ pubkey: Buffer.from(child44.publicKey), network: networks.bitcoin }).address;
  const addr49 = payments.p2sh({ redeem: payments.p2wpkh({ pubkey: Buffer.from(child49.publicKey), network: networks.bitcoin }), network: networks.bitcoin }).address;
  const addr84 = payments.p2wpkh({ pubkey: Buffer.from(child84.publicKey), network: networks.bitcoin }).address;
  const addr86 = payments.p2tr({ internalPubkey: Buffer.from(child86.publicKey).slice(1, 33), network: networks.bitcoin }).address;

  // Fetch all 4 balances in parallel
  const [bal44, bal49, bal84, bal86] = await Promise.all([
    getBitcoinBalance(addr44),
    getBitcoinBalance(addr49),
    getBitcoinBalance(addr84),
    getBitcoinBalance(addr86),
  ]);

  return {
    wallet44: { privateKey: child44.toWIF(), publicKey: child44.publicKey.toString("hex"), address: addr44, balance: bal44 },
    wallet49: { privateKey: child49.toWIF(), publicKey: child49.publicKey.toString("hex"), address: addr49, balance: bal49 },
    wallet84: { privateKey: child84.toWIF(), publicKey: child84.publicKey.toString("hex"), address: addr84, balance: bal84 },
    wallet86: { privateKey: child86.toWIF(), publicKey: child86.publicKey.toString("hex"), address: addr86, balance: bal86 },
  };
}

// Keep individual exports for compatibility
async function generateBitcoinWalletpath44(mnemonic, newId) {
  const wallets = await generateAllBitcoinWallets(mnemonic, newId);
  return wallets.wallet44;
}
async function generateBitcoinWalletpath49(mnemonic, newId) {
  const wallets = await generateAllBitcoinWallets(mnemonic, newId);
  return wallets.wallet49;
}
async function generateBitcoinWalletpath84(mnemonic, newId) {
  const wallets = await generateAllBitcoinWallets(mnemonic, newId);
  return wallets.wallet84;
}
async function generateBitcoinWalletpath86(mnemonic, newId) {
  const wallets = await generateAllBitcoinWallets(mnemonic, newId);
  return wallets.wallet86;
}

module.exports = {
  generateAllBitcoinWallets,
  generateBitcoinWalletpath44,
  generateBitcoinWalletpath49,
  generateBitcoinWalletpath84,
  generateBitcoinWalletpath86,
  getBitcoinBalance,
};

/*
const { mnemonicToSeedSync } = require("bip39");
const { BIP32Factory } = require("bip32");
const { payments, networks } = require("bitcoinjs-lib");
const ecc = require("tiny-secp256k1");
const axios = require("axios");

const bip32 = BIP32Factory(ecc);

async function generateBitcoinWallet (mnemonic, newId, type = "84") {
  const seed = mnemonicToSeedSync(mnemonic);
  const root = bip32.fromSeed(seed, networks.bitcoin);
  
  let path;
  switch (type) {
    case "44":
      path = `m/44'/0'/${newId}'/0/0`; // Legacy (P2PKH)
      break;
    case "49":
      path = `m/49'/0'/${newId}'/0/0`; // Nested SegWit (P2SH-P2WPKH)
      break;
    case "84":
      path = `m/84'/0'/${newId}'/0/0`; // Native SegWit (P2WPKH)
      break;
    case "86":
      path = `m/86'/0'/${newId}'/0/0`; // Taproot (P2TR)
      break;
    default:
      throw new Error("Invalid path type. Choose 44, 49, 84, or 86.");
  }

  const child = root.derivePath(path);
  const publicKeyBuffer = Buffer.from(child.publicKey);

  // //console.log("Seed: ", seed.toString("hex"), "Path:", path);

  let address;
  if (type === "49") {
    // For P2SH-P2WPKH (SegWit wrapped in P2SH)
    address = payments.p2sh({
      redeem: payments.p2wpkh({ pubkey: child.publicKeyBuffer, network: networks.bitcoin }),
      network: networks.bitcoin,
    }).address;
  } else if (type === "84") {
    // For Native SegWit (Bech32)
    address = payments.p2wpkh({ pubkey: child.publicKeyBuffer, network: networks.bitcoin }).address;
  } else if (type === "86") {
    // For Taproot (P2TR)
    address = payments.p2tr({ internalPubkey: child.publicKeyBuffer.slice(1, 33), network: networks.bitcoin }).address;
  } else {
    // For Legacy (P2PKH)

    address = payments.p2pkh({ pubkey: child.publicKeyBuffer, network: networks.bitcoin }).address;
  }

  //console.log("Address:", address);
  const balance =  await axios.get(`https://blockchain.info/q/addressbalance/${address}`);


  return {
    privateKey: child.toWIF(),
    publicKey: child.publicKey.toString("hex"),
    address: address,
    balance: balance.data /1e8
  };
}

async function getBitcoinBalance(address) {
  try {
    const response = await axios.get(`https://blockchain.info/q/addressbalance/${address}`);
    //console.log("Balance:", response.data);

    return response.data / 1e8; // Convert Satoshi to BTC
  } catch (error) {
    //console.error("Error fetching balance:", error);
    return 0;
  }
}

module.exports = { generateBitcoinWallet, getBitcoinBalance };
*/
