import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Alert,
  Linking,
  Platform
} from 'react-native';
// Conditional import for WebView - only import on mobile platforms
const WebView = Platform.OS === 'web' ? null : require('react-native-webview').WebView;

import { db } from '../../config/firebaseConfig';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs, 
  updateDoc,
  doc // Added this import
} from 'firebase/firestore';

const OrderForm = ({ route, navigation }) => {
  // Check if route.params exists before destructuring
  const { food, user } = route?.params || {};
  
  // If food or user is not available, display a message
  if (!food || !user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          No food information available. Please go back and select a food item.
        </Text>
        <TouchableOpacity
          style={styles.goBackButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.goBackButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [orderId, setOrderId] = useState('');
  const [firebaseOrderId, setFirebaseOrderId] = useState(''); // Added this state

  // FIXED: Get kantin info - REMOVE DEFAULT VALUE
  let kantin = food.canteen || food.kantin;
  
  // Validate kantin exists and is valid
  if (!kantin || !['A', 'B', 'C', 'D'].includes(kantin)) {
    console.error('Invalid kantin detected:', kantin);
    Alert.alert('Error', 'Data kantin tidak valid. Silakan pilih makanan kembali.');
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Data kantin tidak valid. Silakan kembali dan pilih makanan lagi.
        </Text>
        <TouchableOpacity
          style={styles.goBackButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.goBackButtonText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Debug log untuk memastikan kantin ter-detect dengan benar
  console.log('Food object:', food);
  console.log('food.canteen:', food.canteen);
  console.log('food.kantin:', food.kantin);
  console.log('Kantin detected:', kantin);

  const getKantinName = (kantinId) => {
    const kantinNames = {
      'A': 'Kantin A',
      'B': 'Kantin B', 
      'C': 'Kantin C',
      'D': 'Kantin D'
    };
    return kantinNames[kantinId] || `Kantin ${kantinId}`;
  };

  const getKantinColor = (kantinId) => {
    const colors = {
      'A': '#FF5722',
      'B': '#2196F3',
      'C': '#4CAF50',
      'D': '#9C27B0'
    };
    return colors[kantinId] || '#FF9800';
  };

  // Function to check payment status from Midtrans
  const checkPaymentStatus = async (orderId) => {
    try {
      // Midtrans Status Check API
      const statusUrl = `https://api.sandbox.midtrans.com/v2/${orderId}/status`;
      const serverKey = 'SB-Mid-server-wE-e3Dx5VmUYCzVXTuWzRH4P';
      
      const response = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(serverKey + ':')}`
        }
      });
      
      const result = await response.json();
      console.log('Payment status from Midtrans:', result); // Added debug log
      
      if (result.transaction_status) {
        return {
          status: result.transaction_status,
          paymentType: result.payment_type,
          fraudStatus: result.fraud_status
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error checking payment status:', error);
      return null;
    }
  };

  // FIXED: Function to update payment status in Firebase
  const updatePaymentStatusInFirebase = async (midtransOrderId, paymentStatus) => {
    try {
      console.log('Updating payment status for order:', midtransOrderId, 'to:', paymentStatus);
      
      // Update di koleksi kantin-specific
      const kantinCollectionName = `orders_kantin_${kantin.toLowerCase()}`;
      const kantinQuery = query(
        collection(db, kantinCollectionName),
        where('midtransOrderId', '==', midtransOrderId)
      );
      const kantinSnapshot = await getDocs(kantinQuery);
      
      let updateCount = 0;
      for (const docSnapshot of kantinSnapshot.docs) {
        await updateDoc(docSnapshot.ref, { 
          paymentStatus,
          status: paymentStatus === 'paid' ? 'confirmed' : 'pending' // Also update order status
        });
        updateCount++;
        console.log(`✅ Updated kantin order ${docSnapshot.id} with payment status: ${paymentStatus}`);
      }
      
      // Update di general orders collection
      const generalQuery = query(
        collection(db, 'orders'),
        where('midtransOrderId', '==', midtransOrderId)
      );
      const generalSnapshot = await getDocs(generalQuery);
      
      for (const docSnapshot of generalSnapshot.docs) {
        await updateDoc(docSnapshot.ref, { 
          paymentStatus,
          status: paymentStatus === 'paid' ? 'confirmed' : 'pending' // Also update order status
        });
        updateCount++;
        console.log(`✅ Updated general order ${docSnapshot.id} with payment status: ${paymentStatus}`);
      }
      
      console.log(`✅ Payment status updated successfully for ${updateCount} documents`);
      return updateCount > 0;
    } catch (error) {
      console.error('❌ Error updating payment status:', error);
      return false;
    }
  };

  // Function to create Midtrans payment
  const createPayment = async (orderData) => {
    try {
      // Generate unique order ID
      const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Midtrans Snap API endpoint (Sandbox)
      const midtransUrl = 'https://app.sandbox.midtrans.com/snap/v1/transactions';
      
      // Your server key from Midtrans dashboard
      const serverKey = 'SB-Mid-server-wE-e3Dx5VmUYCzVXTuWzRH4P'; // Replace with your actual server key
      
      const paymentData = {
        transaction_details: {
          order_id: orderId,
          gross_amount: orderData.totalAmount
        },
        customer_details: {
          first_name: orderData.userName.split(' ')[0] || 'Customer',
          last_name: orderData.userName.split(' ').slice(1).join(' ') || '',
          email: orderData.userEmail,
        },
        item_details: orderData.items.map(item => ({
          id: item.id,
          price: item.price,
          quantity: item.quantity,
          name: item.name
        })),
        credit_card: {
          secure: true
        },
        callbacks: {
          finish: Platform.OS === 'web' ? `${window.location.origin}/payment-success` : 'myapp://payment-success',
          error: Platform.OS === 'web' ? `${window.location.origin}/payment-error` : 'myapp://payment-error',
          pending: Platform.OS === 'web' ? `${window.location.origin}/payment-pending` : 'myapp://payment-pending'
        }
      };

      const response = await fetch(midtransUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(serverKey + ':')}`
        },
        body: JSON.stringify(paymentData)
      });

      const result = await response.json();
      
      if (result.token && result.redirect_url) {
        return {
          success: true,
          orderId: orderId,
          token: result.token,
          redirectUrl: result.redirect_url
        };
      } else {
        throw new Error(result.error_messages?.[0] || 'Failed to create payment');
      }
    } catch (error) {
      console.error('Payment creation error:', error);
      throw error;
    }
  };

  const handleSubmitOrder = async () => {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1) {
      Alert.alert('Error', 'Jumlah pesanan harus minimal 1');
      return;
    }

    // Validasi kantin sekali lagi
    if (!kantin || !['A', 'B', 'C', 'D'].includes(kantin)) {
      Alert.alert('Error', 'Data kantin tidak valid. Silakan pilih makanan kembali.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const orderData = {
        userId: user.uid,
        userName: user.displayName || user.email,
        userEmail: user.email,
        kantin: kantin,
        kantinName: getKantinName(kantin),
        items: [{
          id: food.id,
          name: food.name,
          price: food.price,
          quantity: qty,
          kantin: kantin
        }],
        totalAmount: food.price * qty,
        notes,
        status: 'pending',
        paymentStatus: 'pending', // Add payment status
        createdAt: serverTimestamp()
      };

      console.log('Creating payment for order:', orderData);

      // Create Midtrans payment
      const paymentResult = await createPayment(orderData);
      
      if (paymentResult.success) {
        // Add order ID from Midtrans
        orderData.midtransOrderId = paymentResult.orderId;
        orderData.paymentToken = paymentResult.token;
        
        // Store order in Firebase with payment info
        const kantinCollectionName = `orders_kantin_${kantin.toLowerCase()}`;
        
        try {
          const docRef = await addDoc(collection(db, kantinCollectionName), orderData);
          console.log(`✅ Order successfully added to ${kantinCollectionName} with ID:`, docRef.id);
          setFirebaseOrderId(docRef.id); // Store Firebase order ID
          
          // Also store in general orders collection
          try {
            const generalDocRef = await addDoc(collection(db, 'orders'), { ...orderData, firebaseOrderId: docRef.id });
            console.log('✅ Order also added to general orders collection with ID:', generalDocRef.id);
          } catch (generalError) {
            console.log('⚠️ General orders collection update failed, but kantin-specific order saved successfully');
          }
          
          // Handle payment differently for web and mobile
          if (Platform.OS === 'web') {
            // For web, open payment URL in new tab/window
            Alert.alert(
              'Pembayaran',
              'Anda akan diarahkan ke halaman pembayaran Midtrans. Setelah pembayaran selesai, kembali ke aplikasi ini.',
              [
                {
                  text: 'Buka Pembayaran',
                  onPress: () => {
                    window.open(paymentResult.redirectUrl, '_blank');
                    // Show order tracking info
                    setOrderId(paymentResult.orderId);
                    showPaymentInstructions();
                  }
                },
                {
                  text: 'Batal',
                  style: 'cancel'
                }
              ]
            );
          } else {
            // For mobile, show WebView
            setOrderId(paymentResult.orderId);
            setPaymentUrl(paymentResult.redirectUrl);
            setShowPayment(true);
          }
          
        } catch (kantinError) {
          console.error(`❌ Error adding to ${kantinCollectionName}:`, kantinError);
          throw new Error(`Collection ${kantinCollectionName} tidak ditemukan. Silakan hubungi admin.`);
        }
      }
    } catch (error) {
      console.error('Error creating order:', error);
      Alert.alert(
        'Error', 
        `Gagal membuat pesanan: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show payment instructions for web platform
  const showPaymentInstructions = () => {
    Alert.alert(
      'Pesanan Dibuat',
      `Pesanan Anda dengan ID ${orderId} telah dibuat. Silakan selesaikan pembayaran di tab yang baru dibuka. Setelah pembayaran selesai, cek status pesanan di menu "Pesanan Saya".`,
      [
        {
          text: 'Lihat Pesanan',
          onPress: () => navigation.navigate('UserOrdersScreen')
        },
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  // FIXED: Handle WebView navigation state changes (only for mobile)
  const handleNavigationStateChange = async (navState) => {
    console.log('Navigation state:', navState.url);
    
    // Check for payment completion URLs - improved detection
    if (navState.url.includes('payment-success') || 
        navState.url.includes('transaction_status=capture') ||
        navState.url.includes('transaction_status=settlement') ||
        navState.url.includes('/finish') ||
        navState.url.includes('status_code=200')) {
      
      // Add delay to ensure Midtrans has processed the payment
      setTimeout(() => {
        handlePaymentSuccess();
      }, 2000);
      
    } else if (navState.url.includes('payment-error') || 
               navState.url.includes('transaction_status=deny') ||
               navState.url.includes('transaction_status=cancel') ||
               navState.url.includes('/error')) {
      handlePaymentError();
    } else if (navState.url.includes('payment-pending') || 
               navState.url.includes('transaction_status=pending') ||
               navState.url.includes('/unfinish')) {
      handlePaymentPending();
    }
  };

  // FIXED: Updated handlePaymentSuccess function with better retry logic
  const handlePaymentSuccess = async () => {
    try {
      console.log('Processing payment success for order:', orderId);
      
      // Retry mechanism for checking payment status
      let paymentStatus = null;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!paymentStatus && retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Progressive delay
        paymentStatus = await checkPaymentStatus(orderId);
        retryCount++;
        console.log(`Payment status check attempt ${retryCount}:`, paymentStatus);
      }
      
      if (paymentStatus && ['capture', 'settlement'].includes(paymentStatus.status)) {
        // Update Firebase dengan status pembayaran yang tepat
        const updateSuccess = await updatePaymentStatusInFirebase(orderId, 'paid');
        
        if (updateSuccess) {
          Alert.alert(
            'Pembayaran Berhasil!',
            `Pembayaran untuk pesanan ${orderId} telah berhasil. Pesanan Anda sedang diproses.`,
            [
              { 
                text: 'Lihat Pesanan', 
                onPress: () => {
                  setShowPayment(false);
                  navigation.navigate('UserOrdersScreen');
                }
              },
              { 
                text: 'OK', 
                onPress: () => {
                  setShowPayment(false);
                  navigation.goBack();
                }
              }
            ]
          );
        } else {
          // If Firebase update failed, but payment was successful
          Alert.alert(
            'Pembayaran Berhasil!',
            'Pembayaran berhasil, namun ada masalah sinkronisasi data. Status akan diperbarui dalam beberapa saat.',
            [
              { 
                text: 'OK', 
                onPress: () => {
                  setShowPayment(false);
                  navigation.navigate('UserOrdersScreen');
                }
              }
            ]
          );
        }
      } else {
        // If status is still not confirmed, update Firebase anyway and let user know
        await updatePaymentStatusInFirebase(orderId, 'processing');
        
        Alert.alert(
          'Pembayaran Diproses',
          'Pembayaran Anda sedang diverifikasi. Status akan diperbarui dalam beberapa menit.',
          [
            { 
              text: 'Lihat Pesanan', 
              onPress: () => {
                setShowPayment(false);
                navigation.navigate('UserOrdersScreen');
              }
            },
            { 
              text: 'OK', 
              onPress: () => {
                setShowPayment(false);
                navigation.goBack();
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error in handlePaymentSuccess:', error);
      
      // Fallback: Update status to processing and show success message
      try {
        await updatePaymentStatusInFirebase(orderId, 'processing');
      } catch (updateError) {
        console.error('Failed to update payment status as fallback:', updateError);
      }
      
      Alert.alert(
        'Pembayaran Berhasil!',
        `Pembayaran untuk pesanan ${orderId} telah berhasil. Status akan diperbarui dalam beberapa saat.`,
        [
          { 
            text: 'Lihat Pesanan', 
            onPress: () => {
              setShowPayment(false);
              navigation.navigate('UserOrdersScreen');
            }
          },
          { 
            text: 'OK', 
            onPress: () => {
              setShowPayment(false);
              navigation.goBack();
            }
          }
        ]
      );
    }
  };

  const handlePaymentError = () => {
    Alert.alert(
      'Pembayaran Gagal',
      'Pembayaran tidak dapat diproses. Silakan coba lagi.',
      [
        { 
          text: 'Coba Lagi', 
          onPress: () => setShowPayment(false)
        },
        { 
          text: 'Batal', 
          onPress: () => {
            setShowPayment(false);
            navigation.goBack();
          }
        }
      ]
    );
  };

  const handlePaymentPending = async () => {
    // Update status to pending in Firebase
    await updatePaymentStatusInFirebase(orderId, 'pending');
    
    Alert.alert(
      'Pembayaran Tertunda',
      'Pembayaran Anda sedang diproses. Kami akan memberitahu Anda setelah pembayaran dikonfirmasi.',
      [
        { 
          text: 'OK', 
          onPress: () => {
            setShowPayment(false);
            navigation.goBack();
          }
        }
      ]
    );
  };

  const handleQuantityChange = (value) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setQuantity(numericValue || '1');
  };

  const incrementQuantity = () => {
    const currentQty = parseInt(quantity) || 0;
    setQuantity((currentQty + 1).toString());
  };

  const decrementQuantity = () => {
    const currentQty = parseInt(quantity) || 0;
    if (currentQty > 1) {
      setQuantity((currentQty - 1).toString());
    }
  };

  const totalPrice = food.price * (parseInt(quantity) || 0);

  // Show payment WebView if payment is initiated (mobile only)
  if (showPayment && paymentUrl && Platform.OS !== 'web' && WebView) {
    return (
      <View style={styles.container}>
        <View style={styles.paymentHeader}>
          <TouchableOpacity 
            style={styles.closePaymentButton}
            onPress={() => {
              Alert.alert(
                'Batalkan Pembayaran?',
                'Apakah Anda yakin ingin membatalkan pembayaran?',
                [
                  { text: 'Tidak', style: 'cancel' },
                  { 
                    text: 'Ya', 
                    onPress: () => {
                      setShowPayment(false);
                      navigation.goBack();
                    }
                  }
                ]
              );
            }}
          >
            <Text style={styles.closePaymentButtonText}>✕ Tutup</Text>
          </TouchableOpacity>
          <Text style={styles.paymentTitle}>Pembayaran - {orderId}</Text>
        </View>
        <WebView
          source={{ uri: paymentUrl }}
          onNavigationStateChange={handleNavigationStateChange}
          startInLoadingState={true}
          scalesPageToFit={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Image 
        source={{ uri: food.imageUrl || food.imageData }} 
        style={styles.foodImage}
        resizeMode="cover"
      />
      
      <View style={styles.content}>
        <View style={[styles.kantinBadge, { backgroundColor: getKantinColor(kantin) }]}>
          <Text style={styles.kantinBadgeText}>{getKantinName(kantin)}</Text>
        </View>
        
        <Text style={styles.foodName}>{food.name}</Text>
        <Text style={styles.foodPrice}>Rp {food.price.toLocaleString()}</Text>
        
        {food.description && (
          <Text style={styles.foodDescription}>{food.description}</Text>
        )}
        
        <View style={styles.formContainer}>
          <Text style={styles.formLabel}>Jumlah Pesanan</Text>
          <View style={styles.quantityContainer}>
            <TouchableOpacity 
              style={[styles.quantityButton, { opacity: parseInt(quantity) <= 1 ? 0.5 : 1 }]} 
              onPress={decrementQuantity}
              disabled={parseInt(quantity) <= 1}
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.quantityInput}
              value={quantity}
              onChangeText={handleQuantityChange}
              keyboardType="numeric"
              placeholder="1"
            />
            <TouchableOpacity 
              style={styles.quantityButton}
              onPress={incrementQuantity}
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.formLabel}>Catatan Tambahan (Opsional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Contoh: Tidak pedas, extra sayur, dll."
            multiline
            value={notes}
            onChangeText={setNotes}
            maxLength={200}
          />
          
          <View style={styles.orderSummary}>
            <Text style={styles.summaryTitle}>Ringkasan Pesanan</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{food.name}</Text>
              <Text style={styles.summaryValue}>x{quantity}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Kantin Tujuan</Text>
              <Text style={styles.summaryValue}>{getKantinName(kantin)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Harga per item</Text>
              <Text style={styles.summaryValue}>Rp {food.price.toLocaleString()}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Bayar:</Text>
              <Text style={styles.totalAmount}>
                Rp {totalPrice.toLocaleString()}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={[
              styles.orderButton, 
              { backgroundColor: getKantinColor(kantin) },
              isSubmitting && styles.orderButtonDisabled
            ]}
            onPress={handleSubmitOrder}
            disabled={isSubmitting}
          >
            <Text style={styles.orderButtonText}>
              {isSubmitting ? 'Memproses Pesanan...' : `💳 Bayar & Pesan ke ${getKantinName(kantin)}`}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.infoText}>
            {Platform.OS === 'web' 
              ? 'Anda akan diarahkan ke halaman pembayaran Midtrans di tab baru untuk menyelesaikan transaksi.'
              : 'Anda akan diarahkan ke halaman pembayaran Midtrans untuk menyelesaikan transaksi.'
            }
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  goBackButton: {
    backgroundColor: '#4285F4',
    padding: 12,
    borderRadius: 8,
  },
  goBackButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closePaymentButton: {
    padding: 8,
    backgroundColor: '#f44336',
    borderRadius: 5,
  },
  closePaymentButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  foodImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#eee',
  },
  content: {
    padding: 15,
  },
  kantinBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  kantinBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  foodName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  foodPrice: {
    fontSize: 20,
    color: '#4285F4',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  foodDescription: {
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    justifyContent: 'center',
  },
  quantityButton: {
    backgroundColor: '#4285F4',
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22.5,
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  quantityInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    marginHorizontal: 15,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    maxWidth: 80,
  },
  notesInput: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  orderSummary: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryLabel: {
    color: '#666',
  },
  summaryValue: {
    color: '#333',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 10,
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  orderButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  orderButtonDisabled: {
    opacity: 0.6,
  },
  orderButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default OrderForm;