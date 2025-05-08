import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { db } from '../../config/firebaseConfig';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { AuthContext } from '../../context/AuthContext';

const UserHome = () => {
  const [foods, setFoods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetchFoods();
  }, []);

  const fetchFoods = async () => {
    try {
      const foodsCollection = collection(db, 'foods');
      const q = query(foodsCollection, orderBy('createdAt', 'desc'));
      const foodsSnapshot = await getDocs(q);
      const foodsList = foodsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFoods(foodsList);
    } catch (error) {
      console.error('Error fetching foods:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderPress = (food) => {
    navigation.navigate('OrderForm', { food, user });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Halo, {user?.displayName || 'Pengguna'} 👋</Text>
        <Text style={styles.subGreeting}>Mau makan apa hari ini?</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.loadingText}>Memuat menu...</Text>
        </View>
      ) : (
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>🍽️ Menu Tersedia</Text>
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
                  <Text style={styles.foodName}>{food.name}</Text>
                  <Text style={styles.foodPrice}>Rp {food.price.toLocaleString()}</Text>
                  <Text style={styles.foodDescription} numberOfLines={2}>
                    {food.description}
                  </Text>
                  <TouchableOpacity 
                    style={styles.orderButton}
                    onPress={() => handleOrderPress(food)}
                  >
                    <Text style={styles.orderButtonText}>Pesan Sekarang</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Belum ada menu makanan tersedia</Text>
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
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
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
  foodName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  foodPrice: {
    fontSize: 16,
    color: '#4285F4',
    marginVertical: 4,
    fontWeight: '500',
  },
  foodDescription: {
    color: '#666',
    fontSize: 14,
  },
  orderButton: {
    backgroundColor: '#34A853',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});

export default UserHome;
