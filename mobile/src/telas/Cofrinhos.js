import { Pressable, RefreshControl, ScrollView, Text } from 'react-native';
import { useEspacoBarra } from '../componentes/BarraAbas';
import { useApi } from '../api';
import { Erro, Painel, Progresso, Titulo, cores, estilos } from '../componentes/UI';
import { centavos } from '../processamento';

export default function Cofrinhos({ aoEscolher }) {
  const espacoBarra = useEspacoBarra();
  const { dados, erro, carregando, recarregar } = useApi('/api/dispositivos');

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: espacoBarra }}
      refreshControl={<RefreshControl refreshing={carregando} onRefresh={recarregar} />}
    >
      <Titulo>Meus cofrinhos</Titulo>
      <Erro mensagem={erro} />
      {dados?.dispositivos.length === 0 && (
        <Text style={estilos.suave}>Nenhum cofrinho ainda. Cadastre o primeiro pelo site do Cofrinho Invista+.</Text>
      )}
      {dados?.dispositivos.map(d => (
        <Pressable key={d.id} onPress={() => aoEscolher(d)} accessibilityRole="button">
          <Painel>
            <Text style={estilos.subtitulo}>{d.apelido}</Text>
            <Text style={{ fontSize: 26, fontWeight: '700', color: cores.primaria }}>{centavos(d.saldoCentavos)}</Text>
            {d.metaCentavos ? <Progresso atual={d.saldoCentavos} total={d.metaCentavos} /> : <Text style={estilos.suave}>Sem meta definida</Text>}
          </Painel>
        </Pressable>
      ))}
    </ScrollView>
  );
}
