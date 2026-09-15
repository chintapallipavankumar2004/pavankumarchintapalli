import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import { firebaseConfigured, getFirebaseServices } from "@/lib/firebase";

type AuthValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);
  useEffect(() => {
    if (!firebaseConfigured) return;
    let unsubscribe: () => void = () => {};
    getFirebaseServices().then(async (services) => {
      if (!services) return;
      const { getIdTokenResult, onAuthStateChanged, signOut } = await import("firebase/auth");
      unsubscribe = onAuthStateChanged(services.auth, async (next) => {
        if (!next) {
          setUser(null);
          setLoading(false);
          return;
        }
        const token = await getIdTokenResult(next);
        if (token.claims.admin !== true) {
          await signOut(services.auth);
          setUser(null);
        } else setUser(next);
        setLoading(false);
      });
    });
    return () => unsubscribe();
  }, []);
  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      configured: firebaseConfigured,
      login: async (email, password) => {
        const services = await getFirebaseServices();
        if (!services) throw new Error("Firebase is not configured.");
        const { getIdTokenResult, signInWithEmailAndPassword, signOut } =
          await import("firebase/auth");
        const credential = await signInWithEmailAndPassword(services.auth, email, password);
        const token = await getIdTokenResult(credential.user, true);
        if (token.claims.admin !== true) {
          await signOut(services.auth);
          throw new Error("This account is not authorized as an administrator.");
        }
      },
      logout: async () => {
        const services = await getFirebaseServices();
        if (services) {
          const { signOut } = await import("firebase/auth");
          await signOut(services.auth);
        }
      },
    }),
    [user, loading],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
