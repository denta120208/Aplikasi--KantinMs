import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Alert 
} from 'react-native';
import { db } from '../../config/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

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
        kantin: kantin, // Make sure kantin is properly set
        kantinName: getKantinName(kantin),
        items: [{
          id: food.id,
          name: food.name,
          price: food.price,
          quantity: qty,
          kantin: kantin // Also store kantin in item for reference
        }],
        totalAmount: food.price * qty,
        notes,
        status: 'pending',
        createdAt: serverTimestamp()
      };

      console.log('Sending order to collection:', `orders_kantin_${kantin.toLowerCase()}`);
      console.log('Order data:', orderData);

      // Primary: Store order in kantin-specific collection
      const kantinCollectionName = `orders_kantin_${kantin.toLowerCase()}`;
      
      try {
        await addDoc(collection(db, kantinCollectionName), orderData);
        console.log(`✅ Order successfully added to ${kantinCollectionName}`);
      } catch (kantinError) {
        console.error(`❌ Error adding to ${kantinCollectionName}:`, kantinError);
        
        // If kantin collection doesn't exist, show specific error
        if (kantinError.code === 'permission-denied' || kantinError.message.includes('collection')) {
          throw new Error(`Collection ${kantinCollectionName} tidak ditemukan. Silakan hubungi admin untuk membuat collection ini di Firebase.`);
        }
        throw kantinError;
      }
      
      // Secondary: Also store in general orders collection for overall tracking by super admin
      try {
        await addDoc(collection(db, 'orders'), orderData);
        console.log('✅ Order also added to general orders collection');
      } catch (generalError) {
        console.log('⚠️ General orders collection update failed, but kantin-specific order saved successfully');
        console.error(generalError);
      }
      
      Alert.alert(
        'Pesanan Berhasil!',
        `Pesanan Anda ke ${getKantinName(kantin)} telah dikirim dan sedang menunggu konfirmasi.`,
        [
          { 
            text: 'Lihat Pesanan', 
            onPress: () => {
              // Navigate to user orders screen if available
              navigation.navigate('UserOrdersScreen');
            }
          },
          { 
            text: 'OK', 
            onPress: () => navigation.goBack() 
          }
        ]
      );
    } catch (error) {
      console.error('Error adding order:', error);
      Alert.alert(
        'Error', 
        `Gagal mengirim pesanan ke ${getKantinName(kantin)}. 
        
Error: ${error.message}

Kemungkinan penyebab:
1. Collection orders_kantin_${kantin.toLowerCase()} belum dibuat di Firebase
2. Koneksi internet tidak stabil
3. Permissions Firebase belum diatur

Silakan hubungi admin atau coba lagi.`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
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
        
        {/* Enhanced Debug info */}
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>🔍 Debug Info:</Text>
          <Text style={styles.debugText}>food.canteen = "{food.canteen || 'undefined'}"</Text>
          <Text style={styles.debugText}>food.kantin = "{food.kantin || 'undefined'}"</Text>
          <Text style={styles.debugText}>✅ Final Kantin = "{kantin}"</Text>
          <Text style={styles.debugText}>📂 Collection: orders_kantin_{kantin.toLowerCase()}</Text>
          <Text style={styles.debugText}>🎯 Kantin Name: {getKantinName(kantin)}</Text>
        </View>
        
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
              {isSubmitting ? 'Memproses Pesanan...' : `Pesan ke ${getKantinName(kantin)}`}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.infoText}>
            Pesanan akan langsung dikirim ke {getKantinName(kantin)} dan akan diproses setelah dikonfirmasi oleh admin kantin.
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
  debugContainer: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#ffeb3b',
  },
  debugText: {
    fontSize: 11,
    color: '#856404',
    fontFamily: 'monospace',
    marginBottom: 2,
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