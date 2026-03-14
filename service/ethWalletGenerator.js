const { mnemonicToSeed } = require("bip39");
const { formatEther, HDNodeWallet } = require("ethers");
const { EthProvider } = require("./provider");
const axios = require("axios");

// Connection pooling for HTTP requests - reuse connections
const httpAgent = new (require("http").Agent)({
  keepAlive: true,
  maxSockets: 50,
});
const httpsAgent = new (require("https").Agent)({
  keepAlive: true,
  maxSockets: 50,
});

const axiosInstance = axios.create({
  timeout: 5000,
  httpAgent,
  httpsAgent,
});

// Cache for ETH prices to reduce API calls
let cachedEthPrice = null;
let lastPriceFetch = 0;
const PRICE_CACHE_TTL = 60000; // 60 seconds

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

// Fetch ETH price with caching - batch requests to reduce API load
const fetchEthPrice = async () => {
  try {
    const now = Date.now();
    // Return cached price if still valid
    if (cachedEthPrice && now - lastPriceFetch < PRICE_CACHE_TTL) {
      return cachedEthPrice;
    }

    const response = await axiosInstance.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
    );
    cachedEthPrice = response.data.ethereum.usd;
    lastPriceFetch = now;
    return cachedEthPrice;
  } catch (error) {
    ////console.error("Error fetching ETH price:", error);
    return null;
  }
};
// Get Ethereum Balance using the
const GetEthBalance = async (walletAddress) => {
  try {
    if (!walletAddress) throw new Error("Wallet address is required");

    // Get balance in Wei with faster provider
    const ethBalanceWei = await EthProvider.getBalance(walletAddress);
    const ethBalance = formatEther(ethBalanceWei); // Convert to ETH

    // Fetch ETH price in USD (cached)
    const ethPrice = await fetchEthPrice();

    // Convert balance to USD
    const balanceInUSD = ethPrice
      ? (parseFloat(ethBalance) * ethPrice).toFixed(2)
      : "N/A";

    return {
      eth: ethBalance,
      usd: balanceInUSD,
    };
  } catch (error) {
    return null;
  }
};
module.exports = {
  GetEthBalance,
  generateEthereumWallet,
};
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
