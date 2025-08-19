
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { app } from '@/lib/firebase'; // Ensure you import your initialized Firebase app

// --- THIS IS THE CRITICAL PART THAT IS LIKELY MISSING OR INCORRECT ---
const auth = getAuth(app);
// ---------------------------------------------------------------------

export const useAuth = () => {
  // ... other state and functions

  const login = async (email, password) => {
    try {
      // The 'auth' object is now defined and available here
      await signInWithEmailAndPassword(auth, email, password);
      return true; // Indicate success
    } catch (error) {
      console.error("Authentication error in useAuth:", error);
      return false; // Indicate failure
    }
  };

  const logout = async () => {
    await signOut(auth);
  };
  
  // ... rest of the hook (e.g., useEffect with onAuthStateChanged)

  return {
    // ... other values
    login,
    logout,
  };
};