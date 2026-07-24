import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  TextInput,
  Modal,
  StatusBar,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../config';
import {
  getToken,
  getScannerName,
  saveScannerName,
  getServerUrl,
  saveServerUrl,
  removeToken,
  removeRefreshToken,
} from '../services/storage';
import { useAppStore } from '../store';
import { RootStackParamList } from '../types';
import { API_URL } from '../config';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const CARDS = [
  {
    key: 'scanner',
    icon: '📷',
    title: 'Escanear QR',
    description: 'Validar ingreso de espectadores',
  },
  {
    key: 'listar',
    icon: '📋',
    title: 'Lista',
    description: 'Ver todos los espectadores y reenviar QR',
  },
  {
    key: 'buscar',
    icon: '🔍',
    title: 'Consultar',
    description: 'Buscar si un espectador ya ingresó',
  },
  {
    key: 'dashboard',
    icon: '📊',
    title: 'Dashboard',
    description: 'Estadísticas en vivo del evento',
  },
  {
    key: 'vender',
    icon: '🎟️',
    title: 'Vender Entrada',
    description: 'Generar nuevo código QR',
  },
] as const;

export default function HomeScreen({ navigation }: Props) {
  const setScannerName = useAppStore((s) => s.setScannerName);
  const scannerName = useAppStore((s) => s.scannerName);
  const setToken = useAppStore((s) => s.setToken);

  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [nameInput, setNameInput] = useState('');


  const fadeValues = useRef(CARDS.map(() => new Animated.Value(0))).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkScannerName();
    startWaveAnimation();

    Animated.stagger(
      150,
      fadeValues.map((v) =>
        Animated.timing(v, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        })
      )
    ).start();
  }, []);

  async function handleUpdate() {
    const token = await getToken();
    if (!token) return;
    const url = `${API_URL}/apk/download?token=${encodeURIComponent(token)}`;
    Linking.openURL(url).catch(() => {});
  }

  function startWaveAnimation() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }

  async function checkScannerName() {
    const name = await getScannerName();
    if (name) {
      setScannerName(name);
    } else {
      setNameModalVisible(true);
    }
  }

  async function handleSaveName() {
    if (!nameInput.trim()) return;
    await saveScannerName(nameInput.trim());
    setScannerName(nameInput.trim());
    setNameModalVisible(false);
  }

  function handleCardPress(key: string) {
    switch (key) {
      case 'scanner':
        navigation.navigate('Scanner');
        break;
      case 'listar':
        navigation.navigate('Listar');
        break;
      case 'buscar':
        navigation.navigate('Buscar');
        break;
      case 'dashboard':
        navigation.navigate('Dashboard');
        break;
      case 'vender':
        navigation.navigate('Vender');
        break;
    }
  }

  async function handleLogout() {
    await removeToken();
    await removeRefreshToken();
    setToken(null);
    navigation.replace('Login');
  }

  const waveTranslateX = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 30],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <View style={styles.header}>
        <Animated.View
          style={[
            styles.wave,
            {
              transform: [{ translateX: waveTranslateX }],
            },
          ]}
        />
        <View style={styles.headerContent}>
          <Text style={styles.appName}>Muestra invernal</Text>
          <Text style={styles.headerSub}>🪩 de tela y aro ✨</Text>
        </View>
      </View>

      <View style={styles.cardsContainer}>
        {CARDS.map((card, index) => (
          <Animated.View
            key={card.key}
            style={[styles.cardWrapper, { opacity: fadeValues[index] }]}
          >
            <TouchableOpacity
              style={[
                styles.card,
                card.key === 'dashboard' && styles.cardDashboard,
                card.key === 'listar' && styles.cardListar,
                card.key === 'vender' && styles.cardVender,
              ]}
              onPress={() => handleCardPress(card.key)}
              activeOpacity={0.85}
            >
              <Text style={styles.cardIcon}>{card.icon}</Text>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardDescription}>{card.description}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      <View style={styles.footer}>
        {scannerName ? (
          <Text style={styles.footerText}>
            Scanner: <Text style={styles.footerHighlight}>{scannerName}</Text>
          </Text>
        ) : null}
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleUpdate}>
          <Text style={styles.updateText}>📲 Instalar última versión</Text>
        </TouchableOpacity>
        <Text style={styles.version}>v1.2.0</Text>
      </View>

      <Modal
        visible={nameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nombre del Scanner</Text>
            <Text style={styles.modalSubtitle}>
              Ingresá tu nombre para registrar quién valida cada ingreso
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej: Juan Carlos"
              placeholderTextColor={COLORS.textMuted}
              value={nameInput}
              onChangeText={setNameInput}
              autoFocus
            />
            <TouchableOpacity
              style={[
                styles.modalButton,
                !nameInput.trim() && styles.modalButtonDisabled,
              ]}
              onPress={handleSaveName}
              disabled={!nameInput.trim()}
            >
              <Text style={styles.modalButtonText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    backgroundColor: COLORS.bgCard,
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    paddingTop: 60,
    paddingBottom: 30,
    overflow: 'hidden',
  },
  wave: {
    position: 'absolute',
    bottom: -20,
    left: -40,
    right: 0,
    height: 60,
    backgroundColor: 'transparent',
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
    borderColor: COLORS.primary,
    borderWidth: 2,
    opacity: 0.3,
  },
  headerContent: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 32,
    fontWeight: '900',
    fontStyle: 'italic',
    color: COLORS.primaryLight,
    letterSpacing: 2,
    textShadowColor: COLORS.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  headerSub: {
    fontSize: 13,
    color: '#FFF',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
    textShadowColor: COLORS.primaryLight,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  cardsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    gap: 16,
  },
  cardWrapper: {
    flex: 1,
    maxHeight: 100,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  cardDashboard: {
    borderColor: COLORS.accent,
  },
  cardListar: {
    borderColor: '#10B981',
  },
  cardVender: {
    borderColor: COLORS.primaryLight,
  },
  cardIcon: {
    fontSize: 36,
    marginRight: 18,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '900',
    fontStyle: 'italic',
    color: COLORS.text,
    letterSpacing: 1,
    textShadowColor: COLORS.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 4,
  },
  footerText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  footerHighlight: {
    color: COLORS.primaryLight,
    fontWeight: '600',
  },
  logoutText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textDecorationLine: 'underline',
  },
  updateText: {
    fontSize: 13,
    color: COLORS.primaryLight,
    fontWeight: '600',
    marginTop: 4,
  },
  version: {
    fontSize: 11,
    color: COLORS.textMuted,
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalContent: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 24,
    padding: 28,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 20,
  },
  modalInput: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  modalCancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  modalCancelText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});
