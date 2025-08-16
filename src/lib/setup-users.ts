
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { UserRole, Language } from './types';

interface UserProfile {
  name: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  language: Language;
  registrationDate: string;
  avatar?: string;
}

// Function to create a user profile in Firestore
export async function createUserProfile(
  userId: string, 
  email: string, 
  profile: UserProfile
) {
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      email,
      ...profile,
    });
    console.log('User profile created successfully for:', email);
  } catch (error) {
    console.error('Error creating user profile:', error);
  }
}
