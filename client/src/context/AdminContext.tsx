import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "../services/firebase/firebase";
import { adminLogin } from "../services/api/authApi";

type AdminStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "unauthorized"
  | "error";

interface AdminData {
  uid: string;
  name: string;
  email: string;
}

interface AdminContextType {
  status: AdminStatus;
  admin: AdminData | null;
  user: User | null;
  error: string | null;
  refreshAdmin: () => Promise<AdminData | null>;
  clearAdmin: () => void;
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType>({
  status: "loading",
  admin: null,
  user: null,
  error: null,
  refreshAdmin: async () => null,
  clearAdmin: () => {},
  logout: async () => {},
});

export const useAdmin = () => useContext(AdminContext);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [status, setStatus] = useState<AdminStatus>("loading");
  const [admin, setAdmin] = useState<AdminData | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef<{ user: User; task: Promise<AdminData | null> } | null>(null);
  const generation = useRef(0);

  const clearAdmin = useCallback(() => {
    generation.current += 1;
    inFlight.current = null;
    setAdmin(null);
    setUser(null);
    setStatus("unauthenticated");
    setError(null);
  }, []);

  const refreshAdmin = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      clearAdmin();
      return null;
    }
    if (inFlight.current?.user === currentUser) {
      return inFlight.current.task;
    }

    const requestGeneration = ++generation.current;

    setStatus("loading");
    setError(null);

    const task = (async () => {
      try {
        let response;
        try {
          response = await adminLogin(await currentUser.getIdToken());
        } catch (firstError: any) {
          if (firstError?.response?.status !== 401) {
            throw firstError;
          }
          response = await adminLogin(await currentUser.getIdToken(true));
        }

        if (
          generation.current !== requestGeneration ||
          auth.currentUser !== currentUser
        ) {
          return null;
        }
        if (response.admin !== true || response.uid !== currentUser.uid) {
          throw new Error("Invalid admin verification response");
        }

        const nextAdmin: AdminData = {
          uid: response.uid,
          name: response.name || "Admin",
          email: response.email || currentUser.email || "",
        };

        setAdmin(nextAdmin);
        setUser(currentUser);
        setStatus("authenticated");
        return nextAdmin;
      } catch (error: any) {
        if (generation.current !== requestGeneration || auth.currentUser !== currentUser) {
          return null;
        }

        const responseStatus = error?.response?.status;

        if (responseStatus === 403) {
          setAdmin(null);
          setUser(currentUser);
          setStatus("unauthorized");
          setError("Not authorized as admin");
        } else if (responseStatus === 401) {
          setAdmin(null);
          setUser(null);
          setStatus("unauthenticated");
          setError("Session expired. Please sign in again.");
        } else {
          setAdmin(null);
          setUser(currentUser);
          setStatus("error");
          setError("Unable to verify admin status. Please try again.");
        }

        return null;
      } finally {
        if (generation.current === requestGeneration) {
          inFlight.current = null;
        }
      }
    })();

    inFlight.current = { user: currentUser, task };
    return task;
  }, [clearAdmin]);

  useEffect(() => {
    setStatus("loading");
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        clearAdmin();
        return;
      }
      await refreshAdmin();
    });

    return () => unsubscribe();
  }, [clearAdmin, refreshAdmin]);

  const logout = useCallback(async () => {
    clearAdmin();
    await signOut(auth);
  }, [clearAdmin]);

  const value = useMemo(
    () => ({
      status,
      admin,
      user,
      error,
      refreshAdmin,
      clearAdmin,
      logout,
    }),
    [status, admin, user, error, refreshAdmin, clearAdmin, logout]
  );

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
};
