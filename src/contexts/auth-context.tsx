"use client";

import type { ReactNode } from 'react';
import { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from '@/lib/types';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'Users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as Omit<User, 'id' | 'email'>;
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            ...userData
          });
        } else {
          console.error("No user profile in Firestore for UID:", firebaseUser.uid);
          await signOut(auth);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, pass: string) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      console.log("Login successful for:", userCredential.user.email);
    } catch (error: any) { // Catch the specific error
      console.error("Firebase Auth Error Code:", error.code);
      console.error("Firebase Auth Error Message:", error.message);
      setLoading(false);
      throw error;
    }
  }, [])

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    router.push('/login');
  }, [router]);

  useEffect(() => {
    if (!loading) {
      const isAuthPage = pathname === '/login';
      if (user && isAuthPage) {
        router.push('/dashboard');
      } else if (!user && !isAuthPage) {
        router.push('/login');
      }
    }
  }, [user, loading, pathname, router]);

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    loading
  };
  
  // Render a loading spinner until the authentication state is determined
  if (loading) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}