// Import semua dependencies yang diperlukan
import React, { useState, useContext } from 'react';
import {
  View,           // Container dasar untuk layout
  Text,           // Komponen untuk menampilkan teks
  TextInput,      // Input field untuk form
  TouchableOpacity, // Button yang bisa ditekan
  StyleSheet,     // Untuk membuat styling
  Image,          // Komponen untuk menampilkan gambar
  Alert,          // Modal alert bawaan React Native
  ActivityIndicator, // Loading spinner
  ScrollView,     // Container yang bisa di-scroll
} from 'react-native';
import { AuthContext } from '../../context/AuthContext'; // Import AuthContext untuk autentikasi

// Komponen Register dengan parameter navigation dari React Navigation
const Register = ({ navigation }) => {
  // State untuk menyimpan data form menggunakan useState Hook
  const [formData, setFormData] = useState({
    name: '',           // Nama lengkap user
    email: '',          // Email user
    password: '',       // Password user
    confirmPassword: '', // Konfirmasi password
  });
  
  // State untuk mengatur loading state
  const [isLoading, setIsLoading] = useState(false);
  
  // Mengambil fungsi-fungsi dari AuthContext menggunakan useContext Hook
  const { register, loginWithGoogle, logout } = useContext(AuthContext);

  // Fungsi untuk menghandle perubahan input field
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,        // Spread operator untuk mempertahankan data sebelumnya
      [field]: value  // Update field yang spesifik dengan nilai baru
    }));
  };

  // Fungsi untuk validasi form sebelum submit
  const validateForm = () => {
    // Cek apakah nama sudah diisi (setelah di-trim untuk menghilangkan spasi)
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Nama harus diisi');
      return false;
    }
    
    // Cek apakah email sudah diisi
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Email harus diisi');
      return false;
    }
    
    // Cek apakah password sudah diisi
    if (!formData.password) {
      Alert.alert('Error', 'Password harus diisi');
      return false;
    }
    
    // Cek panjang password minimal 6 karakter
    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password minimal 6 karakter');
      return false;
    }
    
    // Cek apakah password dan konfirmasi password sama
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Konfirmasi password tidak cocok');
      return false;
    }
    
    return true; // Return true jika semua validasi passed
  };

  // Fungsi async untuk menghandle registrasi dengan email/password
  const handleRegister = async () => {
    // Jalankan validasi terlebih dahulu
    if (!validateForm()) return;

    setIsLoading(true); // Set loading state menjadi true
    
    try {
      // Siapkan data user yang akan disimpan
      const userData = {
        name: formData.name.trim(),
        role: 'user' // Default role sebagai user biasa
      };
      
      // Panggil fungsi register dari AuthContext
      await register(formData.email.trim(), formData.password, userData);
      
      // Tampilkan alert sukses dan navigate ke halaman Login
      Alert.alert(
        'Berhasil', 
        'Akun berhasil dibuat! Silakan login dengan akun yang baru dibuat.',
        [
          { 
            text: 'OK', 
            onPress: () => navigation.navigate('Login') // Navigate ke Login setelah OK ditekan
          }
        ]
      );
    } catch (error) {
      // Handle berbagai jenis error dari Firebase Auth
      let errorMessage = 'Registrasi gagal'; // Default error message
      
      // Cek jenis error dan berikan pesan yang sesuai
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email sudah digunakan. Silakan gunakan email lain.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Format email tidak valid';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password terlalu lemah';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      // Finally block akan selalu dijalankan, baik success maupun error
      setIsLoading(false); // Set loading kembali ke false
    }
  };

  // Fungsi untuk menghandle registrasi dengan Google
  const handleGoogleRegister = async () => {
    try {
      setIsLoading(true);
      
      // Cek apakah user sudah ada dengan mencoba login Google terlebih dahulu
      await loginWithGoogle();
      
      // Jika berhasil login, berarti akun Google sudah ada
      Alert.alert(
        'Berhasil', 
        'Anda sudah memiliki akun Google! Silakan login dengan akun Google Anda.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Logout terlebih dahulu, lalu navigate ke Login
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

  // Return JSX untuk render UI
  return (
    // ScrollView agar konten bisa di-scroll jika tidak muat di layar
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        {/* Section untuk logo dan title */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/logo.png')} // Path ke file logo
            style={styles.logo}
            resizeMode="contain" // Menjaga aspect ratio gambar
          />
          <Text style={styles.title}>Kantin-MS</Text>
          <Text style={styles.subtitle}>Daftar untuk mulai menggunakan</Text>
        </View>

        {/* Container untuk form input */}
        <View style={styles.formContainer}>
          {/* Input field untuk nama */}
          <TextInput
            style={styles.input}
            placeholder="👤 Nama Lengkap"
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
            placeholderTextColor="#888"
          />
          
          {/* Input field untuk email */}
          <TextInput
            style={styles.input}
            placeholder="📧 Email"
            keyboardType="email-address" // Keyboard khusus untuk email
            autoCapitalize="none"        // Matikan auto capitalize
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            placeholderTextColor="#888"
          />
          
          {/* Input field untuk password */}
          <TextInput
            style={styles.input}
            placeholder="🔒 Password"
            secureTextEntry // Hide text untuk password
            value={formData.password}
            onChangeText={(value) => handleInputChange('password', value)}
            placeholderTextColor="#888"
          />
          
          {/* Input field untuk konfirmasi password */}
          <TextInput
            style={styles.input}
            placeholder="🔒 Konfirmasi Password"
            secureTextEntry
            value={formData.confirmPassword}
            onChangeText={(value) => handleInputChange('confirmPassword', value)}
            placeholderTextColor="#888"
          />

          {/* Button untuk registrasi */}
          <TouchableOpacity
            style={[
              styles.registerButton, 
              isLoading && { backgroundColor: '#7baaf7' } // Ubah warna saat loading
            ]}
            onPress={handleRegister}
            disabled={isLoading} // Disable button saat loading
          >
            {isLoading ? (
              // Tampilkan loading spinner jika sedang loading
              <ActivityIndicator color="#fff" />
            ) : (
              // Tampilkan text normal jika tidak loading
              <Text style={styles.registerButtonText}>Daftar</Text>
            )}
          </TouchableOpacity>

          {/* Button untuk registrasi dengan Google */}
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

          {/* Link untuk ke halaman login */}
          <View style={styles.loginLinkContainer}>
            <Text style={styles.loginLinkText}>
              Sudah punya akun?{' '}
              <Text 
                style={styles.loginLink}
                onPress={() => navigation.navigate('Login')} // Navigate ke Login
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

// StyleSheet untuk mendefinisikan styling komponen
const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,           // Biarkan container grow sesuai konten
    backgroundColor: '#f8f9fc',
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center', // Center konten secara vertikal
    minHeight: '100%',
  },
  logoContainer: {
    alignItems: 'center',  // Center secara horizontal
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 20,      // Membuat sudut melengkung
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
    backgroundColor: '#4285F4', // Warna biru Google
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',       // Center text secara horizontal
    marginBottom: 12,
    elevation: 3,               // Shadow untuk Android
  },
  registerButtonText: {
    color: '#fff',
    fontWeight: '600',          // Semi-bold
    fontSize: 18,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderColor: '#4285F4',
    borderWidth: 1,             // Border biru
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
  },
  googleButtonText: {
    color: '#4285F4',           // Text biru untuk Google button
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
    color: '#4285F4',           // Link berwarna biru
    fontWeight: '600',
  },
});

// Export komponen agar bisa digunakan di file lain
export default Register;