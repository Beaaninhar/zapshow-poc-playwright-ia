export type UserRole = "MASTER" | "USER";

export type User = {
  id: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

export type Event = {
  id: number;
  title: string;
  description?: string;
  date: string;
  price: number;
  createdByUserId: number;
  createdByName: string;
};
