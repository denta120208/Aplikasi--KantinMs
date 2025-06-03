import React, { createContext, useState, useEffect } from 'react';
import { auth, db } from '../config/firebaseConfig';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithCredential 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

// Import Google Sign In hanya untuk mobile platform
let GoogleSignin = null;
if (Platform.OS !== 'web') {
  try {
    GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
  } catch (error) {
    console.log('Google Sign In not available for this platform');
  }
}

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Configure Google Sign In hanya untuk mobile
    if (GoogleSignin && Platform.OS !== 'web') {
      GoogleSignin.configure({
        webClientId: '914454433538-sk3j67hjvk9tf8v72nngi1lfnc4g58q0.apps.googleusercontent.com', // Dari Firebase Console
      });
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Get user role from Firestore
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: docSnap.data().role,
            ...docSnap.data()
          });
        } else {
          // Create new user document for Google sign in users
          const userData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: 'user', // Default role for new users
            createdAt: new Date().toISOString(),
          };
          
          await setDoc(docRef, userData);
          setUser(userData);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web platform - menggunakan popup
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        return result.user;
      } else {
        // Mobile platform - menggunakan Google Sign In native
        if (!GoogleSignin) {
          throw new Error('Google Sign In tidak tersedia untuk platform ini');
        }
        
        // Check if your device supports Google Play
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        
        // Get the users ID token
        const { idToken } = await GoogleSignin.signIn();
        
        // Create a Google credential with the token
        const googleCredential = GoogleAuthProvider.credential(idToken);
        
        // Sign-in the user with the credential
        const userCredential = await signInWithCredential(auth, googleCredential);
        return userCredential.user;
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (GoogleSignin && Platform.OS !== 'web') {
        await GoogleSignin.signOut(); // Sign out from Google (mobile only)
      }
      await signOut(auth); // Sign out from Firebase
      return true;
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      signInWithGoogle, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};