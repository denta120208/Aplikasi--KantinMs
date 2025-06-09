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
      
      {/* Stats Cards Container */}
      <View style={styles.statsContainer}>
        {/* Top Row - Menu and Orders */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={handleNavigateToMenu} style={styles.halfCard}>
            <View style={styles.statCard}>
              <Text style={styles.cardTitle}>Menu Makanan</Text>
              <Text style={styles.cardNumber}>{stats.menuCount} Menu</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleNavigateToOrders} style={styles.halfCard}>
            <View style={styles.statCard}>
              <Text style={styles.cardTitle}>Pesanan hari ini</Text>
              <Text style={styles.cardNumber}>{stats.todayOrdersCount} Pesanan</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Bottom Row - Users (Full width) */}
        <TouchableOpacity onPress={handleNavigateToUsers} style={styles.fullCard}>
          <View style={styles.statCard}>
            <Text style={styles.cardTitle}>Total Pengguna</Text>
            <Text style={styles.cardNumber}>{stats.userCount} Pengguna</Text>
          </View>
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
    color: '#333',
  },
  
  // New Stats Container Styles
  statsContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  halfCard: {
    flex: 1,
    marginHorizontal: 4,
  },
  fullCard: {
    marginHorizontal: 4,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  
  // Recent Orders Styles
  recentOrdersContainer: {
    padding: 16,
    marginBottom: 20,
  },
  recentOrdersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  orderCard: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  orderTime: {
    color: '#666',
    fontSize: 12,
  },
  orderDetails: {
    marginVertical: 8,
  },
  customerName: {
    marginBottom: 4,
    color: '#666',
    fontSize: 14,
  },
  orderItems: {
    marginBottom: 4,
    color: '#666',
    fontSize: 14,
  },
  orderTotal: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: 14,
  },
  orderStatusContainer: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  orderStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  statusPending: {
    backgroundColor: '#FFF3CD',
    color: '#856404',
  },
  statusProcessing: {
    backgroundColor: '#CCE5FF',
    color: '#004085',
  },
  statusCompleted: {
    backgroundColor: '#D4EDDA',
    color: '#155724',
  },
  noOrdersCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
  },
  noOrdersText: {
    color: '#666',
    fontSize: 16,
  },
});
export default AdminDashboard;