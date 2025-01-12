import { saveLastProcessedLt, getLastProcessedLt } from '../services/ProcessedOffsetService';
import { getLatestEvents, EmitLogEvent } from './ListenToEvents';
import { wss } from '../App'; // import the wss from app

async function processEvents(events: EmitLogEvent[]) {
  for (const event of events) {
    console.log(`Processing event of type ${event.type}:`, event);

    function bigintReplacer(_: string, value: any) {
        return typeof value === 'bigint' ? value.toString() : value;
    }

    switch (event.type) {
      case 'CampaignCreatedEvent': {
        console.log('Broadcasting CampaignCreatedEvent to all clients');
        wss.clients.forEach((client) => {
          if (client.readyState === 1) { // WebSocket.OPEN === 1
            client.send(JSON.stringify({
                type: 'CampaignCreatedEvent',
                data: event.data, // We'll also apply the replacer below
              }, bigintReplacer));
          }
        });
        break;
      }
      // ... other cases ...
      default:
        console.log(`No specific handling for event type ${event.type}`);
    }
  }
}

export const processBlockchainEvents = async (): Promise<void> => {

  try {
    const lastProcessedLt = await getLastProcessedLt();
    console.log('Last Processed LT:', lastProcessedLt);

    const events: EmitLogEvent[] = await getLatestEvents(lastProcessedLt);
    if (events.length > 0) {
      await processEvents(events);
      const maxLt = events.reduce(
        (max, event) => (event.createdLt > max ? event.createdLt : max),
        lastProcessedLt
      );
      await saveLastProcessedLt(maxLt);
      console.log('Updated Last Processed LT:', maxLt);
    }
  } catch (error) {
    console.error('Error fetching or processing events:', error);
  }
};
