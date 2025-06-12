
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
  Easing,
  Alert
} from 'react-native';
import { Card } from 'react-native-elements';
import { useNavigation } from '@react-navigation/native';
import { db } from '../../config/firebaseConfig';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  where, 
  Timestamp 
} from 'firebase/firestore';

const AdminDashboard = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState({
    orders: false,
    menu: false,
    users: false
  });
  const [stats, setStats] = useState({
    menuCount: 0,
    todayOrdersCount: 0,
    totalOrdersCount: 0,
    userCount: 0,
    pendingOrdersCount: 0,
    completedOrdersCount: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());

  // Real-time listeners refs
  const unsubscribeRefs = useRef([]);

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
    totalOrdersCount: new Animated.Value(0),
    userCount: new Animated.Value(0),
    pendingOrdersCount: new Animated.Value(0),
    completedOrdersCount: new Animated.Value(0)
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

  // Check if all data is loaded
  const checkDataLoaded = (newDataLoaded) => {
    if (newDataLoaded.orders && newDataLoaded.menu && newDataLoaded.users) {
      console.log('✅ All data loaded, hiding loading screen');
      setLoading(false);
    }
  };

  // Animate numbers counting up
  const animateNumbers = (newStats) => {
    Object.keys(numberCounters).forEach(key => {
      if (newStats[key] !== undefined) {
        Animated.timing(numberCounters[key], {
          toValue: newStats[key],
          duration: 1000, // Reduced duration for faster response
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }).start();
      }
    });
  };

  // Animate cards entrance
  const animateCardsEntrance = () => {
    const animations = cardAnimations.slice(0, 6).map((cardAnim, index) => {
      return Animated.parallel([
        Animated.timing(cardAnim.scale, {
          toValue: 1,
          duration: 400, // Faster animation
          delay: index * 50, // Reduced delay
          easing: Easing.elastic(1.1),
          useNativeDriver: true,
        }),
        Animated.timing(cardAnim.opacity, {
          toValue: 1,
          duration: 300,
          delay: index * 50,
          useNativeDriver: true,
        }),
        Animated.timing(cardAnim.translateY, {
          toValue: 0,
          duration: 350,
          delay: index * 50,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        })
      ]);
    });

    Animated.stagger(40, animations).start();
  };

  // Animate order cards
  const animateOrderCards = (orderCount) => {
    initializeCardAnimations(orderCount + 6);
    
    const orderAnimations = cardAnimations.slice(6, 6 + orderCount).map((cardAnim, index) => {
      cardAnim.scale.setValue(0);
      cardAnim.opacity.setValue(0);
      cardAnim.translateY.setValue(20);
      
      return Animated.parallel([
        Animated.timing(cardAnim.scale, {
          toValue: 1,
          duration: 300,
          delay: index * 60,
          easing: Easing.out(Easing.back(1.05)),
          useNativeDriver: true,
        }),
        Animated.timing(cardAnim.opacity, {
          toValue: 1,
          duration: 250,
          delay: index * 60,
          useNativeDriver: true,
        }),
        Animated.timing(cardAnim.translateY, {
          toValue: 0,
          duration: 300,
          delay: index * 60,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      ]);
    });

    Animated.stagger(30, orderAnimations).start();
  };

  // Pulse animation for loading
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
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
        duration: 1500,
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
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 550,
        easing: Easing.out(Easing.back(1.05)),
        useNativeDriver: true,
      })
    ]).start(() => {
      animateCardsEntrance();
    });
  };

  // Setup real-time listeners
  const setupRealTimeListeners = () => {
    // Clear existing listeners
    unsubscribeRefs.current.forEach(unsubscribe => unsubscribe());
    unsubscribeRefs.current = [];

    try {
      // 1. Real-time listener for ORDERS
      const ordersRef = collection(db, 'orders');
      const ordersQuery = query(ordersRef, orderBy('createdAt', 'desc'));
      
      const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
        console.log('🔄 Orders updated - Count:', snapshot.docs.length);
        
        const allOrders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : new Date()
        }));
        
        setRecentOrders(allOrders);
        
        // Calculate order statistics
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todaysOrders = allOrders.filter(order => {
          const orderDate = order.createdAt;
          return orderDate >= today;
        });
        
        const pendingOrders = allOrders.filter(order => order.status === 'pending');
        const completedOrders = allOrders.filter(order => order.status === 'completed');
        
        setStats(prevStats => {
          const newStats = {
            ...prevStats,
            todayOrdersCount: todaysOrders.length,
            totalOrdersCount: allOrders.length,
            pendingOrdersCount: pendingOrders.length,
            completedOrdersCount: completedOrders.length
          };
          animateNumbers(newStats);
          setLastUpdateTime(new Date());
          return newStats;
        });
        
        // Mark orders as loaded
        setDataLoaded(prev => {
          const newDataLoaded = { ...prev, orders: true };
          checkDataLoaded(newDataLoaded);
          return newDataLoaded;
        });
        
        // Animate order cards after a short delay
        setTimeout(() => {
          animateOrderCards(Math.min(allOrders.length, 5));
        }, 200);
      }, (error) => {
        console.error("❌ Error in orders listener:", error);
        Alert.alert('Error', 'Gagal memuat data pesanan real-time');
        setDataLoaded(prev => ({ ...prev, orders: true })); // Mark as loaded even on error
      });
      
      unsubscribeRefs.current.push(unsubscribeOrders);

      // 2. Real-time listener for MENU (FOODS)
      const foodsRef = collection(db, 'foods');
      const foodsQuery = query(foodsRef, orderBy('name', 'asc'));
      
      const unsubscribeFoods = onSnapshot(foodsQuery, (snapshot) => {
        console.log('🔄 Menu updated - Count:', snapshot.docs.length);
        
        setStats(prevStats => {
          const newStats = {
            ...prevStats,
            menuCount: snapshot.docs.length
          };
          animateNumbers(newStats);
          setLastUpdateTime(new Date());
          return newStats;
        });

        // Mark menu as loaded
        setDataLoaded(prev => {
          const newDataLoaded = { ...prev, menu: true };
          checkDataLoaded(newDataLoaded);
          return newDataLoaded;
        });
      }, (error) => {
        console.error("❌ Error in foods listener:", error);
        Alert.alert('Error', 'Gagal memuat data menu real-time');
        setDataLoaded(prev => ({ ...prev, menu: true })); // Mark as loaded even on error
      });
      
      unsubscribeRefs.current.push(unsubscribeFoods);

      // 3. Real-time listener for USERS
      const usersRef = collection(db, 'users');
      const usersQuery = query(usersRef, orderBy('createdAt', 'desc'));
      
      const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
        console.log('🔄 Users updated - Count:', snapshot.docs.length);
        
        setStats(prevStats => {
          const newStats = {
            ...prevStats,
            userCount: snapshot.docs.length
          };
          animateNumbers(newStats);
          setLastUpdateTime(new Date());
          return newStats;
        });

        // Mark users as loaded
        setDataLoaded(prev => {
          const newDataLoaded = { ...prev, users: true };
          checkDataLoaded(newDataLoaded);
          return newDataLoaded;
        });
      }, (error) => {
        console.error("❌ Error in users listener:", error);
        Alert.alert('Error', 'Gagal memuat data user real-time');
        setDataLoaded(prev => ({ ...prev, users: true })); // Mark as loaded even on error
      });
      
      unsubscribeRefs.current.push(unsubscribeUsers);

      console.log('✅ All real-time listeners setup successfully');

      // Fallback timeout to ensure loading stops even if data is slow
      setTimeout(() => {
        if (loading) {
          console.log('⏰ Timeout reached, stopping loading');
          setLoading(false);
        }
      }, 10000); // 10 second timeout

    } catch (error) {
      console.error("❌ Error setting up real-time listeners:", error);
      Alert.alert('Error', 'Gagal mengatur monitoring real-time');
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🚀 AdminDashboard mounted, initializing...');
    
    // Initialize card animations
    initializeCardAnimations(12);
    
    // Start loading animations
    startPulseAnimation();
    startRotateAnimation();

    // Setup all real-time listeners immediately
    setupRealTimeListeners();
    
    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up real-time listeners');
      unsubscribeRefs.current.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      console.log('✨ Starting entrance animation');
      startEntranceAnimation();
    }
  }, [loading]);

  // Debug effect to track loading state
  useEffect(() => {
    console.log('📊 Data loaded state:', dataLoaded);
    console.log('⏳ Loading state:', loading);
  }, [dataLoaded, loading]);

  // Navigation handlers
  const handleNavigateToOrders = () => {
    navigation.navigate('Orders');
  };

  const handleNavigateToMenu = () => {
    navigation.navigate('MenuManagement');
  };

  const handleNavigateToUsers = () => {
    navigation.navigate('UserManagement');
  };

  // Utility functions
  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatLastUpdate = (date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const renderOrderItem = ({ item, index }) => {
    const cardIndex = index + 6;
    const cardAnimation = cardAnimations[cardIndex] || { 
      scale: new Animated.Value(1), 
      opacity: new Animated.Value(1), 
      translateY: new Animated.Value(0) 
    };
    
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
            <Text style={styles.customerName}>Customer: {item.userName || 'Unknown'}</Text>
            <Text style={styles.orderItems}>
              Items: {item.items?.map(food => `${food.quantity}x ${food.name}`).join(', ') || 'No items'}
            </Text>
            <Text style={styles.orderTotal}>Total: Rp {item.totalAmount?.toLocaleString() || '0'}</Text>
          </View>
          
          <View style={styles.orderStatusContainer}>
            <Text style={[
              styles.orderStatus, 
              item.status === 'completed' ? styles.statusCompleted : 
              item.status === 'processing' ? styles.statusProcessing : 
              styles.statusPending
            ]}>
              {(item.status || 'pending').toUpperCase()}
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
          Memuat dashboard real-time...
        </Animated.Text>
        <Text style={styles.loadingSubText}>
          {dataLoaded.orders ? '✅' : '⏳'} Pesanan {' '}
          {dataLoaded.menu ? '✅' : '⏳'} Menu {' '}
          {dataLoaded.users ? '✅' : '⏳'} Pengguna
        </Text>
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
        Dashboard Admin (Real-time)
      </Animated.Text>

      {/* Last Update Time */}
      <Animated.Text 
        style={[
          styles.lastUpdateText,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        Terakhir diperbarui: {formatLastUpdate(lastUpdateTime)}
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
        {/* First Row - Menu and Today's Orders */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={handleNavigateToMenu} style={styles.halfCard}>
            <Animated.View 
              style={[
                styles.statCard,
                styles.menuCard,
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
                {Math.round(numberCounters.menuCount._value)} Menu
              </Animated.Text>
            </Animated.View>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleNavigateToOrders} style={styles.halfCard}>
            <Animated.View 
              style={[
                styles.statCard,
                styles.todayOrdersCard,
                {
                  transform: [
                    { scale: cardAnimations[1]?.scale || new Animated.Value(1) },
                    { translateY: cardAnimations[1]?.translateY || new Animated.Value(0) }
                  ],
                  opacity: cardAnimations[1]?.opacity || new Animated.Value(1)
                }
              ]}
            >
              <Text style={styles.cardTitle}>Pesanan Hari Ini</Text>
              <Animated.Text style={styles.cardNumber}>
                {Math.round(numberCounters.todayOrdersCount._value)} Pesanan
              </Animated.Text>
            </Animated.View>
          </TouchableOpacity>
        </View>
        
        {/* Second Row - Total Orders and Users */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={handleNavigateToOrders} style={styles.halfCard}>
            <Animated.View 
              style={[
                styles.statCard,
                styles.totalOrdersCard,
                {
                  transform: [
                    { scale: cardAnimations[2]?.scale || new Animated.Value(1) },
                    { translateY: cardAnimations[2]?.translateY || new Animated.Value(0) }
                  ],
                  opacity: cardAnimations[2]?.opacity || new Animated.Value(1)
                }
              ]}
            >
              <Text style={styles.cardTitle}>Total Pesanan</Text>
              <Animated.Text style={styles.cardNumber}>
                {Math.round(numberCounters.totalOrdersCount._value)} Pesanan
              </Animated.Text>
            </Animated.View>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleNavigateToUsers} style={styles.halfCard}>
            <Animated.View 
              style={[
                styles.statCard,
                styles.usersCard,
                {
                  transform: [
                    { scale: cardAnimations[3]?.scale || new Animated.Value(1) },
                    { translateY: cardAnimations[3]?.translateY || new Animated.Value(0) }
                  ],
                  opacity: cardAnimations[3]?.opacity || new Animated.Value(1)
                }
              ]}
            >
              <Text style={styles.cardTitle}>Total Pengguna</Text>
              <Animated.Text style={styles.cardNumber}>
                {Math.round(numberCounters.userCount._value)} Pengguna
              </Animated.Text>
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Third Row - Order Status */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={handleNavigateToOrders} style={styles.halfCard}>
            <Animated.View 
              style={[
                styles.statCard,
                styles.pendingCard,
                {
                  transform: [
                    { scale: cardAnimations[4]?.scale || new Animated.Value(1) },
                    { translateY: cardAnimations[4]?.translateY || new Animated.Value(0) }
                  ],
                  opacity: cardAnimations[4]?.opacity || new Animated.Value(1)
                }
              ]}
            >
              <Text style={styles.cardTitle}>Pesanan Pending</Text>
              <Animated.Text style={styles.cardNumber}>
                {Math.round(numberCounters.pendingOrdersCount._value)} Pending
              </Animated.Text>
            </Animated.View>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleNavigateToOrders} style={styles.halfCard}>
            <Animated.View 
              style={[
                styles.statCard,
                styles.completedCard,
                {
                  transform: [
                    { scale: cardAnimations[5]?.scale || new Animated.Value(1) },
                    { translateY: cardAnimations[5]?.translateY || new Animated.Value(0) }
                  ],
                  opacity: cardAnimations[5]?.opacity || new Animated.Value(1)
                }
              ]}
            >
              <Text style={styles.cardTitle}>Pesanan Selesai</Text>
              <Animated.Text style={styles.cardNumber}>
                {Math.round(numberCounters.completedOrdersCount._value)} Selesai
              </Animated.Text>
            </Animated.View>
          </TouchableOpacity>
        </View>
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
            data={recentOrders.slice(0, 5)}
            renderItem={renderOrderItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
          />
        ) : (
          <Animated.View
            style={[
              {
                transform: [
                  { scale: cardAnimations[6]?.scale || new Animated.Value(1) },
                  { translateY: cardAnimations[6]?.translateY || new Animated.Value(0) }
                ],
                opacity: cardAnimations[6]?.opacity || new Animated.Value(1)
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
    textAlign: 'center',
  },
  loadingSubText: {
    marginTop: 10,
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 40,
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  lastUpdateText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  
  // Stats Container Styles
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
  
  // Card Color Variants
  menuCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4285F4',
  },
  todayOrdersCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#34A853',
  },
  totalOrdersCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#EA4335',
  },
  usersCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FBBC04',
  },
  pendingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  completedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
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