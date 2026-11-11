import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { api, useApi } from '../api';
import { Carregando, Cartao, Erro } from '../componentes/Estado';
import { CorrelacaoRegressao, IntervalosConfianca, TesteHipoteses } from '../componentes/EstatisticaInferencial';
import { dataHora, diaMes, hojeIso, numero, porcentagem, reais, somarDias } from '../formatos';

const AZUL = '#004a9f';
const VERDE = '#28a745';
const LARANJA = '#e67e22';

function Grafico({ titulo, children, altura = 260 }) {
  return (
    <div className="painel grafico">
      <h3>{titulo}</h3>
      <ResponsiveContainer width="100%" height={altura}>{children}</ResponsiveContainer>
    </div>
  );
}

async function baixarCsv(id, de, ate) {
  const { depositos } = await api(`/api/dispositivos/${id}/depositos?de=${de}&ate=${ate}&limite=500`);
  const linhas = [['registradoEm', 'valorCentavos', 'forma', 'pesoGramas', 'origem']]
    .concat(depositos.map(d => [d.registradoEm, d.valorCentavos, d.forma, d.pesoGramas ?? '', d.origem]));
  const blob = new Blob([linhas.map(l => l.join(',')).join('\n')], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `depositos-${de}-a-${ate}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function Estatisticas() {
  const { id } = useParams();
  const hoje = hojeIso();
  const [filtro, setFiltro] = useState({ de: somarDias(hoje, -89), ate: hoje, dataMeta: somarDias(hoje, 60) });
  const [aplicado, setAplicado] = useState(filtro);
  const [erroCsv, setErroCsv] = useState('');
  const { dados: e, erro, carregando, recarregar } = useApi(
    `/api/dispositivos/${id}/estatisticas?de=${aplicado.de}&ate=${aplicado.ate}&dataMeta=${aplicado.dataMeta}`,
  );

  const d = e?.descritiva;
  const serie = e?.serieDiaria.map(p => ({ ...p, dia: diaMes(p.data) })) ?? [];

  return (
    <section>
      <div className="linha-titulo">
        <h1>Estatísticas dos depósitos</h1>
        <div className="acoes">
          <Link className="botao" to={`/cofrinhos/${id}/simulacao`}>Simulação</Link>
          <Link className="botao secundario" to={`/cofrinhos/${id}`}>Voltar ao painel</Link>
        </div>
      </div>

      <form className="painel filtros" onSubmit={ev => { ev.preventDefault(); setAplicado(filtro); }}>
        <label>De <input type="date" value={filtro.de} onChange={ev => setFiltro({ ...filtro, de: ev.target.value })} /></label>
        <label>Até <input type="date" value={filtro.ate} onChange={ev => setFiltro({ ...filtro, ate: ev.target.value })} /></label>
        <label>Data da meta <input type="date" value={filtro.dataMeta} onChange={ev => setFiltro({ ...filtro, dataMeta: ev.target.value })} /></label>
        <button className="botao">Aplicar</button>
        <button
          type="button"
          className="botao secundario"
          onClick={() => baixarCsv(id, aplicado.de, aplicado.ate).catch(falha => setErroCsv(falha.message))}
        >
          Baixar CSV
        </button>
      </form>
      <Erro mensagem={erroCsv} />
      <Erro mensagem={erro} tentarDeNovo={recarregar} />
      {carregando && !e && <Carregando />}

      {e && e.n === 0 && <p className="aviso">Nenhum depósito no período.</p>}

      {e && e.n > 0 && (
        <>
          <p className="aviso">
            {e.n} depósitos ({e.origem.sensor} do sensor, {e.origem.simulado} simulados) em {e.periodo.dias} dias.
          </p>

          <h2>Medidas descritivas (valor do depósito)</h2>
          <div className="grade-cartoes">
            <Cartao titulo="Média" valor={reais(d.media)} />
            <Cartao titulo="Mediana" valor={reais(d.mediana)} />
            <Cartao titulo="Moda" valor={d.modas.map(reais).join(', ')} detalhe={d.unimodal ? 'Unimodal' : 'Multimodal'} />
            <Cartao titulo="Desvio padrão" valor={reais(d.desvioPadraoAmostral)} detalhe={`Populacional: ${reais(d.desvioPadraoPopulacional)}`} />
            <Cartao titulo="Coeficiente de variação" valor={`${numero(d.coeficienteVariacao, 1)}%`} />
            <Cartao titulo="Quartis" valor={`${reais(d.quartis.q1)} a ${reais(d.quartis.q3)}`} detalhe={`Mín. ${reais(d.minimo)} e máx. ${reais(d.maximo)}`} />
            <Cartao titulo="Assimetria (Pearson 2)" valor={numero(d.assimetria.pearson2, 3)} detalhe={d.assimetria.classificacao} />
            <Cartao
              titulo="Assimetria (outras)"
              valor={`Fisher ${numero(d.assimetria.fisher, 3)}`}
              detalhe={`Pearson 1 ${numero(d.assimetria.pearson1, 3)} e Bowley ${numero(d.assimetria.bowley, 3)}`}
            />
            <Cartao titulo="Curtose percentílica" valor={numero(d.curtose.percentilica, 3)} detalhe={d.curtose.classificacao} />
            <Cartao titulo="Excesso de curtose" valor={numero(d.curtose.excesso, 3)} detalhe="0 na curva normal" />
          </div>

          <Grafico titulo="Depósitos por dia e saldo acumulado">
            <ComposedChart data={serie}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" minTickGap={16} />
              <YAxis yAxisId="dia" tickFormatter={v => numero(v)} />
              <YAxis yAxisId="saldo" orientation="right" tickFormatter={v => numero(v)} />
              <Tooltip formatter={valor => reais(valor)} />
              <Legend />
              <Bar yAxisId="dia" dataKey="totalReais" name="Depositado no dia" fill={AZUL} />
              <Line yAxisId="saldo" dataKey="saldoAcumuladoReais" name="Saldo acumulado" stroke={VERDE} dot={false} strokeWidth={2} />
            </ComposedChart>
          </Grafico>

          <div className="duas-colunas">
            <Grafico titulo="Frequência por valor">
              <BarChart data={e.frequencias.map(f => ({ ...f, rotulo: reais(f.valor) }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rotulo" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="frequencia" name="Depósitos" fill={AZUL} />
              </BarChart>
            </Grafico>
            <Grafico titulo="Histograma (classes de Sturges)">
              <BarChart data={e.histograma.map(h => ({ ...h, rotulo: `${numero(h.inicio)} a ${numero(h.fim)}` }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rotulo" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="frequencia" name="Depósitos" fill={LARANJA} />
              </BarChart>
            </Grafico>
          </div>

          <h2>Probabilidade</h2>
          <div className="duas-colunas">
            <Grafico titulo="Chance de depositar em cada dia da semana">
              <BarChart data={e.probabilidade.depositoPorDiaSemana}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" />
                <YAxis domain={[0, 1]} tickFormatter={v => porcentagem(v, 0)} />
                <Tooltip formatter={v => porcentagem(v)} />
                <Bar dataKey="probabilidade" name="Probabilidade" fill={VERDE} />
              </BarChart>
            </Grafico>
            <div className="painel">
              <h3>Meta</h3>
              {e.probabilidade.meta ? (
                <>
                  <p>Faltam <strong>{reais(e.probabilidade.meta.faltaReais)}</strong> até {dataHora(e.probabilidade.meta.dataMeta).split(',')[0]}.</p>
                  <p className="saldo grande">{porcentagem(e.probabilidade.meta.probabilidade)}</p>
                  <small>Chance de chegar à meta mantendo o ritmo atual (aproximação normal da soma dos depósitos diários).</small>
                </>
              ) : (
                <p>Defina uma meta no painel do cofrinho.</p>
              )}
            </div>
          </div>

          <h2>Regressão linear simples</h2>
          <div className="grade-cartoes">
            <Cartao
              titulo="Tendência do saldo"
              valor={e.regressao.tendencia ? `R$ ${numero(e.regressao.tendencia.b)} por dia` : 'n/d'}
              detalhe={e.regressao.tendencia && `y = ${numero(e.regressao.tendencia.a)} + ${numero(e.regressao.tendencia.b)}x · R² = ${numero(e.regressao.tendencia.r2, 3)}`}
            />
            <Cartao
              titulo="Previsão da meta"
              valor={e.regressao.previsaoMeta ? dataHora(e.regressao.previsaoMeta).split(',')[0] : 'n/d'}
              detalhe="Pela reta de tendência"
            />
            <Cartao
              titulo="Calibração peso × saldo"
              valor={e.regressao.calibracao ? `R$ ${numero(e.regressao.calibracao.b, 3)} por grama` : 'n/d'}
              detalhe={e.regressao.calibracao && `R² = ${numero(e.regressao.calibracao.r2, 3)}`}
            />
          </div>

          <h2>Correlação e regressão múltipla</h2>
          <CorrelacaoRegressao dados={e.correlacao} />

          <h2>Intervalo de confiança</h2>
          <IntervalosConfianca dados={e.inferencia.intervalos} />

          <h2>Teste de hipóteses</h2>
          <div className="painel">
            <h3>Fim de semana x dias úteis, em 5 passos</h3>
            <TesteHipoteses dados={e.inferencia.fimDeSemanaVsDiasUteis} />
          </div>
        </>
      )}
    </section>
  );
}
