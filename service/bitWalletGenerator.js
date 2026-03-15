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
      `https://blockchain.info/q/addressbalance/${address}`,
    );
    // console.log("response: " + response.data);

    return response.data / 1e8; // Convert Satoshi to BTC
  } catch (error) {
    console.error("Error fetching balance:", error); // Improved error logging
    return 0;
  }
}
async function generateBitcoinWalletpath84(mnemonic, newId) {
  const seed = mnemonicToSeedSync(mnemonic);
  const root = bip32.fromSeed(seed, networks.bitcoin);
  const path = `m/84'/0'/${newId}'/0/0`;
  const child = root.derivePath(path);

  const publicKeyBuffer = Buffer.from(child.publicKey);

  // Native SegWit (bech32 - bc1q...)
  const { address } = payments.p2wpkh({
    pubkey: publicKeyBuffer,
    network: networks.bitcoin,
  });

  const balance = await getBitcoinBalance(address);
  return {
    privateKey: child.toWIF(),
    publicKey: child.publicKey.toString("hex"),
    address: address,
    balance: balance,
  };
}

async function generateBitcoinWalletpath44(mnemonic, newId) {
  const seed = mnemonicToSeedSync(mnemonic);
  const root = bip32.fromSeed(seed, networks.bitcoin);
  const path = `m/44'/0'/${newId}'/0/0`;
  const child = root.derivePath(path);
  //console.log("Seed: ", seed.toString("hex"), "child:", child, "Path: " + path);

  // Convert Uint8Array to Buffer
  const publicKeyBuffer = Buffer.from(child.publicKey);

  const { address } = payments.p2pkh({
    pubkey: publicKeyBuffer,
    network: networks.bitcoin,
  });
  //console.log("Address: " + address);
  const balance = await getBitcoinBalance(address);

  return {
    privateKey: child.toWIF(),
    publicKey: child.publicKey.toString("hex"),
    address: address,
    balance: balance,
  };
}

async function generateBitcoinWalletpath49(mnemonic, newId) {
  const seed = mnemonicToSeedSync(mnemonic);
  const root = bip32.fromSeed(seed, networks.bitcoin);
  const path = `m/49'/0'/${newId}'/0/0`;
  const child = root.derivePath(path);

  const publicKeyBuffer = Buffer.from(child.publicKey);

  // Nested SegWit (P2SH-P2WPKH - 3...)
  const { address } = payments.p2sh({
    redeem: payments.p2wpkh({ pubkey: publicKeyBuffer, network: networks.bitcoin }),
    network: networks.bitcoin,
  });

  const balance = await getBitcoinBalance(address);

  return {
    privateKey: child.toWIF(),
    publicKey: child.publicKey.toString("hex"),
    address: address,
    balance,
  };
}

async function generateBitcoinWalletpath86(mnemonic, newId) {
  const seed = mnemonicToSeedSync(mnemonic);
  const root = bip32.fromSeed(seed, networks.bitcoin);
  const path = `m/86'/0'/${newId}'/0/0`;
  const child = root.derivePath(path);

  const publicKeyBuffer = Buffer.from(child.publicKey);

  // Taproot (P2TR - bc1p...)
  const { address } = payments.p2tr({
    internalPubkey: publicKeyBuffer.slice(1, 33), // x-only pubkey (32 bytes)
    network: networks.bitcoin,
  });

  const balance = await getBitcoinBalance(address);

  return {
    privateKey: child.toWIF(),
    publicKey: child.publicKey.toString("hex"),
    address: address,
    balance,
  };
}

module.exports = {
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
