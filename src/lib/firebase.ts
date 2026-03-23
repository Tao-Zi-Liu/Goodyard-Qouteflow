import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getFunctions, Functions } from 'firebase/functions';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAifBxtQ5bzA_I7b-uwx8RfMHyP55gQjIk",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "goodyard-qouteflow.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "goodyard-qouteflow",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "goodyard-qouteflow.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1088251195087",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1088251195087:web:e9ae476a06569a4b1d11ba",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-KGSE8YBS1V"
};

const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth: Auth = getAuth(app);
const databaseId = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || '(default)';
const db: Firestore = getFirestore(app, databaseId);
const functions: Functions = getFunctions(app);
const storage: FirebaseStorage = getStorage(app);

export { app, auth, db, functions, storage };
