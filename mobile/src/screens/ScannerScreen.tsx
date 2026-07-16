import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  TextInput,
  FlatList,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  BarcodeScanningResult,
} from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../config';
import { validarQr, marcarSalida, ValidarQrResponse } from '../services/api';
import { useAppStore } from '../store';
import dayjs from 'dayjs';
import { RootStackParamList } from '../types';

type ScannerScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Scanner'
>;

interface Props {
  navigation: ScannerScreenNavigationProp;
}

interface ScanHistoryItem {
  nombre: string;
  apellido: string;
  dni: string;
  valido: boolean;
  timestamp: string;
}

type ResultType = 'valid' | 'rejected' | 'invalid' | null;

export default function ScannerScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [resultType, setResultType] = useState<ResultType>(null);
  const [resultData, setResultData] = useState<ValidarQrResponse['espectador'] | null>(null);
  const [primerIngreso, setPrimerIngreso] = useState<ValidarQrResponse['primer_ingreso'] | null>(null);
  const [lastQrHash, setLastQrHash] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [manualModal, setManualModal] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const scannerName = useAppStore((s) => s.scannerName);

  const resultOpacity = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  function showResult(type: ResultType, data?: ValidarQrResponse['espectador'], primerIngresoData?: ValidarQrResponse['primer_ingreso']) {
    setResultType(type);
    setResultData(data || null);
    setPrimerIngreso(primerIngresoData || null);
    setScanned(true);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Animated.parallel([
      Animated.timing(resultOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(resultScale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function hideResult() {
    Animated.parallel([
      Animated.timing(resultOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(resultScale, {
        toValue: 0.5,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setResultType(null);
      setResultData(null);
      setPrimerIngreso(null);
      setScanned(false);
      resultScale.setValue(0.5);
    });
  }

  async function handleScan(result: BarcodeScanningResult) {
    if (scanned || !scannerName) return;
    await processScan(result.data);
  }

  async function processScan(qrHash: string) {
    if (!scannerName) return;
    setScanned(true);
    setLastQrHash(qrHash);
    try {
      const res = await validarQr(qrHash, scannerName);
      if (res.valido) {
        showResult('valid', res.espectador);
        setScanHistory((prev) => [
          {
            nombre: res.espectador?.nombre || '',
            apellido: res.espectador?.apellido || '',
            dni: res.espectador?.dni || '',
            valido: true,
            timestamp: dayjs().format('HH:mm:ss'),
          } as ScanHistoryItem,
          ...prev.slice(0, 2),
        ]);
      } else if (res.motivo === 'QR ya utilizado') {
        showResult('rejected', res.espectador, res.primer_ingreso);
        setScanHistory((prev) => [
          {
            nombre: res.espectador?.nombre || '',
            apellido: res.espectador?.apellido || '',
            dni: res.espectador?.dni || '',
            valido: false,
            timestamp: dayjs().format('HH:mm:ss'),
          } as ScanHistoryItem,
          ...prev.slice(0, 2),
        ]);
      } else {
        showResult('invalid');
      }
    } catch {
      showResult('invalid');
    }
  }

  async function handleSalida() {
    if (!scannerName || !lastQrHash) return;
    try {
      const res = await marcarSalida(lastQrHash, scannerName);
      if (res.valido) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        hideResult();
      } else {
        Alert.alert('Error', res.motivo || 'No se pudo marcar salida');
      }
    } catch {
      Alert.alert('Error', 'No se pudo marcar salida');
    }
  }

  function handleManualSubmit() {
    if (!manualInput.trim()) return;
    setManualModal(false);
    processScan(manualInput.trim());
    setManualInput('');
  }

  function getResultConfig() {
    switch (resultType) {
      case 'valid':
        return {
          icon: '✅',
          title: 'INGRESO VÁLIDO',
          bgColor: 'rgba(34,197,94,0.92)',
        };
      case 'rejected':
        return {
          icon: '❌',
          title: 'QR YA UTILIZADO',
          bgColor: 'rgba(239,68,68,0.92)',
        };
      case 'invalid':
        return {
          icon: '❌',
          title: 'QR INVÁLIDO',
          bgColor: 'rgba(239,68,68,0.92)',
        };
      default:
        return { icon: '', title: '', bgColor: 'transparent' };
    }
  }

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Permiso de Cámara</Text>
          <Text style={styles.permissionText}>
            Necesitamos acceso a la cámara para escanear los QR de las entradas
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Conceder Permiso</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const resultConfig = getResultConfig();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={handleScan}
      >
        <View style={styles.cameraOverlay}>
          <Text style={styles.overlayText}>Colocá el QR en el centro</Text>

          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>

          <TouchableOpacity
            style={styles.torchButton}
            onPress={() => setTorch((t) => !t)}
          >
            <Text style={styles.torchIcon}>{torch ? '🔦' : '💡'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.manualButton}
            onPress={() => setManualModal(true)}
          >
            <Text style={styles.manualButtonText}>Ingresar código manualmente</Text>
          </TouchableOpacity>
        </View>

        {resultType && (
          <Animated.View
            style={[
              styles.resultOverlay,
              { backgroundColor: resultConfig.bgColor, opacity: resultOpacity },
            ]}
          >
            <Animated.View
              style={[
                styles.resultContent,
                { transform: [{ scale: resultScale }] },
              ]}
            >
              <Text style={styles.resultIcon}>{resultConfig.icon}</Text>
              <Text style={styles.resultTitle}>{resultConfig.title}</Text>

              {resultType !== 'invalid' && resultData && (
                <>
                  <View style={styles.resultDivider} />
                  <Text style={styles.resultName}>
                    {resultData.nombre} {resultData.apellido}
                  </Text>
                  <Text style={styles.resultDni}>
                    DNI: {resultData.dni}
                  </Text>
                  {resultData.alumnaInvitada && (
                    <Text style={styles.resultAlumna}>🎓 {resultData.alumnaInvitada}</Text>
                  )}
                  {resultData.silla ? (
                    <View style={styles.resultSeatPill}>
                      <Text style={styles.resultSeatPillIcon}>💺</Text>
                      <Text style={styles.resultSeatPillText}>SILLA RESERVADA</Text>
                    </View>
                  ) : (
                    <Text style={styles.resultSeatNo}>Silla: NO</Text>
                  )}
                  {resultType === 'valid' && (
                    <Text style={styles.resultTime}>
                      Ingresó a las: {dayjs().format('HH:mm:ss')}
                    </Text>
                  )}
                  {resultType === 'rejected' && primerIngreso && (
                    <>
                      <Text style={styles.resultTime}>
                        Ingresó a las: {dayjs(primerIngreso.timestamp).format('HH:mm:ss')}
                      </Text>
                      <Text style={styles.resultScanner}>
                        Escaneó: {primerIngreso.scanner}
                      </Text>
                      <TouchableOpacity style={styles.salidaButton} onPress={handleSalida}>
                        <Text style={styles.salidaButtonText}>🚪 Marcar salida</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}
              <TouchableOpacity style={styles.backButton} onPress={hideResult}>
                <Text style={styles.backButtonText}>Volver</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        )}
      </CameraView>

      {scanHistory.length > 0 && (
        <View style={styles.historyBar}>
          <Text style={styles.historyTitle}>Últimos escaneos</Text>
          {scanHistory.map((item, i) => (
            <View key={i} style={styles.historyRow}>
              <View
                style={[
                  styles.historyDot,
                  { backgroundColor: item.valido ? COLORS.success : COLORS.error },
                ]}
              />
              <Text style={styles.historyName}>
                {item.nombre} {item.apellido}
              </Text>
              <Text style={styles.historyTime}>{item.timestamp}</Text>
            </View>
          ))}
        </View>
      )}

      <Modal
        visible={manualModal}
        transparent
        animationType="fade"
        onRequestClose={() => setManualModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ingresar QR Manualmente</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Código QR"
              placeholderTextColor={COLORS.textMuted}
              value={manualInput}
              onChangeText={setManualInput}
              autoFocus
              autoCapitalize="none"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setManualModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSubmit,
                  !manualInput.trim() && styles.modalSubmitDisabled,
                ]}
                onPress={handleManualSubmit}
                disabled={!manualInput.trim()}
              >
                <Text style={styles.modalSubmitText}>Validar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const SCAN_FRAME_SIZE = 240;
const CORNER_SIZE = 24;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  overlayText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  scanFrame: {
    width: SCAN_FRAME_SIZE,
    height: SCAN_FRAME_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: COLORS.accent,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 4,
  },
  torchButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  torchIcon: {
    fontSize: 22,
  },
  manualButton: {
    position: 'absolute',
    bottom: 40,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  manualButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  resultContent: {
    alignItems: 'center',
    padding: 28,
    borderRadius: 24,
    backgroundColor: COLORS.bgCard,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  resultIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 1,
    textAlign: 'center',
  },
  resultDivider: {
    width: '80%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 16,
  },
  resultName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  resultDni: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  resultAlumna: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryLight,
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 2,
  },
  resultSeatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
    gap: 6,
  },
  resultSeatPillIcon: {
    fontSize: 18,
  },
  resultSeatPillText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.bg,
    letterSpacing: 1,
  },
  resultSeatNo: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  resultTime: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  resultScanner: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  permissionButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  backButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  salidaButton: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  salidaButtonText: {
    color: COLORS.primaryLight,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  historyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  historyTitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  historyName: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  historyTime: {
    color: COLORS.textMuted,
    fontSize: 12,
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
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
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
  modalButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalCancelText: {
    color: COLORS.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  modalSubmit: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSubmitDisabled: {
    opacity: 0.5,
  },
  modalSubmitText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
