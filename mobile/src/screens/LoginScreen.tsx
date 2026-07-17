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
import { COLORS, API_URL } from '../config';
import { login } from '../services/api';
import { saveToken } from '../services/storage';
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
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setToken = useAppStore((s) => s.setToken);

  const [showRecover, setShowRecover] = useState(false);
  const [recEmail, setRecEmail] = useState('');
  const [recCode, setRecCode] = useState('');
  const [recNewPw, setRecNewPw] = useState('');
  const [recShowPw, setRecShowPw] = useState(false);
  const [recLoading, setRecLoading] = useState(false);
  const [recMsg, setRecMsg] = useState('');

  const fadeTitle = useRef(new Animated.Value(0)).current;
  const fadeSubtitle = useRef(new Animated.Value(0)).current;
  const fadeForm = useRef(new Animated.Value(0)).current;
  const fadeButton = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeTitle, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(fadeSubtitle, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(fadeForm, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(fadeButton, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

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

  async function handleRecover() {
    if (!recEmail.trim() || !recCode.trim() || !recNewPw.trim()) {
      setRecMsg('Completá todos los campos');
      return;
    }
    if (recNewPw.length < 8 || !/[!@#$%^&*(),.?":{}|<>]/.test(recNewPw)) {
      setRecMsg('Mínimo 8 caracteres y 1 especial');
      return;
    }
    setRecLoading(true);
    setRecMsg('');
    try {
      const res = await fetch(`${API_URL}/auth/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recEmail.trim(), recoveryCode: recCode.trim(), newPassword: recNewPw }),
      });
      const data = await res.json();
      if (data.ok) {
        setRecMsg('✅ Contraseña restablecida');
        setTimeout(() => { setShowRecover(false); setRecMsg(''); setRecNewPw(''); setRecCode(''); }, 2000);
      } else {
        setRecMsg(data.error || 'Error');
      }
    } catch {
      setRecMsg('Error de conexión');
    } finally {
      setRecLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
          <View style={styles.pwRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Contraseña"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPw}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPw(!showPw)}>
              <Text style={styles.eyeIcon}>{showPw ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </Animated.View>

        <Animated.View style={[styles.buttonContainer, { opacity: fadeButton }]}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.buttonText}>Iniciar Sesión</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.forgotBtn} onPress={() => setShowRecover(true)}>
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Modal visible={showRecover} transparent animationType="fade" onRequestClose={() => setShowRecover(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Recuperar contraseña</Text>
              <Text style={styles.modalSub}>Usá el código de recuperación del servidor</Text>

              <TextInput style={styles.input} placeholder="Email" placeholderTextColor={COLORS.textMuted} value={recEmail} onChangeText={setRecEmail} keyboardType="email-address" autoCapitalize="none" />
              <TextInput style={styles.input} placeholder="Código de recuperación" placeholderTextColor={COLORS.textMuted} value={recCode} onChangeText={setRecCode} autoCapitalize="none" />
              
              <View style={styles.pwRow}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Nueva contraseña" placeholderTextColor={COLORS.textMuted} value={recNewPw} onChangeText={setRecNewPw} secureTextEntry={!recShowPw} />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setRecShowPw(!recShowPw)}>
                  <Text style={styles.eyeIcon}>{recShowPw ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>

              {recMsg ? <Text style={[styles.recMsg, recMsg.includes('✅') ? { color: COLORS.success } : { color: COLORS.error }]}>{recMsg}</Text> : null}

              <TouchableOpacity style={[styles.button, recLoading && styles.buttonDisabled]} onPress={handleRecover} disabled={recLoading}>
                {recLoading ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.buttonText}>Restablecer</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowRecover(false); setRecMsg(''); }}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  gradientTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 200, backgroundColor: COLORS.primary, opacity: 0.15, borderBottomLeftRadius: 80, borderBottomRightRadius: 80 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  headerSection: { alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 34, fontWeight: '700', color: COLORS.accent, letterSpacing: 1 },
  subtitle: { textAlign: 'center', fontSize: 15, color: COLORS.textMuted, marginBottom: 40, letterSpacing: 2, textTransform: 'uppercase' },
  form: { gap: 16 },
  input: { backgroundColor: COLORS.bgCard, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 16, fontSize: 16, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  pwRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  eyeBtn: { position: 'absolute', right: 12, padding: 8, zIndex: 10 },
  eyeIcon: { fontSize: 20 },
  error: { color: COLORS.error, fontSize: 14, textAlign: 'center', marginTop: 4 },
  buttonContainer: { marginTop: 32 },
  button: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: COLORS.text, fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  forgotBtn: { marginTop: 16, alignItems: 'center' },
  forgotText: { color: COLORS.textMuted, fontSize: 14, textDecorationLine: 'underline' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 32 },
  modalContent: { backgroundColor: COLORS.bgCard, borderRadius: 24, padding: 28, gap: 14, borderWidth: 1, borderColor: COLORS.border },
  modalTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  modalSub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginBottom: 4 },
  recMsg: { fontSize: 14, textAlign: 'center' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: COLORS.textMuted, fontSize: 14 },
});
