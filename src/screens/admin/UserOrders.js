import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../config/firebaseConfig';
import { collection, query, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';

const UserOrders = () => {
  const [orders, setOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      setOrders(ordersList);
    });
    
    return () => unsubscribe();
  }, []);

  const toggleExpand = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Gagal mengupdate status pesanan');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FFC107';
      case 'processing':
        return '#2196F3';
      case 'completed':
        return '#4CAF50';
      case 'cancelled':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  const formatDate = (date) => {
    return date.toLocaleString('id-ID', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Pesanan Pengguna</Text>
      
      {orders.length === 0 ? (
        <Text style={styles.emptyText}>Belum ada pesanan</Text>
      ) : (
        orders.map((order) => (
          <View key={order.id} style={styles.orderCard}>
            <TouchableOpacity 
              style={styles.orderHeader}
              onPress={() => toggleExpand(order.id)}
            >
              <View>
                <Text style={styles.orderUser}>{order.userName}</Text>
                <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
              </View>
              <View style={styles.orderHeaderRight}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={styles.statusText}>{order.status}</Text>
                </View>
                <Ionicons 
                  name={expandedOrderId === order.id ? 'chevron-up' : 'chevron-down'} 
                  size={24} 
                  color="#666"
                />
              </View>
            </TouchableOpacity>
            
            {expandedOrderId === order.id && (
              <View style={styles.orderDetails}>
                <Text style={styles.orderDetailTitle}>Detail Pesanan:</Text>
                {order.items.map((item, index) => (
                  <View key={index} style={styles.orderItem}>
                    <Text style={styles.orderItemName}>{item.name}</Text>
                    <Text style={styles.orderItemQty}>x{item.quantity}</Text>
                    <Text style={styles.orderItemPrice}>Rp {item.price.toLocaleString()}</Text>
                  </View>
                ))}
                <View style={styles.orderTotal}>
                  <Text style={styles.orderTotalLabel}>Total:</Text>
                  <Text style={styles.orderTotalAmount}>
                    Rp {order.totalAmount.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.orderActions}>
                  {order.status === 'pending' && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.processButton]}
                        onPress={() => updateOrderStatus(order.id, 'processing')}
                      >
                        <Text style={styles.actionButtonText}>Proses</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.cancelButton]}
                        onPress={() => updateOrderStatus(order.id, 'cancelled')}
                      >
                        <Text style={styles.actionButtonText}>Batal</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {order.status === 'processing' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.completeButton]}
                      onPress={() => updateOrderStatus(order.id, 'completed')}
                    >
                      <Text style={styles.actionButtonText}>Selesai</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
};

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
    emptyText: {
      textAlign: 'center',
      marginTop: 30,
      color: '#666',
    },
    orderCard: {
      backgroundColor: '#fff',
      borderRadius: 10,
      marginBottom: 15,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 3,
    },
    orderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 15,
      alignItems: 'center',
    },
    orderHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    orderUser: {
      fontWeight: 'bold',
      fontSize: 16,
    },
    orderDate: {
      color: '#666',
      fontSize: 12,
      marginTop: 5,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
      marginRight: 10,
    },
    statusText: {
      color: '#fff',
      fontSize: 12,
    },
    orderDetails: {
      padding: 15,
      borderTopWidth: 1,
      borderTopColor: '#eee',
    },
    orderDetailTitle: {
      fontWeight: 'bold',
      marginBottom: 10,
    },
    orderItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 5,
    },
    orderItemName: {
      flex: 2,
    },
    orderItemQty: {
      flex: 1,
      textAlign: 'center',
    },
    orderItemPrice: {
      flex: 1,
      textAlign: 'right',
    },
    orderTotal: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: '#eee',
    },
    orderTotalLabel: {
      fontWeight: 'bold',
    },
    orderTotalAmount: {
      fontWeight: 'bold',
    },
    orderActions: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: 15,
    },
    actionButton: {
      paddingVertical: 8,
      paddingHorizontal: 15,
      borderRadius: 5,
      minWidth: 100,
      alignItems: 'center',
    },
    processButton: {
      backgroundColor: '#2196F3',
    },
    completeButton: {
      backgroundColor: '#4CAF50',
    },
    cancelButton: {
      backgroundColor: '#F44336',
    },
    actionButtonText: {
      color: '#fff',
      fontWeight: 'bold',
    },
  });
  
  export default UserOrders;