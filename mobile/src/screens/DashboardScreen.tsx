import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../config';
import { getEstadisticas, EstadisticasResponse, UltimoIngreso } from '../services/api';
import dayjs from 'dayjs';
import { RootStackParamList } from '../types';

type DashboardScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Dashboard'
>;

interface Props {
  navigation: DashboardScreenNavigationProp;
}

type StatCard = {
  key: string;
  label: string;
  value: number | string;
  color: string;
  suffix?: string;
};

export default function DashboardScreen({ navigation }: Props) {
  const [stats, setStats] = useState<EstadisticasResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchStats();
    startPulse();
    pollRef.current = setInterval(fetchStats, 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function startPulse() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }

  const fetchStats = useCallback(async () => {
    try {
      const data = await getEstadisticas();
      setStats(data);
    } catch {}
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await fetchStats();
    } catch {}
    setRefreshing(false);
  }

  const statCards: StatCard[] = stats
    ? [
        { key: 'ingresos', label: 'Ingresaron', value: stats.ingresados, color: COLORS.success },
        { key: 'faltan', label: 'Faltan', value: stats.faltantes, color: COLORS.error },
        { key: 'sillas_oc', label: 'Sillas Ocupadas', value: stats.sillas_ocupadas, color: COLORS.accent },
        { key: 'sillas_rest', label: 'Sillas Restantes', value: stats.sillas_restantes, color: COLORS.primaryLight },
        { key: 'ocupacion', label: 'Ocupación', value: stats.ocupacion_pct, color: COLORS.primaryLight, suffix: '%' },
        { key: 'vendidos', label: 'Vendidas en Puerta', value: stats.vendidos_en_puerta, color: '#F59E0B' },
      ]
    : [];

  function renderStatCard(card: StatCard) {
    return (
      <View key={card.key} style={styles.statCard}>
        <Text style={styles.statLabel}>{card.label}</Text>
        <Text style={[styles.statValue, { color: card.color }]}>
          {card.value}
          {card.suffix || ''}
        </Text>
      </View>
    );
  }

  function renderRecentItem({ item }: { item: UltimoIngreso }) {
    return (
      <View style={styles.recentRow}>
        <Text style={styles.recentTime}>
          {dayjs(item.creado_en).format('HH:mm:ss')}
        </Text>
        <View style={styles.recentInfo}>
          <Text style={styles.recentName}>
            {item.nombreCompleto}
          </Text>
          <Text style={styles.recentScanner}>{item.scanner_nombre}</Text>
        </View>
        {item.silla && (
          <View style={styles.sillaBadge}>
            <Text style={styles.sillaBadgeText}>💺 SILLA</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 En Vivo</Text>
        <View style={styles.liveContainer}>
          <Animated.View
            style={[styles.liveDot, { opacity: pulseAnim }]}
          />
          <Text style={styles.liveText}>EN VIVO</Text>
        </View>
      </View>

      <FlatList
        data={stats?.ultimos_ingresos || []}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderRecentItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primaryLight}
            colors={[COLORS.primaryLight]}
          />
        }
        ListHeaderComponent={
          <View style={styles.statsGrid}>
            {statCards.map(renderStatCard)}
          </View>
        }
        ListHeaderComponentStyle={styles.statsGridContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>{stats ? 'Sin ingresos recientes' : 'Cargando estadísticas...'}</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  liveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
  },
  liveText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statsGridContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    backgroundColor: COLORS.bgCard,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 38,
    fontWeight: '700',
    marginTop: 6,
  },
  listContent: {
    paddingBottom: 32,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recentTime: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    width: 85,
    flexShrink: 0,
  },
  recentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recentName: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
  },
  recentScanner: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sillaBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sillaBadgeText: {
    fontSize: 11,
    color: COLORS.bg,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 32,
    fontSize: 15,
  },
});
