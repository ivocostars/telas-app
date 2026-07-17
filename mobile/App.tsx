import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { COLORS } from './src/config';
import { getToken } from './src/services/storage';
import { useAppStore } from './src/store';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import VenderScreen from './src/screens/VenderScreen';
import BuscarScreen from './src/screens/BuscarScreen';
import ListarScreen from './src/screens/ListarScreen';
import { RootStackParamList } from './src/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const DarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.primary,
    background: COLORS.bg,
    card: COLORS.bgCard,
    text: COLORS.text,
    border: COLORS.border,
    notification: COLORS.primary,
  },
};

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const token = useAppStore((s) => s.token);
  const setToken = useAppStore((s) => s.setToken);

  useEffect(() => {
    initAuth();
  }, []);

  async function initAuth() {
    try {
      const storedToken = await getToken();
      if (storedToken) {
        setToken(storedToken);
      }
    } catch {} finally {
      setInitializing(false);
    }
  }

  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primaryLight} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <NavigationContainer theme={DarkTheme}>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: COLORS.bg },
              animation: 'fade',
            }}
            initialRouteName={token ? 'Home' : 'Login'}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
              name="Scanner"
              component={ScannerScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Vender" component={VenderScreen} />
            <Stack.Screen name="Buscar" component={BuscarScreen} />
            <Stack.Screen name="Listar" component={ListarScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
});
