import telegramConfig from './telegram_events_config.json';

/**
 * Interface for a single Telegram event definition.
 */
export interface AdminPrivileges {
  [assetType: string]: string[];
}

/**
 * Interface for a single Telegram event.
 */
export interface TelegramEvent {
  eventName: string;         // e.g. "JOINED_CHAT"
  telegramOpCode: number;    // numeric code
  description?: string;
  api: string;
  internalRequiredAdminPrivileges: AdminPrivileges;
  externalRequiredAdminPrivileges: AdminPrivileges;
}

/**
 * Interface for the overall JSON structure.
 */
interface TelegramEventsJson {
  telegramEvents: TelegramEvent[];
}

/**
 * Safely cast to our interface.
 */
export const doc: TelegramEventsJson = telegramConfig as TelegramEventsJson;

/**
 * Build in-memory maps for quick lookups.
 */
const eventNameToTelegramOpCode = new Map<string, number>();
const telegramOpCodeToEventName = new Map<number, string>();
const telegramOpCodeToEvent     = new Map<number, TelegramEvent>();

for (const evt of doc.telegramEvents) {
  eventNameToTelegramOpCode.set(evt.eventName, evt.telegramOpCode);
  telegramOpCodeToEventName.set(evt.telegramOpCode, evt.eventName);
  telegramOpCodeToEvent.set(evt.telegramOpCode, evt);
}

/**
 * Look up the Telegram op code by event name.
 */
export function getTelegramOpCodeByEventName(eventName: string): number | undefined {
  return eventNameToTelegramOpCode.get(eventName);
}

/**
 * Look up the event name by a given Telegram op code.
 */
export function getEventNameByTelegramOpCode(opCode: number): string | undefined {
  return telegramOpCodeToEventName.get(opCode);
}

/**
 * Look up the entire Telegram event by a given Telegram op code.
 */
export function getTelegramEventByOpCode(opCode: number): TelegramEvent | undefined {
  return telegramOpCodeToEvent.get(opCode);
}

// Debug / example usage
console.log('=== Loaded Telegram Events ===');
for (const evt of doc.telegramEvents) {
  console.log(`Event: ${evt.eventName} -> tOpCode=${evt.telegramOpCode}`);
}
