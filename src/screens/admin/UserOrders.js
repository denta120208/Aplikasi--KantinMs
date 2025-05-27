import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../config/firebaseConfig';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';

const UserOrders = ({ route }) => {
  const [orders, setOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [selectedKantin, setSelectedKantin] = useState('all');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Get admin kantin from route params or default to 'all' for super admin
  const adminKantin = route?.params?.kantin || 'all';

  useEffect(() => {
    let q;
    
    // If admin is kantin-specific, only show orders from that kantin
    if (adminKantin !== 'all') {
      // Query kantin-specific collection
      q = query(
        collection(db, `orders_kantin_${adminKantin.toLowerCase()}`), 
        orderBy('createdAt', 'desc')
      );
    } else {
      // Super admin sees all orders from main collection
      q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    }
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let ordersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      
      // Additional filter for super admin if specific kantin is selected
      if (adminKantin === 'all' && selectedKantin !== 'all') {
        ordersList = ordersList.filter(order => order.kantin === selectedKantin);
      }
      
      setOrders(ordersList);
    });
    
    return () => unsubscribe();
  }, [adminKantin, selectedKantin]);

  const toggleExpand = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const updateOrderStatus = async (orderId, status, orderKantin) => {
    try {
      // Update in kantin-specific collection if admin is kantin-specific
      if (adminKantin !== 'all') {
        await updateDoc(doc(db, `orders_kantin_${adminKantin.toLowerCase()}`, orderId), {
          status
        });
      }
      
      // Always update in general orders collection for overall tracking
      try {
        await updateDoc(doc(db, 'orders', orderId), {
          status
        });
      } catch (generalError) {
        // Silent fail for general orders update
      }
      
    } catch (error) {
      alert('Gagal mengupdate status pesanan');
    }
  };

  const deleteAllOrders = async () => {
    Alert.alert(
      'Konfirmasi Hapus Semua Data',
      `Apakah Anda yakin ingin menghapus semua pesanan ${adminKantin === 'all' ? 'dari semua kantin' : `dari ${getKantinName(adminKantin)}`}?\n\nTindakan ini tidak dapat dibatalkan!`,
      [
        {
          text: 'Batal',
          style: 'cancel'
        },
        {
          text: 'Hapus Semua',
          style: 'destructive',
          onPress: confirmDeleteAll
        }
      ]
    );
  };

  const confirmDeleteAll = async () => {
    setIsDeleting(true);
    
    try {
      const batch = writeBatch(db);
      let deletedCount = 0;

      if (adminKantin !== 'all') {
        // Delete from kantin-specific collection
        const kantinQuery = query(collection(db, `orders_kantin_${adminKantin.toLowerCase()}`));
        const kantinSnapshot = await getDocs(kantinQuery);
        
        kantinSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
          deletedCount++;
        });

        // Also delete from general orders collection for this kantin
        const generalQuery = query(collection(db, 'orders'));
        const generalSnapshot = await getDocs(generalQuery);
        
        generalSnapshot.docs.forEach(doc => {
          const orderData = doc.data();
          if (orderData.kantin === adminKantin) {
            batch.delete(doc.ref);
          }
        });
      } else {
        // Super admin - delete from main collection
        let ordersToDelete = orders;
        
        // If specific kantin is selected, only delete those orders
        if (selectedKantin !== 'all') {
          ordersToDelete = orders.filter(order => order.kantin === selectedKantin);
        }
        
        ordersToDelete.forEach(order => {
          const orderRef = doc(db, 'orders', order.id);
          batch.delete(orderRef);
          deletedCount++;
        });

        // Also delete from kantin-specific collections if needed
        if (selectedKantin !== 'all') {
          const kantinQuery = query(collection(db, `orders_kantin_${selectedKantin.toLowerCase()}`));
          const kantinSnapshot = await getDocs(kantinQuery);
          
          kantinSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
        } else {
          // Delete from all kantin collections
          const kantinIds = ['a', 'b', 'c', 'd'];
          for (const kantinId of kantinIds) {
            try {
              const kantinQuery = query(collection(db, `orders_kantin_${kantinId}`));
              const kantinSnapshot = await getDocs(kantinQuery);
              
              kantinSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
              });
            } catch (error) {
              // Silent fail for individual kantin deletions
            }
          }
        }
      }

      await batch.commit();
      
      Alert.alert(
        'Berhasil!',
        `${deletedCount} pesanan telah dihapus.`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      Alert.alert(
        'Error',
        'Gagal menghapus pesanan. Silakan coba lagi.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsDeleting(false);
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

  const getKantinColor = (kantin) => {
    const colors = {
      'A': '#FF5722',
      'B': '#2196F3',
      'C': '#4CAF50',
      'D': '#9C27B0'
    };
    return colors[kantin] || '#757575';
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

  const getKantinName = (kantinId) => {
    const kantinNames = {
      'A': 'Kantin A',
      'B': 'Kantin B', 
      'C': 'Kantin C',
      'D': 'Kantin D'
    };
    return kantinNames[kantinId] || `Kantin ${kantinId}`;
  };

  const getStatusText = (status) => {
    const statusTexts = {
      'pending': 'Menunggu',
      'processing': 'Diproses',
      'completed': 'Selesai',
      'cancelled': 'Dibatalkan'
    };
    return statusTexts[status] || status;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>
          {adminKantin === 'all' ? 'Semua Pesanan' : `Pesanan ${getKantinName(adminKantin)}`}
        </Text>
        
        {/* Delete All Button */}
        {orders.length > 0 && (
          <TouchableOpacity
            style={[styles.deleteAllButton, isDeleting && styles.deleteAllButtonDisabled]}
            onPress={deleteAllOrders}
            disabled={isDeleting}
          >
            <Ionicons 
              name="trash-outline" 
              size={16} 
              color="#fff" 
              style={styles.deleteAllIcon}
            />
            <Text style={styles.deleteAllButtonText}>
              {isDeleting ? 'Menghapus...' : 'Hapus Semua'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Kantin Filter - only show for super admin */}
      {adminKantin === 'all' && (
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Filter Kantin:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedKantin === 'all' && styles.filterButtonActive
              ]}
              onPress={() => setSelectedKantin('all')}
            >
              <Text style={[
                styles.filterButtonText,
                selectedKantin === 'all' && styles.filterButtonTextActive
              ]}>
                Semua
              </Text>
            </TouchableOpacity>
            {['A', 'B', 'C', 'D'].map(kantin => (
              <TouchableOpacity
                key={kantin}
                style={[
                  styles.filterButton,
                  selectedKantin === kantin && styles.filterButtonActive,
                  { borderColor: getKantinColor(kantin) }
                ]}
                onPress={() => setSelectedKantin(kantin)}
              >
                <Text style={[
                  styles.filterButtonText,
                  selectedKantin === kantin && styles.filterButtonTextActive
                ]}>
                  Kantin {kantin}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            {adminKantin === 'all' 
              ? 'Belum ada pesanan' 
              : `Belum ada pesanan untuk ${getKantinName(adminKantin)}`
            }
          </Text>
        </View>
      ) : (
        <>
          {/* Order Count Info */}
          <View style={styles.orderCountContainer}>
            <Text style={styles.orderCountText}>
              {orders.length} pesanan ditemukan
            </Text>
          </View>
          
          {orders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <TouchableOpacity 
                style={styles.orderHeader}
                onPress={() => toggleExpand(order.id)}
              >
                <View>
                  <View style={styles.userKantinRow}>
                    <Text style={styles.orderUser}>{order.userName}</Text>
                    {order.kantin && adminKantin === 'all' && (
                      <View style={[
                        styles.kantinBadge, 
                        { backgroundColor: getKantinColor(order.kantin) }
                      ]}>
                        <Text style={styles.kantinBadgeText}>
                          {getKantinName(order.kantin)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                  <Text style={styles.orderTotalSmall}>
                    Total: Rp {order.totalAmount.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.orderHeaderRight}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
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
                  
                  {order.notes && (
                    <View style={styles.notesContainer}>
                      <Text style={styles.notesLabel}>Catatan:</Text>
                      <Text style={styles.notesText}>{order.notes}</Text>
                    </View>
                  )}
                  
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
                          onPress={() => updateOrderStatus(order.id, 'processing', order.kantin)}
                        >
                          <Text style={styles.actionButtonText}>Proses</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.cancelButton]}
                          onPress={() => updateOrderStatus(order.id, 'cancelled', order.kantin)}
                        >
                          <Text style={styles.actionButtonText}>Tolak</Text>
                        </TouchableOpacity>
                      </>
                    )}
                    {order.status === 'processing' && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.completeButton]}
                        onPress={() => updateOrderStatus(order.id, 'completed', order.kantin)}
                      >
                        <Text style={styles.actionButtonText}>Selesai</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          ))}
        </>
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
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  deleteAllButton: {
    backgroundColor: '#F44336',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  deleteAllButtonDisabled: {
    backgroundColor: '#ccc',
  },
  deleteAllIcon: {
    marginRight: 6,
  },
  deleteAllButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  orderCountContainer: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  orderCountText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  filterContainer: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
    backgroundColor: '#fff',
  },
  filterButtonActive: {
    backgroundColor: '#4285F4',
    borderColor: '#4285F4',
  },
  filterButtonText: {
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 10,
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
  userKantinRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderUser: {
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 10,
    color: '#333',
  },
  kantinBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  kantinBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  orderDate: {
    color: '#666',
    fontSize: 12,
    marginTop: 5,
  },
  orderTotalSmall: {
    color: '#4285F4',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 3,
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
    fontWeight: 'bold',
  },
  orderDetails: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  orderDetailTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    paddingVertical: 3,
  },
  orderItemName: {
    flex: 2,
    color: '#333',
  },
  orderItemQty: {
    flex: 1,
    textAlign: 'center',
    color: '#666',
  },
  orderItemPrice: {
    flex: 1,
    textAlign: 'right',
    color: '#333',
    fontWeight: '500',
  },
  notesContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 5,
  },
  notesLabel: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  notesText: {
    color: '#666',
    fontStyle: 'italic',
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
    fontSize: 16,
    color: '#333',
  },
  orderTotalAmount: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#4285F4',
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