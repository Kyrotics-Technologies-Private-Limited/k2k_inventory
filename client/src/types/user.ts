// src/types/auth.ts

export interface AdminSignupInput {
  email: string;
  name: string;
  uid: string;
}

export interface AdminLoginResponse {
  message: string;
  admin: true;
  uid: string;
  email: string;
  name?: string;
}
