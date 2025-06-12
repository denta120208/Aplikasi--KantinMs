import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';

// Mendapatkan dimensi layar untuk animasi
const { width, height } = Dimensions.get('window');

const Login = ({ navigation }) => {
  // STATE MANAGEMENT
  // State untuk menyimpan input email dan password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Loading state untuk tombol

  // Context untuk fungsi login
  const { login, loginWithGoogle } = useContext(AuthContext);

  // ANIMATION VALUES
  // Membuat referensi untuk nilai animasi yang tidak akan berubah saat re-render
  const fadeAnim = useRef(new Animated.Value(0)).current; // Animasi fade in untuk title/subtitle
  const slideAnim = useRef(new Animated.Value(-50)).current; // Animasi slide dari atas untuk title
  const logoScaleAnim = useRef(new Animated.Value(0)).current; // Animasi scale untuk logo
  const logoRotateAnim = useRef(new Animated.Value(0)).current; // Animasi rotasi logo
  const formSlideAnim = useRef(new Animated.Value(width)).current; // Form slide dari kanan
  const buttonPulseAnim = useRef(new Animated.Value(1)).current; // Animasi pulse untuk tombol
  const shimmerAnim = useRef(new Animated.Value(-1)).current; // Efek shimmer pada logo
  
  // INDIVIDUAL INPUT ANIMATIONS
  // Animasi terpisah untuk setiap elemen form (staggered animation)
  const emailInputAnim = useRef(new Animated.Value(0)).current;
  const passwordInputAnim = useRef(new Animated.Value(0)).current;
  const loginButtonAnim = useRef(new Animated.Value(0)).current;
  const googleButtonAnim = useRef(new Animated.Value(0)).current;
  const registerLinkAnim = useRef(new Animated.Value(0)).current;
  const demoAnim = useRef(new Animated.Value(0)).current;

  // EFFECT HOOK
  // Menjalankan animasi saat komponen pertama kali dimount
  useEffect(() => {
    startEntranceAnimations(); // Animasi masuk sekali
    startContinuousAnimations(); // Animasi yang berjalan terus-menerus
  }, []);

  // ENTRANCE ANIMATIONS FUNCTION
  // Fungsi untuk menjalankan semua animasi masuk
  const startEntranceAnimations = () => {
    // Logo entrance animation - Scale bounce effect
    Animated.sequence([
      // Logo membesar dulu (bounce effect)
      Animated.timing(logoScaleAnim, {
        toValue: 1.2, // Lebih besar dari normal
        duration: 600,
        useNativeDriver: true, // Menggunakan native driver untuk performa
      }),
      // Kemudian kembali ke ukuran normal
      Animated.timing(logoScaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Logo rotation - Rotasi 360 derajat
    Animated.timing(logoRotateAnim, {
      toValue: 1, // Akan diinterpolasi menjadi 360deg
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Title dan subtitle fade in dengan slide dari atas
    Animated.parallel([
      // Fade in effect
      Animated.timing(fadeAnim, {
        toValue: 1, // Dari transparan ke opaque
        duration: 800,
        useNativeDriver: true,
      }),
      // Slide down effect
      Animated.timing(slideAnim, {
        toValue: 0, // Dari -50 ke 0 (slide ke bawah)
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Form slide in dari kanan layar
    Animated.timing(formSlideAnim, {
      toValue: 0, // Dari width ke 0 (slide ke kiri)
      duration: 800,
      useNativeDriver: true,
    }).start();

    // STAGGERED ANIMATIONS
    // Animasi bertahap untuk setiap elemen form dengan delay
    const staggerDelay = 150; // Delay 150ms antar elemen
    
    // Email input muncul pertama
    setTimeout(() => {
      Animated.timing(emailInputAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, staggerDelay);

    // Password input muncul kedua
    setTimeout(() => {
      Animated.timing(passwordInputAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, staggerDelay * 2);

    // Login button muncul ketiga
    setTimeout(() => {
      Animated.timing(loginButtonAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, staggerDelay * 3);

    // Google button muncul keempat
    setTimeout(() => {
      Animated.timing(googleButtonAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, staggerDelay * 4);

    // Register link muncul kelima
    setTimeout(() => {
      Animated.timing(registerLinkAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, staggerDelay * 5);

    // Demo info muncul terakhir
    setTimeout(() => {
      Animated.timing(demoAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, staggerDelay * 6);
  };

  // CONTINUOUS ANIMATIONS FUNCTION
  // Animasi yang berjalan terus-menerus
  const startContinuousAnimations = () => {
    // Button pulse animation - Tombol berkedip-kedip
    const pulseAnimation = () => {
      Animated.sequence([
        // Membesar sedikit
        Animated.timing(buttonPulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        // Kembali ke ukuran normal
        Animated.timing(buttonPulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulseAnimation()); // Rekursif - ulangi terus
    };
    
    // Mulai pulse setelah 2 detik
    setTimeout(() => {
      pulseAnimation();
    }, 2000);

    // Shimmer effect - Efek kilap pada logo
    const shimmerAnimation = () => {
      Animated.timing(shimmerAnim, {
        toValue: 1, // Dari -1 ke 1 (bergerak dari kiri ke kanan)
        duration: 2000,
        useNativeDriver: true,
      }).start(() => {
        shimmerAnim.setValue(-1); // Reset posisi
        shimmerAnimation(); // Ulangi
      });
    };
    
    // Mulai shimmer setelah 3 detik
    setTimeout(() => {
      shimmerAnimation();
    }, 3000);
  };

  // LOGIN HANDLER FUNCTION
  const handleLogin = async () => {
    // Validasi input
    if (!email || !password) {
      Alert.alert('Error', 'Email dan password harus diisi');
      return;
    }

    // Animasi tombol ditekan (button press feedback)
    Animated.sequence([
      // Tombol mengecil saat ditekan
      Animated.timing(buttonPulseAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      // Kembali ke ukuran normal
      Animated.timing(buttonPulseAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setIsLoading(true); // Aktifkan loading state
    try {
      await login(email, password); // Panggil fungsi login dari context
    } catch (error) {
      // Error handling dengan pesan yang spesifik
      let errorMessage = 'Login gagal';
      
      // Handle berbagai jenis error Firebase Auth
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Email tidak ditemukan. Silakan daftar terlebih dahulu.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Password salah';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Format email tidak valid';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'Akun telah dinonaktifkan';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Terlalu banyak percobaan login. Coba lagi nanti.';
      }
      
      Alert.alert('Login gagal', errorMessage);
    } finally {
      setIsLoading(false); // Matikan loading state
    }
  };

  // GOOGLE LOGIN HANDLER
  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      await loginWithGoogle(); // Panggil fungsi Google login dari context
    } catch (error) {
      Alert.alert('Login Google gagal', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ANIMATION INTERPOLATIONS
  // Mengkonversi nilai animasi menjadi nilai yang bisa digunakan

  // Rotasi logo dari 0 ke 360 derajat
  const logoRotate = logoRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Shimmer bergerak dari kiri ke kanan layar
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-width, width], // Dari luar layar kiri ke luar layar kanan
  });

  // RENDER JSX
  return (
    <View style={styles.container}>
      {/* LOGO SECTION */}
      <View style={styles.logoContainer}>
        {/* Logo dengan animasi scale dan rotate */}
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              transform: [
                { scale: logoScaleAnim }, // Animasi scale
                { rotate: logoRotate }, // Animasi rotasi
              ],
            },
          ]}
        >
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          {/* Overlay shimmer effect */}
          <Animated.View
            style={[
              styles.shimmerOverlay,
              {
                transform: [{ translateX: shimmerTranslate }], // Animasi shimmer
              },
            ]}
          />
        </Animated.View>
        
        {/* Title dengan fade dan slide animation */}
        <Animated.Text
          style={[
            styles.title,
            {
              opacity: fadeAnim, // Fade in
              transform: [{ translateY: slideAnim }], // Slide dari atas
            },
          ]}
        >
          Kantin-MS
        </Animated.Text>
        
        {/* Subtitle dengan animasi yang sama */}
        <Animated.Text
          style={[
            styles.subtitle,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          Masuk untuk melanjutkan
        </Animated.Text>
      </View>

      {/* FORM SECTION */}
      {/* Container form dengan slide animation dari kanan */}
      <Animated.View
        style={[
          styles.formContainer,
          {
            transform: [{ translateX: formSlideAnim }], // Slide dari kanan
          },
        ]}
      >
        {/* EMAIL INPUT dengan staggered animation */}
        <Animated.View
          style={[
            styles.inputWrapper,
            {
              opacity: emailInputAnim, // Fade in
              transform: [
                {
                  // Slide dari bawah
                  translateY: emailInputAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0], // Dari 30px di bawah ke posisi normal
                  }),
                },
              ],
            },
          ]}
        >
          <TextInput
            style={styles.input}
            placeholder="📧 Email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            placeholderTextColor="#888"
          />
        </Animated.View>

        {/* PASSWORD INPUT dengan staggered animation */}
        <Animated.View
          style={[
            styles.inputWrapper,
            {
              opacity: passwordInputAnim,
              transform: [
                {
                  translateY: passwordInputAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <TextInput
            style={styles.input}
            placeholder="🔒 Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholderTextColor="#888"
          />
        </Animated.View>

        {/* LOGIN BUTTON dengan pulse dan staggered animation */}
        <Animated.View
          style={[
            {
              opacity: loginButtonAnim,
              transform: [
                { scale: buttonPulseAnim }, // Pulse effect
                {
                  // Slide dari bawah
                  translateY: loginButtonAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.loginButton, 
              isLoading && { backgroundColor: '#7baaf7' } // Warna berbeda saat loading
            ]}
            onPress={handleLogin}
            disabled={isLoading} // Disable saat loading
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" /> // Loading spinner
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* GOOGLE LOGIN BUTTON */}
        <Animated.View
          style={[
            {
              opacity: googleButtonAnim,
              transform: [
                {
                  translateY: googleButtonAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.googleButtonText}>Login dengan Google</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* REGISTER LINK */}
        <Animated.View
          style={[
            styles.registerLinkContainer,
            {
              opacity: registerLinkAnim,
              transform: [
                {
                  translateY: registerLinkAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.registerLinkText}>
            Belum punya akun?{' '}
            <Text 
              style={styles.registerLink}
              onPress={() => navigation.navigate('Register')} // Navigasi ke halaman register
            >
              Daftar di sini
            </Text>
          </Text>
        </Animated.View>

        {/* DEMO ACCOUNT INFO */}
        <Animated.View
          style={[
            styles.demoContainer,
            {
              opacity: demoAnim,
              transform: [
                {
                  translateY: demoAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
                { scale: demoAnim }, // Scale animation untuk demo container
              ],
            },
          ]}
        >
          <Text style={styles.demoTitle}>Demo Account:</Text>
          <Text style={styles.demoText}>Email: User@gmail.com</Text>
          <Text style={styles.demoText}>Password: 123456</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

// STYLESHEET
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fc', // Background abu-abu muda
    padding: 24,
    justifyContent: 'center', // Center vertikal
  },
  logoContainer: {
    alignItems: 'center', // Center horizontal
    marginBottom: 40,
  },
  logoWrapper: {
    position: 'relative', // Untuk positioning shimmer overlay
    overflow: 'hidden', // Supaya shimmer tidak keluar bounds
    borderRadius: 20,
    marginBottom: 10,
  },
  logo: {
    width: 150,
    height: 150,
    borderRadius: 20,
  },
  shimmerOverlay: {
    position: 'absolute', // Overlay di atas logo
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 50, // Lebar efek shimmer
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)', // Putih semi-transparan
    transform: [{ skewX: '-20deg' }], // Miring 20 derajat
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    marginTop: 20,
  },
  inputWrapper: {
    marginBottom: 16, // Spacing antar input
  },
  input: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    color: '#333',
    // Shadow untuk iOS
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5, // Shadow untuk Android
  },
  loginButton: {
    backgroundColor: '#4285F4', // Warna biru Google
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 3,
    // Shadow berwarna biru
    shadowColor: '#4285F4',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 18,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderColor: '#4285F4',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#4285F4',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3.84,
  },
  googleButtonText: {
    color: '#4285F4',
    fontWeight: '600',
    fontSize: 16,
  },
  registerLinkContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  registerLinkText: {
    fontSize: 16,
    color: '#666',
  },
  registerLink: {
    color: '#4285F4',
    fontWeight: '600',
  },
  demoContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  demoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
});

export default Login;