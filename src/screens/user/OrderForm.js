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

  const handleSubmitOrder = async () => {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1) {
      Alert.alert('Error', 'Jumlah pesanan harus minimal 1');
      return;
    }

    setIsSubmitting(true);
    try {
      const orderData = {
        userId: user.uid,
        userName: user.displayName || user.email,
        items: [{
          id: food.id,
          name: food.name,
          price: food.price,
          quantity: qty
        }],
        totalAmount: food.price * qty,
        notes,
        status: 'pending',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'orders'), orderData);
      Alert.alert(
        'Pesanan Berhasil',
        'Pesanan Anda telah dikirim dan akan segera diproses.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error adding order:', error);
      Alert.alert('Error', 'Gagal mengirim pesanan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuantityChange = (value) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setQuantity(numericValue);
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

  return (
    <ScrollView style={styles.container}>
      <Image 
        source={{ uri: food.imageUrl || food.imageData }} 
        style={styles.foodImage} 
      />
      
      <View style={styles.content}>
        <Text style={styles.foodName}>{food.name}</Text>
        <Text style={styles.foodPrice}>Rp {food.price.toLocaleString()}</Text>
        <Text style={styles.foodDescription}>{food.description}</Text>
        
        <View style={styles.formContainer}>
          <Text style={styles.formLabel}>Jumlah</Text>
          <View style={styles.quantityContainer}>
            <TouchableOpacity 
              style={styles.quantityButton} 
              onPress={decrementQuantity}
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.quantityInput}
              value={quantity}
              onChangeText={handleQuantityChange}
              keyboardType="numeric"
            />
            <TouchableOpacity 
              style={styles.quantityButton}
              onPress={incrementQuantity}
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.formLabel}>Catatan</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Catatan khusus untuk pesanan Anda"
            multiline
            value={notes}
            onChangeText={setNotes}
          />
          
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalAmount}>
              Rp {(food.price * (parseInt(quantity) || 0)).toLocaleString()}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.orderButton}
            onPress={handleSubmitOrder}
            disabled={isSubmitting}
          >
            <Text style={styles.orderButtonText}>
              {isSubmitting ? 'Memproses...' : 'Kirim Pesanan'}
            </Text>
          </TouchableOpacity>
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
  },
  content: {
    padding: 15,
  },
  foodName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  foodPrice: {
    fontSize: 18,
    color: '#4285F4',
    marginVertical: 5,
  },
  foodDescription: {
    color: '#666',
    marginBottom: 20,
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 15,
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
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  quantityButton: {
    backgroundColor: '#4285F4',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
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
    marginHorizontal: 10,
    padding: 8,
    backgroundColor: '#f2f2f2',
    borderRadius: 5,
  },
  notesInput: {
    backgroundColor: '#f2f2f2',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  orderButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  orderButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default OrderForm;