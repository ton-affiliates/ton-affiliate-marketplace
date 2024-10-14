# Repo for affiliate-marketplace

# Affiliate Marketplace Smart Contracts

This repository contains smart contracts for an affiliate marketing platform on the TON blockchain. The project includes contracts for managing affiliate campaigns, allowing advertisers and affiliates to interact, and tracking and rewarding user actions.

## Table of Contents
- [Project Structure](#project-structure)
- [How to Use](#how-to-use)
  - [Build](#build)
  - [Test](#test)
- [Contract Overview](#contract-overview)
- [Flow Overview](#flow-overview)
- [APIs](#apis)
- [Events](#events)
- [Error Codes](#error-codes)

## Project Structure

- `contracts` - source code for all the smart contracts of the project and their dependencies.
- `wrappers` - wrapper classes (implementing `Contract` from ton-core) for the contracts, including serialization/deserialization primitives and compilation functions.
- `tests` - tests for the contracts.
- `scripts` - scripts used by the project, mainly for deployment.

## How to Use

### Build
`npx blueprint build --all` or `yarn blueprint build --all`

### Test
`npx blueprint test` or `yarn blueprint test`


## Contract Overview

### AffiliateMarketplace Contract
The `AffiliateMarketplace` contract manages the deployment and administration of `Campaign` contracts. This contract includes functions for administrative control, such as stopping/resuming campaigns, as well as handling bot-initiated user actions.

### Campaign Contract
Each `Campaign` contract corresponds to a specific advertising campaign. The contract handles affiliate registrations, tracks user actions, and facilitates the distribution of rewards based on verified actions. Campaign details include user action costs for both regular and premium Telegram users.

## Flow Overview

1. **Deploy AffiliateMarketplace Contract**:
   The deployer initializes the `AffiliateMarketplace`, which then manages the deployment of individual campaigns.

2. **Campaign Creation**:
   The bot deploys a new campaign through the `AffiliateMarketplace` contract, initiating a `Campaign` contract.

3. **Setting Campaign Details**:
   The advertiser sets the details for the campaign, including the costs per action for regular and premium users. *Op codes for both user types must match.*

4. **User Actions Verification**:
   - **Bot Verification**: Bot verifies Telegram-based user actions like joining a channel or commenting in a group.
   - **Advertiser Verification**: Advertiser verifies customized user actions on mini apps (e.g., registration, purchases).

5. **Affiliate Participation**:
   Affiliates can register with specific campaigns and accrue earnings based on verified actions. They can later withdraw these earnings.

## APIs

### AffiliateMarketplace Contract

### Admin Functions

### 1. AdminReplenish
Allows the contract owner to replenish the balance of the `AffiliateMarketplace` contract.
- **Access**: Owner only
- **Purpose**: Refill the contract balance for operations such as deploying new campaigns.

### 2. AdminWithdraw
Enables the contract owner to withdraw funds from the `AffiliateMarketplace` contract to specified wallet addresses.
- **Access**: Owner only
- **Purpose**: Retrieve funds from the contract, maintaining a required buffer.
- **Parameters**:
  - `amount`: The total amount to withdraw from the contract balance.
  - `wallets`: A map of wallet addresses that will receive the withdrawal. If multiple wallets are provided, the amount will be divided among them.

### 3. AdminModifyCampaignFeePercentage
Allows the owner to modify the fee percentage charged on affiliate earnings withdrawals for a specific campaign.
- **Access**: Owner only
- **Purpose**: Adjust the fee percentage for a specific campaign's withdrawals.
- **Parameters**:
  - `campaignId`: The unique identifier of the campaign.
  - `feePercentage`: The new fee percentage (e.g., 200 for 2%).

### 4. AdminStopCampaign
Permits the owner to stop a specific campaign, effectively pausing all operations within that campaign.
- **Access**: Owner only
- **Purpose**: Temporarily suspend a campaign’s operations.
- **Parameters**:
  - `campaignId`: The unique identifier of the campaign to be stopped.

### 5. AdminResumeCampaign
Allows the owner to resume operations of a previously stopped campaign.
- **Access**: Owner only
- **Purpose**: Reactivate a campaign that was previously stopped.
- **Parameters**:
  - `campaignId`: The unique identifier of the campaign to be resumed.

### 6. AdminSeizeCampaignBalance
Enables the owner to seize all funds from a specific campaign and transfer them back to the `AffiliateMarketplace` contract.
- **Access**: Owner only
- **Purpose**: Retrieve all funds from a campaign, typically when shutting it down.
- **Parameters**:
  - `campaignId`: The unique identifier of the campaign from which to seize funds.

### 7. Stop (Inherited from Stoppable)
Allows the owner to pause all operations within the `AffiliateMarketplace` contract.
- **Access**: Owner only
- **Purpose**: Temporarily suspend all operations across the entire contract and its campaigns.

### 8. Resume (Inherited from Stoppable)
Allows the owner to resume operations within the `AffiliateMarketplace` contract after it has been paused.
- **Access**: Owner only
- **Purpose**: Reactivate the contract and all associated campaigns.


### Bot Functions
### 1. BotDeployNewCampaign
Allows the bot to deploy a new campaign contract within the `AffiliateMarketplace`.
- **Access**: Bot only
- **Purpose**: Deploy a new campaign contract to manage a specific campaign's data and actions.
- **Parameters**: None

### 2. BotUserAction
Permits the bot to verify specific user actions related to a campaign. These actions generally correspond to operations such as joining a channel or posting in a group on Telegram, validated through Telegram.
- **Access**: Bot only
- **Purpose**: Verify user actions that fall within the scope of bot-verified events and link these actions to a specific affiliate within a campaign.
- **Parameters**:
  - `campaignId`: The unique identifier of the campaign for which the user action is being verified.
  - `affiliateId`: The unique identifier of the affiliate associated with the user action.
  - `userActionOpCode`: The operation code corresponding to the specific user action (e.g., 0 for "user click").
  - `isPremiumUser`: Boolean indicating whether the user involved in the action is a premium user (subscribed) or a regular user.

### Campaign Contract

The `Campaign` contract offers a set of functions that can be accessed by the advertiser and the affiliates of the campaign. These functions allow the advertiser to manage the campaign details, handle user actions, manage affiliates, and withdraw funds, and for the affiliate it allows registering as an affiliate of the campaign and withdrawing funds according to peformance.

### Advertiser Functions

### 1. AdvertiserSetCampaignDetails
Sets up campaign details, including CPA rates and affiliate permissions, and initializes the advertiser address.
- **Access**: Advertiser only (Initially anyone can call to become the advertiser, locking the role for the campaign)
- **Purpose**: Define campaign specifics like CPA rates, affiliate permissions, and campaign validity.
- **Parameters**:
  - `campaignDetails`: A `CampaignDetails` struct containing:
    - `regularUsersCostPerAction`: Map linking operation codes to CPA for regular users.
    - `premiumUsersCostPerAction`: Map linking operation codes to CPA for premium users.
    - `allowedAffiliates`: Map of affiliate addresses allowed in the campaign.
    - `isOpenCampaign`: Boolean indicating if the campaign is open for any affiliate to join.
    - `campaignValidForNumDays`: Optional campaign duration.

### 2. AdvertiserReplenish
Adds funds to the campaign balance, allowing for continued affiliate payments.
- **Access**: Advertiser only
- **Purpose**: Ensure that the campaign has sufficient funds to pay affiliates for actions.
- **Parameters**: None (uses message value as funds)

### 3. AdvertiserAddNewAffiliateToAllowedList
Adds an affiliate to the list of allowed affiliates in a closed campaign.
- **Access**: Advertiser only
- **Purpose**: Manually permit specific affiliates to join a closed campaign.
- **Parameters**:
  - `affiliate`: Address of the affiliate to be added.

### 4. AdvertiserWithdrawFunds
Withdraws all remaining funds to the advertiser’s address.
- **Access**: Advertiser only
- **Purpose**: Conclude a campaign and retrieve the remaining campaign funds.
- **Parameters**: None

### 5. AdvertiserUserAction
Directly verifies a user action on the campaign (applicable to user actions occurring in mini-apps or websites).
- **Access**: Advertiser only
- **Purpose**: Enable advertiser to directly verify user actions beyond those handled by the bot.
- **Parameters**:
  - `affiliateId`: Unique ID of the affiliate associated with the user action.
  - `userActionOpCode`: Operation code indicating the user action (must be > 2000).
  - `isPremiumUser`: Boolean indicating if the user is a premium user.

### Affiliate Functions

### 1. AffiliateCreateNewAffiliate
Registers an affiliate with the campaign, allowing them to start earning from user actions.
- **Access**: Open to any user in an open campaign; restricted to allowed affiliates in a closed campaign.
- **Purpose**: Register the affiliate and allow them to participate in the campaign.
- **Parameters**: None

### 2. AffiliateWithdrawEarnings
Allows an affiliate to withdraw their accrued earnings from the campaign.
- **Access**: Only the registered affiliate can call this function.
- **Purpose**: Provides a mechanism for affiliates to withdraw their earnings from the campaign contract.
- **Parameters**:
  - `affiliateId`: Unique ID of the affiliate requesting the withdrawal.

### 3. Bounced<PayAffiliate>
Handles situations where payments to an affiliate bounce back to the contract.
- **Access**: Called automatically upon a bounced payment.
- **Purpose**: Ensures that the affiliate’s accrued earnings are updated in case of a failed withdrawal.
- **Parameters**:
  - `affiliateId`: Unique ID of the affiliate.
  - `amount`: The amount that bounced back.
 

### Getter Functions

The `Campaign` and `AffiliateMarketplace` contracts offer various getter functions that allow querying key details regarding campaigns, affiliates, and contract balances. These functions are accessible to any user and do not modify the state.

### Campaign Contract Getters

1. **campaignData**
   - **Access**: Public
   - **Purpose**: Retrieves comprehensive data on the campaign.
   - **Parameters**: None
   - **Returns**: `CampaignData` object containing:
     - `campaignId`: Campaign identifier.
     - `advertiser`: Address of the advertiser.
     - `owner`: Owner of the contract.  Always the Parent contract which is AffiliateMarketplace.
     - `campaignDetails`: Struct of campaign specifics, including CPA rates, allowed affiliates, and open/closed status.
     - `numAffiliates`: Total registered affiliates.
     - `campaignStartTimestamp`: Campaign start time as a unix timestamp.
     - `lastUserActionTimestamp`: Timestamp of the last user action as a unix timestamp.
     - `numUserActions`: Total number of user actions tracked.
     - `state`: Current state of the campaign.  States are 0 - STATE_CAMPAIGN_CREATED, or 1 - STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER.
     - `campaignBalance`: Remaining balance available for affiliate payouts.
     - `contractBalance`: Total contract balance.
     - `contractAddress`: Address of the campaign contract.
     - `feePercentage`: Fee percentage on affiliate earnings withdrawals.
     - `campaignHasSufficientFundsToPayMaxCpa`: Boolean indicating if there are enough funds for max CPA.
     - `isCampaignExpired`: Boolean indicating if the campaign has expired.
     - `isCampaignPausedByAdmin`: Boolean indicating if the campaign is paused by admin.

2. **affiliateData**
   - **Access**: Public
   - **Purpose**: Retrieves data related to a specific affiliate within the campaign.
   - **Parameters**:
     - `affiliateId`: The identifier of the affiliate.
   - **Returns**: `AffiliateData` object containing:
     - `affiliate`: Address of the affiliate.
     - `userActionsStats`: Map of user actions (op code to count) by the affiliate.
     - `premiumUserActionsStats`: Map of premium user actions (op code to count) by the affiliate.
     - `accruedEarnings`: Total accrued earnings for the affiliate.

3. **affiliatesData**
   - **Access**: Public
   - **Purpose**: Returns a mapping of all affiliate data in the campaign.
   - **Parameters**: None
   - **Returns**: `Map` of affiliate IDs to `AffiliateData` objects.

### AffiliateMarketplace Contract Getters

1. **balance**
   - **Access**: Public
   - **Purpose**: Provides the total TON balance of the `AffiliateMarketplace` contract.
   - **Parameters**: None
   - **Returns**: The balance of the contract as an integer in nano-TONs.

2. **bot**
   - **Access**: Public
   - **Purpose**: Retrieves the address of the bot authorized to interact with the contract.
   - **Parameters**: None
   - **Returns**: The address of the bot.

3. **numCampaigns**
   - **Access**: Public
   - **Purpose**: Provides the total number of campaigns deployed by the `AffiliateMarketplace` contract.
   - **Parameters**: None
   - **Returns**: The count of campaigns.

4. **campaignContractAddress**
   - **Access**: Public
   - **Purpose**: Fetches the contract address of a specific campaign by its ID.
   - **Parameters**:
     - `campaignId`: The unique identifier of the campaign.
   - **Returns**: The address of the corresponding campaign contract.

These getter functions allow users to query contract state and specific details without affecting the contract, which is especially useful for frontend integrations and monitoring.


## Events

All events are emitted by the `AffiliateMarketplace` contract.

# Events in AffiliateMarketplace Contract

The `AffiliateMarketplace` contract emits various events to provide visibility into critical actions and state changes. These events are essential for tracking, auditing, and debugging the contract's behavior.

## Events

### 1. CampaignCreatedEvent
Emitted when a new campaign is successfully created.
- **Purpose**: Notifies that a new campaign has been initialized.
- **Parameters**:
  - `campaignId` (uint32): Unique identifier for the campaign.
  - `campaignContractAddress` (Address): Address of the new campaign contract.
 
### 2. AdvertiserSignedCampaignDetailsEvent
Emitted when a an advertiser set the campaign details.
- **Purpose**: Notifies when campaign details were signed by the advertiser and affiliates can start registration.
- **Parameters**:
  - `campaignId` (uint32): Unique identifier for the campaign.
  - `advertiserAddress` (Address): Address of the avertiser.

### 2. AffiliateCreatedEvent
Emitted when a new affiliate registers for a campaign.
- **Purpose**: Indicates a successful affiliate registration.
- **Parameters**:
  - `campaignId` (uint32): ID of the campaign.
  - `affiliateId` (uint32): ID of the affiliate.
  - `advertiserAddress` (Address): Address of the advertiser.
  - `affiliateAddress` (Address): Address of the affiliate.

### 3. AffiliateWithdrawEarningsEvent
Emitted when an affiliate withdraws earnings.
- **Purpose**: Logs the withdrawal of earnings by an affiliate.
- **Parameters**:
  - `campaignId` (uint32): ID of the campaign.
  - `advertiserAddress` (Address): Address of the advertiser.
  - `affiliateId` (uint32): ID of the affiliate.
  - `earnings` (Coins): Amount withdrawn by the affiliate (including the fee).
  - `fee` (Coins): Fee deducted from the withdrawal.

### 4. AdvertiserWithdrawFundsEvent
Emitted when an advertiser withdraws the entire campaign balance.
- **Purpose**: Notifies that the advertiser has retrieved all campaign funds.
- **Parameters**:
  - `campaignId` (uint32): ID of the campaign.
  - `advertiserAddress` (Address): Address of the advertiser.
  - `campaignBalance` (Coins): Amount withdrawn.

### 5. CampaignBalanceUnderFiveTonEvent
Emitted when a campaign balance drops below a threshold (5 TON). Emitted only upon user actions (not when advertiser withdraws fuds).
- **Purpose**: Alerts of low campaign balance.
- **Parameters**:
  - `campaignId` (uint32): ID of the campaign.
  - `advertiserAddressStr` (Address): Address of the advertiser.
  - `campaignBalance` (Coins): Remaining balance of the campaign.

### 6. InsufficientCampaignFundsEvent
Emitted when a campaign has insufficient funds to cover maximum CPA set in Campaign Details. Emitted only upon user actions (not when advertiser withdraws fuds).
- **Purpose**: Notifies of insufficient funds in the campaign for upcoming payments of the maximum CPA set in the campaign details.
- **Parameters**:
  - `campaignId` (uint32): ID of the campaign.
  - `advertiserAddress` (Address): Address of the advertiser.
  - `campaignBalance` (Coins): Current campaign balance.
  - `contractBalance` (Coins): Contract's overall balance.
  - `maxCpaValue` (Coins): Highest CPA value that needs to be covered.

### 7. CampaignSeizedEvent
Emitted when the admin seizes the campaign’s balance.
- **Purpose**: Indicates the admin has forcibly retrieved funds from a campaign.
- **Parameters**:
  - `campaignId` (uint32): ID of the campaign.
  - `amountSeized` (Coins): Amount seized by the admin.


## Error Codes
# Error Codes

The `AffiliateMarketplace` contract uses various error codes to indicate specific issues or constraints that arise during contract execution. These error codes are critical for debugging and handling errors in a structured way.

## Error Code List

### Common TON Errors
- **2**: Stack underflow
- **3**: Stack overflow
- **4**: Integer overflow
- **5**: Integer out of expected range
- **6**: Invalid opcode
- **7**: Type check error
- **8**: Cell overflow
- **9**: Cell underflow
- **10**: Dictionary error
- **13**: Out of gas error
- **32**: Method ID not found
- **34**: Action is invalid or not supported
- **37**: Not enough TON
- **38**: Not enough extra-currencies
- **128**: Null reference exception
- **129**: Invalid serialization prefix
- **130**: Invalid incoming message
- **131**: Constraints error
- **132**: Access denied
- **133**: Contract stopped
- **134**: Invalid argument
- **135**: Code of a contract was not found
- **136**: Invalid address
- **137**: Masterchain support is not enabled for this contract

### AffiliateMarketplace and Campaign Contract Specific Errors
- **2509**: Must have at least one wallet to withdraw to
- **4138**: Only the advertiser can add a new affiliate
- **11661**: Only advertiser can verify these events
- **12969**: Must be in state: STATE_CAMPAIGN_DETAILS_SET_BY_ADVERTISER
- **14486**: Cannot find CPA for the given op code
- **32363**: No earnings to withdraw
- **33594**: Cannot manually add affiliates to an open campaign
- **34905**: Bot can verify only op codes under 2000
- **36363**: Only the advertiser can remove the campaign and withdraw all funds
- **40058**: Campaign has no funds
- **40368**: Contract stopped
- **41412**: Only affiliate can withdraw earnings
- **43100**: Reached max number of affiliates for this campaign
- **44318**: Only bot can deploy new campaign
- **47193**: Insufficient funds to repay parent for deployment
- **48874**: Insufficient contract funds to make payment
- **49469**: Access denied
- **49782**: Affiliate not on allowed list
- **50865**: Owner must be deployer
- **52003**: Campaign is expired
- **53205**: Only the advertiser can replenish the contract
- **53296**: Contract not stopped
- **53456**: Affiliate does not exist
- **54206**: Insufficient campaign balance to make payment
- **57313**: Must be in state: STATE_CAMPAIGN_CREATED
- **58053**: OP codes for regular and premium users must match
- **60644**: Advertiser can verify only op codes over 2000
- **62634**: Only bot can invoke user actions

Each code is designed to indicate a specific type of error and helps in diagnosing and fixing issues effectively. Developers should handle these errors appropriately in their applications to ensure a robust user experience.




