import { useState, useEffect } from "react";
import { HTTP_ENDPOINT_NETWORK } from "../common/constants";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { TonClient } from "@ton/ton";

export const useTonClient = (): TonClient | null => {
  const [client, setClient] = useState<TonClient | null>(null);

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const endpoint = HTTP_ENDPOINT_NETWORK == "testnet" ? 
          await getHttpEndpoint({ network: HTTP_ENDPOINT_NETWORK }) :
          await getHttpEndpoint();
        const client = new TonClient({ endpoint });
        setClient(client);
      } catch (error) {
        console.error("Failed to initialize TonClientV4:", error);
      }
    };

    fetchClient();
  }, []);

  return client;
};
