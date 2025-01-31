import { useState, useEffect } from "react";
import { TonConfig } from "../config/TonConfig";
import { getHttpV4Endpoint } from "@orbs-network/ton-access";
import { TonClient4 } from "@ton/ton";

export const useTonClient = (): TonClient4 | null => {
  const [client, setClient] = useState<TonClient4 | null>(null);

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const endpoint = TonConfig.HTTP_ENDPOINT_NETWORK == "testnet" ? 
          await getHttpV4Endpoint({ network: TonConfig.HTTP_ENDPOINT_NETWORK }) :
          await getHttpV4Endpoint();
        const client = new TonClient4({ endpoint });
        setClient(client);
      } catch (error) {
        console.error("Failed to initialize TonClientV4:", error);
      }
    };

    fetchClient();
  }, []);

  return client;
};
