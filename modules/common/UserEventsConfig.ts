// @common/UserEventsConfig.ts
import eventsDoc from './events.json'; // TypeScript will auto-bundle it

/**
 * Interfaces matching the JSON structure.
 */

export interface EventAssetPrivileges {
  type: string;
  internalRequiredAdminPrivileges: string[];
  externalRequiredAdminPrivileges: string[];
}

/**
 * Interface for the API details associated with an event.
 */
export interface UserEventAPI {
  trigger: string;         // e.g. "new_chat_members" or "cron_job"
  method?: string;         // e.g. "getChatMember" (optional, only applicable for some events)
  notes?: string;          // Additional information for developers/maintainers.
}

/**
 * Interface for a user event definition.
 */
export interface UserEvent {
  eventName: string;     // e.g. "JOINED"
  opCode: number;        // e.g. 0
  description?: string;  // e.g. "User joined the group or channel"
  assetTypes: EventAssetPrivileges[];
  api?: UserEventAPI;    // Optional API details (e.g. trigger, method, notes)
}

interface UserEventsJson {
  events: UserEvent[];
}

const doc: UserEventsJson = eventsDoc as UserEventsJson;

// Uncomment if you need to debug the loaded configuration.
// console.log(`Loaded doc.events:\n${JSON.stringify(doc.events, null, 2)}`);

/**
 * Build in-memory maps:
 *   - eventName -> opCode
 *   - opCode -> eventName
 *
 * Note: We convert opCode to BigInt to handle any potential large numeric values.
 */
const eventNameToOpCode = new Map<string, bigint>();
const opCodeToEventName = new Map<bigint, string>();

for (const evt of doc.events) {
  const bigOpCode = BigInt(evt.opCode);
  eventNameToOpCode.set(evt.eventName, bigOpCode);
  opCodeToEventName.set(bigOpCode, evt.eventName);
}

/**
 * Look up opCode by eventName.
 */
export function getOpCodeByEventName(eventName: string): bigint | undefined {
  return eventNameToOpCode.get(eventName);
}

/**
 * Look up eventName by opCode.
 * The input opCode is accepted as a number and then converted to BigInt.
 */
export function getEventNameByOpCode(opCode: bigint): string | undefined {
  return opCodeToEventName.get(opCode);
}

/**
 * Get full event definition by eventName
 * (including description, privileges & API details).
 */
export function getEventDefinition(eventName: string): UserEvent | undefined {
  return doc.events.find((e) => e.eventName === eventName);
}

/**
 * Get full event definition by opCode
 * (including description, privileges & API details).
 */
export function getEventDefinitionByOpCode(opCode: number): UserEvent | undefined {
  return doc.events.find((e) => e.opCode === opCode);
}

/**
 * Get all user event names (for a dropdown, UI list, etc.).
 */
export function getAllUserEventNames(): string[] {
  return doc.events.map((e) => e.eventName);
}

/**
 * Optionally, export the entire configuration if needed.
 */
export const eventsConfig: UserEventsJson = doc;
