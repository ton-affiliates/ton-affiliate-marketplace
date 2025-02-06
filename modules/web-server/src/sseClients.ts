// sseClients.ts
export interface SSEClient {
    res: import('express').Response;
    campaignId?: string; // for campaign-specific subscriptions
    type?: string;       // e.g., 'newCampaign' for new campaign events
  }
  
  export let sseClients: SSEClient[] = [];
  
  export const addSseClient = (client: SSEClient) => {
    sseClients.push(client);
  };
  
  export const removeSseClient = (client: SSEClient) => {
    sseClients = sseClients.filter(c => c !== client);
  };
  