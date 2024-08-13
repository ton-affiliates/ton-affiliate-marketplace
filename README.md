# AffiliateMarketplace Smart Contract Project

This project contains the implementation and testing of a decentralized affiliate marketplace on the TON blockchain. The project is designed to facilitate the creation and management of affiliate contracts between advertisers and publishers, ensuring transparent and secure transactions.

## Table of Contents

- [Overview](#overview)
- [Contracts](#contracts)
- [Tests](#tests)
- [Setup](#setup)
- [Running Tests](#running-tests)
- [Project Structure](#project-structure)

## Overview

The `AffiliateMarketplace` smart contract allows advertisers to create affiliate campaigns where publishers can sign up to promote the advertiser's products or services. The contract ensures that both parties agree to the terms before any transactions occur and provides mechanisms for handling user interactions, payments, and contract terminations.

## Contracts

### AffiliateMarketplace

The `AffiliateMarketplace` contract is the main entry point for creating and managing affiliate campaigns. It handles:

- Creation of new affiliate campaigns.
- Tracking of advertiser and publisher agreements.
- Management of funds and payments.

### Affiliate

The `Affiliate` contract is a child contract deployed for each affiliate campaign. It tracks:

- The state of the campaign (signed by advertiser, signed by publisher, etc.).
- User clicks and other interactions.
- Payments to the publisher based on user interactions.

## Tests

The project includes a comprehensive test suite to ensure the correct behavior of the contracts under various conditions.

### Positive Tests

- **Creation of Affiliate Contracts**: Verifies that contracts can be created successfully.
- **Signing by Both Parties**: Tests that both advertisers and publishers can sign the contract, and that the contract transitions through the correct states.
- **Adding Funds**: Ensures that funds can be added to the contract by the advertiser.
- **Handling User Clicks**: Simulates user interactions and ensures the correct payments are made.

### Negative Tests

- **Unauthorized Signatures**: Verifies that only authorized parties can sign the contract.
- **Double Signing Prevention**: Ensures that no party can sign the contract more than once.
- **Unauthorized Fund Management**: Tests that only the advertiser can add funds or remove the affiliate.
- **Unauthorized Affiliate Creation and Management**: Ensures that only the bot can create affiliates and only the owner can manage the marketplace.

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [NPM](https://www.npmjs.com/) or [Yarn](https://yarnpkg.com/)
- [TON Sandbox](https://github.com/tonlabs/ton-sandbox) for local testing

### Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/yourusername/AffiliateMarketplace.git
cd AffiliateMarketplace
npm install
```

## Running Tests

The project uses the `@ton/sandbox` framework for testing smart contracts on the TON blockchain.

### Running All Tests

```bash
npm test
```

### Running Specific Tests

To run a specific test file:

```bash
npm run test -- ./test/IntegrationTest.spec.ts
```

## Project Structure

```
.
├── contracts
│   ├── Affiliate.tact                # Affiliate child contract implementation
│   ├── AffiliateMarketplace.tact     # Main marketplace contract implementation
│
├── test
│   ├── IntegrationTest.spec.ts       # Integration tests for the contracts
│   ├── NegativeTests.spec.ts         # Negative tests to ensure robustness
│   ├── events.ts                     # Event loaders for test verification
│
├── dist                              # Compiled contracts
│   ├── tact_Affiliate.js
│   ├── tact_AffiliateMarketplace.js
│
├── README.md                         # This README file
├── package.json                      # Project dependencies and scripts
└── tsconfig.json                     # TypeScript configuration
```
