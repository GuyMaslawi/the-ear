export enum DropCategory {
  QUEUE = 'QUEUE',
  PARKING = 'PARKING',
  CROWD = 'CROWD',
  INCIDENT = 'INCIDENT',
  PRODUCT = 'PRODUCT',
  SAFETY = 'SAFETY',
  OTHER = 'OTHER',
}

export enum DropStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

/**
 * Quick-reply keys sent by the mobile app (`answerOptions.ts`).
 * Must stay in sync with client option `key` values.
 */
export enum QuickStatus {
  /** Queue / crowd */
  EMPTY = 'EMPTY',
  SHORT = 'SHORT',
  NORMAL = 'NORMAL',
  BUSY = 'BUSY',
  VERY_BUSY = 'VERY_BUSY',
  /** Parking */
  PLENTY = 'PLENTY',
  SOME = 'SOME',
  HARD = 'HARD',
  NONE = 'NONE',
  /** Product / stock */
  IN_STOCK = 'IN_STOCK',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  /** Safety / incident */
  CALM = 'CALM',
  ACTIVITY = 'ACTIVITY',
  POLICE = 'POLICE',
  UNSAFE = 'UNSAFE',
  /** General yes/no */
  YES = 'YES',
  NO = 'NO',
  UNKNOWN = 'UNKNOWN',
}
