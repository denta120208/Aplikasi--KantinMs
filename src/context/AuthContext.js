import React, { createContext, useState, useEffect } from 'react';
import { auth, db } from '../config/firebaseConfig';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithCredential 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

// Configure WebBrowser for better UX
WebBrowser.maybeCompleteAuthSession();

// Check if running in Expo environment
const isExpo = () => {
  try {
    return typeof expo !== 'undefined' || __DEV__;
  } catch (error) {
    return false;
  }
};

// Check if running in web environment
const isWeb = () => {
  return Platform.OS === 'web';
};

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Google OAuth configuration
  const googleConfig = {
    clientId: '914454433538-sk3j67hjvk9tf8v72nngi1lfnc4g58q0.apps.googleusercontent.com',
    // For development, you might need to add your development URLs
    redirectUri: AuthSession.makeRedirectUri({
      useProxy: true,
    }),
    scopes: ['openid', 'profile', 'email'],
    additionalParameters: {},
    customParameters: {},
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
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
            // Create new user document
            const userData = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              role: 'user',
              createdAt: new Date().toISOString(),
            };
            
            await setDoc(docRef, userData);
            setUser(userData);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          // Set user with basic info if Firestore fails
          setUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: 'user'
          });
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
      if (isWeb()) {
        // For web, use Firebase's built-in popup
        const { signInWithPopup } = await import('firebase/auth');
        const provider = new GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        
        const result = await signInWithPopup(auth, provider);
        return result.user;
      } else {
        // For mobile (Expo), use AuthSession
        const request = new AuthSession.AuthRequest({
          clientId: googleConfig.clientId,
          scopes: googleConfig.scopes,
          redirectUri: googleConfig.redirectUri,
          responseType: AuthSession.ResponseType.IdToken,
          extraParams: {
            nonce: Math.random().toString(36).substring(2, 15),
          },
        });

        const result = await request.promptAsync({
          authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        });

        if (result.type === 'success') {
          const { id_token } = result.params;
          
          if (id_token) {
            // Create a Google credential with the token
            const googleCredential = GoogleAuthProvider.credential(id_token);
            
            // Sign-in the user with the credential
            const userCredential = await signInWithCredential(auth, googleCredential);
            return userCredential.user;
          } else {
            throw new Error('Tidak ada token yang diterima dari Google');
          }
        } else if (result.type === 'cancel') {
          throw new Error('Login dibatalkan oleh pengguna');
        } else {
          throw new Error('Login Google gagal');
        }
      }
    } catch (error) {
      console.error('Google Sign In Error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      signInWithGoogle, 
      logout,
      isGoogleSigninAvailable: true // Always available in Expo
    }}>
      {children}
    </AuthContext.Provider>
  );
};