// Import Firebase
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Konfigurasi Firebase
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
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };