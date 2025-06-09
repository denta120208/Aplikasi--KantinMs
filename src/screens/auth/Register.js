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
  ScrollView,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';

const Register = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const { register, loginWithGoogle, logout } = useContext(AuthContext);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Nama harus diisi');
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Email harus diisi');
      return false;
    }
    if (!formData.password) {
      Alert.alert('Error', 'Password harus diisi');
      return false;
    }
    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password minimal 6 karakter');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Konfirmasi password tidak cocok');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const userData = {
        name: formData.name.trim(),
        role: 'user'
      };
      
      await register(formData.email.trim(), formData.password, userData);
      
      Alert.alert(
        'Berhasil', 
        'Akun berhasil dibuat! Silakan login dengan akun yang baru dibuat.',
        [
          { 
            text: 'OK', 
            onPress: () => navigation.navigate('Login')
          }
        ]
      );
    } catch (error) {
      let errorMessage = 'Registrasi gagal';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email sudah digunakan. Silakan gunakan email lain.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Format email tidak valid';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password terlalu lemah';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      setIsLoading(true);
      
      // Cek apakah user sudah ada dengan login Google terlebih dahulu
      await loginWithGoogle();
      
      // Jika berhasil login, berarti akun sudah ada
      Alert.alert(
        'Berhasil', 
        'Anda sudah memiliki akun Google! Silakan login dengan akun Google Anda.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Logout dulu lalu ke halaman login
              logout().then(() => {
                navigation.navigate('Login');
              });
            }
          }
        ]
      );
    } catch (error) {
      // Jika error, kemungkinan user baru atau ada masalah lain
      Alert.alert('Error', 'Registrasi dengan Google gagal: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Kantin-MS</Text>
          <Text style={styles.subtitle}>Daftar untuk mulai menggunakan</Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="👤 Nama Lengkap"
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
            placeholderTextColor="#888"
          />
          
          <TextInput
            style={styles.input}
            placeholder="📧 Email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            placeholderTextColor="#888"
          />
          
          <TextInput
            style={styles.input}
            placeholder="🔒 Password"
            secureTextEntry
            value={formData.password}
            onChangeText={(value) => handleInputChange('password', value)}
            placeholderTextColor="#888"
          />
          
          <TextInput
            style={styles.input}
            placeholder="🔒 Konfirmasi Password"
            secureTextEntry
            value={formData.confirmPassword}
            onChangeText={(value) => handleInputChange('confirmPassword', value)}
            placeholderTextColor="#888"
          />

          <TouchableOpacity
            style={[styles.registerButton, isLoading && { backgroundColor: '#7baaf7' }]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerButtonText}>Daftar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.googleButtonText}>Daftar dengan Google</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginLinkContainer}>
            <Text style={styles.loginLinkText}>
              Sudah punya akun?{' '}
              <Text 
                style={styles.loginLink}
                onPress={() => navigation.navigate('Login')}
              >
                Login di sini
              </Text>
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#f8f9fc',
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 20,
    marginBottom: 10,
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
  input: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    color: '#333',
  },
  registerButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 3,
  },
  registerButtonText: {
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
  },
  googleButtonText: {
    color: '#4285F4',
    fontWeight: '600',
    fontSize: 16,
  },
  loginLinkContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  loginLinkText: {
    fontSize: 16,
    color: '#666',
  },
  loginLink: {
    color: '#4285F4',
    fontWeight: '600',
  },
});

export default Register;