export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ASSETS: Fetcher;
}

export interface AuthContext {
  user: {
    id: string;
    name: string;
    phone: string;
    email: string;
  };
  org: {
    id: string;
    name: string;
    planTier: 'free' | 'pro';
    maxRooms: number;
    maxProperties: number;
  };
  member: {
    id: string;
    role: 'owner' | 'staff';
    assignedPropertyIds: string[];
  };
}

export type AppVariables = {
  auth: AuthContext;
};
