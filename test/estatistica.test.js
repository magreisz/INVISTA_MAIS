import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analisarDepositos, assimetria, classificarCorrelacao, correlacao, curtose, diaLocal, intervaloConfiancaMedia,
  intervaloMediaT, intervaloMediaZ, intervaloProporcao, modas, normalCdf, normalQuantil,
  quantil, regressaoLinear, regressaoMultipla, resumoDescritivo, tCdf, tQuantil, testeTWelch,
} from '../lib/estatistica.js';

const valores = [0.05, 0.10, 0.25, 0.25, 0.50, 1.00, 1.00, 1.00, 2.00, 5.00, 0.25, 0.10, 1.00, 0.50, 10.00];
const perto = (atual, esperado, tolerancia = 1e-4) =>
  assert.ok(Math.abs(atual - esperado) < tolerancia, `${atual} ≠ ${esperado}`);

test('medidas de posição e dispersão batem com o Python', () => {
  const r = resumoDescritivo(valores);
  perto(r.media, 1.5333333);
  assert.equal(r.mediana, 0.5);
  assert.deepEqual(r.modas, [1]);
  perto(r.desvioPadraoPopulacional, 2.5618136);
  perto(r.desvioPadraoAmostral, 2.6517290);
  assert.deepEqual([r.quartis.q1, r.quartis.q3], [0.25, 1]);
  perto(quantil(valores, 0.1), 0.1);
  perto(quantil(valores, 0.9), 3.8);
  perto(r.coeficienteVariacao, 167.0748, 1e-3);
  assert.deepEqual(modas([1, 2, 2, 3, 3]), [2, 3]);
});

test('assimetria e curtose (Pearson, Fisher, Bowley, percentílica e momentos)', () => {
  const a = assimetria(valores);
  perto(a.fisher, 2.4996052);
  perto(a.pearson2, 3 * (1.5333333 - 0.5) / 2.5618136);
  perto(a.pearson1, (1.5333333 - 1) / 2.5618136);
  perto(a.bowley, (1 + 0.25 - 2 * 0.5) / (1 - 0.25));
  assert.equal(a.classificacao, 'assimetria forte positiva (à direita)');
  const k = curtose(valores);
  perto(k.excesso, 5.2144908);
  perto(k.percentilica, 0.75 / (2 * 3.7));
  assert.equal(k.classificacao, 'leptocúrtica');
  assert.equal(assimetria([1, 2]).classificacao, 'não aplicável');
});

test('distribuições normal e t de Student', () => {
  perto(normalCdf(1.96), 0.9750021, 1e-6);
  perto(normalCdf(-0.5), 0.3085375, 1e-6);
  perto(tCdf(1.3, 7), 0.8826161, 1e-6);
  perto(tQuantil(0.975, 10), 2.2281389, 1e-5);
  perto(tQuantil(0.975, 29), 2.0452296, 1e-5);
  perto(tQuantil(0.975, 1), 12.7062047, 1e-4);
  perto(tQuantil(0.975, 2.5), 3.5746548, 1e-4);
});

test('inferência: intervalo de confiança e teste t de Welch', () => {
  const ic = intervaloConfiancaMedia(valores);
  perto(ic.inferior, 0.0648548);
  perto(ic.superior, 3.0018119);
  const w = testeTWelch([1.0, 2.0, 0.5, 5.0, 1.0, 2.0], [0.25, 0.5, 0.1, 1.0, 0.25, 0.5, 0.05]);
  perto(w.t, 2.2792730);
  perto(w.grausLiberdade, 5.3436552);
  perto(w.p, 0.0682181, 1e-5);
  assert.equal(w.rejeitaH0, false);
  assert.equal(intervaloConfiancaMedia([1]), null);
});

test('regressão linear', () => {
  const r = regressaoLinear([10, 20, 30, 40, 50], [1.1, 2.3, 2.9, 4.2, 5.1]);
  perto(r.a, 0.15);
  perto(r.b, 0.099);
  perto(r.r, 0.9955910);
  perto(r.r2, 0.9912015);
  assert.equal(regressaoLinear([1, 1, 1], [1, 2, 3]), null);
});

