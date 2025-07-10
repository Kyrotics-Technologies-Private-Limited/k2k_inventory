// src/context/AdminContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../services/firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

interface AdminData {
  uid: string;
  name: string;
  email: string;
}

interface AdminContextType {
  admin: AdminData | null;
}

const AdminContext = createContext<AdminContextType>({ admin: null });

export const useAdmin = () => useContext(AdminContext);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [admin, setAdmin] = useState<AdminData | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, "admin", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAdmin({
            uid: user.uid,
            name: docSnap.data().name || "Admin",
            email: user.email || "",
          });
        }
      } else {
        setAdmin(null);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AdminContext.Provider value={{ admin }}>{children}</AdminContext.Provider>
  );
};
