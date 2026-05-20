export type DropCategory =
  | 'QUEUE'
  | 'PARKING'
  | 'CROWD'
  | 'INCIDENT'
  | 'PRODUCT'
  | 'SAFETY'
  | 'OTHER';

export type DropStatus = 'ACTIVE' | 'EXPIRED' | 'RESOLVED';

/** Must match server `QuickStatus` and `answerOptions` keys. */
export type QuickStatus =
  | 'EMPTY'
  | 'SHORT'
  | 'NORMAL'
  | 'BUSY'
  | 'VERY_BUSY'
  | 'PLENTY'
  | 'SOME'
  | 'HARD'
  | 'NONE'
  | 'IN_STOCK'
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'CALM'
  | 'ACTIVITY'
  | 'POLICE'
  | 'UNSAFE'
  | 'YES'
  | 'NO'
  | 'UNKNOWN';

export type AnswerOptionType = 'QUEUE' | 'PARKING' | 'PRODUCT' | 'SAFETY' | 'GENERAL';

export type AnswerOption = {
  key: QuickStatus;
  label: string;
  icon: string;
  color: string;
};

export type GeoPoint = {
  type: 'Point';
  coordinates: [number, number];
};

export type Drop = {
  id: string;
  question: string;
  category: DropCategory;
  location: GeoPoint;
  radiusMeters: number;
  status: DropStatus;
  expiresAt: string;
  createdAt: string;
  answerCount: number;
  aiSummary: string;
  confidenceScore: number;
  isMine: boolean;
};

export type Answer = {
  id: string;
  dropId: string;
  text: string;
  quickStatus: QuickStatus;
  distanceFromDrop: number;
  trustWeight: number;
  createdAt: string;
  isMine: boolean;
};
