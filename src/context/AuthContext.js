import React, { createContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

// Configure WebBrowser for AuthSession
WebBrowser.maybeCompleteAuthSession();

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false); // Flag untuk registrasi

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Jika sedang dalam proses registrasi, jangan update user state
      if (isRegistering) {
        return;
      }

      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setUser({
            uid: user.uid,
            email: user.email,
            role: docSnap.data().role,
            ...docSnap.data()
          });
        } else {
          setUser({
            uid: user.uid,
            email: user.email,
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [isRegistering]);

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  };

  const register = async (email, password, userData = {}) => {
    try {
      setIsRegistering(true); // Set flag registrasi
      
      // Buat akun baru dengan email dan password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Simpan data user tambahan ke Firestore
      const userDoc = {
        uid: user.uid,
        email: user.email,
        role: userData.role || 'user', // default role
        name: userData.name || '',
        createdAt: new Date().toISOString(),
        ...userData
      };

      await setDoc(doc(db, 'users', user.uid), userDoc);
      
      // Logout setelah registrasi agar tidak otomatis login
      await signOut(auth);
      
      return user;
    } catch (error) {
      throw error;
    } finally {
      setIsRegistering(false); // Reset flag registrasi
    }
  };

  const loginWithGoogle = async () => {
    try {
      if (Platform.OS === 'web') {
        // Untuk web, gunakan Firebase popup
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        
        // Cek apakah user sudah ada di database
        const docRef = doc(db, "users", result.user.uid);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          // Jika user baru, simpan ke database
          const userDoc = {
            uid: result.user.uid,
            email: result.user.email,
            name: result.user.displayName || '',
            role: 'user',
            createdAt: new Date().toISOString(),
          };
          await setDoc(docRef, userDoc);
        }
        
        return result.user;
      } else {
        // Untuk native (Android/iOS), gunakan Expo AuthSession
        const clientId = '914454433538-sk3j67hjvk9tf8v72nngi1lfnc4g58q0.apps.googleusercontent.com';
        
        const redirectUri = AuthSession.makeRedirectUri({
          useProxy: true,
        });

        const request = new AuthSession.AuthRequest({
          clientId: clientId,
          scopes: ['openid', 'profile', 'email'],
          redirectUri: redirectUri,
          responseType: AuthSession.ResponseType.IdToken,
          extraParams: {},
          additionalParameters: {},
        });

        const result = await request.promptAsync({
          authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        });

        if (result.type === 'success') {
          const { id_token } = result.params;
          
          // Create a Google credential with the token
          const googleCredential = GoogleAuthProvider.credential(id_token);
          
          // Sign in the user with the credential
          const userCredential = await signInWithCredential(auth, googleCredential);
          
          // Cek apakah user sudah ada di database
          const docRef = doc(db, "users", userCredential.user.uid);
          const docSnap = await getDoc(docRef);
          
          if (!docSnap.exists()) {
            // Jika user baru, simpan ke database
            const userDoc = {
              uid: userCredential.user.uid,
              email: userCredential.user.email,
              name: userCredential.user.displayName || '',
              role: 'user',
              createdAt: new Date().toISOString(),
            };
            await setDoc(docRef, userDoc);
          }
          
          return userCredential.user;
        } else {
          throw new Error('Google sign in was cancelled or failed');
        }
      }
    } catch (error) {
      console.log('Google Sign In Error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
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
      register, 
      loginWithGoogle, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};