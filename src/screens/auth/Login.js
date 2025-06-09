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

const { width, height } = Dimensions.get('window');

const Login = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginWithGoogle } = useContext(AuthContext);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const logoScaleAnim = useRef(new Animated.Value(0)).current;
  const logoRotateAnim = useRef(new Animated.Value(0)).current;
  const formSlideAnim = useRef(new Animated.Value(width)).current;
  const buttonPulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(-1)).current;
  
  // Individual input animations
  const emailInputAnim = useRef(new Animated.Value(0)).current;
  const passwordInputAnim = useRef(new Animated.Value(0)).current;
  const loginButtonAnim = useRef(new Animated.Value(0)).current;
  const googleButtonAnim = useRef(new Animated.Value(0)).current;
  const registerLinkAnim = useRef(new Animated.Value(0)).current;
  const demoAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start entrance animations
    startEntranceAnimations();
    startContinuousAnimations();
  }, []);

  const startEntranceAnimations = () => {
    // Logo entrance animation
    Animated.sequence([
      Animated.timing(logoScaleAnim, {
        toValue: 1.2,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(logoScaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Logo rotation
    Animated.timing(logoRotateAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Title and subtitle fade in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Form slide in from right
    Animated.timing(formSlideAnim, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Staggered input animations
    const staggerDelay = 150;
    setTimeout(() => {
      Animated.timing(emailInputAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, staggerDelay);

    setTimeout(() => {
      Animated.timing(passwordInputAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, staggerDelay * 2);

    setTimeout(() => {
      Animated.timing(loginButtonAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, staggerDelay * 3);

    setTimeout(() => {
      Animated.timing(googleButtonAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, staggerDelay * 4);

    setTimeout(() => {
      Animated.timing(registerLinkAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, staggerDelay * 5);

    setTimeout(() => {
      Animated.timing(demoAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, staggerDelay * 6);
  };

  const startContinuousAnimations = () => {
    // Button pulse animation
    const pulseAnimation = () => {
      Animated.sequence([
        Animated.timing(buttonPulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(buttonPulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulseAnimation());
    };
    
    setTimeout(() => {
      pulseAnimation();
    }, 2000);

    // Shimmer effect
    const shimmerAnimation = () => {
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }).start(() => {
        shimmerAnim.setValue(-1);
        shimmerAnimation();
      });
    };
    
    setTimeout(() => {
      shimmerAnimation();
    }, 3000);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email dan password harus diisi');
      return;
    }

    // Button press animation
    Animated.sequence([
      Animated.timing(buttonPulseAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonPulseAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setIsLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      let errorMessage = 'Login gagal';
      
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
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      await loginWithGoogle();
    } catch (error) {
      Alert.alert('Login Google gagal', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const logoRotate = logoRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-width, width],
  });

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              transform: [
                { scale: logoScaleAnim },
                { rotate: logoRotate },
              ],
            },
          ]}
        >
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Animated.View
            style={[
              styles.shimmerOverlay,
              {
                transform: [{ translateX: shimmerTranslate }],
              },
            ]}
          />
        </Animated.View>
        
        <Animated.Text
          style={[
            styles.title,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          Kantin-MS
        </Animated.Text>
        
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

      <Animated.View
        style={[
          styles.formContainer,
          {
            transform: [{ translateX: formSlideAnim }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.inputWrapper,
            {
              opacity: emailInputAnim,
              transform: [
                {
                  translateY: emailInputAnim.interpolate({
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
            placeholder="📧 Email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            placeholderTextColor="#888"
          />
        </Animated.View>

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

        <Animated.View
          style={[
            {
              opacity: loginButtonAnim,
              transform: [
                { scale: buttonPulseAnim },
                {
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
            style={[styles.loginButton, isLoading && { backgroundColor: '#7baaf7' }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

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
              onPress={() => navigation.navigate('Register')}
            >
              Daftar di sini
            </Text>
          </Text>
        </Animated.View>

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
                { scale: demoAnim },
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fc',
    padding: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
    marginBottom: 10,
  },
  logo: {
    width: 150,
    height: 150,
    borderRadius: 20,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 50,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    transform: [{ skewX: '-20deg' }],
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
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    color: '#333',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loginButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 3,
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