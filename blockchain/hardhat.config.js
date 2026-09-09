require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

const { POLYGON_PRIVATE_KEY, POLYGON_RPC_URL } = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    amoy: {
      url: POLYGON_RPC_URL || "https://rpc-amoy.polygon.technology",
      accounts: POLYGON_PRIVATE_KEY ? [POLYGON_PRIVATE_KEY] : []
    }
  }
};
