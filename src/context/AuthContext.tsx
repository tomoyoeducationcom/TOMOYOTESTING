import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider, testFirestoreConnection } from '../lib/firebase';
import { isAuthorizedAdminIdentity } from '../lib/domain';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  authError: string | null;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<User | null>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    testFirestoreConnection();

    getRedirectResult(auth).catch((err) => {
      if (err instanceof Error) {
        setAuthError(err.message);
      }
    });

    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const signInWithGoogle = async (): Promise<User | null> => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (!result.user.emailVerified) {
        setAuthError('Akun Google Anda belum memiliki status email terverifikasi.');
        return null;
      }
      return result.user;
    } catch (error: unknown) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code)
          : '';

      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return null;
        } catch (redirectError) {
          setAuthError(
            redirectError instanceof Error
              ? redirectError.message
              : 'Gagal memulai login Google.'
          );
          return null;
        }
      }

      if (code === 'auth/popup-closed-by-user') {
        setAuthError('Jendela login Google ditutup sebelum proses selesai.');
        return null;
      }

      setAuthError(
        error instanceof Error ? error.message : 'Terjadi kesalahan saat masuk dengan Google.'
      );
      return null;
    }
  };

  const logout = async () => {
    setAuthError(null);
    await signOut(auth);
  };

  const isAdmin = Boolean(
    user &&
      isAuthorizedAdminIdentity({
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
      })
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        isAdmin,
        signInWithGoogle,
        logout,
        clearAuthError: () => setAuthError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
