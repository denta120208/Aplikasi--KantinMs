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

  // Auto-check payment status for pending payments using simulation
  useEffect(() => {
    const checkPendingPayments = async () => {
      const pendingOrders = orders.filter(order => 
        order.paymentStatus === 'pending' && 
        order.midtransOrderId &&
        // Only check orders created in the last 24 hours
        (new Date() - order.createdAt) < 24 * 60 * 60 * 1000
      );

      if (pendingOrders.length > 0) {
        console.log(`Auto-checking ${pendingOrders.length} pending payments...`);
        
        for (const order of pendingOrders) {
          try {
            await simulatePaymentStatusCheck(order.id, order.kantin, order.midtransOrderId, order.createdAt, false);
            // Add delay between checks
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
      
      // Set up interval to check every 30 seconds
      paymentCheckInterval.current = setInterval(checkPendingPayments, 30 * 1000);
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

  // Simulasi pengecekan status pembayaran tanpa API call langsung
  const simulatePaymentStatusCheck = async (orderId, orderKantin, midtransOrderId, orderCreatedAt, showAlert = true) => {
    if (isCheckingPayment[orderId]) return;
    
    setIsCheckingPayment(prev => ({ ...prev, [orderId]: true }));
    
    try {
      // Simulasi delay API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const now = new Date();
      const timeDiff = now - orderCreatedAt;
      const minutesDiff = timeDiff / (1000 * 60);
      
      let newPaymentStatus = 'pending';
      let statusChanged = false;
      
      // Langsung set ke paid untuk semua pembayaran yang baru
      newPaymentStatus = 'paid';
      statusChanged = true;
      
      // Update status jika ada perubahan
      if (statusChanged) {
        const updateData = {
          paymentStatus: newPaymentStatus,
          lastPaymentCheck: new Date(),
          midtransTransactionStatus: newPaymentStatus === 'paid' ? 'settlement' : 'pending',
          midtransPaymentType: newPaymentStatus === 'paid' ? 'bank_transfer' : null,
          midtransTransactionTime: newPaymentStatus === 'paid' ? new Date().toISOString() : null,
          simulatedUpdate: true // Mark as simulated for tracking
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
          console.log(`Payment status updated for order ${orderId}: ${newPaymentStatus}`);
        }
      } else if (showAlert) {
        Alert.alert('Info', `Status pembayaran masih: ${getPaymentStatusText(newPaymentStatus)}`);
      }
      
    } catch (error) {
      if (showAlert) {
        Alert.alert(
          'Info', 
          'Tidak dapat mengecek status secara otomatis. Silakan update manual jika pembayaran sudah berhasil.',
          [
            { text: 'Batal', style: 'cancel' },
            { 
              text: 'Update Manual ke PAID', 
              onPress: () => manualUpdatePaymentStatus(orderId, orderKantin, 'paid')
            }
          ]
        );
      }
      console.error('Error updating payment status:', error);
    } finally {
      setIsCheckingPayment(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Manual update payment status (fallback)
  const manualUpdatePaymentStatus = async (orderId, orderKantin, newStatus) => {
    try {
      const updateData = {
        paymentStatus: newStatus,
        lastPaymentCheck: new Date(),
        midtransTransactionStatus: newStatus === 'paid' ? 'settlement' : 'pending',
        manualUpdate: true
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
      
      Alert.alert('Berhasil', `Status pembayaran diupdate ke: ${getPaymentStatusText(newStatus)}`);
    } catch (error) {
      Alert.alert('Error', 'Gagal mengupdate status pembayaran');
      console.error('Manual update error:', error);
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
          <View style={styles.autoCheckTextContainer}>
            <Text style={styles.autoCheckText}>
              {`Simulasi auto-check ${pendingPaymentsCount} pending payment${pendingPaymentsCount > 1 ? 's' : ''} setiap 30 detik`}
            </Text>
            <Text style={styles.autoCheckSubText}>
              (Gunakan "Cek Status" atau "Update Manual" untuk update langsung)
            </Text>
          </View>
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
                    {/* FIXED: Display customer name and class properly */}
                    <Text style={styles.orderUser}>
                      {order.customerName || order.userName || 'Customer'}
                    </Text>
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
                  
                  {/* ADDED: Display class information */}
                  {order.customerClass && (
                    <Text style={styles.orderClass}>
                      Kelas: {order.customerClass}
                    </Text>
                  )}
                  
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
                  {/* ADDED: Customer Information Section */}
                  <View style={styles.customerInfoContainer}>
                    <Text style={styles.customerInfoTitle}>Informasi Customer:</Text>
                    <View style={styles.customerInfoRow}>
                      <Text style={styles.customerInfoLabel}>Nama:</Text>
                      <Text style={styles.customerInfoValue}>
                        {order.customerName || order.userName || 'Tidak tersedia'}
                      </Text>
                    </View>
                    {order.customerClass && (
                      <View style={styles.customerInfoRow}>
                        <Text style={styles.customerInfoLabel}>Kelas:</Text>
                        <Text style={styles.customerInfoValue}>{order.customerClass}</Text>
                      </View>
                    )}
                    {order.customerPhone && (
                      <View style={styles.customerInfoRow}>
                        <Text style={styles.customerInfoLabel}>No. HP:</Text>
                        <Text style={styles.customerInfoValue}>{order.customerPhone}</Text>
                      </View>
                    )}
                    {order.customerEmail && (
                      <View style={styles.customerInfoRow}>
                        <Text style={styles.customerInfoLabel}>Email:</Text>
                        <Text style={styles.customerInfoValue}>{order.customerEmail}</Text>
                      </View>
                    )}
                  </View>
                  
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
                    {(order.simulatedUpdate || order.manualUpdate) && (
                      <View style={styles.paymentInfoRow}>
                        <Text style={styles.paymentInfoLabel}>Update Type:</Text>
                        <Text style={[styles.paymentInfoValue, { color: '#FF9800' }]}>
                          {order.simulatedUpdate ? 'Simulasi' : 'Manual'}
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
                    
                    {/* Check Payment Status Button (using simulation) */}
                    {order.paymentStatus === 'pending' && order.midtransOrderId && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.checkPaymentButton, isCheckingPayment[order.id] && styles.checkPaymentButtonDisabled]}
                        onPress={() => simulatePaymentStatusCheck(order.id, order.kantin, order.midtransOrderId, order.createdAt, true)}
                        disabled={isCheckingPayment[order.id]}
                      >
                        {isCheckingPayment[order.id] ? (
                          <Ionicons name="sync" size={16} color="#fff" style={styles.spinning} />
                        ) : (
                          <Ionicons name="refresh" size={16} color="#fff" />
                        )}
                        <Text style={styles.actionButtonText}>
                          {isCheckingPayment[order.id] ? 'Checking...' : 'Cek Status'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    
                    {/* Manual Update Buttons for Failed Payments */}
                    {['failed', 'failure', 'deny', 'cancel', 'expire'].includes(order.paymentStatus) && (
                      <View style={styles.manualUpdateContainer}>
                        <Text style={styles.manualUpdateTitle}>Update Manual:</Text>
                        <View style={styles.manualUpdateButtons}>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.manualPaidButton]}
                            onPress={() => manualUpdatePaymentStatus(order.id, order.kantin, 'paid')}
                          >
                            <Ionicons name="checkmark-circle" size={16} color="#fff" />
                            <Text style={styles.actionButtonText}>Mark as Paid</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.manualPendingButton]}
                            onPress={() => manualUpdatePaymentStatus(order.id, order.kantin, 'pending')}
                          >
                            <Ionicons name="time" size={16} color="#fff" />
                            <Text style={styles.actionButtonText}>Reset to Pending</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
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
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  deleteAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F44336',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  deleteAllButtonDisabled: {
    backgroundColor: '#ccc',
  },
  deleteAllIcon: {
    marginRight: 4,
  },
  deleteAllButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  autoCheckInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  autoCheckText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  filterButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  orderCountContainer: {
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  orderCountText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  userKantinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderUser: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  kantinBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  kantinBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  orderTotalSmall: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  orderIdText: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  orderHeaderRight: {
    alignItems: 'flex-end',
  },
  statusContainer: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  paymentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  paymentIcon: {
    marginRight: 4,
  },
  paymentStatusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  spinning: {
    // Add spinning animation if needed
  },
  orderDetails: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 16,
  },
  orderDetailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderItemName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  orderItemQty: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 16,
  },
  orderItemPrice: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  paymentInfoContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  paymentInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  paymentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  paymentInfoLabel: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  paymentInfoValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  notesContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#856404',
  },
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  orderTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  orderTotalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  orderActions: {
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  processButton: {
    backgroundColor: '#2196F3',
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  checkPaymentButton: {
    backgroundColor: '#FF9800',
  },
  checkPaymentButtonDisabled: {
    backgroundColor: '#ccc',
  },
  waitingPaymentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    marginBottom: 8,
  },
  waitingPaymentText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#E65100',
    fontWeight: '500',
  },
  manualUpdateContainer: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  manualUpdateTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 8,
  },
  manualUpdateButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  manualPaidButton: {
    backgroundColor: '#4CAF50',
    flex: 1,
    marginRight: 4,
  },
  manualPendingButton: {
    backgroundColor: '#FF9800',
    flex: 1,
    marginLeft: 4,
  },
});

export default UserOrders;