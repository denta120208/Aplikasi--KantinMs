import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../config/firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { AuthContext } from '../../context/AuthContext';

const UserHome = () => {
  const [foods, setFoods] = useState([]);
  const [selectedCanteen, setSelectedCanteen] = useState('A');
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);

  // Get screen width for responsive image sizing
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = screenWidth - 40; // Account for padding

  const canteens = [
    { label: 'Kantin A', value: 'A', icon: '🏪', color: '#4285F4' },
    { label: 'Kantin B', value: 'B', icon: '🍽️', color: '#34A853' },
    { label: 'Kantin C', value: 'C', icon: '🥘', color: '#FF9800' },
    { label: 'Kantin D', value: 'D', icon: '🍜', color: '#9C27B0' }
  ];

  useEffect(() => {
    fetchFoods();
  }, [selectedCanteen]);

  const fetchFoods = async () => {
    setIsLoading(true);
    try {
      const foodsCollection = collection(db, 'foods');
      const q = query(
        foodsCollection, 
        where('canteen', '==', selectedCanteen)
      );
      const foodsSnapshot = await getDocs(q);
      const foodsList = foodsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort in JavaScript instead of Firestore query
      const sortedFoods = foodsList.sort((a, b) => {
        // Sort by createdAt if it exists, otherwise by name
        if (a.createdAt && b.createdAt) {
          return b.createdAt.toMillis() - a.createdAt.toMillis();
        }
        return a.name.localeCompare(b.name);
      });
      
      setFoods(sortedFoods);
    } catch (error) {
      console.error('Error fetching foods:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderPress = (food) => {
    navigation.navigate('OrderForm', { food, user });
  };

  const handleCanteenSelect = (canteenValue) => {
    setSelectedCanteen(canteenValue);
  };

  const getCurrentCanteen = () => {
    return canteens.find(canteen => canteen.value === selectedCanteen);
  };

  // Calculate dynamic image height based on admin's cropped aspect ratio
  const getFoodImageStyle = (food) => {
    if (food.imageMetadata && food.imageMetadata.aspectRatio) {
      // Use the exact aspect ratio from admin's crop
      const height = cardWidth / food.imageMetadata.aspectRatio;
      return {
        width: '100%',
        height: Math.max(120, Math.min(height, 300)), // Min 120, max 300 for better UX
        borderRadius: 12,
      };
    }
    // Fallback for legacy images without metadata
    return {
      width: '100%',
      height: 200, // Default height
      borderRadius: 12,
    };
  };

  // Determine the best resize mode based on aspect ratio
  const getResizeMode = (food) => {
    if (food.imageMetadata && food.imageMetadata.aspectRatio) {
      // Since admin already cropped the image to desired ratio, use 'cover' to fill nicely
      return 'cover';
    }
    return 'cover'; // Default for legacy images
  };

  // Get image URI - handle both legacy and new format
  const getImageUri = (food) => {
    if (typeof food.imageData === 'string') {
      return food.imageData;
    } else if (food.imageData && food.imageData.uri) {
      return food.imageData.uri;
    }
    return null;
  };

  // Calculate if image is landscape, portrait, or square for layout decisions
  const getImageOrientation = (food) => {
    if (food.imageMetadata && food.imageMetadata.aspectRatio) {
      const ratio = food.imageMetadata.aspectRatio;
      if (ratio > 1.3) return 'landscape';
      if (ratio < 0.7) return 'portrait';
      return 'square';
    }
    return 'unknown';
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Halo, {user?.displayName || 'Pengguna'} 👋</Text>
        <Text style={styles.subGreeting}>Pilih kantin favorit Anda!</Text>
      </View>

      {/* Canteen Selection */}
      <View style={styles.canteenSection}>
        <Text style={styles.canteenTitle}>🏫 Pilih Kantin</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.canteenContainer}
        >
          {canteens.map((canteen) => (
            <TouchableOpacity
              key={canteen.value}
              style={[
                styles.canteenCard,
                { borderColor: canteen.color },
                selectedCanteen === canteen.value && { 
                  backgroundColor: canteen.color,
                  transform: [{ scale: 1.05 }]
                }
              ]}
              onPress={() => handleCanteenSelect(canteen.value)}
              activeOpacity={0.8}
            >
              <Text style={styles.canteenIcon}>{canteen.icon}</Text>
              <Text style={[
                styles.canteenLabel,
                selectedCanteen === canteen.value && styles.selectedCanteenLabel
              ]}>
                {canteen.label}
              </Text>
              {selectedCanteen === canteen.value && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Current Canteen Header */}
      <View style={[
        styles.currentCanteenHeader,
        { backgroundColor: getCurrentCanteen()?.color + '20' }
      ]}>
        <Text style={styles.currentCanteenIcon}>{getCurrentCanteen()?.icon}</Text>
        <View>
          <Text style={styles.currentCanteenTitle}>Menu {getCurrentCanteen()?.label}</Text>
          <Text style={styles.currentCanteenSubtitle}>
            {foods.length} menu tersedia
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={getCurrentCanteen()?.color || "#4285F4"} />
          <Text style={styles.loadingText}>Memuat menu {getCurrentCanteen()?.label}...</Text>
        </View>
      ) : (
        <View style={styles.menuContainer}>
          {foods.length > 0 ? (
            foods.map((food) => {
              const imageUri = getImageUri(food);
              const imageOrientation = getImageOrientation(food);
              
              return (
                <TouchableOpacity 
                  key={food.id} 
                  style={[
                    styles.foodCard,
                    // Add extra spacing for portrait images
                    imageOrientation === 'portrait' && styles.portraitCard
                  ]}
                  onPress={() => handleOrderPress(food)}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.imageContainer,
                    getFoodImageStyle(food)
                  ]}>
                    {imageUri ? (
                      <Image 
                        source={{ uri: imageUri }} 
                        style={styles.foodImage}
                        resizeMode={getResizeMode(food)}
                        onError={(error) => {
                          console.log('Image load error:', error.nativeEvent.error);
                        }}
                      />
                    ) : (
                      <View style={styles.noImageContainer}>
                        <Ionicons name="image-outline" size={50} color="#ccc" />
                        <Text style={styles.noImageText}>No Image</Text>
                      </View>
                    )}
                    
                    {/* Gradient overlay for better text readability */}
                    <View style={styles.imageOverlay} />
                    <View style={styles.imageContent}>
                      <View style={[
                        styles.canteenBadge,
                        { backgroundColor: getCurrentCanteen()?.color }
                      ]}>
                        <Text style={styles.canteenBadgeText}>
                          {getCurrentCanteen()?.icon} Kantin {food.canteen}
                        </Text>
                      </View>
                      
                      {/* Show image ratio info for debugging if needed */}
                      {food.imageMetadata && __DEV__ && (
                        <View style={styles.debugInfo}>
                          <Text style={styles.debugText}>
                            {Math.round(food.imageMetadata.aspectRatio * 100) / 100} • {imageOrientation}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.foodInfo}>
                    <View style={styles.foodHeader}>
                      <Text style={styles.foodName}>{food.name}</Text>
                      <Text style={[
                        styles.foodPrice,
                        { color: getCurrentCanteen()?.color }
                      ]}>
                        Rp {food.price?.toLocaleString() || '0'}
                      </Text>
                    </View>
                    
                    <Text style={styles.foodDescription} numberOfLines={2}>
                      {food.description}
                    </Text>
                    
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  subGreeting: {
    fontSize: 16,
    color: '#7f8c8d',
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
    paddingRight: 20,
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
    color: '#fff',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  portraitCard: {
    marginBottom: 25, // Extra spacing for portrait images
  },
  imageContainer: {
    position: 'relative',
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
    backgroundColor: 'rgba(0,0,0,0.3)',
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
    flex: 1,
    marginRight: 10,
  },
  foodPrice: {
    fontSize: 18,
    fontWeight: 'bold',
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