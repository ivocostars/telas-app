import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Modal,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../config';
import { login } from '../services/api';
import { saveToken, getServerUrl, saveServerUrl } from '../services/storage';
import { useAppStore } from '../store';
import { RootStackParamList } from '../types';

type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Login'
>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setToken = useAppStore((s) => s.setToken);

  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [serverInput, setServerInput] = useState('');
  const [serverUrl, setServerUrlState] = useState('');
  const [testing, setTesting] = useState(false);

  const fadeTitle = useRef(new Animated.Value(0)).current;
  const fadeSubtitle = useRef(new Animated.Value(0)).current;
  const fadeForm = useRef(new Animated.Value(0)).current;
  const fadeButton = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadServerUrl();
    Animated.sequence([
      Animated.timing(fadeTitle, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(fadeSubtitle, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(fadeForm, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(fadeButton, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  async function loadServerUrl() {
    const url = await getServerUrl();
    if (url) setServerUrlState(url);
  }

  function openServerModal() {
    setServerInput(serverUrl);
    setServerModalVisible(true);
  }

  async function handleTestConnection() {
    const url = serverInput.trim().replace(/\/+$/, '');
    if (!url) {
      Alert.alert('Error', 'Ingresá la URL del servidor');
      return;
    }
    setTesting(true);
    try {
      const res = await fetch(`${url}/health`);
      const data = await res.json();
      if (data.status === 'ok') {
        await saveServerUrl(url);
        setServerUrlState(url);
        Alert.alert('Conexión exitosa', `Servidor: ${url}\nTimezone: ${data.tz || 'N/A'}`);
        setServerModalVisible(false);
      } else {
        Alert.alert('Error', 'Respuesta inesperada del servidor');
      }
    } catch {
      Alert.alert('Error', 'No se pudo conectar al servidor.\nVerificá la URL y que el servidor esté corriendo.');
    } finally {
      setTesting(false);
    }
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Completá todos los campos');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await login(email.trim(), password.trim());
      await saveToken(res.token);
      setToken(res.token);
      navigation.replace('Home');
    } catch (e: any) {
      setError(e.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.gradientTop} />

      <View style={styles.content}>
        <Animated.View style={[styles.headerSection, { opacity: fadeTitle }]}>
          <Text style={styles.title}>Telas Scanner</Text>
        </Animated.View>

        <Animated.Text style={[styles.subtitle, { opacity: fadeSubtitle }]}>
          Control de Ingresos
        </Animated.Text>

        <Animated.View style={[styles.form, { opacity: fadeForm }]}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={COLORS.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor={COLORS.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </Animated.View>

        <Animated.View style={[styles.buttonContainer, { opacity: fadeButton }]}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <Text style={styles.buttonText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.serverLink} onPress={openServerModal}>
            <Text style={styles.serverLinkText}>
              ⚙️ Servidor: {serverUrl ? serverUrl.replace(/^https?:\/\//, '').replace(/\/api$/, '') : 'Configurar'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Modal
        visible={serverModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setServerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configurar Servidor</Text>
            <Text style={styles.modalSubtitle}>
              Ingresá la URL del backend (ej: http://192.168.1.100:4000/api)
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="http://192.168.1.100:4000/api"
              placeholderTextColor={COLORS.textMuted}
              value={serverInput}
              onChangeText={setServerInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <TouchableOpacity
              style={[styles.modalButton, testing && styles.modalButtonDisabled]}
              onPress={handleTestConnection}
              disabled={testing}
            >
              {testing ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <Text style={styles.modalButtonText}>Probar Conexión</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setServerModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: COLORS.primary,
    opacity: 0.15,
    borderBottomLeftRadius: 80,
    borderBottomRightRadius: 80,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 1,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 15,
    color: COLORS.textMuted,
    marginBottom: 40,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  error: {
    color: COLORS.error,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  buttonContainer: {
    marginTop: 32,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  serverLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  serverLinkText: {
    color: COLORS.textMuted,
    fontSize: 13,
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
  modalCancel: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  modalCancelText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});
