//src/services/auth.service.ts
import type { User } from "../../types/user";
import api from "./api";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
} from "firebase/auth";
import type { ConfirmationResult } from "firebase/auth";

import { auth } from "../firebase/firebase";

/**
 * Initialize reCAPTCHA verifier
 * @param container DOM element to render the reCAPTCHA
 * @returns RecaptchaVerifier instance
 */
export const initRecaptcha = (container: HTMLElement): RecaptchaVerifier => {
  const verifier = new RecaptchaVerifier(auth, container, {
    size: "invisible",
    callback: () => {},
    "expired-callback": () => {},
  });

  verifier.render();
  return verifier;
};

/**
 * Send OTP to phone number
 * @param phoneNumber Phone number with or without country code
 * @param recaptchaVerifier Initialized reCAPTCHA verifier
 * @returns Promise with confirmation result
 */
export const sendOTP = async (
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> => {
  try {
    const formattedPhone = phoneNumber.startsWith("+")
      ? phoneNumber
      : `+${phoneNumber}`;
    return await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
  } catch (error) {
    console.error("Error sending OTP:", error);
    throw error;
  }
};

/**
 * Verify OTP code
 * @param confirmationResult Confirmation result from sendOTP
 * @param otpCode 6-digit OTP code
 * @returns Promise with user credential
 */
export const verifyOTP = async (
  confirmationResult: ConfirmationResult,
  otpCode: string
) => {
  try {
    return await confirmationResult.confirm(otpCode);
  } catch (error) {
    console.error("Error verifying OTP:", error);
    throw error;
  }
};

/**
 * Get current user from the database
 * @returns Promise with user data
 */
export const getCurrentUser = async (): Promise<User> => {
  try {
    const token = await auth.currentUser?.getIdToken();
   console.log("Token:", token);
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await api.get("/users/getUser", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data.user;
  } catch (error) {
    console.error("Error getting current user:", error);
    throw error;
  }
};

/**
 * Save or update user information
 * @param userData User data to save
 * @returns Promise with updated user data
 */
export const saveUserInfo = async (userData: {
  name: string;
  email: string;
  phone: string;
}): Promise<User> => {
  try {
    const token = await auth.currentUser?.getIdToken();

    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await api.post("/users/user", userData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log("response", response);

    return response.data.user;
  } catch (error) {
    console.error("Error saving user info:", error);
    throw error;
  }
};

/**
 * Check if user exists in the database
 * @returns Promise with boolean indicating if user exists
 */
export const checkUserExists = async (): Promise<{
  exists: boolean;
  user?: User;
}> => {
  try {
    const token = await auth.currentUser?.getIdToken();
    console.log("token", token);
    if (!token) {
      throw new Error("Not authenticated");
    }

    try {
      const response = await api.get("/users/check", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      // If 404 error, user doesn't exist
      if (error.response && error.response.status === 404) {
        return { exists: false };
      }
      throw error;
    }
  } catch (error) {
    console.error("Error checking if user exists:", error);
    throw error;
  }
};

/**
 * Delete user account
 * @returns Promise that resolves when account is deleted
 */
export const deleteAccount = async (): Promise<void> => {
  try {
    const token = await auth.currentUser?.getIdToken();

    if (!token) {
      throw new Error("Not authenticated");
    }

    await api.delete("/users/delete", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Sign out after successful deletion
    await signOutUser();
  } catch (error) {
    console.error("Error deleting account:", error);
    throw error;
  }
};

/**
 * Sign out the current user
 * @returns Promise that resolves when sign out is complete
 */
export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

/**
 * Get authentication token for current user
 * @returns Promise with token or null if not authenticated
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    return (await auth.currentUser?.getIdToken()) || null;
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
};

/**
 * Check if user is authenticated
 * @returns Boolean indicating if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!auth.currentUser;
};



