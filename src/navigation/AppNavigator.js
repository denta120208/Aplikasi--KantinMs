import React, { useContext } from 'react';
// Import React dan useContext hook untuk mengakses AuthContext

import { NavigationContainer } from '@react-navigation/native';
// NavigationContainer: Container utama yang membungkus seluruh navigasi app

import { createStackNavigator } from '@react-navigation/stack';
// createStackNavigator: Membuat navigasi stack (layar bertumpuk)

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// createBottomTabNavigator: Membuat navigasi tab di bagian bawah layar

import { Ionicons } from '@expo/vector-icons';
// Ionicons: Library icon untuk menampilkan ikon di tab

// Import semua screen/halaman yang akan digunakan
import Login from '../screens/auth/Login';
import Register from '../screens/auth/Register'; // Screen registrasi user baru
import AdminDashboard from '../screens/admin/Dashboard';
import ManageFood from '../screens/admin/ManageFood';
import UserOrders from '../screens/admin/UserOrders';
import AdminProfile from '../screens/admin/Profile';
import UserHome from '../screens/user/Home';
import OrderForm from '../screens/user/OrderForm';
import UserProfile from '../screens/user/Profile';

// Import AuthContext untuk mengecek status login dan role user
import { AuthContext } from '../context/AuthContext';

// Membuat instance navigator
const Stack = createStackNavigator(); // Untuk navigasi stack
const Tab = createBottomTabNavigator(); // Untuk navigasi tab

// ===== ADMIN TAB NAVIGATOR =====
// Komponen navigasi tab khusus untuk admin
const AdminTabNavigator = () => {
  return (
    <Tab.Navigator
      // screenOptions: Konfigurasi untuk semua tab
      screenOptions={({ route }) => ({
        // tabBarIcon: Fungsi untuk menentukan ikon setiap tab
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          // Menentukan ikon berdasarkan nama route
          if (route.name === 'Dashboard') {
            // Jika tab Dashboard: ikon home (filled jika aktif, outline jika tidak)
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'ManageFood') {
            // Jika tab ManageFood: ikon fast-food
            iconName = focused ? 'fast-food' : 'fast-food-outline';
          } else if (route.name === 'UserOrders') {
            // Jika tab UserOrders: ikon list
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Profile') {
            // Jika tab Profile: ikon person
            iconName = focused ? 'person' : 'person-outline';
          }
          
          // Return komponen Ionicons dengan props yang diterima
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      {/* Mendefinisikan tab-tab untuk admin */}
      <Tab.Screen name="Dashboard" component={AdminDashboard} />
      <Tab.Screen name="ManageFood" component={ManageFood} />
      <Tab.Screen name="UserOrders" component={UserOrders} />
      <Tab.Screen name="Profile" component={AdminProfile} />
    </Tab.Navigator>
  );
};

// ===== USER TAB NAVIGATOR =====
// Komponen navigasi tab khusus untuk user biasa
const UserTabNavigator = () => {
  return (
    <Tab.Navigator
      // Konfigurasi serupa dengan admin tapi lebih sederhana
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          // User hanya punya 2 tab: Home dan Profile
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      {/* Tab untuk user biasa */}
      <Tab.Screen name="Home" component={UserHome} />
      <Tab.Screen name="Profile" component={UserProfile} />
    </Tab.Navigator>
  );
};

// ===== MAIN APP NAVIGATOR =====
// Komponen utama yang mengatur navigasi berdasarkan status login dan role
const AppNavigator = () => {
  // Mengambil data user dan loading state dari AuthContext
  const { user, loading } = useContext(AuthContext);

  // Jika masih loading, tidak render apapun (atau bisa loading screen)
  if (loading) {
    return null; // atau tampilkan loading screen
  }

  return (
    // NavigationContainer: Container utama yang harus membungkus semua navigator
    <NavigationContainer>
      {/* Stack Navigator untuk mengatur flow aplikasi */}
      <Stack.Navigator>
        {!user ? (
          // ===== JIKA USER BELUM LOGIN =====
          // Tampilkan screen Auth (Login & Register)
          <>
            <Stack.Screen 
              name="Login" 
              component={Login} 
              options={{ headerShown: false }} // Sembunyikan header
            />
            <Stack.Screen 
              name="Register" 
              component={Register} 
              options={{ headerShown: false }} // Sembunyikan header
            />
          </>
        ) : user.role === 'admin' ? (
          // ===== JIKA USER ADALAH ADMIN =====
          // Tampilkan AdminTabNavigator
          <Stack.Screen 
            name="AdminArea" 
            component={AdminTabNavigator} 
            options={{ headerShown: false }} // Sembunyikan header karena tab sudah punya header
          />
        ) : (
          // ===== JIKA USER ADALAH USER BIASA =====
          // Tampilkan UserTabNavigator + screen tambahan
          <>
            <Stack.Screen 
              name="UserArea" 
              component={UserTabNavigator} 
              options={{ headerShown: false }} // Sembunyikan header
            />
            {/* Screen OrderForm bisa diakses dari UserTabNavigator */}
            <Stack.Screen 
              name="OrderForm" 
              component={OrderForm} 
              options={{ title: 'Order Makanan' }} // Tampilkan header dengan title
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// Export komponen utama
export default AppNavigator;

