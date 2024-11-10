# Affiliate Marketplace Smart Contracts

## Overview

This repository contains smart contracts for a decentralized affiliate marketing platform on the **TON blockchain**. The platform facilitates collaboration between advertisers and affiliates, tracks and verifies user actions, and manages automated or advertiser-controlled payouts in **TON** or **USDT Jettons**.  Each **Campaign** has its own deployed smart contract, and is highly customizable and configurable.  All events are centralized and emitted from the **AffiliateMarketplace** contract, ensuring ease of tracking and integration.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [How to Use](#how-to-use)
   - [Build](#build)
   - [Test](#test)
3. [Contract Overview](#contract-overview)
4. [Workflow](#workflow)
5. [APIs](#apis)
   - [AffiliateMarketplace APIs](#affiliatemarketplace-apis)
   - [Campaign Contract APIs](#campaign-contract-apis)
6. [Getter Functions](#getter-functions)
7. [Events](#events)
8. [Error Codes](#error-codes)

---

## Project Structure

- **`contracts`**: Source code for the smart contracts and their dependencies.
- **`wrappers`**: Wrapper classes for serialization, deserialization, and compilation.
- **`tests`**: Unit and integration tests for the contracts.
- **`scripts`**: Deployment and utility scripts for managing campaigns.

---

## How to Use

### Build
Compile all contracts:
```bash
npx blueprint build --all
```
or
```bash
yarn blueprint build --all
```

### Test
Execute the test suite:
```bash
npx blueprint test
```
or
```bash
yarn blueprint test
```

---

## Contract Overview

### **AffiliateMarketplace Contract**
- Deploys and manages `Campaign` contracts.
- Centralizes event emissions for ease of integration and tracking.
- Provides administrative tools for managing campaigns.
- Supports bot-verified user actions.

### **Campaign Contract**
- Handles individual campaign operations:
  - Tracks affiliate registrations and user actions.
  - Manages payouts based on verified actions.  Payouts are either done by the advertiser or by each affiliate.
  - Configurable to support TON or USDT Jettons for payments.
  - Flexible affiliate participation (open or restricted with approval).
  - Supports also advertiser-verified user actions directly on the Campaign contract.

---

## Workflow

1. **Deploy `AffiliateMarketplace`**:
   - The contract owner deploys and initializes it with:
     - Bot address for user action verification.
     - USDT master address and wallet bytecode.

2. **Create Campaign**:
   - A bot deploys a campaign, initializing a `Campaign` contract.

3. **Configure Campaign**:
   - Advertisers set CPA rates, duration, payment method, and participation rules.

4. **Affiliate Participation**:
   - Affiliates:
     - Join open campaigns directly.
     - Request approval for closed campaigns, which advertisers approve/reject.

5. **Track User Actions**:
   - **Bot**: Verifies Telegram actions (e.g., joining channels).
   - **Advertiser**: Validates custom actions (e.g., registrations, purchases).

6. **Payout Earnings**:
   - Affiliates withdraw directly (optional approval required).
   - Advertisers can manage payouts for specific campaigns.

---

## APIs

### **AffiliateMarketplace APIs**

#### Admin Functions
1. **AdminReplenish**  
   Replenishes the marketplace's balance.  
   - **Access**: Owner only  

2. **AdminWithdraw**  
   Withdraws funds to specified wallets.  
   - **Access**: Owner only  

3. **AdminModifyCampaignFeePercentage**  
   Adjusts withdrawal fee percentage for a specific campaign.  
   - **Access**: Owner only  
   - **Parameters**:
     - `campaignId`: ID of the campaign.
     - `feePercentage`: New fee percentage (e.g., 200 for 2%).

4. **AdminStopCampaign**  
   Pauses a campaign.  
   - **Access**: Owner only  
   - **Parameters**:
     - `campaignId`: ID of the campaign.

5. **AdminResumeCampaign**  
   Resumes a paused campaign.  
   - **Access**: Owner only  
   - **Parameters**:
     - `campaignId`: ID of the campaign.

6. **AdminSeizeCampaignBalance**  
   Transfers campaign funds to the marketplace.  
   - **Access**: Owner only  
   - **Parameters**:
     - `campaignId`: ID of the campaign.

7. **AdminPayAffiliateUSDTBounced**  
   Handles bounced affiliate payments in USDT.  
   - **Access**: Owner only  
   - **Parameters**:
     - `campaignId`: ID of the campaign.
     - `affiliateId`: ID of the affiliate.
     - `amount`: Bounced amount.

8. **AdminJettonNotificationMessageFailure**  
   Manages cases where Jetton notifications fail.  
   - **Access**: Owner only  
   - **Parameters**:
     - `campaignId`: ID of the campaign.
     - `amount`: Amount to adjust.

---

#### Bot Functions
1. **BotDeployNewCampaign**  
   Deploys a new campaign.  
   - **Access**: Bot only  

2. **BotUserAction**  
   Verifies user actions for campaigns.  
   - **Access**: Bot only  
   - **Parameters**:
     - `campaignId`: Campaign ID.
     - `affiliateId`: Affiliate ID.
     - `userActionOpCode`: Operation code.
     - `isPremiumUser`: Boolean for premium users.

---

### **Campaign Contract APIs**

#### Advertiser Functions
1. **AdvertiserSetCampaignDetails**  
   Configures campaign settings.  
   - **Access**: Advertiser  

2. **AdvertiserReplenish**  
   Adds funds to the campaign.  
   - **Access**: Advertiser  

3. **AdvertiserWithdrawFunds**  
   Withdraws remaining campaign funds.  
   - **Access**: Advertiser  

4. **AdvertiserUserAction**  
   Verifies custom actions.  
   - **Access**: Advertiser  

5. **AdvertiserAddNewAffiliateToAllowedList**  
   Approves affiliate requests for closed campaigns.  
   - **Access**: Advertiser  

6. **AdvertiserModifyAffiliateRequiresApprovalForWithdrawalFlag**  
   Toggles withdrawal approval for affiliates.  
   - **Access**: Advertiser  

#### Affiliate Functions
1. **AffiliateCreateNewAffiliate**  
   Registers an affiliate for open or closed campaigns.  
   - **Access**: Open for public campaigns; approval required for closed campaigns.  

2. **AffiliateAskToJoinAllowedList**  
   Requests approval to join a closed campaign.  
   - **Access**: Affiliate  

3. **AffiliateWithdrawEarnings**  
   Withdraws accrued earnings.  
   - **Access**: Affiliate  

---

## Getter Functions

### **AffiliateMarketplace**
- **balance**: Returns the marketplace's TON balance.  
- **bot**: Fetches the bot address.  
- **numCampaigns**: Retrieves the total campaigns deployed.  
- **campaignContractAddress**: Fetches a campaign's address by ID.  

### **Campaign**
- **campaignData**: Returns full campaign details.  
- **affiliateData**: Fetches details of a specific affiliate.  
- **affiliatesData**: Returns data for all affiliates.  
- **affiliatesDataInRange**: Fetches data for affiliates in a given range.  

---

## Events

### **Events Emitted by `AffiliateMarketplace`**
1. **CampaignCreatedEvent**  
   - Emitted when a new campaign is created.  
   - **Parameters**:
     - `campaignId`: ID of the campaign.
     - `campaignContractAddress`: Address of the new campaign.

2. **AffiliateCreatedEvent**  
   - Emitted when an affiliate registers.  
   - **Parameters**:
     - `campaignId`: Campaign ID.
     - `affiliateId`: Affiliate ID.
     - `advertiser`: Advertiser address.
     - `affiliate`: Affiliate address.

3. **AffiliateWithdrawEarningsEvent**  
   - Emitted when an affiliate withdraws funds.  
   - **Parameters**:
     - `campaignId`: Campaign ID.
     - `affiliateId`: Affiliate ID.
     - `earnings`: Amount withdrawn.
     - `fee`: Fee deducted.

4. **AdvertiserWithdrawFundsEvent**  
   - Emitted when an advertiser withdraws campaign funds.  
   - **Parameters**:
     - `campaignId`: Campaign ID.
     - `campaignBalance`: Withdrawn balance.

5. **InsufficientCampaignFundsEvent**  
   - Emitted when a campaign has insufficient funds for maximum CPA.  
   - **Parameters**:
     - `campaignId`: Campaign ID.
     - `maxCpaValue`: Max CPA value.
     - `campaignBalance`: Current balance.

6. **CampaignBalanceUnderFiveTonEvent**  
   - Alerts when a campaign balance drops below 5 TON.  
   - **Parameters**:
     - `campaignId`: Campaign ID.
     - `campaignBalance`: Remaining balance.

7. **AdvertiserModifiedAllowedListEvent**  
   - Emitted when an advertiser modifies the allowed list.  
   - **Parameters**:
     - `campaignId`: Campaign ID.
     - `affiliate`: Affiliate address.
     - `isAdded`: Boolean indicating if the affiliate was added or removed.

8. **AffiliateAskToJoinAllowedListEvent**
   - Emitted when an affiliate requests to join a closed campaign.  
   - **Parameters**:
     - `campaignId`: Campaign ID.
     - `affiliate`: Affiliate address.

---

## Error Codes

### **AffiliateMarketplace Errors**
- **2509**: At least one wallet required for withdrawal.  
- **53205**: Only advertiser can replenish funds.  

### **Campaign Errors**
- **57313**: Must be in `STATE_CAMPAIGN_CREATED`.  
- **62634**: Only bot can invoke user actions.  
- **49782**: Affiliate not on allowed list.  

