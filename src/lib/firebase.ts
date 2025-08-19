import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getFunctions, Functions } from 'firebase/functions';
import { getStorage, Storage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAifBxtQ5bzA_I7b-uwx8RfMHyP55gQjIk",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "goodyard-qouteflow.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "goodyard-qouteflow",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "goodyard-qouteflow.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1088251195087",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1088251195087:web:e9ae476a06569a4b1d11ba",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-KGSE8YBS1V"
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let functions: Functions | undefined;
let storage: Storage | undefined;

// Only initialize Firebase on client side
if (typeof window !== 'undefined') {
  try {
    // Initialize Firebase only if it hasn't been initialized
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    
    // Initialize services
    auth = getAuth(app);
    db = getFirestore(app);
    functions = getFunctions(app);
    storage = getStorage(app);
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

// Export with type assertions for SSR
export { 
  app,
  auth,
  db,
  functions,
  storage
};