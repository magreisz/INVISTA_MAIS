import * as SecureStore from 'expo-secure-store';
import { Appearance } from 'react-native';

const CHAVE_TEMA = 'invista_tema';

export async function lerTema() {
  try {
    if (await SecureStore.isAvailableAsync()) {
      const salvo = await SecureStore.getItemAsync(CHAVE_TEMA);
      if (salvo === 'claro' || salvo === 'escuro') return salvo;
    }
  } catch {
    return Appearance.getColorScheme() === 'dark' ? 'escuro' : 'claro';
  }
  return Appearance.getColorScheme() === 'dark' ? 'escuro' : 'claro';
}

export async function salvarTema(tema) {
  try {
    if (await SecureStore.isAvailableAsync()) await SecureStore.setItemAsync(CHAVE_TEMA, tema);
  } catch {
    return;
  }
}
