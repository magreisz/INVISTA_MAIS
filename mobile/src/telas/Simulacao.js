import { useState } from 'react';
import { useEspacoBarra } from '../componentes/BarraAbas';
import { ScrollView, Text, View } from 'react-native';
import { useApi } from '../api';
import { GraficoLinhas } from '../componentes/Graficos';
import { Botao, Campo, Cartao, Erro, Titulo, estilos } from '../componentes/UI';
import { numero, reais } from '../processamento';

export default function Simulacao({ dispositivo }) {
  const espacoBarra = useEspacoBarra();
  const [meses, setMeses] = useState('12');
  const [aporte, setAporte] = useState('0');
  const [aplicado, setAplicado] = useState({ meses: 12, aporte: 0 });
  const { dados, erro, carregando } = useApi(
    `/api/dispositivos/${dispositivo.id}/simulacao?meses=${aplicado.meses}&aporteMensalCentavos=${aplicado.aporte}`,
  );
  const final = dados?.serie.at(-1);

  function simular() {
    setAplicado({
      meses: Math.min(120, Math.max(1, parseInt(meses, 10) || 12)),
      aporte: Math.max(0, Math.round(Number(aporte.replace(',', '.')) * 100) || 0),
    });
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: espacoBarra }}>
      <Titulo>Quanto renderia?</Titulo>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Campo rotulo="Meses" value={meses} onChangeText={setMeses} keyboardType="number-pad" /></View>
        <View style={{ flex: 1 }}><Campo rotulo="Guardar por mês (R$)" value={aporte} onChangeText={setAporte} keyboardType="decimal-pad" /></View>
      </View>
      <Botao titulo="Simular" aoTocar={simular} carregando={carregando} />
      <Erro mensagem={erro} />
      {dados && (
        <>
          <View style={estilos.grade}>
            <Cartao titulo="Parado no cofre" valor={reais(final.cofre)} />
            <Cartao titulo="Poupança" valor={reais(final.poupanca)} />
            <Cartao titulo="Título Selic" valor={reais(final.selic)} detalhe={`Selic ${numero(dados.selicAnual)}% ao ano`} destaque />
          </View>
          <GraficoLinhas
            titulo="Evolução mês a mês (R$)"
            series={[
              { nome: 'Cofre', cor: '#9aa5b1', valores: dados.serie.map(p => p.cofre) },
              { nome: 'Poupança', cor: '#e67e22', valores: dados.serie.map(p => p.poupanca) },
              { nome: 'Selic', cor: '#28a745', valores: dados.serie.map(p => p.selic) },
            ]}
            rotulos={dados.serie.map(p => `${p.mes}m`)}
            formatar={v => numero(v, 0)}
          />
          <Text style={estilos.suave}>{dados.aviso}</Text>
        </>
      )}
    </ScrollView>
  );
}
