export async function formatCampaignData(data: any): Promise<string> {
  function formatDictionary(dict: any, name: string): string {
    const entries = Array.from(dict._map.entries()).map(
      ([key, value]: [any, any]) => `${key}: ${value}`
    );
    return `${name}: { ${entries.join(', ')} }`;
  }

  function formatAffiliateData(affiliatesDict: any): string {
    const entries = Array.from(affiliatesDict._map.entries()).map(
      ([key, value]: [any, any]) => {
        const formattedUserActions = formatDictionary(value.userActionsStats, 'userActionsStats');
        return `Affiliate ${key}: { affiliate: ${value.affiliate}, accruedEarnings: ${value.accruedEarnings}n, ${formattedUserActions} }`;
      }
    );
    return `affiliates: { ${entries.join(', ')} }`;
  }

  const formattedCampaignDetails = `{
    isOpenCampaign: ${data.campaignDetails.isOpenCampaign},
    daysWithoutUserActionForWithdrawFunds: ${data.campaignDetails.daysWithoutUserActionForWithdrawFunds}n,
    ${formatDictionary(data.campaignDetails.regularUsers, 'regularUsers')},
    ${formatDictionary(data.campaignDetails.premiumUsers, 'premiumUsers')},
    ${formatDictionary(data.campaignDetails.allowedAffiliates, 'allowedAffiliates')}
  }`;

  const formattedAffiliates = formatAffiliateData(data.affiliates);

  const result = `CampaignData: {
    campaignId: ${data.campaignId}n,
    advertiser: ${data.advertiser},
    campaignDetails: ${formattedCampaignDetails},
    ${formattedAffiliates},
    state: ${data.state}n,
    numUserActions: ${data.numUserActions}n,
    lastUserAction: ${data.lastUserAction}n,
    campaignBalance: ${data.campaignBalance}n,
    contractBalance: ${data.contractBalance}n,
    contractAddress: ${data.contractAddress}
  }`;

  return result.replace(/\n/g, ''); // Removes the newlines
}
