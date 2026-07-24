import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  StatusBar,
  ActivityIndicator,
  Modal,
  Alert,
  Linking,
  Platform,
  Switch,
  ScrollView,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../config';
import { getEspectadores, sendEmail, updateEspectador, deleteEspectador, type EspectadorListado, type CreateEspectadorData } from '../services/api';
import { RootStackParamList } from '../types';

type ListarScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Listar'
>;

interface Props {
  navigation: ListarScreenNavigationProp;
}

const PAGE_SIZE = 30;

export default function ListarScreen({ navigation }: Props) {
  const [spectators, setSpectators] = useState<EspectadorListado[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<EspectadorListado | null>(null);
  const [qrModal, setQrModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CreateEspectadorData>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sending, setSending] = useState(false);
  const shotRef = useRef<any>(null);

  useEffect(() => {
    fetchData(1, true);
  }, []);

  async function fetchData(p: number, replace: boolean) {
    try {
      const res = await getEspectadores({
        search: search || undefined,
        page: p,
        limit: PAGE_SIZE,
      });
      setSpectators(replace ? res.data : (prev) => [...prev, ...res.data]);
      setTotalPages(res.totalPages);
    } catch {
      Alert.alert('Error', 'No se pudo cargar la lista');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function handleSearch() {
    setLoading(true);
    setPage(1);
    fetchData(1, true);
  }

  function handleLoadMore() {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    const next = page + 1;
    setPage(next);
    fetchData(next, false);
  }

  function openQr(s: EspectadorListado) {
    setSelected(s);
    setQrModal(true);
  }

  function openEdit(s: EspectadorListado) {
    setSelected(s);
    setEditForm({
      email: s.email || '',
      telefono: s.telefono || '',
      silla: s.silla,
    });
    setEditModal(true);
  }

  async function handleSaveEdit() {
    if (!selected) return;
    Alert.alert(
      'Advertencia',
      '¿Estás seguro que querés modificar los datos de este espectador?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Grabar', style: 'destructive', onPress: async () => {
            setSaving(true);
            try {
              await updateEspectador(selected.id, editForm);
              Alert.alert('Éxito', 'Espectador modificado');
              setEditModal(false);
              fetchData(1, true);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'No se pudo guardar');
            } finally {
              setSaving(false);
            }
        }},
      ]
    );
  }

  async function handleDeleteEspectador() {
    if (!selected) return;
    Alert.alert(
      'ELIMINAR ESPECTADOR',
      `¿Eliminar a ${selected.nombreCompleto}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'ELIMINAR', style: 'destructive', onPress: async () => {
            setDeleting(true);
            try {
              await deleteEspectador(selected.id);
              Alert.alert('Éxito', 'Espectador eliminado');
              setEditModal(false);
              fetchData(1, true);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'No se pudo eliminar');
            } finally {
              setDeleting(false);
            }
        }},
      ]
    );
  }

  async function handleEmail() {
    if (!selected || !selected.email) return;
    setSending(true);
    try {
      await sendEmail(selected.id);
      Alert.alert('Enviado', `QR enviado a ${selected.email}`);
      setQrModal(false);
    } catch {
      Alert.alert('Error', 'No se pudo enviar el email');
    } finally {
      setSending(false);
    }
  }

  async function captureQr(): Promise<string> {
    if (!shotRef.current) throw new Error('Referencia no disponible');
    return shotRef.current.capture({ format: 'png', quality: 1 });
  }

  async function handleShare() {
    if (!selected) return;
    try {
      const uri = await captureQr();
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: `Entrada - ${selected.nombreCompleto}`,
      });
    } catch {
      Alert.alert('Error', 'No se pudo compartir');
    }
  }

  async function handleWhatsApp() {
    if (!selected || !selected.telefono) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería');
        return;
      }

      const uri = await captureQr();
      await MediaLibrary.createAssetAsync(uri);

      const digits = selected.telefono.replace(/[^\d]/g, '');
      let phone = digits;
      if (digits.startsWith('54')) phone = digits;
      else if (digits.startsWith('15')) phone = '549' + digits.slice(2);
      else if (digits.startsWith('11')) phone = '549' + digits;
      else if (digits.length >= 10) phone = '549' + digits;

      const msg = encodeURIComponent(
        `🎟️ *Entrada - Telas*\n\n*Nombre:* ${selected.nombreCompleto}`
      );
      Linking.openURL(`https://wa.me/${phone}?text=${msg}`).catch(() =>
        Alert.alert('QR guardado', 'El QR se guardó en la galería')
      );
    } catch {
      Alert.alert('Error', 'No se pudo completar');
    }
  }

  function renderItem({ item }: { item: EspectadorListado }) {
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => openQr(item)}
        onLongPress={() => openEdit(item)}
        activeOpacity={0.7}
      >
        <View style={styles.rowInfo}>
          <Text style={styles.rowName}>{item.nombreCompleto}</Text>
          {item.alumnaInvitada && (
            <Text style={styles.rowAlumna}>🎓 {item.alumnaInvitada}</Text>
          )}
          <View style={styles.rowBadges}>
            {item.silla && (
              <Text style={styles.badgeSilla}>💺 Silla</Text>
            )}
            <Text
              style={[
                styles.badgeIngreso,
                { color: item.ingresado ? COLORS.success : COLORS.textMuted },
              ]}
            >
              {item.ingresado ? '✅ DENTRO' : '⬜ FUERA'}
            </Text>
          </View>
        </View>
        <View style={styles.rowActions}>
          {item.email && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => { setSelected(item); handleEmail(); }}
            >
              <Text style={styles.actionBtnText}>✉️</Text>
            </TouchableOpacity>
          )}
          {item.telefono && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => openQr(item)}
            >
              <Text style={styles.actionBtnText}>📱</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.chevron}>›</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Lista de Espectadores</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Buscar por nombre..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={COLORS.text} />
          ) : (
            <Text style={styles.searchButtonText}>Buscar</Text>
          )}
        </TouchableOpacity>
      </View>

      {loading && spectators.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryLight} />
        </View>
      ) : (
        <FlatList
          data={spectators}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                style={{ padding: 16 }}
                color={COLORS.primaryLight}
              />
            ) : null
          }
          ListEmptyComponent={
            <Text style={styles.empty}>Sin resultados</Text>
          }
        />
      )}

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>← Volver</Text>
      </TouchableOpacity>

      <Modal
        visible={qrModal}
        transparent
        animationType="fade"
        onRequestClose={() => setQrModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selected && (
              <>
                {/* Hidden capture for sharing */}
                <ViewShot
                  ref={shotRef}
                  options={{ format: 'png', quality: 1 }}
                  style={styles.hiddenCapture}
                >
                  <View style={styles.captureCard}>
                    <Text style={styles.captureTitle}>ACROBACIA EN TELAS</Text>
                    <View style={styles.captureQrWrap}>
                      <QRCode
                        value={[selected.qrHash, selected.nombreCompleto, selected.alumnaInvitada || ''].join('|')}
                        size={280}
                        backgroundColor="white"
                        color="#000"
                      />
                    </View>
                    <Text style={styles.captureName}>
                      {selected.nombreCompleto.toUpperCase()}
                    </Text>
                  </View>
                </ViewShot>

                <Text style={styles.modalName}>{selected.nombreCompleto}</Text>
                {selected.alumnaInvitada && (
                  <Text style={styles.modalAlumna}>🎓 {selected.alumnaInvitada}</Text>
                )}
                <View style={styles.modalQr}>
                  <QRCode
                    value={[selected.qrHash, selected.nombreCompleto, selected.alumnaInvitada || ''].join('|')}
                    size={200}
                    backgroundColor="white"
                    color={COLORS.bg}
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalActionBtn}
                    onPress={handleShare}
                  >
                    <Text style={styles.modalActionIcon}>📤</Text>
                    <Text style={styles.modalActionText}>Compartir QR</Text>
                  </TouchableOpacity>

                  {selected.email && (
                    <TouchableOpacity
                      style={styles.modalActionBtn}
                      onPress={handleEmail}
                      disabled={sending}
                    >
                      <Text style={styles.modalActionIcon}>
                        {sending ? '⏳' : '✉️'}
                      </Text>
                      <Text style={styles.modalActionText}>
                        {sending ? 'Enviando...' : 'Enviar Email'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {selected.telefono && (
                    <TouchableOpacity
                      style={styles.modalActionBtn}
                      onPress={handleWhatsApp}
                    >
                      <Text style={styles.modalActionIcon}>📱</Text>
                      <Text style={styles.modalActionText}>WhatsApp</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setQrModal(false)}
                >
                  <Text style={styles.modalCloseText}>Cerrar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={editModal} transparent animationType="fade" onRequestClose={() => setEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 20 }]}>
            <ScrollView style={{ width: '100%', maxHeight: 400 }}>
              <Text style={styles.modalName}>{selected?.nombreCompleto}</Text>
              {selected?.alumnaInvitada ? (
                <Text style={styles.modalAlumna}>🎓 {selected.alumnaInvitada}</Text>
              ) : null}

              <Text style={{ color: COLORS.textMuted, marginTop: 20 }}>Email</Text>
              <TextInput
                style={styles.input}
                value={editForm.email}
                onChangeText={t => setEditForm({...editForm, email: t})}
                keyboardType="email-address"
              />

              <Text style={{ color: COLORS.textMuted, marginTop: 10 }}>Teléfono</Text>
              <TextInput
                style={styles.input}
                value={editForm.telefono}
                onChangeText={t => setEditForm({...editForm, telefono: t})}
                keyboardType="phone-pad"
              />

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, paddingBottom: 15 }}>
                <Text style={{ color: COLORS.textMuted }}>Silla Reservada</Text>
                <Switch
                  value={editForm.silla ?? false}
                  onValueChange={v => setEditForm({...editForm, silla: v})}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor={editForm.silla ? COLORS.primaryLight : COLORS.textMuted}
                />
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: COLORS.bg, flex: 1 }]} onPress={() => setEditModal(false)}>
                <Text style={styles.modalActionText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: COLORS.error, flex: 0.5 }]} onPress={handleDeleteEspectador} disabled={deleting || saving}>
                <Text style={[styles.modalActionText, { color: '#fff', fontSize: 16 }]}>🗑️</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: COLORS.primary, flex: 1.5 }]} onPress={handleSaveEdit} disabled={saving || deleting}>
                <Text style={[styles.modalActionText, { color: '#000' }]}>{saving ? 'Grabando...' : 'Grabar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20,
    backgroundColor: COLORS.bgCard, borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  searchRow: { flexDirection: 'row', padding: 16, gap: 10 },
  input: {
    flex: 1, backgroundColor: COLORS.bgCard, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  searchButton: {
    backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center',
  },
  searchButtonText: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingTop: 0, gap: 8, paddingBottom: 20 },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 32, fontSize: 15 },
  row: {
    flexDirection: 'row', backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  rowAlumna: { fontSize: 13, color: COLORS.primaryLight, marginTop: 2 },
  rowBadges: { flexDirection: 'row', gap: 8, marginTop: 4 },
  badgeSilla: { fontSize: 12, color: COLORS.accent, fontWeight: '600' },
  badgeIngreso: { fontSize: 12, fontWeight: '600' },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8 },
  actionBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.bg,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  actionBtnText: { fontSize: 16 },
  chevron: { fontSize: 22, color: COLORS.textMuted, marginLeft: 4 },
  backBtn: { alignItems: 'center', paddingVertical: 16 },
  backBtnText: { color: COLORS.textMuted, fontSize: 14 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center',
    alignItems: 'center', padding: 24,
  },
  modalContent: {
    backgroundColor: COLORS.bgCard, borderRadius: 24, padding: 28,
    width: '100%', maxWidth: 360, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  modalName: { fontSize: 20, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  modalAlumna: { fontSize: 14, color: COLORS.primaryLight, marginTop: 4, fontWeight: '600' },
  modalQr: {
    padding: 12, backgroundColor: '#fff', borderRadius: 16, marginTop: 16,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' },
  modalActionBtn: {
    flex: 1, backgroundColor: COLORS.bg, borderRadius: 14, paddingVertical: 12,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  modalActionIcon: { fontSize: 20 },
  modalActionText: { color: COLORS.text, fontSize: 11, fontWeight: '600', marginTop: 4 },
  modalClose: { marginTop: 20, paddingVertical: 10, paddingHorizontal: 24 },
  modalCloseText: { color: COLORS.textMuted, fontSize: 14 },
  hiddenCapture: { position: 'absolute', left: -9999, top: 0 },
  captureCard: {
    alignItems: 'center', backgroundColor: '#fff', padding: 30, borderRadius: 20,
  },
  captureTitle: {
    fontSize: 14, fontWeight: '800', color: '#6C3CB5', letterSpacing: 3, marginBottom: 16,
  },
  captureQrWrap: { padding: 16, backgroundColor: '#fff', borderRadius: 12 },
  captureName: {
    fontSize: 22, fontWeight: '900', color: '#000', letterSpacing: 2,
    marginTop: 16, textAlign: 'center',
  },
});
