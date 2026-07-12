import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const TOKEN_KEY = 'auth_token';
const SCANNER_NAME_KEY = 'scanner_name';
const SERVER_URL_KEY = 'server_url';
const CONFIG_FILE = `${FileSystem.documentDirectory}app-config.json`;

async function writeConfigBackup(data: Record<string, string>): Promise<void> {
  try {
    const existing = await FileSystem.readAsStringAsync(CONFIG_FILE).catch(() => '{}');
    const config = { ...JSON.parse(existing), ...data };
    await FileSystem.writeAsStringAsync(CONFIG_FILE, JSON.stringify(config));
  } catch {}
}

async function readConfigBackup(): Promise<Record<string, string>> {
  try {
    const content = await FileSystem.readAsStringAsync(CONFIG_FILE);
    return JSON.parse(content);
  } catch {
    return {};
  }
}

// --- Token (SecureStore) ---

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// --- Scanner Name (AsyncStorage + file backup) ---

export async function saveScannerName(name: string): Promise<void> {
  await AsyncStorage.setItem(SCANNER_NAME_KEY, name);
  await writeConfigBackup({ [SCANNER_NAME_KEY]: name });
}

export async function getScannerName(): Promise<string | null> {
  try {
    const val = await AsyncStorage.getItem(SCANNER_NAME_KEY);
    if (val) return val;
  } catch {}
  const backup = await readConfigBackup();
  if (backup[SCANNER_NAME_KEY]) {
    await AsyncStorage.setItem(SCANNER_NAME_KEY, backup[SCANNER_NAME_KEY]);
    return backup[SCANNER_NAME_KEY];
  }
  return null;
}

// --- Server URL (AsyncStorage + file backup) ---

export async function saveServerUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(SERVER_URL_KEY, url);
  await writeConfigBackup({ [SERVER_URL_KEY]: url });
}

export async function getServerUrl(): Promise<string | null> {
  try {
    const val = await AsyncStorage.getItem(SERVER_URL_KEY);
    if (val) return val;
  } catch {}
  const backup = await readConfigBackup();
  if (backup[SERVER_URL_KEY]) {
    await AsyncStorage.setItem(SERVER_URL_KEY, backup[SERVER_URL_KEY]);
    return backup[SERVER_URL_KEY];
  }
  return null;
}
