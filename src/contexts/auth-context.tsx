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
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();

  // Convert Firebase User to our User type
  const getUserData = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          name: userData.name || firebaseUser.displayName || 'User',
          role: userData.role || 'Sales',
          registrationDate: userData.registrationDate?.toDate?.()?.toISOString() || 
                          userData.registrationDate || 
                          firebaseUser.metadata.creationTime!,
          lastLoginTime: userData.lastLoginTime,
          status: userData.status || 'Active',
          language: userData.language || 'en',
          avatar: userData.avatar || firebaseUser.photoURL || 'https://placehold.co/100x100',
          mustChangePassword: userData.mustChangePassword || false,
          createdBy: userData.createdBy,
          createdAt: userData.createdAt?.toDate?.()?.toISOString() || userData.createdAt,
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    // Check if auth is properly initialized
    if (!auth) {
      console.error('Firebase auth is not initialized');
      setLoading(false);
      return;
    }

    setIsInitialized(true);

    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = onAuthStateChanged(
        auth, 
        async (firebaseUser) => {
          console.log('Auth state changed:', firebaseUser?.email || 'null');
          
          try {
            if (firebaseUser) {
              const userData = await getUserData(firebaseUser);
              if (userData) {
                setUser(userData);
                // Only use localStorage on client side
                if (typeof window !== 'undefined') {
                  localStorage.setItem('user', JSON.stringify(userData));
                  localStorage.setItem('lang', userData.language);
                }
              } else {
                // Create user document if it doesn't exist
                console.log('Creating user document for authenticated user');
                const newUserData = {
                  email: firebaseUser.email,
                  name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                  role: 'Sales',
                  registrationDate: new Date().toISOString(),
                  status: 'Active',
                  language: 'en',
                  avatar: 'https://placehold.co/100x100',
                  lastLoginTime: new Date().toISOString()
                };
                
                await setDoc(doc(db, 'users', firebaseUser.uid), newUserData);
                
                // Fetch the user data again
                const createdUserData = await getUserData(firebaseUser);
                if (createdUserData) {
                  setUser(createdUserData);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('user', JSON.stringify(createdUserData));
                    localStorage.setItem('lang', createdUserData.language);
                  }
                }
              }
            } else {
              setUser(null);
              // Only use localStorage on client side
              if (typeof window !== 'undefined') {
                localStorage.removeItem('user');
                localStorage.removeItem('lang');
              }
            }
          } catch (error) {
            console.error('Error processing auth state change:', error);
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          console.error('Auth state change error:', error);
          setLoading(false);
        }
      );
    } catch (error) {
      console.error('Error setting up auth listener:', error);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    // Ensure we're on client side
    if (typeof window === 'undefined' || !auth) {
      console.error('Cannot login: Firebase auth not available');
      return false;
    }

    console.log('Attempting login for:', email);
    setLoading(true);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Firebase auth successful for:', userCredential.user.email);
      
      const userData = await getUserData(userCredential.user);
      
      if (!userData) {
        // Create user document if it doesn't exist
        console.log('Creating user document for:', userCredential.user.email);
        const newUserData = {
          email: userCredential.user.email,
          name: userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'User',
          role: 'Sales',
          registrationDate: new Date().toISOString(),
          status: 'Active',
          language: 'en',
          avatar: 'https://placehold.co/100x100',
          lastLoginTime: new Date().toISOString()
        };
        
        await setDoc(doc(db, 'users', userCredential.user.uid), newUserData);
      } else {
        // Update last login time
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          lastLoginTime: new Date().toISOString()
        }, { merge: true });
      }
      
      // The onAuthStateChanged listener will handle setting the user state
      return true;
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      setLoading(false);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    // Ensure we're on client side
    if (typeof window === 'undefined' || !auth) {
      console.error('Cannot logout: Firebase auth not available');
      return;
    }

    try {
      await signOut(auth);
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
    loading: loading || !isInitialized
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}