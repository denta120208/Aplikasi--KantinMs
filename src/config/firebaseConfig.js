// config/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Platform detection yang lebih akurat
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
const isWeb = typeof window !== 'undefined' && !window.ReactNativeWebView;

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCTQzrp1WzT-1HlbguY9HEAi8YNVMF_nk8",
  authDomain: "kantin-ms.firebaseapp.com",
  projectId: "kantin-ms",
  storageBucket: "kantin-ms.appspot.com",
  messagingSenderId: "914454433538",
  appId: "1:914454433538:android:4d5f7fc313a295f526fc1b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with platform-specific settings
let auth;
if (isReactNative) {
  // For React Native - use AsyncStorage for persistence
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (error) {
    // Fallback jika AsyncStorage tidak tersedia
    console.warn('AsyncStorage not available, using default auth');
    auth = getAuth(app);
  }
} else {
  // For Web
  auth = getAuth(app);
}

// Initialize Firestore and Storage
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage, isWeb, isReactNative };
export default app;