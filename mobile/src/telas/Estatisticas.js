import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useEspacoBarra } from '../componentes/BarraAbas';
import { useApi } from '../api';
import { GraficoBarras, GraficoLinhas } from '../componentes/Graficos';
import { Cartao, Erro, Painel, Titulo, cores, estilos } from '../componentes/UI';
import { mediaMovel, numero, reais } from '../processamento';

export default function Estatisticas({ dispositivo }) {
  const espacoBarra = useEspacoBarra();
  const { dados: e, erro, carregando, recarregar } = useApi(`/api/dispositivos/${dispositivo.id}/estatisticas`);

  const serie = e?.serieDiaria ?? [];
  const totais = serie.map(p => p.totalReais);
  const media7 = mediaMovel(totais, 7);
  const d = e?.descritiva;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: espacoBarra }}
      refreshControl={<RefreshControl refreshing={carregando} onRefresh={recarregar} />}
    >
      <Titulo>Estatísticas</Titulo>
      <Erro mensagem={erro} />
      {e && e.n === 0 && <Text style={estilos.suave}>Nenhum depósito nos últimos 90 dias.</Text>}
      {e && e.n > 0 && (
        <>
          <Text style={estilos.suave}>{e.n} depósitos nos últimos 90 dias ({e.origem.sensor} do sensor e {e.origem.simulado} simulados).</Text>
          <View style={estilos.grade}>
            <Cartao titulo="Média" valor={reais(d.media)} />
            <Cartao titulo="Mediana" valor={reais(d.mediana)} />
            <Cartao titulo="Moda" valor={d.modas.map(reais).join(', ')} />
            <Cartao titulo="Desvio padrão" valor={reais(d.desvioPadraoAmostral)} detalhe={`CV ${numero(d.coeficienteVariacao, 1)}%`} />
            <Cartao titulo="Assimetria" valor={numero(d.assimetria.pearson2, 2)} detalhe={d.assimetria.classificacao} />
            <Cartao titulo="Curtose" valor={numero(d.curtose.percentilica, 3)} detalhe={d.curtose.classificacao} />
          </View>
          <GraficoLinhas
            titulo="Saldo acumulado (R$)"
            series={[{ nome: 'Saldo acumulado', cor: cores.bom, valores: serie.map(p => p.saldoAcumuladoReais) }]}
            rotulos={serie.map(p => p.data.slice(8, 10) + '/' + p.data.slice(5, 7))}
          />
          <GraficoLinhas
            titulo="Depósito diário e média móvel de 7 dias (R$)"
            series={[
              { nome: 'Depositado no dia', cor: '#9aa5b1', valores: totais },
              { nome: 'Média móvel 7 dias', cor: cores.primaria, valores: media7 },
            ]}
            rotulos={serie.map(p => p.data.slice(8, 10) + '/' + p.data.slice(5, 7))}
            formatar={v => numero(v, 1)}
          />
          <GraficoBarras
            titulo="Chance de depositar por dia da semana"
            itens={e.probabilidade.depositoPorDiaSemana.map(p => ({ rotulo: p.dia, valor: p.probabilidade ?? 0 }))}
            cor={cores.bom}
            formatar={v => `${Math.round(v * 100)}%`}
          />
          <GraficoBarras
            titulo="Frequência por valor depositado"
            itens={e.frequencias.map(f => ({ rotulo: numero(f.valor), valor: f.frequencia }))}
          />
          <Painel>
            <Text style={estilos.subtitulo}>Regressão e inferência</Text>
            {e.regressao.tendencia && (
              <Text style={estilos.texto}>
                O saldo cresce em média {reais(e.regressao.tendencia.b)} por dia (R² = {numero(e.regressao.tendencia.r2, 3)}).
              </Text>
            )}
            {e.inferencia.intervaloConfiancaMedia && (
              <Text style={estilos.texto}>
                Com 95% de confiança, o depósito médio fica entre {reais(e.inferencia.intervaloConfiancaMedia.inferior)} e{' '}
                {reais(e.inferencia.intervaloConfiancaMedia.superior)}.
              </Text>
            )}
            {e.inferencia.fimDeSemanaVsDiasUteis && <Text style={estilos.texto}>{e.inferencia.fimDeSemanaVsDiasUteis.conclusao}</Text>}
          </Painel>
        </>
      )}
    </ScrollView>
  );
}
