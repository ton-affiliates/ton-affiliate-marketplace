import blockchainConfig from './blockchain_events_config.json';

/**
 * Interface for a single Blockchain event definition.
 */
export interface BlockchainEvent {
  eventName: string;            // now just a string, e.g. "USER_REFERRED"
  telegramOpCodes: number[];    // numeric Telegram codes
  blockchainOpCode: number;     // numeric Blockchain code
  description?: string;
}

/**
 * Interface for the overall JSON structure.
 */
interface BlockchainEventsJson {
  blockchainEvents: BlockchainEvent[];
}

/**
 * Safely cast and export the JSON data. This ensures `blockchainConfig`
 * is typed properly as `BlockchainEventsJson`.
 */
export const doc: BlockchainEventsJson = blockchainConfig as BlockchainEventsJson;

/** 
 * Build some in-memory maps for quick lookups.
 */
const eventNameToBlockchainOpCode = new Map<string, number>();
const eventNameToTelegramOpCodes  = new Map<string, number[]>();
const telegramOpCodeToEventName   = new Map<number, string>();
const blockchainOpCodeToEventName = new Map<number, string>();
const blockchainOpCodeToDescription = new Map<number, string>();
const telegramOpCodeToBlockchainOpCode   = new Map<number, number>();

for (const evt of doc.blockchainEvents) {
  // Forward lookups
  eventNameToBlockchainOpCode.set(evt.eventName, evt.blockchainOpCode);
  eventNameToTelegramOpCodes.set(evt.eventName, evt.telegramOpCodes);
  blockchainOpCodeToEventName.set(evt.blockchainOpCode, evt.eventName);
  

  // Description
  if (evt.description) {
    blockchainOpCodeToDescription.set(evt.blockchainOpCode, evt.description);
  }

  // Reverse lookup for each Telegram op code
  for (const tOpCode of evt.telegramOpCodes) {
    telegramOpCodeToEventName.set(tOpCode, evt.eventName);
    telegramOpCodeToBlockchainOpCode.set(tOpCode, evt.blockchainOpCode);
  }
}

/**
 * Look up the blockchain op code by event name.
 */
export function getBlockchainOpCodeByEventName(eventName: string): number | undefined {
  return eventNameToBlockchainOpCode.get(eventName);
}

/**
 * Look up the blockchain op code by telegram op code.
 */
export function getBlockchainOpCodeByTelegramOpCode(telegramOpCode: number): number | undefined {
  return telegramOpCodeToBlockchainOpCode.get(telegramOpCode);
}

/**
 * Look up the Telegram op codes by event name.
 */
export function getTelegramOpCodesByEventName(eventName: string): number[] | undefined {
  return eventNameToTelegramOpCodes.get(eventName);
}

/**
 * Look up all Telegram op codes for a given blockchain op code.
 * (This might already exist in your code as getTelegramOpCodesByBlockchainOpCode!)
 */
export function getTelegramOpCodesByOpCode(opCode: number): number[] | undefined {
  // 1) Translate blockchain op code to event name
  const eventName = blockchainOpCodeToEventName.get(opCode);
  if (!eventName) {
    return undefined;
  }

  // 2) Then fetch all associated telegram op codes
  return eventNameToTelegramOpCodes.get(eventName);
}

/**
 * Look up the event name by a given Telegram op code.
 */
export function getEventNameByTelegramOpCode(tOpCode: number): string | undefined {
  return telegramOpCodeToEventName.get(tOpCode);
}

/**
 * Look up the event name by a given blockchain op code.
 */
export function getEventNameByBlockchainOpCode(bOpCode: number): string | undefined {
  return blockchainOpCodeToEventName.get(bOpCode);
}

/**
 * Look up the event description by a given blockchain op code.
 */
export function getEventDescriptionByBlockchainOpCode(bOpCode: number): string | undefined {
  return blockchainOpCodeToDescription.get(bOpCode);
}

/**
 * Look up all Telegram op codes for a given blockchain op code.
 */
export function getTelegramOpCodesByBlockchainOpCode(bOpCode: number): number[] | undefined {
  const eventName = blockchainOpCodeToEventName.get(bOpCode);
  if (!eventName) return undefined;
  return eventNameToTelegramOpCodes.get(eventName);
}

// Debug / example usage
console.log('=== Loaded Blockchain Events ===');
for (const evt of doc.blockchainEvents) {
  console.log(`Event: ${evt.eventName} -> bOpCode=${evt.blockchainOpCode}, tOpCodes=[${evt.telegramOpCodes.join(', ')}]`);
}
