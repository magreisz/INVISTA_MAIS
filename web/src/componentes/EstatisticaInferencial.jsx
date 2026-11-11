import { useState } from 'react';
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { numero, porcentagem, reais } from '../formatos';

const AZUL = '#2f7bf0';

function corDaCelula(r) {
  if (r === null || r === undefined) return undefined;
  const alfa = Math.min(Math.abs(r), 1) * 0.55;
  return r >= 0 ? `rgba(47, 123, 240, ${alfa})` : `rgba(220, 53, 69, ${alfa})`;
}

function Dispersao({ titulo, pontos, campoX, rotuloX, r, classificacao }) {
  return (
    <div className="painel grafico">
      <h3>{titulo}</h3>
      <p className="aviso estat-legenda">r = {numero(r, 3)} ({classificacao})</p>
      <ResponsiveContainer width="100%" height={220}>
        <ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" dataKey={campoX} name={rotuloX} allowDecimals={false} />
          <YAxis type="number" dataKey="total" name="Total do dia" tickFormatter={v => numero(v)} />
          <Tooltip formatter={(valor, nome) => (nome === 'Total do dia' ? reais(valor) : valor)} />
          <Scatter data={pontos} fill={AZUL} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CorrelacaoRegressao({ dados }) {
  const reg = dados.regressao;
  const [cenario, setCenario] = useState({ quantidade: 2, fimDeSemana: 1, diaDoMes: 5 });

  if (dados.diasAnalisados < 3) {
    return <p className="aviso">São necessários pelo menos 3 dias com depósito para calcular a correlação.</p>;
  }

  const coef = nome => reg?.coeficientes.find(c => c.nome === nome)?.b ?? 0;
  const projecao = reg
    ? coef('intercepto') + coef('quantidade') * cenario.quantidade + coef('fimDeSemana') * cenario.fimDeSemana + coef('diaDoMes') * cenario.diaDoMes
    : null;
  const sinal = v => (v < 0 ? `- ${numero(Math.abs(v), 3)}` : `+ ${numero(v, 3)}`);
  const porNome = Object.fromEntries(dados.comY.map(c => [c.nome, c]));

  return (
    <>
      <p className="aviso">
        A correlação mede o grau de relacionamento entre a variável dependente <strong>Y (total guardado no dia)</strong> e as
        variáveis independentes <strong>X1 (depósitos no dia)</strong>, <strong>X2 (fim de semana)</strong> e <strong>X3 (dia do mês)</strong>.
        Foram analisados {dados.diasAnalisados} dias com depósito.
      </p>

      <div className="estat-dispersoes">
        <Dispersao titulo="Y x X1: depósitos no dia" pontos={dados.pontos} campoX="quantidade" rotuloX="Depósitos no dia" {...porNome.quantidade} />
        <Dispersao titulo="Y x X2: fim de semana" pontos={dados.pontos} campoX="fimDeSemana" rotuloX="Fim de semana" {...porNome.fimDeSemana} />
        <Dispersao titulo="Y x X3: dia do mês" pontos={dados.pontos} campoX="diaDoMes" rotuloX="Dia do mês" {...porNome.diaDoMes} />
      </div>

      <div className="painel">
        <h3>Matriz de correlação (Pearson)</h3>
        <div className="estat-rolagem">
          <table className="tabela estat-matriz">
            <thead>
              <tr><th />{dados.variaveis.map(v => <th key={v.nome}>{v.rotulo}</th>)}</tr>
            </thead>
            <tbody>
              {dados.variaveis.map((v, i) => (
                <tr key={v.nome}>
                  <th>{v.rotulo}</th>
                  {dados.matriz[i].map((r, j) => (
                    <td key={dados.variaveis[j].nome} style={{ background: corDaCelula(r) }}>{numero(r, 2)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <small>Azul: correlação positiva (as duas crescem juntas). Vermelho: negativa (uma cresce e a outra diminui). Quanto mais forte a cor, mais perto de 1 ou -1.</small>
      </div>

      <div className="painel">
        <h3>Regressão linear múltipla</h3>
        {reg ? (
          <>
            <p className="estat-formula">
              Y = {numero(coef('intercepto'), 3)} {sinal(coef('quantidade'))}·X1 {sinal(coef('fimDeSemana'))}·X2 {sinal(coef('diaDoMes'))}·X3
            </p>
            <div className="estat-rolagem">
              <table className="tabela">
                <thead>
                  <tr><th>Variável</th><th>Coeficiente</th><th>t</th><th>p-valor</th><th>É relevante? (5%)</th></tr>
                </thead>
                <tbody>
                  {reg.coeficientes.map(c => (
                    <tr key={c.nome}>
                      <td>{c.rotulo}</td>
                      <td>{numero(c.b, 3)}</td>
                      <td>{numero(c.t, 3)}</td>
                      <td>{numero(c.p, 4)}</td>
                      <td>{c.relevante === null ? '' : c.relevante ? <span className="selo bom">Sim</span> : <span className="selo ruim">Não</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              R² = <strong>{numero(reg.r2, 3)}</strong> e R² ajustado = <strong>{numero(reg.r2Ajustado, 3)}</strong>: as variáveis
              explicam {porcentagem(reg.r2Ajustado, 0)} da variação do total guardado por dia. Variáveis com p-valor acima de 5%
              não ajudam a explicar Y e poderiam sair do modelo.
            </p>

            <h3>Projeção</h3>
            <p className="aviso">Use a equação para prever quanto será guardado num dia futuro.</p>
            <div className="filtros">
              <label>
                Depósitos no dia (X1)
                <input type="number" min="1" max="20" value={cenario.quantidade} onChange={e => setCenario({ ...cenario, quantidade: Number(e.target.value) })} />
              </label>
              <label>
                Fim de semana (X2)
                <select value={cenario.fimDeSemana} onChange={e => setCenario({ ...cenario, fimDeSemana: Number(e.target.value) })}>
                  <option value={1}>Sim</option>
                  <option value={0}>Não</option>
                </select>
              </label>
              <label>
                Dia do mês (X3)
                <input type="number" min="1" max="31" value={cenario.diaDoMes} onChange={e => setCenario({ ...cenario, diaDoMes: Number(e.target.value) })} />
              </label>
              <div className="estat-projecao">
                <span className="cartao-titulo">Previsão de Y</span>
                <strong>{reais(Math.max(projecao, 0))}</strong>
              </div>
            </div>
          </>
        ) : (
          <p className="aviso">A regressão múltipla precisa de pelo menos 5 dias com depósito e de variação nas variáveis.</p>
        )}
      </div>
    </>
  );
}

const NIVEIS = [0.9, 0.95, 0.98, 0.99];

export function IntervalosConfianca({ dados }) {
  const [nivel, setNivel] = useState(0.95);
  const atual = dados.niveis.find(n => n.confianca === nivel);
  const { amostra, populacao } = dados;
  const z = atual?.mediaComSigma;
  const t = atual?.mediaSemSigma;
  const p = atual?.proporcaoCedulas;
  const muDentro = z && populacao.media !== null && populacao.media >= z.inferior && populacao.media <= z.superior;

  return (
    <>
      <div className="filtros">
        <label>
          Nível de confiança
          <select value={nivel} onChange={e => setNivel(Number(e.target.value))}>
            {NIVEIS.map(n => <option key={n} value={n}>{porcentagem(n, 0)}</option>)}
          </select>
        </label>
        <p className="aviso estat-legenda">
          Amostra: {amostra.n} depósitos do período (x̄ = {reais(amostra.media)}, s = {reais(amostra.desvioPadraoAmostral)}).
          População: {populacao.n} depósitos desde a criação do cofrinho (μ = {reais(populacao.media)}, σ = {reais(populacao.desvioPadrao)}).
        </p>
      </div>

      <div className="estat-intervalos">
        <div className="painel">
          <span className="cofre3d-tipo">Tabela Z</span>
          <h3>1. Média com desvio padrão populacional conhecido</h3>
          {z ? (
            <>
              <p className="estat-formula">ME = z<sub>α/2</sub> · σ / √n = {numero(z.z, 3)} · {numero(z.sigma, 3)} / √{z.n} = {numero(z.erroMaximo, 3)}</p>
              <p className="estat-intervalo">{reais(z.inferior)} &lt; μ &lt; {reais(z.superior)}</p>
              <p>{muDentro
                ? `A média real da população (${reais(populacao.media)}) está dentro do intervalo.`
                : `A média real da população (${reais(populacao.media)}) ficou fora do intervalo, o que acontece em ${porcentagem(1 - nivel, 0)} das amostras.`}</p>
            </>
          ) : <p className="aviso">Precisa de pelo menos 2 depósitos.</p>}
        </div>

        <div className="painel">
          <span className="cofre3d-tipo">t de Student</span>
          <h3>2. Média sem desvio padrão populacional</h3>
          {t ? (
            <>
              <p className="estat-formula">ME = t<sub>α/2</sub> · s / √n = {numero(t.t, 3)} · {numero(t.s, 3)} / √{t.n} = {numero(t.erroMaximo, 3)} (GL = n - 1 = {t.grausLiberdade})</p>
              <p className="estat-intervalo">{reais(t.inferior)} &lt; μ &lt; {reais(t.superior)}</p>
              <p>Com {porcentagem(nivel, 0)} de confiança, o valor médio de um depósito está nesse intervalo.</p>
            </>
          ) : <p className="aviso">Precisa de pelo menos 2 depósitos.</p>}
        </div>

        <div className="painel">
          <span className="cofre3d-tipo">Tabela Z</span>
          <h3>3. Proporção de depósitos em cédula</h3>
          {p ? (
            <>
              <p className="estat-formula">ME = z<sub>α/2</sub> · √(p̂ · q̂ / n) = {numero(p.z, 3)} · √({numero(p.p, 3)} · {numero(p.q, 3)} / {p.n}) = {numero(p.erroMaximo, 3)}</p>
              <p className="estat-intervalo">{porcentagem(p.inferior)} &lt; p &lt; {porcentagem(p.superior)}</p>
              <p>{p.sucessos} de {p.n} depósitos foram em cédula (p̂ = {porcentagem(p.p)}).</p>
            </>
          ) : <p className="aviso">Sem depósitos no período.</p>}
        </div>
      </div>
      <small>Quanto maior o nível de confiança, maior o z (ou o t) e mais largo o intervalo.</small>
    </>
  );
}

export function TesteHipoteses({ dados }) {
  if (!dados) return <p className="aviso">São necessários pelo menos 2 depósitos no fim de semana e 2 nos dias úteis.</p>;
  return (
    <ol className="estat-passos">
      <li>
        <strong>Especificar as hipóteses.</strong> H0: o valor médio dos depósitos no fim de semana é igual ao dos dias úteis.
        H1: os valores médios são diferentes.
      </li>
      <li><strong>Escolher o nível de significância.</strong> α = {porcentagem(dados.alfa, 0)}.</li>
      <li>
        <strong>Coletar os dados.</strong> Fim de semana: {dados.nFimDeSemana} depósitos, média {reais(dados.mediaFimDeSemana)}.
        Dias úteis: {dados.nDiasUteis} depósitos, média {reais(dados.mediaDiasUteis)}.
      </li>
      <li>
        <strong>Calcular a estatística.</strong> Teste t de Welch: t = {numero(dados.t, 3)}, GL = {numero(dados.grausLiberdade, 1)},
        p-valor = {numero(dados.p, 4)}.
      </li>
      <li>
        <strong>Decidir.</strong> {dados.rejeitaH0
          ? `Como o p-valor é menor que ${porcentagem(dados.alfa, 0)}, a estatística está na região crítica: rejeitamos H0.`
          : `Como o p-valor é maior que ${porcentagem(dados.alfa, 0)}, a estatística está na região de aceitação: não rejeitamos H0.`}{' '}
        <strong>{dados.conclusao}</strong>
      </li>
    </ol>
  );
}
