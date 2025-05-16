// User interface
export interface User {
    uid: string;
    name: string;
    email: string | null;
    phone: string;
    createdAt?: Date;
    updatedAt?: Date;
  }