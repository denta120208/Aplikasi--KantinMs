import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
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
      // Removed orderBy to avoid index requirement
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
            foods.map((food) => (
              <TouchableOpacity 
                key={food.id} 
                style={styles.foodCard}
                onPress={() => handleOrderPress(food)}
                activeOpacity={0.8}
              >
                <Image 
                  source={{ uri: food.imageData }} 
                  style={styles.foodImage}
                />
                <View style={styles.foodInfo}>
                  <View style={styles.foodHeader}>
                    <Text style={styles.foodName}>{food.name}</Text>
                    <View style={[
                      styles.canteenBadge,
                      { backgroundColor: getCurrentCanteen()?.color }
                    ]}>
                      <Text style={styles.canteenBadgeText}>
                        {getCurrentCanteen()?.icon} Kantin {food.canteen}
                      </Text>
                    </View>
                  </View>
                  <Text style={[
                    styles.foodPrice,
                    { color: getCurrentCanteen()?.color }
                  ]}>
                    Rp {food.price.toLocaleString()}
                  </Text>
                  <Text style={styles.foodDescription} numberOfLines={2}>
                    {food.description}
                  </Text>
                  <TouchableOpacity 
                    style={[
                      styles.orderButton,
                      { backgroundColor: getCurrentCanteen()?.color }
                    ]}
                    onPress={() => handleOrderPress(food)}
                  >
                    <Ionicons name="bag-add-outline" size={16} color="#fff" />
                    <Text style={styles.orderButtonText}>Pesan Sekarang</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🍽️</Text>
              <Text style={styles.emptyTitle}>Menu Kosong</Text>
              <Text style={styles.emptyText}>
                Belum ada menu makanan di {getCurrentCanteen()?.label}
              </Text>
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={fetchFoods}
              >
                <Ionicons name="refresh-outline" size={20} color="#666" />
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
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
    backgroundColor: '#f4f6fc',
  },
  header: {
    backgroundColor: '#4285F4',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '600',
    color: '#fff',
  },
  subGreeting: {
    fontSize: 16,
    color: '#e0e0e0',
    marginTop: 4,
  },
  canteenSection: {
    paddingVertical: 20,
    backgroundColor: '#fff',
    marginTop: -15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 1,
  },
  canteenTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    paddingHorizontal: 20,
    color: '#333',
  },
  canteenContainer: {
    paddingHorizontal: 15,
  },
  canteenCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 5,
    minWidth: 90,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  canteenIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  canteenLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  selectedCanteenLabel: {
    color: '#fff',
  },
  selectedIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
  currentCanteenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 15,
  },
  currentCanteenIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  currentCanteenTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  currentCanteenSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  loadingText: {
    marginTop: 15,
    color: '#666',
    fontSize: 16,
  },
  menuContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  foodCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  foodImage: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  foodInfo: {
    padding: 15,
  },
  foodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  foodName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  canteenBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  canteenBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  foodPrice: {
    fontSize: 16,
    marginVertical: 4,
    fontWeight: '500',
  },
  foodDescription: {
    color: '#666',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  orderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 5,
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 15,
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  refreshButtonText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
});

export default UserHome;