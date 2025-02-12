import eventsDoc from './blockchain_events_config.json';
import { BlockchainEventType, TelegramEventType } from './Enums';

/**
 * Interface for a Blockchain event definition.
 */
export interface BlockchainEvent {
  eventName: BlockchainEventType;  // Enum for readability
  telegramOpCodes: TelegramEventType[];  // List of event types
  blockchainOpCode: number;  // Number for opCode
  description?: string;
}

/**
 * Interface for the overall JSON structure.
 */
interface BlockchainEventsJson {
  blockchainEvents: BlockchainEvent[];
}

/**
 * Load the event configuration.
 */
export const doc: BlockchainEventsJson = (eventsDoc as unknown) as BlockchainEventsJson;

/**
 * Build in-memory maps for quick lookups.
 */
const eventNameToBlockchainOpCode = new Map<BlockchainEventType, number>();
const eventNameToTelegramOpCodes = new Map<BlockchainEventType, TelegramEventType[]>();
const telegramOpCodeToEventName = new Map<number, BlockchainEventType>();
const blockchainOpCodeToEventName = new Map<number, BlockchainEventType>();
const blockchainOpCodeToEventDescription = new Map<number, string>();

for (const evt of doc.blockchainEvents) {
  // Convert the JSON event name (a string) to its numeric enum value.
  const numericEventName = BlockchainEventType[evt.eventName as unknown as keyof typeof BlockchainEventType];
  
  // Use the numeric value as the key.
  eventNameToBlockchainOpCode.set(numericEventName, evt.blockchainOpCode);
  blockchainOpCodeToEventName.set(evt.blockchainOpCode, numericEventName);
  blockchainOpCodeToEventDescription.set(evt.blockchainOpCode, evt.description!);

  eventNameToTelegramOpCodes.set(numericEventName, evt.telegramOpCodes);
  for (const op of evt.telegramOpCodes) {
    telegramOpCodeToEventName.set(op as number, numericEventName);
  }
}

export const blockchainEvents = doc.blockchainEvents;

/**
 * Look up the blockchain op code by event name.
 */
export function getBlockchainOpCodeByEventName(eventName: BlockchainEventType): number | undefined {
  return eventNameToBlockchainOpCode.get(eventName);
}

/**
 * Look up the Telegram op codes by event name.
 */
export function getTelegramOpCodesByEventName(eventName: BlockchainEventType): TelegramEventType[] | undefined {
  return eventNameToTelegramOpCodes.get(eventName);
}

/**
 * Look up the event name by a given Telegram op code.
 */
export function getEventNameByTelegramOpCode(opCode: number): BlockchainEventType | undefined {
  return telegramOpCodeToEventName.get(opCode);
}

/**
 * Look up the event name by a given blockchain op code.
 */
export function getEventNameByBlockchainOpCode(opCode: bigint): BlockchainEventType | undefined {
  return blockchainOpCodeToEventName.get(Number(opCode));
}

/**
 * Look up the event description by a given blockchain op code.
 */
export function getEventDescriptionByBlockchainOpCode(opCode: bigint): string | undefined {
  return blockchainOpCodeToEventDescription.get(Number(opCode));
}

/**
 * Look up all Telegram op codes for a given blockchain op code.
 */
export function getTelegramOpCodesByBlockchainOpCode(opCode: bigint): TelegramEventType[] | undefined {
  const key = Number(opCode);
  const eventName = blockchainOpCodeToEventName.get(key);
  const telegramCodes = eventNameToTelegramOpCodes.get(eventName!);
  return telegramCodes;
}

/* ------------------------------------------------------------------
   Logging the mappings for debugging purposes at startup.
------------------------------------------------------------------- */

console.log("=== Blockchain Events Config Loaded ===");
console.log("JSON Document (doc):", doc);

console.log("getEventNameByBlockchainOpCode");
console.log(getEventNameByBlockchainOpCode(BigInt(0n)));

console.log("Mapping: eventNameToBlockchainOpCode");
for (const [key, value] of eventNameToBlockchainOpCode.entries()) {
  // Convert numeric key to its string representation via the reverse mapping.
  console.log(`  ${BlockchainEventType[key]} (${key}) -> ${value}`);
}

console.log("Mapping: eventNameToTelegramOpCodes");
for (const [key, value] of eventNameToTelegramOpCodes.entries()) {
  const keyStr = BlockchainEventType[key];
  const telegramCodesStr = value.map(v => TelegramEventType[v]).join(", ");
  console.log(`  ${keyStr} (${key}) -> [${telegramCodesStr}]`);
}

console.log("Mapping: telegramOpCodeToEventName");
for (const [key, value] of telegramOpCodeToEventName.entries()) {
  console.log(`  ${key} -> ${BlockchainEventType[value]} (${value})`);
}

console.log("Mapping: blockchainOpCodeToEventName");
for (const [key, value] of blockchainOpCodeToEventName.entries()) {
  console.log(`  ${key} -> ${BlockchainEventType[value]} (${value})`);
}

console.log("Mapping: blockchainOpCodeToEventDescription");
for (const [key, value] of blockchainOpCodeToEventDescription.entries()) {
  console.log(`  ${key} -> ${value}`);
}

console.log(getTelegramOpCodesByBlockchainOpCode(BigInt(0))); // Should output: [0]
console.log(getTelegramOpCodesByBlockchainOpCode(BigInt(1))); // Should output: [1]
console.log(getTelegramOpCodesByBlockchainOpCode(BigInt(2))); // Should output: [1]
