import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, getDocFromServer, Timestamp, serverTimestamp, FieldValue } from 'firebase/firestore';

// Use hardcoded config for now (will be updated with env vars later)
const firebaseConfig = {
  projectId: "ai-question-paper-genera-cb676",
  appId: "1:294497958738:web:e1b3a03997e6ec5eda188b",
  apiKey: "AIzaSyAQ9jLs3pU-4nTxgFnl_nk3K8y8bsxctAQ",
  authDomain: "ai-question-paper-genera-cb676.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-e9ba6653-3824-44c6-802b-a5b46de9ee86",
  storageBucket: "ai-question-paper-genera-cb676.firebasestorage.app",
  messagingSenderId: "294497958738",
  measurementId: ""
};

// Production domain detection
const isProduction = typeof window !== 'undefined' && 
  (window.location.hostname.includes('vercel.app') || 
   window.location.hostname !== 'localhost');

// Update auth domain for production
if (isProduction) {
  // For production, we need to ensure the auth domain is correct
  // This might need to be updated based on your actual Firebase project settings
  console.log('🔍 Production mode detected, hostname:', window.location.hostname);
}

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Error handling for Firestore operations
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test with better error handling
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('✅ Firebase connection successful');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('the client is offline')) {
        console.error("❌ Firebase connection failed: The client is offline. Check your configuration.");
      } else if (error.message.includes('permission-denied')) {
        console.error("❌ Firebase permission denied: Check your Firestore rules.");
      } else if (error.message.includes('not found')) {
        console.error("❌ Firebase project not found: Check your project ID.");
      } else {
        console.error("❌ Firebase connection error:", error.message);
      }
    }
  }
}

// Test connection only in development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  testConnection();
}

export { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  GoogleAuthProvider,
  type FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  serverTimestamp,
  Timestamp,
  FieldValue,
  getFirestore,
  initializeApp
};
