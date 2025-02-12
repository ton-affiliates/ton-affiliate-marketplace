import eventsDoc from './telegram_events_config.json';
import { TelegramEventType } from './Enums';

/**
 * Interface for admin privileges per asset type.
 */
export interface AdminPrivileges {
  [assetType: string]: string[];
}

/**
 * Interface for a Telegram event definition.
 */
export interface TelegramEvent {
  eventName: TelegramEventType;  // Enum for readability
  telegramOpCode: number;        // Identifier for the event
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
 * Load the event configuration.
 */
export const doc: TelegramEventsJson = (eventsDoc as unknown) as TelegramEventsJson;

/**
 * Build in-memory maps for quick lookups.
 */
const eventNameToTelegramOpCode = new Map<TelegramEventType, number>();
const telegramOpCodeToEventName = new Map<number, TelegramEventType>();
const telegramOpCodeToEvent = new Map<number, TelegramEvent>();

for (const evt of doc.telegramEvents) {
  eventNameToTelegramOpCode.set(evt.eventName, evt.telegramOpCode);
  telegramOpCodeToEventName.set(evt.telegramOpCode, evt.eventName);
  telegramOpCodeToEvent.set(evt.telegramOpCode, evt);
}

/**
 * Look up the Telegram op code by event name.
 */
export function getTelegramOpCodeByEventName(eventName: TelegramEventType): number | undefined {
  return eventNameToTelegramOpCode.get(eventName);
}

/**
 * Look up the event name by a given Telegram op code.
 */
export function getEventNameByTelegramOpCode(opCode: number): TelegramEventType | undefined {
  return telegramOpCodeToEventName.get(opCode);
}

/**
 * Look up the entire Telegram event by a given Telegram op code.
 */
export function getTelegramEventByOpCode(opCode: number): TelegramEvent | undefined {
  return telegramOpCodeToEvent.get(opCode);
}