test('dias e semana usam o fuso de Brasília', () => {
  assert.deepEqual(diaLocal(Date.UTC(2026, 8, 27, 1)), { chave: '2026-09-26', diaSemana: 6 });
});

test('análise dos depósitos monta série, probabilidades, regressões e previsão da meta', () => {
  const inicio = Date.UTC(2026, 8, 1, 15);
  const depositos = Array.from({ length: 20 }, (_, i) => ({
    valorCentavos: [100, 50, 25, 100, 500][i % 5],
    forma: i % 5 === 4 ? 'cedula' : 'moeda',
    pesoGramas: 7 * (i + 1),
    registradoEm: inicio + i * 86400000,
    origem: i < 10 ? 'simulado' : 'sensor',
  }));
  const agora = inicio + 20 * 86400000;
  const r = analisarDepositos(depositos, {
    deMs: inicio - 12 * 3600000, ateMs: agora, agoraMs: agora,
    saldoCentavos: 3100, metaCentavos: 10000, dataMetaMs: agora + 60 * 86400000,
  });
  assert.equal(r.n, 20);
  assert.deepEqual(r.origem, { sensor: 10, simulado: 10 });
  assert.equal(r.descritiva.media, 1.55);
  assert.equal(r.serieDiaria.at(-1).saldoAcumuladoReais, 31);
  assert.equal(r.probabilidade.depositoPorDiaSemana.find(d => d.dia === 'ter').probabilidade, 1);
  assert.ok(r.regressao.tendencia.b > 1 && r.regressao.tendencia.r2 > 0.9);
  assert.ok(r.regressao.calibracao.r2 > 0.9);
  assert.ok(new Date(r.regressao.previsaoMeta) > new Date(agora));
  assert.ok(r.probabilidade.meta.probabilidade > 0.5);
  assert.equal(r.probabilidade.meta.faltaReais, 69);
  assert.match(r.inferencia.fimDeSemanaVsDiasUteis.conclusao, /evidência|diferença/);
  const vazio = analisarDepositos([], { deMs: inicio, ateMs: agora });
  assert.equal(vazio.n, 0);
  assert.equal(vazio.regressao.tendencia, null);
});

test('quantil da normal (tabela Z)', () => {
  perto(normalQuantil(0.975), 1.959964, 1e-5);
  perto(normalQuantil(0.99), 2.326348, 1e-5);
  perto(normalQuantil(0.995), 2.575829, 1e-5);
  perto(normalQuantil(0.01), -2.326348, 1e-5);
});

test('intervalo de confiança: média com e sem desvio populacional e proporção', () => {
  const z = intervaloMediaZ(21.8, 2.85, 5, 0.98);
  perto(z.z, 2.326348, 1e-5);
  perto(z.erroMaximo, 2.965, 1e-3);
  perto(z.inferior, 18.835, 1e-3);
  perto(z.superior, 24.765, 1e-3);

  const amostra = [10, 12, 14, 16, 18];
  const t = intervaloMediaT(amostra, 0.95);
  assert.equal(t.grausLiberdade, 4);
  perto(t.t, 2.776445, 1e-4);
  perto(t.erroMaximo, 2.776445 * Math.sqrt(10) / Math.sqrt(5), 1e-4);
  assert.equal(intervaloMediaT([1], 0.95), null);

  const p = intervaloProporcao(8, 19, 0.99);
  perto(p.p, 8 / 19);
  perto(p.erroMaximo, 2.575829 * Math.sqrt((8 / 19) * (11 / 19) / 19), 1e-5);
  assert.equal(intervaloProporcao(0, 0), null);
});

test('correlação de Pearson e classificação', () => {
  perto(correlacao([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]), 1);
  perto(correlacao([1, 2, 3, 4, 5], [10, 8, 6, 4, 2]), -1);
  assert.equal(correlacao([1, 1, 1], [1, 2, 3]), null);
  assert.equal(classificarCorrelacao(0.95), 'muito forte positiva');
  assert.equal(classificarCorrelacao(-0.5), 'moderada negativa');
  assert.equal(classificarCorrelacao(0.1), 'desprezível');
});

