import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { CampaignDetails } from '../components/CampaignDetails';

const useSocket = (url: string) => {
const [campaignsIds, setCampaignsIds] = useState<string[]>([]); // Initialize as an empty array
const [campaignDetailsFromId, setCampaignDetailsFromId] = useState<CampaignDetails | null>(null);

// Function to parse and sanitize boolean values in the campaignDetails object
const parseCampaignDetails = (data: any): CampaignDetails => {
    const parseBooleansAndObjects = (value: any): any => {
      if (typeof value === 'string') {
        // Convert boolean-like strings to actual booleans
        if (value === 'true') return true;
        if (value === 'false') return false;
  
        // Parse JSON strings into objects, if applicable
        try {
          return JSON.parse(value);
        } catch {
          return value; // Return original value if JSON parsing fails
        }
      }
      return value;
    };
  
    // Apply parsing to the entire data object
    return Object.entries(data).reduce((acc: any, [key, value]) => {
      if (key === 'campaignDetails' && typeof value === 'string') {
        // Parse the nested `campaignDetails` object
        acc[key] = Object.entries(parseBooleansAndObjects(value)).reduce(
          (nestedAcc: any, [nestedKey, nestedValue]) => {
            nestedAcc[nestedKey] = parseBooleansAndObjects(nestedValue);
            return nestedAcc;
          },
          {}
        );
      } else {
        acc[key] = parseBooleansAndObjects(value);
      }
      return acc;
    }, {}) as CampaignDetails;
  };

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch(`${url}/campaignIds`);
        if (!response.ok) {
          throw new Error(`Error fetching campaign IDs: ${response.statusText}`);
        }
        console.log('fetchCampaigns:');
        const campaignIdsArray: string[] = await response.json();
        setCampaignsIds(campaignIdsArray);
        console.log('campaignIdsArray:', campaignIdsArray);
      } catch (error) {
        console.error('Error fetching campaign IDs:', error);
      }
    };

    fetchCampaigns();

    const socket = io(url);
    socket.on('CampaignCreatedEventChannel', (newCampaignId: string) => {
        console.log('CampaignCreatedEventChannel:', newCampaignId);
        setCampaignsIds((prev) => Array.from(new Set([...prev, newCampaignId]))); // Ensure uniqueness and maintain as an array
    });

    return () => {
      socket.disconnect();
    };
  }, [url]);

  const fetchCampaignDetails = async (campaignId: string) => {
    try {
      const response = await fetch(`${url}/campaignDetails/${campaignId}`);
      const data = await response.json();
      if (data.error === 'Campaign not found') {
        console.error(`Campaign with ID ${campaignId} not found.`);
        setCampaignDetailsFromId(null);
      }
      // Parse nested campaignDetails
    //   const parsedData: CampaignDetails = {
    //     ...data,
    //     campaignDetails: typeof data.campaignDetails === 'string'
    //       ? JSON.parse(data.campaignDetails)
    //       : data.campaignDetails,
    //   };
    //   setCampaignDetailsFromId(parsedData);
        else {
            const parsedData = parseCampaignDetails(data);
            setCampaignDetailsFromId(parsedData);
        }
    } catch (error) {
      console.error('Error fetching campaign details:', error);
    }
  };


  return { campaignsIds, campaignDetailsFromId, fetchCampaignDetails };
};

export default useSocket;
