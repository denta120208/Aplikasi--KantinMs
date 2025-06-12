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
import * as WebBrowser from 'expo-web-browser';

// Konfigurasi WebBrowser untuk AuthSession - diperlukan untuk login dengan Google di mobile
WebBrowser.maybeCompleteAuthSession();

// Membuat Context untuk Authentication - akan digunakan di seluruh aplikasi
export const AuthContext = createContext();

// Provider component yang akan membungkus aplikasi dan menyediakan authentication state
export const AuthProvider = ({ children }) => {
  // State untuk menyimpan data user yang sedang login
  const [user, setUser] = useState(null);
  
  // State untuk menunjukkan apakah sedang loading (mengecek status authentication)
  const [loading, setLoading] = useState(true);
  
  // Flag khusus untuk mencegah auto-login saat registrasi
  // Karena Firebase secara otomatis login user setelah registrasi
  const [isRegistering, setIsRegistering] = useState(false);

  // useEffect untuk mendengarkan perubahan authentication state
  useEffect(() => {
    // onAuthStateChanged adalah listener Firebase yang otomatis trigger saat auth state berubah
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Jika sedang dalam proses registrasi, jangan update user state
      // Ini untuk mencegah auto-login setelah registrasi
      if (isRegistering) {
        return;
      }

      if (user) {
        // Jika user ada (sudah login), ambil data tambahan dari Firestore
        const docRef = doc(db, "users", user.uid); // Reference ke document user
        const docSnap = await getDoc(docRef); // Ambil document
        
        if (docSnap.exists()) {
          // Jika document user ada di Firestore, gabungkan data Firebase Auth dengan Firestore
          setUser({
            uid: user.uid,
            email: user.email,
            role: docSnap.data().role, // Role user (admin, user, etc.)
            ...docSnap.data() // Spread semua data dari Firestore
          });
        } else {
          // Jika document tidak ada, hanya gunakan data dari Firebase Auth
          setUser({
            uid: user.uid,
            email: user.email,
          });
        }
      } else {
        // Jika tidak ada user (logout), set user ke null
        setUser(null);
      }
      
      // Set loading ke false setelah selesai mengecek authentication
      setLoading(false);
    });

    // Return function untuk cleanup listener saat component unmount
    return unsubscribe;
  }, [isRegistering]); // Dependency array - effect akan re-run jika isRegistering berubah

  // Fungsi untuk login dengan email dan password
  const login = async (email, password) => {
    try {
      // signInWithEmailAndPassword adalah fungsi Firebase untuk login
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user; // Return user object dari Firebase
    } catch (error) {
      throw error; // Re-throw error agar bisa ditangani di component yang memanggil
    }
  };

  // Fungsi untuk registrasi user baru
  const register = async (email, password, userData = {}) => {
    try {
      setIsRegistering(true); // Set flag registrasi ke true
      
      // Buat akun baru dengan email dan password menggunakan Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Siapkan data user untuk disimpan di Firestore
      const userDoc = {
        uid: user.uid,
        email: user.email,
        role: userData.role || 'user', // Default role adalah 'user'
        name: userData.name || '',
        createdAt: new Date().toISOString(), // Timestamp pembuatan akun
        ...userData // Spread data tambahan yang diberikan
      };

      // Simpan data user ke Firestore collection 'users'
      await setDoc(doc(db, 'users', user.uid), userDoc);
      
      // Logout otomatis setelah registrasi agar user tidak langsung login
      // Ini memberikan kontrol kepada aplikasi untuk mengarahkan user ke halaman login
      await signOut(auth);
      
      return user;
    } catch (error) {
      throw error;
    } finally {
      // Reset flag registrasi di blok finally agar selalu dijalankan
      setIsRegistering(false);
    }
  };

  // Fungsi untuk login dengan Google
  const loginWithGoogle = async () => {
    try {
      // Cek platform - berbeda implementasi untuk web dan mobile
      if (Platform.OS === 'web') {
        // IMPLEMENTASI WEB: menggunakan Firebase popup
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        
        // Cek apakah user sudah ada di database Firestore
        const docRef = doc(db, "users", result.user.uid);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          // Jika user baru (belum ada di Firestore), simpan data ke database
          const userDoc = {
            uid: result.user.uid,
            email: result.user.email,
            name: result.user.displayName || '', // Nama dari Google account
            role: 'user', // Default role
            createdAt: new Date().toISOString(),
          };
          await setDoc(docRef, userDoc);
        }
        
        return result.user;
      } else {
        // IMPLEMENTASI MOBILE: menggunakan Expo AuthSession
        
        // Client ID dari Google Console untuk OAuth
        const clientId = '914454433538-sk3j67hjvk9tf8v72nngi1lfnc4g58q0.apps.googleusercontent.com';
        
        // Buat redirect URI untuk callback setelah login Google
        const redirectUri = AuthSession.makeRedirectUri({
          useProxy: true, // Gunakan Expo proxy untuk development
        });

        // Konfigurasi request OAuth
        const request = new AuthSession.AuthRequest({
          clientId: clientId,
          scopes: ['openid', 'profile', 'email'], // Permission yang diminta
          redirectUri: redirectUri,
          responseType: AuthSession.ResponseType.IdToken, // Minta ID token
          extraParams: {},
          additionalParameters: {},
        });

        // Tampilkan browser untuk login Google
        const result = await request.promptAsync({
          authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        });

        if (result.type === 'success') {
          // Jika login berhasil, ambil ID token dari response
          const { id_token } = result.params;
          
          // Buat credential Google untuk Firebase
          const googleCredential = GoogleAuthProvider.credential(id_token);
          
          // Sign in ke Firebase menggunakan Google credential
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
          // Jika user cancel atau error, throw error
          throw new Error('Google sign in was cancelled or failed');
        }
      }
    } catch (error) {
      console.log('Google Sign In Error:', error);
      throw error;
    }
  };

  // Fungsi untuk logout
  const logout = async () => {
    try {
      // signOut adalah fungsi Firebase untuk logout
      await signOut(auth);
      return true;
    } catch (error) {
      throw error;
    }
  };

  // Return Provider component yang membungkus children
  // Value berisi semua state dan function yang bisa diakses oleh child components
  return (
    <AuthContext.Provider value={{ 
      user,           // Current user object
      loading,        // Loading state
      login,          // Function untuk login email/password
      register,       // Function untuk registrasi
      loginWithGoogle,// Function untuk login Google
      logout          // Function untuk logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};