// import { mnemonicToSeed } from "bip39";
// import { formatEther, HDNodeWallet } from "ethers";
// import { EthProvider } from "./provider";
const { mnemonicToSeed } = require("bip39");
const { formatEther, HDNodeWallet } = require("ethers");
const { EthProvider } = require("./provider");

 async function generateEthereumWallet(mnemonic, newId) {
  ////console.log("newId", newId);

  const seed = await mnemonicToSeed(mnemonic);
  const derivationPath = `m/44'/60'/0'/${newId}/0`; // ✅ Correct derivation path
  const hdNode = HDNodeWallet.fromSeed(seed);
  const child = hdNode.derivePath(derivationPath);
  ////console.log("child: ", child);

  return {
    privateKey: child.privateKey, // ✅ Extract private key
    publicKey: child.address, // ✅ Extract public address (not an object)
  };
}

// Fetch ETH price in USD from CoinGecko
const fetchEthPrice = async () => {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
    );
    const data = await response.json();
    return data.ethereum.usd;
  } catch (error) {
    ////console.error("Error fetching ETH price:", error);
    return null;
  }
};
// Get Ethereum Balance using the
 const GetEthBalance = async (walletAddress) => {
  try {
    if (!walletAddress) throw new Error("Wallet address is required");

    // Get balance in Wei
    const ethBalanceWei = await EthProvider.getBalance(walletAddress);
    const ethBalance = formatEther(ethBalanceWei); // Convert to ETH

    // Fetch ETH price in USD
    const ethPrice = await fetchEthPrice();
    ////console.log("ethPrice: " + ethPrice);
    
    // Convert balance to USD
    const balanceInUSD = ethPrice
      ? (parseFloat(ethBalance) * ethPrice).toFixed(2)
      : "N/A";

    ////console.log(`Balance: ${ethBalance} ETH (~$${balanceInUSD} USD)`);

    return {
      eth: ethBalance,
      usd: balanceInUSD,
    };
  } catch (error) {
    ////console.error("Error fetching ETH balance:", error);
    return null;
  }
};
module.exports ={
  GetEthBalance,generateEthereumWallet
}
// export const GetEthBalance = async (walletAddress) => {
//   try {
//     if (!walletAddress) throw new Error("Wallet address is required");

//     const EthBalance = await EthProvider.getBalance(walletAddress);
//     ////console.log("EthBalance",EthBalance);

//     return formatEther(EthBalance); // Convert from Wei to ETH
//   } catch (error) {
//     ////console.error("Error fetching balance:", error);
//     return null;
//   }
// };
