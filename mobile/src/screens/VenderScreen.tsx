import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Linking,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../config';
import { createEspectador, sendEmail, getEventConfig } from '../services/api';
import { RootStackParamList } from '../types';

type VenderScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Vender'
>;

interface Props {
  navigation: VenderScreenNavigationProp;
}

interface FormData {
  nombreCompleto: string;
  email: string;
  telefono: string;
  silla_reservada: boolean;
  alumna_invitada: string;
}

interface TicketData {
  id: number;
  nombreCompleto: string;
  qrHash: string;
  email: string;
  telefono: string;
}

export default function VenderScreen({ navigation }: Props) {
  const [eventInfo, setEventInfo] = useState<{ date?: string; address?: string }>({});

  useEffect(() => {
    getEventConfig().then((cfg) => {
      if (cfg.eventDate || cfg.eventAddress) {
        setEventInfo({ date: cfg.eventDate, address: cfg.eventAddress });
      }
    }).catch(() => {});
  }, []);

  const [form, setForm] = useState<FormData>({
    nombreCompleto: '',
    email: '',
    telefono: '',
    silla_reservada: false,
    alumna_invitada: '',
  });
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const shotRef = useRef<any>(null);

  function updateField(field: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const isValid =
    form.nombreCompleto.trim().length > 0;

  async function handleGenerate() {
    if (!isValid) return;
    setLoading(true);
    try {
      const data = await createEspectador({
        nombreCompleto: form.nombreCompleto.trim(),
        email: form.email.trim() || undefined,
        telefono: form.telefono.trim() || undefined,
        silla: form.silla_reservada,
        alumnaInvitada: form.alumna_invitada,
        vendidoEnPuerta: true,
      });
      setTicket({
        id: data.id,
        nombreCompleto: form.nombreCompleto.trim(),
        qrHash: data.qrHash,
        email: form.email.trim(),
        telefono: form.telefono.trim(),
      });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo generar la entrada');
    } finally {
      setLoading(false);
    }
  }

  async function captureImage(): Promise<string> {
    if (!shotRef.current) throw new Error('Referencia no disponible');
    return shotRef.current.capture({ format: 'png', quality: 1 });
  }

  async function handleShare() {
    if (!ticket) return;
    try {
      const uri = await captureImage();
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: `Entrada - ${ticket.nombreCompleto}`,
      });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo compartir');
    }
  }

  async function handleWhatsApp() {
    if (!ticket || !ticket.telefono) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería para guardar el QR');
        return;
      }

      const uri = await captureImage();
      await MediaLibrary.createAssetAsync(uri);

      const digits = ticket.telefono.replace(/[^\d]/g, '');
      let phone = digits;
      if (digits.startsWith('54')) phone = digits;
      else if (digits.startsWith('15')) phone = '549' + digits.slice(2);
      else if (digits.startsWith('11')) phone = '549' + digits;
      else if (digits.length >= 10) phone = '549' + digits;

      let msg = `🎟️ *Entrada - Acrobacia en Telas*\n\n*Nombre:* ${ticket.nombreCompleto}`;
      if (eventInfo.date) msg += `\n📅 *Fecha:* ${eventInfo.date}`;
      if (eventInfo.address) msg += `\n📍 *Lugar:* ${eventInfo.address}`;
      const message = encodeURIComponent(msg);
      Linking.openURL(`https://wa.me/${phone}?text=${message}`).catch(() =>
        Alert.alert('QR guardado', `El QR se guardó en la galería. Abrí WhatsApp y adjuntalo manualmente.`)
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo completar');
    }
  }

  async function handleEmail() {
    if (!ticket || !ticket.email) return;
    try {
      await sendEmail(ticket.id);
      Alert.alert('Enviado', `El QR fue enviado a ${ticket.email}`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo enviar el email');
    }
  }

  function handleClear() {
    setForm({
      nombreCompleto: '',
      email: '',
      telefono: '',
      silla_reservada: false,
      alumna_invitada: '',
    });
    setTicket(null);
  }

  const hasEmail = !!ticket?.email;
  const hasPhone = !!ticket?.telefono;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Hidden capture view */}
      {ticket && (
        <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }} style={styles.hiddenCapture}>
          <View style={styles.captureCard}>
            <Text style={styles.captureTitle}>ACROBACIA EN TELAS</Text>
            <View style={styles.captureQrWrap}>
              <QRCode value={ticket.qrHash} size={280} backgroundColor="white" color="#000" />
            </View>
            <Text style={styles.captureName}>
              {ticket.nombreCompleto.toUpperCase()}
            </Text>
          </View>
        </ViewShot>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🎟️ Nueva Entrada</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Nombre *"
            placeholderTextColor={COLORS.textMuted}
            value={form.nombreCompleto}
            onChangeText={(v) => updateField('nombreCompleto', v)}
            autoCapitalize="words"
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={COLORS.textMuted}
            value={form.email}
            onChangeText={(v) => updateField('email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Teléfono"
            placeholderTextColor={COLORS.textMuted}
            value={form.telefono}
            onChangeText={(v) => updateField('telefono', v)}
            keyboardType="phone-pad"
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Silla reservada</Text>
            <Switch
              value={form.silla_reservada}
              onValueChange={(v) => updateField('silla_reservada', v)}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={form.silla_reservada ? COLORS.primaryLight : COLORS.textMuted}
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Alumna invitada (ej: Morena González)"
            placeholderTextColor={COLORS.textMuted}
            value={form.alumna_invitada}
            onChangeText={(v) => updateField('alumna_invitada', v)}
            autoCapitalize="words"
          />

          <TouchableOpacity
            style={[styles.generateButton, (!isValid || loading) && styles.buttonDisabled]}
            onPress={handleGenerate}
            disabled={!isValid || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <Text style={styles.generateButtonText}>GENERAR QR</Text>
            )}
          </TouchableOpacity>
        </View>

        {ticket && (
          <View style={styles.ticketCard}>
            <View style={styles.qrContainer}>
              <QRCode value={ticket.qrHash} size={200} backgroundColor="white" color={COLORS.bg} />
            </View>

            <Text style={styles.ticketName}>{ticket.nombreCompleto}</Text>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                <Text style={styles.actionIcon}>📤</Text>
                <Text style={styles.actionText}>Compartir QR</Text>
              </TouchableOpacity>

              {hasEmail && (
                <TouchableOpacity style={styles.actionButton} onPress={handleEmail}>
                  <Text style={styles.actionIcon}>✉️</Text>
                  <Text style={styles.actionText}>Enviar Email</Text>
                </TouchableOpacity>
              )}

              {hasPhone && (
                <TouchableOpacity style={styles.actionButton} onPress={handleWhatsApp}>
                  <Text style={styles.actionIcon}>📱</Text>
                  <Text style={styles.actionText}>Enviar WhatsApp</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.footerRow}>
              <TouchableOpacity style={styles.footerButton} onPress={() => navigation.goBack()}>
                <Text style={styles.footerButtonText}>← Volver</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerButtonPrimary} onPress={handleClear}>
                <Text style={styles.footerButtonPrimaryText}>Nueva Entrada</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: COLORS.bgCard,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  form: { padding: 20, gap: 14 },
  input: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    paddingHorizontal: 18, paddingVertical: 16,
    fontSize: 16, color: COLORS.text,
    borderWidth: 1, borderColor: COLORS.border,
  },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: 12,
    paddingHorizontal: 18, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  switchLabel: { fontSize: 16, color: COLORS.text },
  generateButton: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    marginTop: 6, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  generateButtonText: { color: COLORS.text, fontSize: 17, fontWeight: '800', letterSpacing: 1 },
  buttonDisabled: { opacity: 0.5 },
  ticketCard: {
    margin: 20, marginTop: 8, backgroundColor: COLORS.bgCard, borderRadius: 24,
    padding: 24, alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary,
  },
  qrContainer: { padding: 12, backgroundColor: '#fff', borderRadius: 16, marginBottom: 16 },
  ticketName: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  actionRow: { flexDirection: 'row', gap: 12, width: '100%' },
  actionButton: {
    flex: 1, backgroundColor: COLORS.bg, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  actionIcon: { fontSize: 20 },
  actionText: { color: COLORS.text, fontSize: 12, fontWeight: '600', marginTop: 4 },
  footerRow: { flexDirection: 'row', gap: 12, marginTop: 20, width: '100%' },
  footerButton: {
    flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  footerButtonText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  footerButtonPrimary: {
    flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center',
  },
  footerButtonPrimaryText: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  hiddenCapture: { position: 'absolute', left: -9999, top: 0 },
  captureCard: {
    alignItems: 'center', backgroundColor: '#fff', padding: 30, borderRadius: 20,
  },
  captureTitle: {
    fontSize: 14, fontWeight: '800', color: '#6C3CB5', letterSpacing: 3,
    marginBottom: 16,
  },
  captureQrWrap: { padding: 16, backgroundColor: '#fff', borderRadius: 12 },
  captureName: {
    fontSize: 22, fontWeight: '900', color: '#000', letterSpacing: 2,
    marginTop: 16, textAlign: 'center',
  },
});
