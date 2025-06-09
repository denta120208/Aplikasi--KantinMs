import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Screens
import Login from '../screens/auth/Login';
import Register from '../screens/auth/Register'; // Tambahkan import Register
import AdminDashboard from '../screens/admin/Dashboard';
import ManageFood from '../screens/admin/ManageFood';
import UserOrders from '../screens/admin/UserOrders';
import AdminProfile from '../screens/admin/Profile';
import UserHome from '../screens/user/Home';
import OrderForm from '../screens/user/OrderForm';
import UserProfile from '../screens/user/Profile';

// Context
import { AuthContext } from '../context/AuthContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Admin Tab Navigator
const AdminTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'ManageFood') {
            iconName = focused ? 'fast-food' : 'fast-food-outline';
          } else if (route.name === 'UserOrders') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboard} />
      <Tab.Screen name="ManageFood" component={ManageFood} />
      <Tab.Screen name="UserOrders" component={UserOrders} />
      <Tab.Screen name="Profile" component={AdminProfile} />
    </Tab.Navigator>
  );
};

// User Tab Navigator
const UserTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={UserHome} />
      <Tab.Screen name="Profile" component={UserProfile} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return null; // atau tampilkan loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!user ? (
          // Auth Stack - ketika user belum login
          <>
            <Stack.Screen 
              name="Login" 
              component={Login} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="Register" 
              component={Register} 
              options={{ headerShown: false }} 
            />
          </>
        ) : user.role === 'admin' ? (
          // Admin Stack
          <Stack.Screen 
            name="AdminArea" 
            component={AdminTabNavigator} 
            options={{ headerShown: false }}
          />
        ) : (
          // User Stack
          <>
            <Stack.Screen 
              name="UserArea" 
              component={UserTabNavigator} 
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="OrderForm" 
              component={OrderForm} 
              options={{ title: 'Order Makanan' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;