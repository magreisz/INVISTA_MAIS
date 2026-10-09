import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { cores } from './src/componentes/UI';
import { restaurar, sair } from './src/sessao';
import Cofrinhos from './src/telas/Cofrinhos';
import Entrar from './src/telas/Entrar';
import Estatisticas from './src/telas/Estatisticas';
import Painel from './src/telas/Painel';
import Simulacao from './src/telas/Simulacao';

const ABAS = [
  { id: 'painel', rotulo: 'Visão geral', icone: 'painel', Tela: Painel },
  { id: 'estatisticas', rotulo: 'Desempenho', icone: 'desempenho', Tela: Estatisticas },
  { id: 'simulacao', rotulo: 'Simulação', icone: 'aportes', Tela: Simulacao },
];

function Icone({ nome, cor }) {
  const comum = { fill: 'none', stroke: cor, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {nome === 'painel' && <Path {...comum} d="M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5M9 21v-7h6v7" />}
      {nome === 'desempenho' && <Path {...comum} d="M4 20V11h4v9M10 20V4h4v16M16 20v-9h4v9M3 21h18" />}
      {nome === 'aportes' && <><Path {...comum} d="M4 18 9 13l4 3 7-9M15 7h5v5" /><Circle cx="5" cy="6" r="2" {...comum} /></>}
      {nome === 'cofrinhos' && <><Path {...comum} d="M5 9a7 7 0 0 1 14 0v9H5zM8 18v2M16 18v2M5 12H3v4h2M19 12h2" /><Circle cx="12" cy="13" r="1" fill={cor} stroke="none" /></>}
      {nome === 'sair' && <Path {...comum} d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10" />}
    </Svg>
  );
}

export default function App() {
  const [usuario, setUsuario] = useState(undefined);
  const [dispositivo, setDispositivo] = useState(null);
  const [aba, setAba] = useState('painel');

  useEffect(() => {
    restaurar().then(setUsuario);
  }, []);

  async function encerrar() {
    await sair();
    setDispositivo(null);
    setUsuario(null);
  }

  let conteudo;
  if (usuario === undefined) {
    conteudo = <ActivityIndicator style={{ flex: 1 }} color={cores.primaria} />;
  } else if (!usuario) {
    conteudo = <Entrar aoEntrar={setUsuario} />;
  } else if (!dispositivo) {
    conteudo = <Cofrinhos aoEscolher={d => { setDispositivo(d); setAba('painel'); }} />;
  } else {
    const { Tela } = ABAS.find(a => a.id === aba);
    conteudo = <Tela key={`${dispositivo.id}-${aba}`} dispositivo={dispositivo} />;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        {usuario && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: cores.borda }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icone nome="aportes" cor={cores.primaria} />
              <Text style={{ fontSize: 18, fontWeight: '700', color: cores.primaria }}>Cofrinho Invista+</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              {dispositivo && (
                <Pressable onPress={() => setDispositivo(null)} accessibilityRole="button" accessibilityLabel="Meus cofrinhos" style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Icone nome="cofrinhos" cor={cores.primaria} />
                  <Text style={{ color: cores.primaria, fontWeight: '600' }}>Cofrinhos</Text>
                </Pressable>
              )}
              <Pressable onPress={encerrar} accessibilityRole="button" accessibilityLabel="Sair da conta" style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Icone nome="sair" cor={cores.suave} />
                <Text style={{ color: cores.suave, fontWeight: '600' }}>Sair</Text>
              </Pressable>
            </View>
          </View>
        )}
        <View style={{ flex: 1 }}>{conteudo}</View>
        {usuario && dispositivo && (
          <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderColor: cores.borda }}>
            {ABAS.map(a => (
              <Pressable key={a.id} onPress={() => setAba(a.id)} style={{ flex: 1, paddingVertical: 9, alignItems: 'center', gap: 3 }} accessibilityRole="tab" accessibilityState={{ selected: aba === a.id }}>
                <Icone nome={a.icone} cor={aba === a.id ? cores.primaria : cores.suave} />
                <Text style={{ textAlign: 'center', fontSize: 12, fontWeight: aba === a.id ? '700' : '500', color: aba === a.id ? cores.primaria : cores.suave }}>{a.rotulo}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
