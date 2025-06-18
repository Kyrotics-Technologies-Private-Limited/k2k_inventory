// src/types/auth.ts

export interface AdminSignupInput {
  email: string;
  name: string;
  uid: string;
}

export interface AdminLoginResponse {
  message: string;
  token: string;
}
