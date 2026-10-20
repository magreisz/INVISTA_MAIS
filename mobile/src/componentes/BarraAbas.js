import { BlurView } from 'expo-blur';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { cores } from './UI';

export const ALTURA_BARRA = 64;
const MARGEM_LATERAL = 22;

function margemInferior(bottom) {
  return Math.max(bottom - 6, 12);
}

export function useEspacoBarra() {
  const { bottom } = useSafeAreaInsets();
  return ALTURA_BARRA + margemInferior(bottom) + 20;
}

export function IconeAba({ nome, ativo, cor = cores.texto, tamanho = 26 }) {
  const traco = { stroke: cor, strokeWidth: ativo ? 2.2 : 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const vazio = { ...traco, fill: 'none' };
  const cheio = { ...traco, fill: cor };
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {nome === 'painel' && (
        <Path {...(ativo ? cheio : vazio)} d="M3.5 10.2 12 3.5l8.5 6.7V20a1 1 0 0 1-1 1h-4.5v-6.5h-6V21H4.5a1 1 0 0 1-1-1z" />
      )}
      {nome === 'desempenho' && (
        <>
          <Rect x="4" y="11" width="4" height="9" rx="1" {...(ativo ? cheio : vazio)} />
          <Rect x="10" y="4" width="4" height="16" rx="1" {...(ativo ? cheio : vazio)} />
          <Rect x="16" y="8" width="4" height="12" rx="1" {...(ativo ? cheio : vazio)} />
        </>
      )}
      {nome === 'simulacao' && (
        <>
          <Path {...vazio} d="M3.5 17.5 9 12l4 3.5 7.5-8" strokeWidth={ativo ? 2.6 : 1.8} />
          <Path {...vazio} d="M15.5 7.5h5v5" strokeWidth={ativo ? 2.6 : 1.8} />
        </>
      )}
      {nome === 'cofrinhos' && (
        <>
          <Circle cx="12" cy="4.5" r="2.2" {...(ativo ? cheio : vazio)} />
          <Rect x="3.5" y="9" width="17" height="11.5" rx="2.5" {...(ativo ? cheio : vazio)} />
          <Path {...vazio} d="M9 12.5h6" stroke={ativo ? '#fff' : cor} />
        </>
      )}
      {nome === 'sair' && <Path {...vazio} d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10" />}
    </Svg>
  );
}

export default function BarraAbas({ abas, ativa, aoEscolher }) {
  const { bottom } = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[estilos.area, { bottom: margemInferior(bottom) }]}>
      <View style={estilos.sombra}>
        <View style={estilos.pilula}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 50 : 35}
            tint="light"
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, estilos.vidro]} />
          <View style={estilos.linha} accessibilityRole="tablist">
            {abas.map(a => {
              const selecionada = a.id === ativa;
              return (
                <Pressable
                  key={a.id}
                  onPress={() => aoEscolher(a.id)}
                  accessibilityRole="tab"
                  accessibilityLabel={a.rotulo}
                  accessibilityState={{ selected: selecionada }}
                  hitSlop={6}
                  style={({ pressed }) => [estilos.botao, pressed && { transform: [{ scale: 0.92 }] }]}
                >
                  <View style={[estilos.destaque, selecionada && estilos.destaqueAtivo]}>
                    <IconeAba nome={a.icone} ativo={selecionada} cor={selecionada ? cores.texto : '#3b4651'} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  area: { position: 'absolute', left: MARGEM_LATERAL, right: MARGEM_LATERAL },
  sombra: {
    borderRadius: ALTURA_BARRA / 2,
    shadowColor: '#0b1a2b', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  pilula: {
    height: ALTURA_BARRA, borderRadius: ALTURA_BARRA / 2, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.75)',
  },
  vidro: { backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.72)' },
  linha: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
  botao: { flex: 1, height: ALTURA_BARRA, alignItems: 'center', justifyContent: 'center' },
  destaque: { width: '100%', height: ALTURA_BARRA - 14, borderRadius: (ALTURA_BARRA - 14) / 2, alignItems: 'center', justifyContent: 'center' },
  destaqueAtivo: { backgroundColor: 'rgba(37, 48, 59, 0.10)' },
});
