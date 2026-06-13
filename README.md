# Marscat Token

Marscat Token (MCAT) is the official ERC20 token of the Marscat project, deployed on Binance Smart Chain (BSC). It features a fixed supply of 1,000,000,000 MCAT and includes compliance-grade controls such as pause, blacklist, and fund recovery.

## Requirements

- Node.js >= 18
- npm

## Setup

```bash
npm install
cp .env.example .env
# Fill in PRIVATE_KEY, BSCSCAN_API_KEY, and MINT_TO in .env
```

## Commands

```bash
npm run compile              # Compile contracts
npm test                     # Run unit tests
npm run deploy:bsc-testnet   # Deploy to BSC testnet
npm run deploy:bsc           # Deploy to BSC mainnet
```

## Security

Keep the owner private key secure. Using a multisig wallet is strongly recommended for mainnet deployments.
