// src/contexts/auth-context.tsx
"use client";

import type { ReactNode } from 'react';
import { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User, Language } from '@/lib/types';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Function to get user profile from Firestore
  const getUserProfile = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: userData.name || firebaseUser.displayName || '',
          role: userData.role || 'Sales',
          registrationDate: userData.registrationDate || firebaseUser.metadata.creationTime || '',
          lastLoginTime: new Date().toISOString(),
          status: userData.status || 'Active',
          language: userData.language || 'en',
          avatar: userData.avatar || firebaseUser.photoURL || 'https://placehold.co/100x100'
        };
      } else {
        // If no user profile exists in Firestore, create a default one
        return {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          role: 'Sales', // Default role
          registrationDate: firebaseUser.metadata.creationTime || new Date().toISOString(),
          lastLoginTime: new Date().toISOString(),
          status: 'Active',
          language: 'en',
          avatar: firebaseUser.photoURL || 'https://placehold.co/100x100'
        };
      }
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  };

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userProfile = await getUserProfile(firebaseUser);
        if (userProfile) {
          setUser(userProfile);
          localStorage.setItem('user', JSON.stringify(userProfile));
          localStorage.setItem('lang', userProfile.language);
        }
      } else {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('lang');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userProfile = await getUserProfile(userCredential.user);
      
      if (userProfile) {
        setUser(userProfile);
        localStorage.setItem('user', JSON.stringify(userProfile));
        localStorage.setItem('lang', userProfile.language);
        setLoading(false);
        return true;
      }
      setLoading(false);
      return false;
    } catch (error) {
      console.error('Login error:', error);
      setLoading(false);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('lang');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [router]);

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}