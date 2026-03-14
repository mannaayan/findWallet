// import { Connection } from "@solana/web3.js";
// import { JsonRpcProvider } from "ethers";
const { Connection } = require("@solana/web3.js");
const { JsonRpcProvider } = require("ethers");
require("dotenv").config();

// const ETH_API_KEY = import.meta.env.VITE_ETH_API_KEY;
// const SOL_API_KEY = import.meta.env.VITE_SOL_API_KEY;
const ETH_API_KEY = process.env.VITE_ETH_API_KEY;
const SOL_API_KEY = process.env.VITE_SOL_API_KEY;

  const EthProvider = new JsonRpcProvider(ETH_API_KEY);


  const SolProvider = new Connection(SOL_API_KEY);

module.exports ={
    EthProvider,SolProvider
}
