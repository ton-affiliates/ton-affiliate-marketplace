import telegramConfig from './telegram_events_config.json';

/**
 * Interface for a single asset type's requirements.
 */
export interface AssetRequirements {
  requiredAdmin: boolean;
  requiredMember: boolean;
  internalRequiredAdminPrivileges: string[];
  externalRequiredAdminPrivileges: string[];
}

/**
 * Interface for asset-specific requirements.
 */
export interface AssetTypeRequirements {
  [assetType: string]: AssetRequirements;
}

/**
 * Interface for a single Telegram event.
 */
export interface TelegramEvent {
  eventName: string; // e.g. "JOINED_CHAT"
  telegramOpCode: number; // Numeric operation code
  description?: string;
  api: string;
  requirements: AssetTypeRequirements;
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
const telegramOpCodeToEvent = new Map<number, TelegramEvent>();

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

/**
 * Check if an event requires the bot to be a member for a given asset type.
 */
export function doesEventRequireBotToBeMember(opCode: number, assetType: string): boolean {
  const event = getTelegramEventByOpCode(opCode);
  return event?.requirements?.[assetType]?.requiredMember ?? false;
}

/**
 * Check if an event requires admin privileges for a given asset type.
 */
export function doesEventRequireAdmin(opCode: number, assetType: string): boolean {
  const event = getTelegramEventByOpCode(opCode);
  return event?.requirements?.[assetType]?.requiredAdmin ?? false;
}

/**
 * Get the list of required internal admin privileges for a given asset type.
 */
export function getInternalRequiredAdminPrivileges(opCode: number, assetType: string): string[] {
  const event = getTelegramEventByOpCode(opCode);
  return event?.requirements?.[assetType]?.internalRequiredAdminPrivileges ?? [];
}

/**
 * Get the list of required external admin privileges for a given asset type.
 */
export function getExternalRequiredAdminPrivileges(opCode: number, assetType: string): string[] {
  const event = getTelegramEventByOpCode(opCode);
  return event?.requirements?.[assetType]?.externalRequiredAdminPrivileges ?? [];
}

// Debug / example usage
console.log('=== Loaded Telegram Events ===');
for (const evt of doc.telegramEvents) {
  console.log(`Event: ${evt.eventName} -> tOpCode=${evt.telegramOpCode}`);
}
