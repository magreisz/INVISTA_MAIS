import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import BarraAbas, { IconeAba } from './src/componentes/BarraAbas';
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
  { id: 'simulacao', rotulo: 'Simulação', icone: 'simulacao', Tela: Simulacao },
  { id: 'cofrinhos', rotulo: 'Meus cofrinhos', icone: 'cofrinhos' },
];

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

  function escolherAba(id) {
    if (id === 'cofrinhos') {
      setDispositivo(null);
      return;
    }
    setAba(id);
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }} edges={['top']}>
        <StatusBar style="dark" />
        {usuario && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(37, 48, 59, 0.18)' }}>
            <Text style={{ fontSize: 22, fontWeight: '800', letterSpacing: -0.6, color: cores.texto }}>
              Cofrinho <Text style={{ color: cores.primaria }}>Invista+</Text>
            </Text>
            <Pressable onPress={encerrar} hitSlop={10} accessibilityRole="button" accessibilityLabel="Sair da conta" style={({ pressed }) => pressed && { opacity: 0.6 }}>
              <IconeAba nome="sair" cor={cores.texto} tamanho={25} />
            </Pressable>
          </View>
        )}
        <View style={{ flex: 1 }}>{conteudo}</View>
        {usuario && dispositivo && <BarraAbas abas={ABAS} ativa={aba} aoEscolher={escolherAba} />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