test('regressão múltipla bate com o Python (scipy) e separa variáveis relevantes', () => {
  const x1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const x2 = [0, 1, 0, 1, 1, 0, 1, 0, 0, 1];
  const ruido = [1.1, -1.9, 1.4, -0.6, 1.3, -1.2, 0.4, -1.5, 1.8, -0.9];
  const x3 = [3, 7, 1, 9, 4, 6, 2, 8, 5, 10];
  const y = x1.map((v, i) => 2 + 3 * v + 1.5 * x2[i] + ruido[i]);
  const r = regressaoMultipla([
    { nome: 'x1', valores: x1 }, { nome: 'x2', valores: x2 }, { nome: 'x3', valores: x3 },
  ], y);
  const [b0, b1, b2, b3] = r.coeficientes;
  perto(b0.b, 3.4175, 1e-3);
  perto(b1.b, 3.1064, 1e-3);
  perto(b2.b, 1.473, 1e-3);
  perto(b3.b, -0.3635, 1e-3);
  perto(b0.p, 0.0088, 1e-3);
  perto(b2.p, 0.0935, 1e-3);
  perto(b3.p, 0.0409, 1e-3);
  assert.equal(b1.relevante, true);
  assert.equal(b2.relevante, false);
  assert.equal(r.grausLiberdade, 6);
  assert.ok(r.r2 > 0.98 && r.r2Ajustado <= r.r2);
  assert.equal(regressaoMultipla([{ nome: 'x', valores: [1, 2] }], [1, 2]), null);
});

test('análise traz correlação, intervalos nos três casos e dados do teste de hipóteses', () => {
  const inicio = Date.UTC(2026, 8, 1, 15);
  const diaDe = [];
  for (let dia = 0; diaDe.length < 30; dia++) for (let k = 0; k < [1, 2, 3][dia % 3] && diaDe.length < 30; k++) diaDe.push(dia);
  const depositos = Array.from({ length: 30 }, (_, i) => ({
    valorCentavos: [100, 50, 25, 100, 500, 200][i % 6],
    forma: [500, 200].includes([100, 50, 25, 100, 500, 200][i % 6]) ? 'cedula' : 'moeda',
    pesoGramas: 7 * (i + 1),
    registradoEm: inicio + diaDe[i] * 86400000 + (i % 3) * 3600000,
    origem: 'sensor',
  }));
  const agora = inicio + 16 * 86400000;
  const r = analisarDepositos(depositos, { deMs: inicio - 3600000, ateMs: agora, agoraMs: agora, populacao: depositos });
  assert.equal(r.correlacao.diasAnalisados, 15);
  assert.ok(r.correlacao.comY.find(c => c.nome === 'quantidade').r > 0.5);
  assert.equal(r.correlacao.matriz.length, 4);
  assert.equal(r.correlacao.matriz[0][0], 1);
  assert.equal(r.correlacao.comY.length, 3);
  assert.ok(r.correlacao.regressao.coeficientes.length === 4);
  const i95 = r.inferencia.intervalos.niveis.find(n => n.confianca === 0.95);
  assert.ok(i95.mediaComSigma.inferior < r.descritiva.media && r.descritiva.media < i95.mediaComSigma.superior);
  assert.ok(i95.mediaSemSigma.grausLiberdade === 29);
  assert.equal(r.inferencia.intervalos.amostra.cedulas, 10);
  perto(i95.proporcaoCedulas.p, 10 / 30);
  const i99 = r.inferencia.intervalos.niveis.find(n => n.confianca === 0.99);
  assert.ok(i99.mediaSemSigma.erroMaximo > i95.mediaSemSigma.erroMaximo);
  assert.equal(typeof r.inferencia.fimDeSemanaVsDiasUteis.nFimDeSemana, 'number');
});
