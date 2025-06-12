import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { db } from '../../config/firebaseConfig';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';

const ManageFood = () => {
  // State untuk data makanan dan form
  const [foods, setFoods] = useState([]); // Daftar makanan
  const [name, setName] = useState(''); // Nama makanan
  const [price, setPrice] = useState(''); // Harga makanan
  const [description, setDescription] = useState(''); // Deskripsi makanan
  const [image, setImage] = useState(null); // Gambar makanan
  const [selectedCanteen, setSelectedCanteen] = useState('A'); // Kantin yang dipilih
  const [isEditing, setIsEditing] = useState(false); // Status edit mode
  const [editId, setEditId] = useState(null); // ID makanan yang sedang diedit
  const [isLoading, setIsLoading] = useState(false); // Status loading

  // Daftar kantin yang tersedia
  const canteens = [
    { label: 'Kantin A', value: 'A' },
    { label: 'Kantin B', value: 'B' },
    { label: 'Kantin C', value: 'C' },
    { label: 'Kantin D', value: 'D' }
  ];

  // Ambil data makanan saat komponen dimount atau kantin berubah
  useEffect(() => {
    console.log("Component mounted, fetching foods for canteen:", selectedCanteen);
    fetchFoods();
  }, [selectedCanteen]);

  // Fungsi untuk mengambil data makanan dari Firestore
  const fetchFoods = async () => {
    console.log("Starting to fetch foods for canteen:", selectedCanteen);
    setIsLoading(true);
    try {
      // Query makanan berdasarkan kantin yang dipilih
      const foodsCollection = collection(db, 'foods');
      const q = query(foodsCollection, where('canteen', '==', selectedCanteen));
      console.log("Query created for canteen:", selectedCanteen);
      
      // Ambil data dari Firestore
      const foodsSnapshot = await getDocs(q);
      console.log(`Fetched ${foodsSnapshot.size} foods for canteen ${selectedCanteen}`);
      
      // Convert data ke array
      const foodsList = foodsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log("Processed foods data for canteen:", selectedCanteen);
      setFoods(foodsList);
    } catch (error) {
      console.error('Error fetching foods:', error);
      Alert.alert('Error', 'Gagal mengambil data makanan: ' + error.message);
    } finally {
      setIsLoading(false);
      console.log("Fetch completed for canteen:", selectedCanteen);
    }
  };

  // Fungsi untuk memilih gambar dari galeri
  const pickImage = async () => {
    try {
      // Buka image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8, // Kualitas gambar
        allowsMultipleSelection: false,
      });

      if (!result.canceled) {
        const selectedImage = result.assets[0];
        // Convert gambar ke base64
        const base64Image = await convertImageToBase64(selectedImage.uri);
        
        // Simpan gambar dengan metadata
        setImage({
          uri: base64Image,
          width: selectedImage.width,
          height: selectedImage.height,
          aspectRatio: selectedImage.width / selectedImage.height
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Gagal memilih gambar');
    }
  };

  // Fungsi untuk convert gambar ke base64
  const convertImageToBase64 = async (uri) => {
    try {
      setIsLoading(true);
      const response = await fetch(uri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result;
          setIsLoading(false);
          resolve(base64String);
        };
        reader.onerror = () => {
          setIsLoading(false);
          reject(new Error('Failed to convert image to base64'));
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      setIsLoading(false);
      console.error('Error converting image to base64:', error);
      throw error;
    }
  };

  // Fungsi untuk menyimpan atau update makanan
  const handleSave = async () => {
    // Validasi input
    if (!name || !price || !description || (!image && !isEditing)) {
      Alert.alert('Error', 'Semua field harus diisi');
      return;
    }

    setIsLoading(true);
    try {
      let imageData = null;
      let imageMetadata = null;
      
      // Handle gambar untuk mode edit atau tambah baru
      if (isEditing && image && typeof image === 'string') {
        // Edit mode - gambar tidak berubah
        const food = foods.find(f => f.id === editId);
        imageData = food.imageData;
        imageMetadata = food.imageMetadata || null;
      } else if (image && typeof image === 'object') {
        // Gambar baru dipilih
        imageData = image.uri;
        imageMetadata = {
          width: image.width,
          height: image.height,
          aspectRatio: image.aspectRatio
        };
      } else if (isEditing) {
        // Edit mode - tidak ada gambar baru
        const food = foods.find(f => f.id === editId);
        imageData = food.imageData;
        imageMetadata = food.imageMetadata || null;
      }

      // Data makanan yang akan disimpan
      const foodData = {
        name,
        price: Number(price),
        description,
        imageData,
        imageMetadata,
        canteen: selectedCanteen
      };

      if (isEditing) {
        // Update makanan yang sudah ada
        await updateDoc(doc(db, 'foods', editId), foodData);
        Alert.alert('Sukses', `Makanan berhasil diupdate untuk Kantin ${selectedCanteen}`);
      } else {
        // Tambah makanan baru
        await addDoc(collection(db, 'foods'), {
          ...foodData,
          createdAt: new Date()
        });
        Alert.alert('Sukses', `Makanan berhasil ditambahkan ke Kantin ${selectedCanteen}`);
      }

      // Reset form setelah berhasil
      setName('');
      setPrice('');
      setDescription('');
      setImage(null);
      setIsEditing(false);
      setEditId(null);
      fetchFoods(); // Refresh daftar makanan
    } catch (error) {
      console.error('Error saving food:', error);
      Alert.alert('Error', 'Gagal menyimpan data makanan: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fungsi untuk memulai edit makanan
  const handleEdit = (food) => {
    // Isi form dengan data makanan yang akan diedit
    setName(food.name);
    setPrice(food.price.toString());
    setDescription(food.description);
    
    // Handle format gambar lama dan baru
    if (typeof food.imageData === 'string') {
      setImage(food.imageData);
    } else {
      setImage(food.imageData);
    }
    
    setSelectedCanteen(food.canteen);
    setIsEditing(true);
    setEditId(food.id);
  };

  // Fungsi untuk menghapus makanan dari Firestore
  const deleteFood = async (id) => {
    console.log("Starting delete operation for food:", id);
    try {
      setIsLoading(true);
      
      // Hapus dokumen dari Firestore
      const foodRef = doc(db, 'foods', id);
      console.log("Document reference created");
      
      console.log("Attempting to delete document");
      await deleteDoc(foodRef);
      console.log("Document deleted successfully");
      
      Alert.alert('Sukses', 'Makanan berhasil dihapus');
      
      // Update state local untuk menghapus item
      setFoods(prevFoods => prevFoods.filter(food => food.id !== id));
      console.log("State updated");
      
      // Reset form jika sedang edit makanan yang dihapus
      if (isEditing && editId === id) {
        setName('');
        setPrice('');
        setDescription('');
        setImage(null);
        setIsEditing(false);
        setEditId(null);
        console.log("Form reset");
      }
    } catch (error) {
      console.error('Error deleting food:', error);
      Alert.alert('Error', 'Gagal menghapus makanan: ' + error.message);
    } finally {
      setIsLoading(false);
      console.log("Delete operation completed");
    }
  };

  // Fungsi untuk menampilkan konfirmasi hapus
  const handleDeletePress = (id) => {
    console.log("Delete button pressed for food:", id);
    Alert.alert(
      'Konfirmasi',
      'Apakah Anda yakin ingin menghapus makanan ini?',
      [
        { 
          text: 'Batal', 
          style: 'cancel',
          onPress: () => console.log("Delete cancelled")
        },
        { 
          text: 'Hapus', 
          style: 'destructive',
          onPress: () => {
            console.log("Delete confirmed, calling deleteFood");
            deleteFood(id);
          }
        }
      ],
      { cancelable: false }
    );
  };

  // Fungsi untuk reset form
  const resetForm = () => {
    setName('');
    setPrice('');
    setDescription('');
    setImage(null);
    setIsEditing(false);
    setEditId(null);
  };

  // Helper function untuk mendapatkan URI gambar
  const getImageUri = (imageData) => {
    if (typeof imageData === 'object' && imageData.uri) {
      return imageData.uri;
    }
    return imageData;
  };

  // Helper function untuk menghitung style gambar berdasarkan aspect ratio
  const getFoodImageStyle = (food) => {
    if (food.imageMetadata && food.imageMetadata.aspectRatio) {
      const cardWidth = 100; // Lebar tetap untuk gambar card
      const height = cardWidth / food.imageMetadata.aspectRatio;
      return {
        width: cardWidth,
        height: Math.max(80, Math.min(height, 120)), // Min 80, max 120
      };
    }
    return styles.foodImage; // Style default
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Kelola Menu Makanan</Text>
      
      {/* Section Pemilihan Kantin */}
      <View style={styles.canteenContainer}>
        <Text style={styles.canteenLabel}>Pilih Kantin:</Text>
        <View style={styles.canteenPicker}>
          <Picker
            selectedValue={selectedCanteen}
            onValueChange={(itemValue) => {
              setSelectedCanteen(itemValue);
              if (isEditing) {
                resetForm(); // Reset form saat ganti kantin pada mode edit
              }
            }}
            style={styles.picker}
          >
            {canteens.map((canteen) => (
              <Picker.Item 
                key={canteen.value} 
                label={canteen.label} 
                value={canteen.value} 
              />
            ))}
          </Picker>
        </View>
      </View>
      
      {/* Form Tambah/Edit Makanan */}
      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>
          {isEditing ? `Edit Menu - Kantin ${selectedCanteen}` : `Tambah Menu Baru - Kantin ${selectedCanteen}`}
        </Text>
        
        {/* Input Nama Makanan */}
        <TextInput
          style={styles.input}
          placeholder="Nama Makanan"
          value={name}
          onChangeText={setName}
        />
        
        {/* Input Harga */}
        <TextInput
          style={styles.input}
          placeholder="Harga"
          keyboardType="numeric"
          value={price}
          onChangeText={setPrice}
        />
        
        {/* Input Deskripsi */}
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Deskripsi"
          multiline
          value={description}
          onChangeText={setDescription}
        />
        
        {/* Image Picker */}
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage} disabled={isLoading}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4285F4" />
              <Text style={styles.loadingText}>Memproses gambar...</Text>
            </View>
          ) : image ? (
            <Image 
              source={{ uri: getImageUri(image) }} 
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.imagePickerContent}>
              <Ionicons name="image-outline" size={24} color="#666" />
              <Text style={styles.imagePickerText}>Pilih Gambar</Text>
              <Text style={styles.imagePickerHint}>Crop sesuka hati Anda</Text>
            </View>
          )}
        </TouchableOpacity>
        
        {/* Tombol Simpan */}
        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.disabledButton]}
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? 'Menyimpan...' : isEditing ? 'Update Makanan' : 'Tambah Makanan'}
          </Text>
        </TouchableOpacity>
        
        {/* Tombol Batal Edit (hanya muncul saat edit) */}
        {isEditing && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={resetForm}
          >
            <Text style={styles.cancelButtonText}>Batal Edit</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Daftar Menu Makanan */}
      <Text style={styles.subHeader}>Menu Kantin {selectedCanteen}</Text>
      {isLoading && foods.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.loadingText}>Memuat menu...</Text>
        </View>
      ) : (
        <View style={styles.foodList}>
          {foods.map((food) => (
            <View key={food.id} style={styles.foodCard}>
              {/* Gambar Makanan */}
              <Image 
                source={{ uri: food.imageData }} 
                style={getFoodImageStyle(food)}
                resizeMode="cover"
              />
              
              {/* Info Makanan */}
              <View style={styles.foodInfo}>
                <Text style={styles.foodName}>{food.name}</Text>
                <Text style={styles.foodPrice}>Rp {food.price.toLocaleString()}</Text>
                <Text style={styles.canteenBadge}>Kantin {food.canteen}</Text>
                <Text style={styles.foodDescription} numberOfLines={2}>
                  {food.description}
                </Text>
                
                {/* Tombol Aksi */}
                <View style={styles.actionButtons}>
                  {/* Tombol Edit */}
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEdit(food)}
                    disabled={isLoading}
                  >
                    <Ionicons name="create-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                  
                  {/* Tombol Hapus */}
                  <TouchableOpacity
                    style={[styles.deleteButton, isLoading && styles.disabledButton]}
                    onPress={() => handleDeletePress(food.id)}
                    disabled={isLoading}
                  >
                    <Ionicons name="trash-outline" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Hapus</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
          
          {/* Pesan jika belum ada menu */}
          {foods.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Belum ada menu makanan di Kantin {selectedCanteen}</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

// Styles untuk komponen
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 15,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  // Style untuk container pemilihan kantin
  canteenContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  canteenLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  canteenPicker: {
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  // Style untuk form container
  formContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#4285F4',
    textAlign: 'center',
  },
  // Style untuk input fields
  input: {
    backgroundColor: '#f2f2f2',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  // Style untuk image picker
  imagePicker: {
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    marginBottom: 15,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imagePickerContent: {
    alignItems: 'center',
  },
  imagePickerText: {
    marginTop: 8,
    color: '#666',
    fontSize: 16,
  },
  imagePickerHint: {
    marginTop: 4,
    color: '#999',
    fontSize: 12,
    fontStyle: 'italic',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  // Style untuk loading indicator
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  // Style untuk tombol
  saveButton: {
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  cancelButton: {
    backgroundColor: '#f2f2f2',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#a9c6fa',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Style untuk daftar makanan
  subHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  foodList: {
    marginBottom: 20,
  },
  foodCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    alignItems: 'stretch',
  },
  foodImage: {
    width: 100,
    height: 100,
  },
  foodInfo: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  foodName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  foodPrice: {
    fontSize: 14,
    color: '#4285F4',
    marginVertical: 5,
  },
  canteenBadge: {
    fontSize: 12,
    color: '#fff',
    backgroundColor: '#34A853',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 5,
  },
  foodDescription: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  // Style untuk tombol aksi
  actionButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  editButton: {
    backgroundColor: '#4285F4',
    padding: 8,
    borderRadius: 5,
    marginRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FF0000',
    padding: 8,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    marginLeft: 5,
    fontWeight: 'bold',
  },
  // Style untuk pesan kosong
  emptyContainer: {
    padding: 50,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default ManageFood;