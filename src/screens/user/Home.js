// Import semua library dan dependency yang diperlukan
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../config/firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { AuthContext } from '../../context/AuthContext';

const UserHome = () => {
  // State untuk menyimpan daftar makanan dari database
  const [foods, setFoods] = useState([]);
  
  // State untuk menyimpan kantin yang dipilih user (default: 'A')
  const [selectedCanteen, setSelectedCanteen] = useState('A');
  
  // State untuk menandakan apakah sedang loading data atau tidak
  const [isLoading, setIsLoading] = useState(true);
  
  // Hook untuk navigasi antar screen
  const navigation = useNavigation();
  
  // Mengambil data user dari AuthContext
  const { user } = useContext(AuthContext);

  // Mendapatkan lebar layar untuk responsive design
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = screenWidth - 40; // Kurangi 40 untuk padding kiri-kanan

  // Data kantin yang tersedia dengan konfigurasi tampilan
  const canteens = [
    { label: 'Kantin A', value: 'A', icon: '🏪', color: '#4285F4' }, // Biru
    { label: 'Kantin B', value: 'B', icon: '🍽️', color: '#34A853' }, // Hijau
    { label: 'Kantin C', value: 'C', icon: '🥘', color: '#FF9800' }, // Orange
    { label: 'Kantin D', value: 'D', icon: '🍜', color: '#9C27B0' }  // Ungu
  ];

  // useEffect akan dijalankan setiap kali selectedCanteen berubah
  useEffect(() => {
    fetchFoods(); // Ambil data makanan sesuai kantin yang dipilih
  }, [selectedCanteen]);

  // Fungsi untuk mengambil data makanan dari Firestore
  const fetchFoods = async () => {
    setIsLoading(true); // Set loading true saat mulai fetch data
    try {
      // Referensi ke collection 'foods' di Firestore
      const foodsCollection = collection(db, 'foods');
      
      // Query untuk filter makanan berdasarkan kantin yang dipilih
      const q = query(
        foodsCollection, 
        where('canteen', '==', selectedCanteen) // Filter: canteen = selectedCanteen
      );
      
      // Eksekusi query dan ambil hasilnya
      const foodsSnapshot = await getDocs(q);
      
      // Transform data dari Firestore menjadi array objek JavaScript
      const foodsList = foodsSnapshot.docs.map(doc => ({
        id: doc.id,        // ID dokumen
        ...doc.data()      // Spread semua field dari dokumen
      }));
      
      // Sorting data di JavaScript (bukan di Firestore)
      const sortedFoods = foodsList.sort((a, b) => {
        // Prioritas sorting: berdasarkan createdAt, jika tidak ada maka berdasarkan nama
        if (a.createdAt && b.createdAt) {
          // Sort berdasarkan tanggal (terbaru dulu)
          return b.createdAt.toMillis() - a.createdAt.toMillis();
        }
        // Jika tidak ada createdAt, sort berdasarkan nama (A-Z)
        return a.name.localeCompare(b.name);
      });
      
      // Update state dengan data yang sudah disort
      setFoods(sortedFoods);
    } catch (error) {
      console.error('Error fetching foods:', error);
    } finally {
      setIsLoading(false); // Set loading false setelah selesai (sukses/error)
    }
  };

  // Handler ketika user menekan tombol order
  const handleOrderPress = (food) => {
    // Navigasi ke screen OrderForm dengan membawa data food dan user
    navigation.navigate('OrderForm', { food, user });
  };

  // Handler ketika user memilih kantin
  const handleCanteenSelect = (canteenValue) => {
    setSelectedCanteen(canteenValue); // Update state kantin yang dipilih
  };

  // Fungsi untuk mendapatkan data kantin yang sedang dipilih
  const getCurrentCanteen = () => {
    return canteens.find(canteen => canteen.value === selectedCanteen);
  };

  // Fungsi untuk menghitung style gambar berdasarkan aspect ratio
  const getFoodImageStyle = (food) => {
    // Cek apakah ada metadata aspect ratio dari admin
    if (food.imageMetadata && food.imageMetadata.aspectRatio) {
      // Hitung tinggi berdasarkan aspect ratio
      const height = cardWidth / food.imageMetadata.aspectRatio;
      return {
        width: '100%',
        height: Math.max(120, Math.min(height, 300)), // Min 120px, max 300px
        borderRadius: 12,
      };
    }
    // Fallback untuk gambar lama tanpa metadata
    return {
      width: '100%',
      height: 200, // Tinggi default
      borderRadius: 12,
    };
  };

  // Fungsi untuk menentukan resize mode gambar
  const getResizeMode = (food) => {
    if (food.imageMetadata && food.imageMetadata.aspectRatio) {
      // Gunakan 'cover' karena admin sudah crop sesuai keinginan
      return 'cover';
    }
    return 'cover'; // Default untuk gambar lama
  };

  // Fungsi untuk mendapatkan URI gambar (handle format lama dan baru)
  const getImageUri = (food) => {
    if (typeof food.imageData === 'string') {
      // Format lama: imageData langsung berupa string URI
      return food.imageData;
    } else if (food.imageData && food.imageData.uri) {
      // Format baru: imageData berupa objek dengan property uri
      return food.imageData.uri;
    }
    return null; // Tidak ada gambar
  };

  // Fungsi untuk menentukan orientasi gambar
  const getImageOrientation = (food) => {
    if (food.imageMetadata && food.imageMetadata.aspectRatio) {
      const ratio = food.imageMetadata.aspectRatio;
      if (ratio > 1.3) return 'landscape';  // Gambar landscape
      if (ratio < 0.7) return 'portrait';   // Gambar portrait
      return 'square';                      // Gambar kotak
    }
    return 'unknown'; // Tidak diketahui
  };

  // Render utama komponen
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header dengan greeting */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Halo, {user?.displayName || 'Pengguna'} 👋
        </Text>
        <Text style={styles.subGreeting}>Pilih kantin favorit Anda!</Text>
      </View>

      {/* Section untuk memilih kantin */}
      <View style={styles.canteenSection}>
        <Text style={styles.canteenTitle}>🏫 Pilih Kantin</Text>
        
        {/* ScrollView horizontal untuk daftar kantin */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.canteenContainer}
        >
          {/* Map semua kantin menjadi TouchableOpacity */}
          {canteens.map((canteen) => (
            <TouchableOpacity
              key={canteen.value}
              style={[
                styles.canteenCard,
                { borderColor: canteen.color }, // Border sesuai warna kantin
                // Style khusus jika kantin ini yang dipilih
                selectedCanteen === canteen.value && { 
                  backgroundColor: canteen.color,
                  transform: [{ scale: 1.05 }] // Sedikit diperbesar
                }
              ]}
              onPress={() => handleCanteenSelect(canteen.value)}
              activeOpacity={0.8}
            >
              <Text style={styles.canteenIcon}>{canteen.icon}</Text>
              <Text style={[
                styles.canteenLabel,
                // Warna text putih jika kantin dipilih
                selectedCanteen === canteen.value && styles.selectedCanteenLabel
              ]}>
                {canteen.label}
              </Text>
              
              {/* Indikator checkmark jika kantin dipilih */}
              {selectedCanteen === canteen.value && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Header untuk kantin yang sedang dipilih */}
      <View style={[
        styles.currentCanteenHeader,
        // Background color dengan opacity 20% dari warna kantin
        { backgroundColor: getCurrentCanteen()?.color + '20' }
      ]}>
        <Text style={styles.currentCanteenIcon}>{getCurrentCanteen()?.icon}</Text>
        <View>
          <Text style={styles.currentCanteenTitle}>
            Menu {getCurrentCanteen()?.label}
          </Text>
          <Text style={styles.currentCanteenSubtitle}>
            {foods.length} menu tersedia
          </Text>
        </View>
      </View>

      {/* Conditional rendering: tampilkan loading atau daftar makanan */}
      {isLoading ? (
        // Loading state
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size="large" 
            color={getCurrentCanteen()?.color || "#4285F4"} 
          />
          <Text style={styles.loadingText}>
            Memuat menu {getCurrentCanteen()?.label}...
          </Text>
        </View>
      ) : (
        // Container untuk daftar makanan
        <View style={styles.menuContainer}>
          {foods.length > 0 ? (
            // Jika ada makanan, map menjadi card
            foods.map((food) => {
              const imageUri = getImageUri(food);
              const imageOrientation = getImageOrientation(food);
              
              return (
                <TouchableOpacity 
                  key={food.id} 
                  style={[
                    styles.foodCard,
                    // Style khusus untuk gambar portrait (spacing lebih)
                    imageOrientation === 'portrait' && styles.portraitCard
                  ]}
                  onPress={() => handleOrderPress(food)}
                  activeOpacity={0.8}
                >
                  {/* Container gambar dengan dynamic styling */}
                  <View style={[
                    styles.imageContainer,
                    getFoodImageStyle(food) // Apply dynamic image style
                  ]}>
                    {imageUri ? (
                      // Jika ada gambar, tampilkan Image component
                      <Image 
                        source={{ uri: imageUri }} 
                        style={styles.foodImage}
                        resizeMode={getResizeMode(food)}
                        onError={(error) => {
                          console.log('Image load error:', error.nativeEvent.error);
                        }}
                      />
                    ) : (
                      // Jika tidak ada gambar, tampilkan placeholder
                      <View style={styles.noImageContainer}>
                        <Ionicons name="image-outline" size={50} color="#ccc" />
                        <Text style={styles.noImageText}>No Image</Text>
                      </View>
                    )}
                    
                    {/* Overlay gradient untuk readability text */}
                    <View style={styles.imageOverlay} />
                    
                    {/* Content di atas gambar */}
                    <View style={styles.imageContent}>
                      {/* Badge kantin */}
                      <View style={[
                        styles.canteenBadge,
                        { backgroundColor: getCurrentCanteen()?.color }
                      ]}>
                        <Text style={styles.canteenBadgeText}>
                          {getCurrentCanteen()?.icon} Kantin {food.canteen}
                        </Text>
                      </View>
                      
                      {/* Debug info (hanya muncul di development mode) */}
                      {food.imageMetadata && __DEV__ && (
                        <View style={styles.debugInfo}>
                          <Text style={styles.debugText}>
                            {Math.round(food.imageMetadata.aspectRatio * 100) / 100} • {imageOrientation}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  {/* Info makanan di bawah gambar */}
                  <View style={styles.foodInfo}>
                    {/* Header: nama dan harga */}
                    <View style={styles.foodHeader}>
                      <Text style={styles.foodName}>{food.name}</Text>
                      <Text style={[
                        styles.foodPrice,
                        { color: getCurrentCanteen()?.color }
                      ]}>
                        Rp {food.price?.toLocaleString() || '0'}
                      </Text>
                    </View>
                    
                    {/* Deskripsi makanan (maksimal 2 baris) */}
                    <Text style={styles.foodDescription} numberOfLines={2}>
                      {food.description}
                    </Text>
                    
                    {/* Container tombol order */}
                    <View style={styles.orderButtonContainer}>
                      <TouchableOpacity
                        style={[
                          styles.orderButton,
                          { backgroundColor: getCurrentCanteen()?.color }
                        ]}
                        onPress={() => handleOrderPress(food)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="add-circle-outline" size={20} color="#fff" />
                        <Text style={styles.orderButtonText}>Pesan Sekarang</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            // Jika tidak ada makanan, tampilkan empty state
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🍽️</Text>
              <Text style={styles.emptyTitle}>Menu Belum Tersedia</Text>
              <Text style={styles.emptyDescription}>
                Belum ada menu makanan di {getCurrentCanteen()?.label}
              </Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

// StyleSheet untuk semua styling komponen
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa', // Background abu-abu muda
  },
  header: {
    padding: 20,
    paddingTop: 60, // Extra padding top untuk status bar
    backgroundColor: '#fff',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    // Shadow untuk iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    // Shadow untuk Android
    elevation: 5,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50', // Warna text gelap
    marginBottom: 5,
  },
  subGreeting: {
    fontSize: 16,
    color: '#7f8c8d', // Warna text abu-abu
  },
  canteenSection: {
    padding: 20,
  },
  canteenTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  canteenContainer: {
    paddingRight: 20, // Padding kanan untuk scroll horizontal
  },
  canteenCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#e9ecef',
    alignItems: 'center',
    minWidth: 100,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  canteenIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  canteenLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
  },
  selectedCanteenLabel: {
    color: '#fff', // Text putih ketika kantin dipilih
  },
  selectedIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  currentCanteenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  currentCanteenIcon: {
    fontSize: 30,
    marginRight: 15,
  },
  currentCanteenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  currentCanteenSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  loadingContainer: {
    padding: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#7f8c8d',
  },
  menuContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  foodCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 20,
    // Shadow yang lebih prominent
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden', // Penting untuk border radius
  },
  portraitCard: {
    marginBottom: 25, // Extra spacing untuk gambar portrait
  },
  imageContainer: {
    position: 'relative', // Untuk absolute positioning overlay
    overflow: 'hidden',
  },
  foodImage: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#ccc',
    fontSize: 16,
    marginTop: 8,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)', // Dark overlay 30% opacity
  },
  imageContent: {
    position: 'absolute',
    top: 15,
    left: 15,
    right: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  canteenBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  canteenBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  debugInfo: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  debugText: {
    color: '#fff',
    fontSize: 10,
  },
  foodInfo: {
    padding: 20,
  },
  foodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  foodName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1, // Mengambil sisa space
    marginRight: 10,
  },
  foodPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    // Color dinamis berdasarkan kantin
  },
  foodDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
    marginBottom: 15,
  },
  orderButtonContainer: {
    alignItems: 'center',
  },
  orderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyContainer: {
    padding: 50,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    margin: 20,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default UserHome;