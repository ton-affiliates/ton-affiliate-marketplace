
export enum UserEventType {
    SOLVED_CAPTCHA = 'SOLVED_CAPTCHA',
    JOINED = 'JOINED',
    RETAINED_TWO_WEEKS = 'RETAINED_TWO_WEEKS',
    RETAINED_ONE_MONTH = 'RETAINED_ONE_MONTH',
}  

// Bot OpCodes
export const BOT_OP_CODE_USER_JOIN = BigInt(0);
export const BOT_OP_CODE_USER_RETAINED_TWO_WEEKS = BigInt(1);
export const BOT_OP_CODE_USER_RETAINED_ONE_MONTH = BigInt(2);

// -----------------------------------------
// 3) Map from UserEventType -> OpCode
// -----------------------------------------
export const userEventToOpCode: Record<UserEventType, bigint> = {
  [UserEventType.SOLVED_CAPTCHA]: BigInt(-1),  // no op code
  [UserEventType.JOINED]: BOT_OP_CODE_USER_JOIN,
  [UserEventType.RETAINED_TWO_WEEKS]: BOT_OP_CODE_USER_RETAINED_TWO_WEEKS,
  [UserEventType.RETAINED_ONE_MONTH]: BOT_OP_CODE_USER_RETAINED_ONE_MONTH,
};

export const opCodeToUserEvent: Record<string, UserEventType> = {
    [BOT_OP_CODE_USER_JOIN.toString()]: UserEventType.JOINED,
    [BOT_OP_CODE_USER_RETAINED_TWO_WEEKS.toString()]: UserEventType.RETAINED_TWO_WEEKS,
    [BOT_OP_CODE_USER_RETAINED_ONE_MONTH.toString()]: UserEventType.RETAINED_ONE_MONTH,
  };
  
  