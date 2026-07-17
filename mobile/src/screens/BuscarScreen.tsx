import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppStore } from '../store';
import { getToken } from '../services/storage';
import { getServerUrl } from '../services/storage';
import { COLORS, API_URL as FALLBACK_API } from '../config';
import { RootStackParamList } from '../types';
import dayjs from 'dayjs';

type BuscarScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Buscar'
>;

interface Props {
  navigation: BuscarScreenNavigationProp;
}

interface Spectator {
  id: number;
  nombreCompleto: string;
  alumnaInvitada: string | null;
  silla: boolean;
  ingresado: boolean;
  ingresadoEn: string | null;
}

export default function BuscarScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Spectator[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      if (!token) { setError('No hay sesión'); return; }
      const baseUrl = (await getServerUrl()) || FALLBACK_API;
      const res = await fetch(`${baseUrl}/espectadores?search=${encodeURIComponent(query.trim())}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { setError('Sesión expirada'); return; }
      const data = await res.json();
      setResults(data.data || []);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  function renderItem({ item }: { item: Spectator }) {
    return (
      <View style={styles.row}>
        <View style={styles.rowInfo}>
          <Text style={styles.rowName}>{item.nombreCompleto}</Text>
          {item.alumnaInvitada && <Text style={styles.rowAlumna}>🎓 {item.alumnaInvitada}</Text>}
        </View>
        <View style={styles.rowStatus}>
          <View style={[styles.statusDot, { backgroundColor: item.ingresado ? COLORS.success : COLORS.error }]} />
          <Text style={[styles.statusText, { color: item.ingresado ? COLORS.success : COLORS.error }]}>
            {item.ingresado ? 'DENTRO' : 'FUERA'}
          </Text>
          {item.silla && <Text style={styles.sillaBadge}>💺</Text>}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔍 Consultar</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Nombre o alumna..."
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={loading}>
          {loading ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.searchButtonText}>Buscar</Text>}
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {results && results.length === 0 && !loading ? (
        <Text style={styles.empty}>Sin resultados</Text>
      ) : null}

      <FlatList
        data={results || []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>← Volver</Text>
      </TouchableOpacity>
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
  error: { color: COLORS.error, textAlign: 'center', marginTop: 8, fontSize: 14 },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 32, fontSize: 15 },
  list: { padding: 16, paddingTop: 0, gap: 8 },
  row: {
    flexDirection: 'row', backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  rowAlumna: { fontSize: 12, color: COLORS.primaryLight, marginTop: 2 },
  rowStatus: { alignItems: 'center', gap: 4 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  sillaBadge: { fontSize: 14 },
  backBtn: { alignItems: 'center', paddingVertical: 16 },
  backBtnText: { color: COLORS.textMuted, fontSize: 14 },
});
