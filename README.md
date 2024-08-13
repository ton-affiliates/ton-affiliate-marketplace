Here’s the updated `README.md` tailored for running the project via [nujan.io](https://ide.nujan.io/), an online IDE for TON:

---

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

- Access to [nujan.io](https://ide.nujan.io/), an online IDE for the TON blockchain.
- Basic understanding of TON blockchain smart contracts.

### Running the Project

Since this project is intended to be run on [nujan.io](https://ide.nujan.io/), you can follow these steps:

1. **Open the IDE**: Go to [nujan.io](https://ide.nujan.io/).
2. **Create a New Project**: Start a new project by importing directly from your GitHub repository.
3. **Import Contracts and Test Files**: Ensure your repository includes all necessary `.tact` files (smart contracts) and test files. These will be automatically imported into your project.
4. **Compile**: Use the IDE's built-in compiler to compile the contracts.
5. **Deploy**: Deploy your contracts directly from the IDE using the provided deployment tools.
6. **Run Tests**: If you have included test files, run them within the IDE to ensure your contracts are functioning correctly.

## Running Tests

### Running All Tests

Tests can be run directly in the IDE if supported, or by using the sandbox provided by [nujan.io](https://ide.nujan.io/).

### Running Specific Tests

If running specific test files, ensure that you are selecting the correct test file in the IDE’s test runner.

## Project Structure

```
.
├── contracts
│   ├── AffiliateMarketplace.tact     # Main marketplace contract implementation + Affiliate child contract implementation
│
├── test
│   ├── IntegrationTest.spec.ts       # Integration tests for the contracts
│   ├── NegativeTests.spec.ts         # Negative tests to ensure robustness
│   ├── events.ts                     # Event loaders for test verification
│
├── dist                              # Compiled contracts
│   ├── tact_Affiliate
│   ├── tact_AffiliateMarketplace
│
├── README.md                         # This README file
└── tact.config.json                  # Tact compiler configuration
```
