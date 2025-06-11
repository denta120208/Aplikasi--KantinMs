import React, { useContext, useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  Alert, 
  Switch,
  Modal,
  TextInput,
  Dimensions,
  Animated,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { db } from '../../config/firebaseConfig';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

const { width } = Dimensions.get('window');

const UserProfile = () => {
  const { user, logout } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(user?.displayName || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [animatedValue] = useState(new Animated.Value(0));

  useEffect(() => {
    if (user?.uid) {
      const q = query(
        collection(db, 'orders'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const ordersList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        }));
        setOrders(ordersList);
        setLoading(false);
      });
      
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Konfirmasi Logout',
      'Apakah Anda yakin ingin keluar?',
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Gagal logout. Silakan coba lagi.');
            }
          }
        }
      ]
    );
  };

  const handleUpdateDisplayName = async () => {
    if (!newDisplayName.trim()) {
      Alert.alert('Error', 'Nama tidak boleh kosong');
      return;
    }

    setIsUpdating(true);
    try {
      await updateProfile(user, {
        displayName: newDisplayName.trim()
      });
      
      setIsEditModalVisible(false);
      Alert.alert('Berhasil', 'Nama berhasil diperbarui');
    } catch (error) {
      Alert.alert('Error', 'Gagal memperbarui nama');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: isDarkMode ? '#FFB74D' : '#FFC107',
      processing: isDarkMode ? '#64B5F6' : '#2196F3',
      completed: isDarkMode ? '#81C784' : '#4CAF50',
      cancelled: isDarkMode ? '#E57373' : '#F44336',
      default: isDarkMode ? '#BDBDBD' : '#757575'
    };
    return colors[status] || colors.default;
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

  const getStatusText = (status) => {
    const statusMap = {
      pending: 'Menunggu',
      processing: 'Diproses',
      completed: 'Selesai',
      cancelled: 'Dibatalkan'
    };
    return statusMap[status] || status;
  };

  const renderOrderItem = ({ item, index }) => (
    <Animated.View 
      style={[
        styles.orderCard, 
        isDarkMode && styles.orderCardDark,
        {
          opacity: animatedValue,
          transform: [{
            translateY: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0]
            })
          }]
        }
      ]}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderDateContainer}>
          <Ionicons 
            name="time-outline" 
            size={16} 
            color={isDarkMode ? '#BDBDBD' : '#666'} 
          />
          <Text style={[styles.orderDate, isDarkMode && styles.textDark]}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>
      
      <View style={styles.orderItems}>
        <View style={styles.itemsHeader}>
          <Ionicons 
            name="restaurant-outline" 
            size={16} 
            color={isDarkMode ? '#BDBDBD' : '#666'} 
          />
          <Text style={[styles.itemsTitle, isDarkMode && styles.textDark]}>
            Item Pesanan
          </Text>
        </View>
        {item.items.map((foodItem, index) => (
          <View key={index} style={styles.orderItem}>
            <Text style={[styles.itemName, isDarkMode && styles.textDark]}>
              {foodItem.name}
            </Text>
            <Text style={[styles.itemQuantity, isDarkMode && styles.textDark]}>
              x{foodItem.quantity}
            </Text>
          </View>
        ))}
      </View>
      
      <View style={styles.orderFooter}>
        <View style={styles.totalContainer}>
          <Ionicons 
            name="card-outline" 
            size={16} 
            color={isDarkMode ? '#4CAF50' : '#2E7D32'} 
          />
          <Text style={[styles.totalAmount, isDarkMode && styles.totalAmountDark]}>
            Total: Rp {item.totalAmount.toLocaleString()}
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor={currentTheme.headerBackground}
      />
      
      <Animated.View 
        style={[
          styles.header, 
          { backgroundColor: currentTheme.headerBackground },
          {
            opacity: animatedValue,
            transform: [{
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, 0]
              })
            }]
          }
        ]}
      >
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: currentTheme.headerText }]}>
            Profil Saya
          </Text>
          <View style={styles.themeToggle}>
            <Ionicons 
              name={isDarkMode ? 'sunny-outline' : 'moon-outline'} 
              size={20} 
              color={currentTheme.headerText} 
            />
            <Switch
              value={isDarkMode}
              onValueChange={setIsDarkMode}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={isDarkMode ? '#f5dd4b' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Ionicons 
              name="person-circle-outline" 
              size={100} 
              color={currentTheme.primary} 
            />
            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: currentTheme.primary }]}
              onPress={() => {
                setNewDisplayName(user?.displayName || '');
                setIsEditModalVisible(true);
              }}
            >
              <Ionicons name="pencil" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.name, { color: currentTheme.headerText }]}>
            {user?.displayName || 'Pengguna'}
          </Text>
          <Text style={[styles.email, { color: currentTheme.headerSubtext }]}>
            {user?.email}
          </Text>
        </View>
      </Animated.View>

      <View style={styles.ordersContainer}>
        <View style={styles.sectionHeader}>
          <Ionicons 
            name="receipt-outline" 
            size={24} 
            color={currentTheme.primary} 
          />
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
            Riwayat Pesanan
          </Text>
        </View>
        
        {loading ? (
          <View style={styles.centerContainer}>
            <Ionicons 
              name="hourglass-outline" 
              size={48} 
              color={currentTheme.secondary} 
            />
            <Text style={[styles.loadingText, { color: currentTheme.secondary }]}>
              Memuat pesanan...
            </Text>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons 
              name="bag-outline" 
              size={64} 
              color={currentTheme.secondary} 
            />
            <Text style={[styles.emptyText, { color: currentTheme.secondary }]}>
              Belum ada pesanan
            </Text>
            <Text style={[styles.emptySubtext, { color: currentTheme.secondary }]}>
              Mulai pesan makanan favoritmu!
            </Text>
          </View>
        ) : (
          <FlatList
            data={orders}
            renderItem={renderOrderItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            style={styles.ordersList}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}
      </View>

      <TouchableOpacity 
        style={[styles.logoutButton, { backgroundColor: currentTheme.danger }]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={24} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Edit Name Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
              Edit Nama
            </Text>
            
            <TextInput
              style={[
                styles.textInput, 
                { 
                  backgroundColor: currentTheme.inputBackground,
                  color: currentTheme.text,
                  borderColor: currentTheme.border
                }
              ]}
              value={newDisplayName}
              onChangeText={setNewDisplayName}
              placeholder="Masukkan nama baru"
              placeholderTextColor={currentTheme.secondary}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: currentTheme.primary }]}
                onPress={handleUpdateDisplayName}
                disabled={isUpdating}
              >
                <Text style={styles.saveButtonText}>
                  {isUpdating ? 'Menyimpan...' : 'Simpan'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const lightTheme = {
  background: '#f8f9fa',
  cardBackground: '#ffffff',
  headerBackground: '#4285F4',
  headerText: '#ffffff',
  headerSubtext: '#e3f2fd',
  text: '#212529',
  secondary: '#6c757d',
  primary: '#4285F4',
  danger: '#dc3545',
  border: '#dee2e6',
  inputBackground: '#ffffff'
};

const darkTheme = {
  background: '#121212',
  cardBackground: '#1e1e1e',
  headerBackground: '#1976D2',
  headerText: '#ffffff',
  headerSubtext: '#bbdefb',
  text: '#ffffff',
  secondary: '#9e9e9e',
  primary: '#2196F3',
  danger: '#f44336',
  border: '#333333',
  inputBackground: '#2c2c2c'
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  editButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
  },
  ordersContainer: {
    padding: 20,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 5,
  },
  ordersList: {
    flex: 1,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  orderCardDark: {
    backgroundColor: '#1e1e1e',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  orderDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderDate: {
    color: '#666',
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  orderItems: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  itemName: {
    flex: 1,
    fontSize: 15,
  },
  itemQuantity: {
    fontWeight: '600',
    fontSize: 15,
  },
  orderFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
    marginTop: 15,
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  totalAmount: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#2E7D32',
  },
  totalAmountDark: {
    color: '#4CAF50',
  },
  textDark: {
    color: '#ffffff',
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    margin: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 10,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: width * 0.9,
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default UserProfile;