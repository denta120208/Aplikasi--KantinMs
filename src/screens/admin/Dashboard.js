import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  FlatList 
} from 'react-native';
import { Card } from 'react-native-elements';
import { useNavigation } from '@react-navigation/native';
import { db } from '../../config/firebaseConfig';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  getDocs, 
  where, 
  Timestamp 
} from 'firebase/firestore';

const AdminDashboard = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    menuCount: 0,
    todayOrdersCount: 0,
    userCount: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    // Load initial statistics
    fetchStatistics();
    
    // Set up real-time listener for orders
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : new Date()
      }));
      
      setRecentOrders(newOrders);
      
      // Update today's order count
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todaysOrders = newOrders.filter(order => {
        const orderDate = order.createdAt;
        return orderDate >= today;
      });
      
      setStats(prevStats => ({
        ...prevStats,
        todayOrdersCount: todaysOrders.length
      }));
      
      setLoading(false);
    }, (error) => {
      console.error("Error getting real-time orders:", error);
      setLoading(false);
    });
    
    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const fetchStatistics = async () => {
    try {
      // Get menu count
      const foodsCollection = collection(db, 'foods');
      const foodsSnapshot = await getDocs(foodsCollection);
      const menuCount = foodsSnapshot.docs.length;
      
      // Get user count
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const userCount = usersSnapshot.docs.length;
      
      setStats({
        menuCount,
        todayOrdersCount: 0, // This will be updated by the real-time listener
        userCount
      });
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  const handleNavigateToOrders = () => {
    navigation.navigate('Orders');
  };

  const handleNavigateToMenu = () => {
    navigation.navigate('MenuManagement');
  };

  const handleNavigateToUsers = () => {
    navigation.navigate('UserManagement');
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderOrderItem = ({ item }) => {
    return (
      <Card containerStyle={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderTitle}>Pesanan #{item.id.substring(0, 6)}</Text>
          <Text style={styles.orderTime}>{formatTime(item.createdAt)}</Text>
        </View>
        
        <View style={styles.orderDetails}>
          <Text style={styles.customerName}>Customer: {item.userName}</Text>
          <Text style={styles.orderItems}>Items: {item.items.map(food => `${food.quantity}x ${food.name}`).join(', ')}</Text>
          <Text style={styles.orderTotal}>Total: Rp {item.totalAmount?.toLocaleString()}</Text>
        </View>
        
        <View style={styles.orderStatusContainer}>
          <Text style={[
            styles.orderStatus, 
            item.status === 'completed' ? styles.statusCompleted : 
            item.status === 'processing' ? styles.statusProcessing : 
            styles.statusPending
          ]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Memuat data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Dashboard Admin</Text>
      
      <View style={styles.cardContainer}>
        <TouchableOpacity onPress={handleNavigateToMenu}>
          <Card containerStyle={styles.card}>
            <Card.Title>Menu Makanan</Card.Title>
            <Card.Divider />
            <View style={styles.cardContent}>
              <Text style={styles.cardText}>{stats.menuCount} Menu</Text>
            </View>
          </Card>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={handleNavigateToOrders}>
          <Card containerStyle={styles.card}>
            <Card.Title>Pesanan Hari Ini</Card.Title>
            <Card.Divider />
            <View style={styles.cardContent}>
              <Text style={styles.cardText}>{stats.todayOrdersCount} Pesanan</Text>
            </View>
          </Card>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={handleNavigateToUsers}>
          <Card containerStyle={styles.card}>
            <Card.Title>Total Pengguna</Card.Title>
            <Card.Divider />
            <View style={styles.cardContent}>
              <Text style={styles.cardText}>{stats.userCount} Pengguna</Text>
            </View>
          </Card>
        </TouchableOpacity>
      </View>
      
      <View style={styles.recentOrdersContainer}>
        <Text style={styles.recentOrdersTitle}>Pesanan Terbaru (Real-time)</Text>
        
        {recentOrders.length > 0 ? (
          <FlatList
            data={recentOrders.slice(0, 5)} // Show only 5 most recent orders
            renderItem={renderOrderItem}
            keyExtractor={item => item.id}
            scrollEnabled={false} // Disable scrolling as we're inside ScrollView
          />
        ) : (
          <Card containerStyle={styles.noOrdersCard}>
            <Text style={styles.noOrdersText}>Belum ada pesanan terbaru</Text>
          </Card>
        )}
        
        
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
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
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 40,
    marginBottom: 20,
    textAlign: 'center',
  },
  cardContainer: {
    padding: 10,
  },
  card: {
    borderRadius: 10,
    marginBottom: 10,
    elevation: 3,
  },
  cardContent: {
    alignItems: 'center',
    padding: 10,
  },
  cardText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  recentOrdersContainer: {
    padding: 10,
    marginBottom: 20,
  },
  recentOrdersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    marginLeft: 10,
  },
  orderCard: {
    borderRadius: 10,
    marginBottom: 10,
    padding: 12,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  orderTitle: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  orderTime: {
    color: '#666',
  },
  orderDetails: {
    marginVertical: 5,
  },
  customerName: {
    marginBottom: 3,
  },
  orderItems: {
    marginBottom: 3,
  },
  orderTotal: {
    fontWeight: 'bold',
  },
  orderStatusContainer: {
    marginTop: 5,
    alignItems: 'flex-end',
  },
  orderStatus: {
    padding: 5,
    borderRadius: 5,
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusPending: {
    backgroundColor: '#FFC107',
    color: '#000',
  },
  statusProcessing: {
    backgroundColor: '#2196F3',
    color: '#fff',
  },
  statusCompleted: {
    backgroundColor: '#4CAF50',
    color: '#fff',
  },
  noOrdersCard: {
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  noOrdersText: {
    color: '#666',
    fontSize: 16,
  },
  viewAllButton: {
    backgroundColor: '#4285F4',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginHorizontal: 10,
  },
  viewAllButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default AdminDashboard;