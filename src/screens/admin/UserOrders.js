import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../config/firebaseConfig';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';

const UserOrders = ({ route }) => {
  const [orders, setOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [selectedKantin, setSelectedKantin] = useState('all');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState({});
  
  // Use ref to store interval ID
  const paymentCheckInterval = useRef(null);
  
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

  // Auto-check payment status for pending payments
  useEffect(() => {
    const checkPendingPayments = async () => {
      const pendingOrders = orders.filter(order => 
        order.paymentStatus === 'pending' && 
        order.midtransOrderId &&
        // Only check orders created in the last 24 hours to avoid unnecessary API calls
        (new Date() - order.createdAt) < 24 * 60 * 60 * 1000
      );

      if (pendingOrders.length > 0) {
        console.log(`Auto-checking ${pendingOrders.length} pending payments...`);
        
        for (const order of pendingOrders) {
          try {
            await checkAndUpdatePaymentStatus(order.id, order.kantin, order.midtransOrderId, false);
            // Add delay between API calls to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`Auto-check failed for order ${order.id}:`, error);
          }
        }
      }
    };

    // Start auto-checking if there are pending orders
    const pendingCount = orders.filter(order => 
      order.paymentStatus === 'pending' && order.midtransOrderId
    ).length;
    
    if (pendingCount > 0) {
      // Check immediately
      checkPendingPayments();
      
      // Set up interval to check every 2 minutes
      paymentCheckInterval.current = setInterval(checkPendingPayments, 2 * 60 * 1000);
    } else {
      // Clear interval if no pending orders
      if (paymentCheckInterval.current) {
        clearInterval(paymentCheckInterval.current);
        paymentCheckInterval.current = null;
      }
    }

    // Cleanup interval on unmount or when orders change
    return () => {
      if (paymentCheckInterval.current) {
        clearInterval(paymentCheckInterval.current);
        paymentCheckInterval.current = null;
      }
    };
  }, [orders]);

  // FIXED: Function to check Midtrans payment status via backend proxy
  const checkMidtransPaymentStatus = async (midtransOrderId) => {
    try {
      // Instead of calling Midtrans directly, call your backend API
      // Replace 'YOUR_BACKEND_URL' with your actual backend URL
      const statusUrl = `YOUR_BACKEND_URL/api/check-payment-status/${midtransOrderId}`;
      
      const response = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add any authentication headers if needed
          // 'Authorization': `Bearer ${userToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error checking Midtrans status:', error);
      throw error;
    }
  };

  // Enhanced function to update payment status
  const checkAndUpdatePaymentStatus = async (orderId, orderKantin, midtransOrderId, showAlert = true) => {
    if (isCheckingPayment[orderId]) return; // Prevent multiple simultaneous checks
    
    setIsCheckingPayment(prev => ({ ...prev, [orderId]: true }));
    
    try {
      // Check status from Midtrans via backend
      const midtransStatus = await checkMidtransPaymentStatus(midtransOrderId);
      
      if (!midtransStatus) {
        if (showAlert) {
          Alert.alert('Error', 'Gagal mengecek status pembayaran dari Midtrans');
        }
        return;
      }
      
      let newPaymentStatus = 'pending';
      let statusChanged = false;
      
      // Map Midtrans status to internal status
      switch (midtransStatus.transaction_status) {
        case 'capture':
        case 'settlement':
          newPaymentStatus = 'paid';
          statusChanged = true;
          break;
        case 'pending':
          newPaymentStatus = 'pending';
          break;
        case 'deny':
        case 'cancel':
        case 'expire':
          newPaymentStatus = 'failed';
          statusChanged = true;
          break;
        case 'failure':
          newPaymentStatus = 'failed';
          statusChanged = true;
          break;
        default:
          newPaymentStatus = midtransStatus.transaction_status;
          statusChanged = true;
      }
      
      // Only update if status has changed
      if (statusChanged) {
        // Update in Firebase
        const updateData = {
          paymentStatus: newPaymentStatus,
          lastPaymentCheck: new Date(),
          midtransTransactionStatus: midtransStatus.transaction_status,
          midtransPaymentType: midtransStatus.payment_type || null,
          midtransTransactionTime: midtransStatus.transaction_time || null
        };

        // Update kantin-specific collection
        if (adminKantin !== 'all') {
          await updateDoc(doc(db, `orders_kantin_${adminKantin.toLowerCase()}`, orderId), updateData);
        }
        
        // Update general orders collection
        try {
          await updateDoc(doc(db, 'orders', orderId), updateData);
        } catch (generalError) {
          console.log('General orders update failed:', generalError);
        }
        
        if (showAlert) {
          const statusMessage = newPaymentStatus === 'paid' 
            ? '✅ Pembayaran berhasil dikonfirmasi!' 
            : `Status pembayaran diperbarui: ${getPaymentStatusText(newPaymentStatus)}`;
            
          Alert.alert('Status Updated', statusMessage);
        } else {
          // Silent update - just log
          console.log(`Payment status updated for order ${orderId}: ${newPaymentStatus}`);
        }
      } else if (showAlert) {
        Alert.alert('Info', `Status pembayaran masih: ${getPaymentStatusText(newPaymentStatus)}`);
      }
      
    } catch (error) {
      if (showAlert) {
        Alert.alert('Error', 'Gagal mengecek status pembayaran. Coba lagi nanti.');
      }
      console.error('Error updating payment status:', error);
    } finally {
      setIsCheckingPayment(prev => ({ ...prev, [orderId]: false }));
    }
  };

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

  // Get payment status color
  const getPaymentStatusColor = (paymentStatus) => {
    switch (paymentStatus) {
      case 'pending':
        return '#FFC107';
      case 'paid':
      case 'capture':
      case 'settlement':
        return '#4CAF50';
      case 'failed':
      case 'deny':
      case 'cancel':
      case 'expire':
      case 'failure':
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

  // Get payment status text
  const getPaymentStatusText = (paymentStatus) => {
    const statusTexts = {
      'pending': 'Menunggu Pembayaran',
      'paid': 'Sudah Dibayar',
      'capture': 'Sudah Dibayar',
      'settlement': 'Sudah Dibayar',
      'failed': 'Pembayaran Gagal',
      'failure': 'Pembayaran Gagal',
      'deny': 'Pembayaran Ditolak',
      'cancel': 'Pembayaran Dibatalkan',
      'expire': 'Pembayaran Expired'
    };
    return statusTexts[paymentStatus] || 'Status Tidak Dikenal';
  };

  // Get count of pending payments for display
  const pendingPaymentsCount = orders.filter(order => 
    order.paymentStatus === 'pending' && order.midtransOrderId
  ).length;

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

      {/* Auto-check payment status info */}
      {pendingPaymentsCount > 0 && (
        <View style={styles.autoCheckInfo}>
          <Ionicons name="information-circle" size={16} color="#4285F4" />
          <Text style={styles.autoCheckText}>
            {`Auto-checking ${pendingPaymentsCount} pending payment${pendingPaymentsCount > 1 ? 's' : ''} every 2 minutes`}
          </Text>
        </View>
      )}
      
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
                  {`Kantin ${kantin}`}
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
              {`${orders.length} pesanan ditemukan`}
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
                    {`Total: Rp ${order.totalAmount.toLocaleString()}`}
                  </Text>
                  
                  {/* Show Midtrans Order ID if available */}
                  {order.midtransOrderId && (
                    <Text style={styles.orderIdText}>
                      {`ID: ${order.midtransOrderId}`}
                    </Text>
                  )}
                </View>
                <View style={styles.orderHeaderRight}>
                  <View style={styles.statusContainer}>
                    {/* Order Status */}
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                      <Text style={styles.statusText}>{getStatusText(order.status)}</Text>
                    </View>
                    
                    {/* Payment Status */}
                    <View style={[
                      styles.paymentStatusBadge, 
                      { backgroundColor: getPaymentStatusColor(order.paymentStatus || 'pending') }
                    ]}>
                      {isCheckingPayment[order.id] ? (
                        <Ionicons name="sync" size={12} color="#fff" style={[styles.paymentIcon, styles.spinning]} />
                      ) : (
                        <Ionicons 
                          name={
                            ['paid', 'capture', 'settlement'].includes(order.paymentStatus) 
                              ? 'checkmark-circle' 
                              : order.paymentStatus === 'pending' 
                                ? 'time' 
                                : 'close-circle'
                          } 
                          size={12} 
                          color="#fff" 
                          style={styles.paymentIcon}
                        />
                      )}
                      <Text style={styles.paymentStatusText}>
                        {getPaymentStatusText(order.paymentStatus || 'pending')}
                      </Text>
                    </View>
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
                      <Text style={styles.orderItemQty}>{`x${item.quantity}`}</Text>
                      <Text style={styles.orderItemPrice}>{`Rp ${item.price.toLocaleString()}`}</Text>
                    </View>
                  ))}
                  
                  {/* Payment Information */}
                  <View style={styles.paymentInfoContainer}>
                    <Text style={styles.paymentInfoTitle}>Informasi Pembayaran:</Text>
                    <View style={styles.paymentInfoRow}>
                      <Text style={styles.paymentInfoLabel}>Status Pembayaran:</Text>
                      <Text style={[
                        styles.paymentInfoValue,
                        { color: getPaymentStatusColor(order.paymentStatus || 'pending') }
                      ]}>
                        {getPaymentStatusText(order.paymentStatus || 'pending')}
                      </Text>
                    </View>
                    {order.midtransOrderId && (
                      <View style={styles.paymentInfoRow}>
                        <Text style={styles.paymentInfoLabel}>Order ID:</Text>
                        <Text style={styles.paymentInfoValue}>{order.midtransOrderId}</Text>
                      </View>
                    )}
                    {order.paymentToken && (
                      <View style={styles.paymentInfoRow}>
                        <Text style={styles.paymentInfoLabel}>Token:</Text>
                        <Text style={styles.paymentInfoValue}>{`${order.paymentToken.substring(0, 20)}...`}</Text>
                      </View>
                    )}
                    {order.lastPaymentCheck && (
                      <View style={styles.paymentInfoRow}>
                        <Text style={styles.paymentInfoLabel}>Last Check:</Text>
                        <Text style={styles.paymentInfoValue}>
                          {formatDate(order.lastPaymentCheck.toDate ? order.lastPaymentCheck.toDate() : new Date(order.lastPaymentCheck))}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  {order.notes && (
                    <View style={styles.notesContainer}>
                      <Text style={styles.notesLabel}>Catatan:</Text>
                      <Text style={styles.notesText}>{order.notes}</Text>
                    </View>
                  )}
                  
                  <View style={styles.orderTotal}>
                    <Text style={styles.orderTotalLabel}>Total:</Text>
                    <Text style={styles.orderTotalAmount}>
                      {`Rp ${order.totalAmount.toLocaleString()}`}
                    </Text>
                  </View>
                  
                  <View style={styles.orderActions}>
                    {/* Only show action buttons if payment is successful */}
                    {['paid', 'capture', 'settlement'].includes(order.paymentStatus) && (
                      <>
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
                      </>
                    )}
                    
                    {/* Show waiting for payment message */}
                    {order.paymentStatus === 'pending' && (
                      <View style={styles.waitingPaymentContainer}>
                        <Ionicons name="time" size={20} color="#FFC107" />
                        <Text style={styles.waitingPaymentText}>
                          Menunggu pembayaran dari customer
                        </Text>
                      </View>
                    )}
                    
                    {/* Show payment failed message */}
                    {['failed', 'failure', 'deny', 'cancel', 'expire'].includes(order.paymentStatus) && (
                      <View style={styles.paymentFailedContainer}>
                        <Ionicons name="close-circle" size={20} color="#F44336" />
                        <Text style={styles.paymentFailedText}>
                          Pembayaran gagal atau dibatalkan
                        </Text>
                      </View>
                    )}

                    {/* Manual Payment Status Check Button */}
                    {order.midtransOrderId && (
                      <TouchableOpacity
                        style={[
                          styles.actionButton, 
                          styles.checkPaymentButton,
                          isCheckingPayment[order.id] && styles.checkPaymentButtonDisabled
                        ]}
                        onPress={() => checkAndUpdatePaymentStatus(order.id, order.kantin, order.midtransOrderId, true)}
                        disabled={isCheckingPayment[order.id]}
                      >
                        <Ionicons 
                          name={isCheckingPayment[order.id] ? "sync" : "refresh"} 
                          size={16} 
                          color="#fff" 
                          style={[
                            styles.refreshIcon,
                            isCheckingPayment[order.id] && styles.spinning
                          ]} 
                        />
                        <Text style={styles.actionButtonText}>
                          {isCheckingPayment[order.id] ? 'Checking...' : 'Cek Status Bayar'}
                        </Text>
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
  orderIdText: {
    color: '#888',
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  statusContainer: {
    alignItems: 'flex-end',
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  paymentStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentIcon: {
    marginRight: 3,
  },
  paymentStatusText: {
    color: '#fff',
    fontSize: 10,
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
  paymentInfoContainer: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4285F4',
  },
  paymentInfoTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    fontSize: 14,
  },
  paymentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  paymentInfoLabel: {
    color: '#666',
    fontSize: 12,
    flex: 1,
  },
  paymentInfoValue: {
    color: '#333',
    fontSize: 12,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  notesContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
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
  // NEW: Waiting payment container
  waitingPaymentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    flex: 1,
  },
  waitingPaymentText: {
    color: '#F57C00',
    marginLeft: 8,
    fontWeight: '500',
    fontSize: 12,
  },
  // NEW: Payment failed container
  paymentFailedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    flex: 1,
  },
  paymentFailedText: {
    color: '#C62828',
    marginLeft: 8,
    fontWeight: '500',
    fontSize: 12,
  },
});

export default UserOrders;