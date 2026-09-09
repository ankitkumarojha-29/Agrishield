const hre = require("hardhat");

async function main() {
  console.log("Deploying AgriShieldRecords contract...");

  const Contract = await hre.ethers.getContractFactory("AgriShieldRecords");
  const contract = await Contract.deploy();

  await contract.waitForDeployment();

  console.log("AgriShieldRecords deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
