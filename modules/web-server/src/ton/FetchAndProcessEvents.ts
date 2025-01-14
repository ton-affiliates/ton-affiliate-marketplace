import { saveLastProcessedLt, getLastProcessedLt } from '../services/ProcessedOffsetsService';
import { getLatestEvents, EmitLogEvent } from './ListenToEvents';
import { wss } from '../App'; // import the wss from app
import { Logger } from "../utils/Logger"; 
import { createEventEntity } from '../services/EventsService';

async function processEvents(events: EmitLogEvent[]) {
  
  for (const event of events) {
    Logger.info(`Processing event of type ${event.type}: ` + event);

    function bigintReplacer(_: string, value: any) {
        return typeof value === 'bigint' ? value.toString() : value;
    }
    
    // Convert "event.data" into a JSON string using bigintReplacer, then parse it back to an object.
    const payload = JSON.parse(
      JSON.stringify(event.data, (_, value) => (typeof value === 'bigint' ? value.toString() : value))
    );

    // Now payload has no BigInt
    await createEventEntity(event.type, payload, event.createdLt?.toString());


    switch (event.type) {
      case 'CampaignCreatedEvent': {
        Logger.info('Broadcasting CampaignCreatedEvent to all clients');
        wss.clients.forEach((client) => {
          if (client.readyState === 1) { // WebSocket.OPEN === 1
            client.send(JSON.stringify({
                type: 'CampaignCreatedEvent',
                data: event.data,
              }, bigintReplacer));
          }
        });
        break;
      }
      // ... other cases ...
      default:
        Logger.info(`No specific handling for event type ${event.type}`);
    }
  }
}

export const processBlockchainEvents = async (): Promise<void> => {

  try {
    const lastProcessedLt = await getLastProcessedLt();
    Logger.debug('Last Processed LT:' + lastProcessedLt);

    const events: EmitLogEvent[] = await getLatestEvents(lastProcessedLt);
    if (events.length > 0) {
      await processEvents(events);
      const maxLt = events.reduce(
        (max, event) => (event.createdLt > max ? event.createdLt : max),
        lastProcessedLt
      );
      await saveLastProcessedLt(maxLt);
      Logger.debug('Updated Last Processed LT:' + maxLt);
    }
  } catch (error) {
    Logger.error('Error fetching or processing events:' + error);
  }
};
