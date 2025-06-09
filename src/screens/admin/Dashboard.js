import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  FlatList,
  Animated,
  Easing
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

  // Animated Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cardAnimations = useRef([]).current;
  const numberCounters = useRef({
    menuCount: new Animated.Value(0),
    todayOrdersCount: new Animated.Value(0),
    userCount: new Animated.Value(0)
  }).current;

  // Initialize card animations
  const initializeCardAnimations = (count) => {
    if (cardAnimations.length < count) {
      for (let i = cardAnimations.length; i < count; i++) {
        cardAnimations.push({
          scale: new Animated.Value(0),
          opacity: new Animated.Value(0),
          translateY: new Animated.Value(30)
        });
      }
    }
  };

  // Animate numbers counting up
  const animateNumbers = (newStats) => {
    // Animate menu count
    Animated.timing(numberCounters.menuCount, {
      toValue: newStats.menuCount,
      duration: 1500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    // Animate today orders count
    Animated.timing(numberCounters.todayOrdersCount, {
      toValue: newStats.todayOrdersCount,
      duration: 1500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    // Animate user count
    Animated.timing(numberCounters.userCount, {
      toValue: newStats.userCount,
      duration: 1500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  };

  // Animate cards entrance
  const animateCardsEntrance = () => {
    const animations = cardAnimations.slice(0, 3).map((cardAnim, index) => {
      return Animated.parallel([
        Animated.timing(cardAnim.scale, {
          toValue: 1,
          duration: 600,
          delay: index * 150,
          easing: Easing.elastic(1.2),
          useNativeDriver: true,
        }),
        Animated.timing(cardAnim.opacity, {
          toValue: 1,
          duration: 400,
          delay: index * 150,
          useNativeDriver: true,
        }),
        Animated.timing(cardAnim.translateY, {
          toValue: 0,
          duration: 500,
          delay: index * 150,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        })
      ]);
    });

    Animated.stagger(100, animations).start();
  };

  // Animate order cards
  const animateOrderCards = (orderCount) => {
    initializeCardAnimations(orderCount + 3); // +3 for stat cards
    
    const orderAnimations = cardAnimations.slice(3, 3 + orderCount).map((cardAnim, index) => {
      // Reset values
      cardAnim.scale.setValue(0);
      cardAnim.opacity.setValue(0);
      cardAnim.translateY.setValue(20);
      
      return Animated.parallel([
        Animated.timing(cardAnim.scale, {
          toValue: 1,
          duration: 400,
          delay: index * 100,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
        Animated.timing(cardAnim.opacity, {
          toValue: 1,
          duration: 300,
          delay: index * 100,
          useNativeDriver: true,
        }),
        Animated.timing(cardAnim.translateY, {
          toValue: 0,
          duration: 400,
          delay: index * 100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      ]);
    });

    Animated.stagger(50, orderAnimations).start();
  };

  // Pulse animation for loading
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Rotate animation for loading
  const startRotateAnimation = () => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  };

  // Main entrance animation
  const startEntranceAnimation = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      })
    ]).start(() => {
      animateCardsEntrance();
    });
  };

  useEffect(() => {
    // Initialize card animations
    initializeCardAnimations(8); // 3 stat cards + 5 order cards
    
    // Start loading animations
    if (loading) {
      startPulseAnimation();
      startRotateAnimation();
    }

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
      
      setStats(prevStats => {
        const newStats = {
          ...prevStats,
          todayOrdersCount: todaysOrders.length
        };
        animateNumbers(newStats);
        return newStats;
      });
      
      setLoading(false);
      
      // Animate order cards
      setTimeout(() => {
        animateOrderCards(Math.min(newOrders.length, 5));
      }, 1000);
    }, (error) => {
      console.error("Error getting real-time orders:", error);
      setLoading(false);
    });
    
    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading) {
      startEntranceAnimation();
    }
  }, [loading]);

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
      
      const newStats = {
        menuCount,
        todayOrdersCount: 0, // This will be updated by the real-time listener
        userCount
      };
      
      setStats(newStats);
      animateNumbers(newStats);
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

  const renderOrderItem = ({ item, index }) => {
    const cardIndex = index + 3; // Offset by 3 for stat cards
    const cardAnimation = cardAnimations[cardIndex] || { scale: new Animated.Value(1), opacity: new Animated.Value(1), translateY: new Animated.Value(0) };
    
    return (
      <Animated.View
        style={[
          {
            transform: [
              { scale: cardAnimation.scale },
              { translateY: cardAnimation.translateY }
            ],
            opacity: cardAnimation.opacity,
          }
        ]}
      >
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
      </Animated.View>
    );
  };

  if (loading) {
    const rotate = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <View style={styles.loadingContainer}>
        <Animated.View
          style={[
            styles.loadingIconContainer,
            {
              transform: [
                { scale: pulseAnim },
                { rotate }
              ]
            }
          ]}
        >
          <ActivityIndicator size="large" color="#4285F4" />
        </Animated.View>
        <Animated.Text 
          style={[
            styles.loadingText,
            {
              opacity: pulseAnim,
            }
          ]}
        >
          Memuat data...
        </Animated.Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Animated.Text 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        Dashboard Admin
      </Animated.Text>
      
      {/* Stats Cards Container */}
      <Animated.View 
        style={[
          styles.statsContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {/* Top Row - Menu and Orders */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={handleNavigateToMenu} style={styles.halfCard}>
            <Animated.View 
              style={[
                styles.statCard,
                {
                  transform: [
                    { scale: cardAnimations[0]?.scale || new Animated.Value(1) },
                    { translateY: cardAnimations[0]?.translateY || new Animated.Value(0) }
                  ],
                  opacity: cardAnimations[0]?.opacity || new Animated.Value(1)
                }
              ]}
            >
              <Text style={styles.cardTitle}>Menu Makanan</Text>
              <Animated.Text style={styles.cardNumber}>
                {numberCounters.menuCount._value.toFixed(0)} Menu
              </Animated.Text>
            </Animated.View>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleNavigateToOrders} style={styles.halfCard}>
            <Animated.View 
              style={[
                styles.statCard,
                {
                  transform: [
                    { scale: cardAnimations[1]?.scale || new Animated.Value(1) },
                    { translateY: cardAnimations[1]?.translateY || new Animated.Value(0) }
                  ],
                  opacity: cardAnimations[1]?.opacity || new Animated.Value(1)
                }
              ]}
            >
              <Text style={styles.cardTitle}>Pesanan hari ini</Text>
              <Animated.Text style={styles.cardNumber}>
                {numberCounters.todayOrdersCount._value.toFixed(0)} Pesanan
              </Animated.Text>
            </Animated.View>
          </TouchableOpacity>
        </View>
        
        {/* Bottom Row - Users (Full width) */}
        <TouchableOpacity onPress={handleNavigateToUsers} style={styles.fullCard}>
          <Animated.View 
            style={[
              styles.statCard,
              {
                transform: [
                  { scale: cardAnimations[2]?.scale || new Animated.Value(1) },
                  { translateY: cardAnimations[2]?.translateY || new Animated.Value(0) }
                ],
                opacity: cardAnimations[2]?.opacity || new Animated.Value(1)
              }
            ]}
          >
            <Text style={styles.cardTitle}>Total Pengguna</Text>
            <Animated.Text style={styles.cardNumber}>
              {numberCounters.userCount._value.toFixed(0)} Pengguna
            </Animated.Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
      
      <Animated.View 
        style={[
          styles.recentOrdersContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <Text style={styles.recentOrdersTitle}>Pesanan Terbaru (Real-time)</Text>
        
        {recentOrders.length > 0 ? (
          <FlatList
            data={recentOrders.slice(0, 5)} // Show only 5 most recent orders
            renderItem={renderOrderItem}
            keyExtractor={item => item.id}
            scrollEnabled={false} // Disable scrolling as we're inside ScrollView
          />
        ) : (
          <Animated.View
            style={[
              {
                transform: [
                  { scale: cardAnimations[3]?.scale || new Animated.Value(1) },
                  { translateY: cardAnimations[3]?.translateY || new Animated.Value(0) }
                ],
                opacity: cardAnimations[3]?.opacity || new Animated.Value(1)
              }
            ]}
          >
            <Card containerStyle={styles.noOrdersCard}>
              <Text style={styles.noOrdersText}>Belum ada pesanan terbaru</Text>
            </Card>
          </Animated.View>
        )}
      </Animated.View>
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
  loadingIconContainer: {
    marginBottom: 20,
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