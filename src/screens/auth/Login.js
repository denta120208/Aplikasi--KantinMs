import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { login, signInWithGoogle, isGoogleSigninAvailable } = useContext(AuthContext);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email dan password harus diisi');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      let errorMessage = 'Terjadi kesalahan saat login';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Email tidak terdaftar';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Password salah';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Format email tidak valid';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Akun telah dinonaktifkan';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Terlalu banyak percobaan login. Coba lagi nanti.';
          break;
        default:
          errorMessage = error.message || 'Login gagal';
      }
      
      Alert.alert('Login Gagal', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isGoogleSigninAvailable) {
      Alert.alert(
        'Fitur Tidak Tersedia', 
        'Google Sign In belum dikonfigurasi. Silakan gunakan email dan password untuk login.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      
      // If result is null, it means redirect was used (web only)
      if (result === null) {
        // Don't set loading to false, let the redirect handle it
        return;
      }
      
      // Success case
      console.log('Google sign in successful');
      
    } catch (error) {
      console.log('Google sign in error:', error);
      
      let errorMessage = 'Gagal login dengan Google. Silakan coba lagi.';
      
      // Handle specific error types
      if (error.message?.includes('dibatalkan oleh pengguna')) {
        // User cancelled - don't show error
        setIsGoogleLoading(false);
        return;
      }
      
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          // User closed popup - don't show error
          setIsGoogleLoading(false);
          return;
          
        case 'auth/popup-blocked':
          errorMessage = 'Popup diblokir browser. Silakan aktifkan popup atau coba refresh halaman.';
          break;
          
        case 'auth/account-exists-with-different-credential':
          errorMessage = 'Email sudah terdaftar dengan metode login lain. Silakan gunakan email dan password.';
          break;
          
        case 'auth/invalid-credential':
        case 'auth/credential-already-in-use':
          errorMessage = 'Kredensial tidak valid atau sudah digunakan.';
          break;
          
        case 'auth/operation-not-allowed':
          errorMessage = 'Google Sign In belum diaktifkan. Hubungi administrator.';
          break;
          
        case 'auth/network-request-failed':
          errorMessage = 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
          break;
          
        default:
          if (error.message?.includes('tidak tersedia') || 
              error.message?.includes('not available')) {
            errorMessage = 'Google Sign In tidak tersedia untuk platform ini.';
          } else if (error.message?.includes('Cross-Origin-Opener-Policy')) {
            errorMessage = 'Mengalihkan untuk login Google...';
            // Don't show alert for COOP errors, as redirect is being used
            setIsGoogleLoading(false);
            return;
          } else if (error.message?.includes('Google Play Services')) {
            errorMessage = 'Google Play Services diperlukan untuk login dengan Google.';
          }
      }
      
      Alert.alert('Login Gagal', errorMessage);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../../assets/logo.jpeg')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Kantin-MS</Text>
        <Text style={styles.subtitle}>Masuk untuk melanjutkan</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>📧 Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Masukkan email Anda"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            placeholderTextColor="#888"
            editable={!isLoading && !isGoogleLoading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>🔒 Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Masukkan password Anda"
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
            placeholderTextColor="#888"
            editable={!isLoading && !isGoogleLoading}
          />
        </View>
        
        <TouchableOpacity
          style={[
            styles.loginButton, 
            (isLoading || isGoogleLoading) && styles.disabledButton
          ]}
          onPress={handleLogin}
          disabled={isLoading || isGoogleLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        {/* Only show Google Sign In if available */}
        {isGoogleSigninAvailable && (
          <>
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>atau</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity
              style={[
                styles.googleButton, 
                (isGoogleLoading || isLoading) && styles.disabledGoogleButton
              ]}
              onPress={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color="#666" size="small" />
              ) : (
                <>
                  <Image
                    source={{
                      uri: 'https://developers.google.com/identity/images/g-logo.png'
                    }}
                    style={styles.googleIcon}
                  />
                  <Text style={styles.googleButtonText}>Masuk dengan Google</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
        
        <View style={styles.testCredentials}>
          <Text style={styles.testCredentialsTitle}>Akun Test:</Text>
          <Text style={styles.testCredentialsText}>Email: User@gmail.com</Text>
          <Text style={styles.testCredentialsText}>Password: 123456</Text>
        </View>
      </View>
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
  logo: {
    width: 120,
    height: 120,
    borderRadius: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    marginTop: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    fontSize: 16,
    color: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  loginButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24,
    minHeight: 52,
  },
  disabledButton: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0.1,
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 18,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e1e5e9',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  googleButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 32,
    minHeight: 52,
  },
  disabledGoogleButton: {
    backgroundColor: '#f8f9fa',
    borderColor: '#f1f3f4',
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  googleButtonText: {
    color: '#333',
    fontWeight: '500',
    fontSize: 16,
  },
  testCredentials: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  testCredentialsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0c4a6e',
    marginBottom: 4,
  },
  testCredentialsText: {
    fontSize: 12,
    color: '#0369a1',
    fontFamily: 'monospace',
  },
});

export default Login;