// @common/UserEventsConfig.ts
import eventsDoc from './events.json'; // TypeScript will auto-bundle it

/**
 * Types matching the JSON structure.
 */
export interface EventAssetPrivileges {
  type: string;
  internalRequiredAdminPrivileges: string[];
  externalRequiredAdminPrivileges: string[];
}

export interface UserEvent {
  eventName: string;     // e.g. "JOINED"
  opCode: number;        // e.g. 0
  description?: string;  // e.g. "User joined the group or channel"
  assetTypes: EventAssetPrivileges[];
}

interface UserEventsJson {
  events: UserEvent[];
}

const doc: UserEventsJson = eventsDoc as UserEventsJson;

/**
 * Build in-memory maps:
 *   - eventName -> opCode
 *   - opCode -> eventName
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
 */
export function getEventNameByOpCode(opCode: bigint): string | undefined {
  return opCodeToEventName.get(opCode);
}

/**
 * Get full event definition by eventName
 * (including description & privileges).
 */
export function getEventDefinition(eventName: string): UserEvent | undefined {
  return doc.events.find((e) => e.eventName === eventName);
}

/**
 * Get full event definition by eventName
 * (including description & privileges).
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
 * Optionally, export the entire config if needed:
 */
export const eventsConfig: UserEventsJson = doc;
