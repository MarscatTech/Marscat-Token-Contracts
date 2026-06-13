import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "BNB");

  const mintTo = process.env.MINT_TO || deployer.address;
  console.log("Mint to (owner):", mintTo);

  const MarscatToken = await ethers.getContractFactory("MarscatToken");
  const token = await MarscatToken.deploy(mintTo);
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("MarscatToken deployed to:", address);
  console.log("\nVerify with:");
  console.log(
    `npx hardhat verify --network <network> ${address} ${mintTo}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
