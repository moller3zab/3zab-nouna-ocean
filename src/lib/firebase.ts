import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCcDfWL-uzS-81KlAKNtZQIi__Wh8QcOCc",
  authDomain: "ahmedwanfal.firebaseapp.com",
  projectId: "ahmedwanfal",
  storageBucket: "ahmedwanfal.firebasestorage.app",
  messagingSenderId: "882265772489",
  appId: "1:882265772489:web:57a1ebe15229f79af31818",
  measurementId: "G-NHVG1RY80G"
};

// Initialize Firebase App singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Analytics initialization with fallback check
export const initAnalytics = async () => {
  if (typeof window !== "undefined" && await isAnalyticsSupported()) {
    return getAnalytics(app);
  }
  return null;
};

export const db = getFirestore(app);
export const storage = getStorage(app);

export {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
};

export default app;
