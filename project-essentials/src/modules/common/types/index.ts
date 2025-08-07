export interface ItemTimestamps {
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
  isAdmin?: boolean;
}