// Firebase configuration for Water Monitor IoT App
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAWfxAuFFwUwL6jsoLjpO2jeupoWhMOS7o",
  authDomain: "weather-monitor-iot.firebaseapp.com",
  projectId: "weather-monitor-iot",
  storageBucket: "weather-monitor-iot.firebasestorage.app",
  messagingSenderId: "1005549204720",
  appId: "1:1005549204720:web:6c3756287f9c588a4e7e35"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Sign in anonymously to satisfy Firestore rules that require authentication
const auth = getAuth(app);
signInAnonymously(auth).catch((err) => {
  console.log('Anonymous auth failed:', err);
});

export default app;
