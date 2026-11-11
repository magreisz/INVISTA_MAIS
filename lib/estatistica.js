const FUSO = 'America/Sao_Paulo';
const DIA_MS = 86400000;
const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

export function arred(valor, casas = 4) {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return null;
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

const soma = valores => valores.reduce((total, x) => total + x, 0);

export function media(valores) {
  return valores.length ? soma(valores) / valores.length : null;
}

export function quantil(valores, p) {
  if (!valores.length) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const posicao = p * (ordenados.length - 1);
  const base = Math.floor(posicao);
  const resto = posicao - base;
  return ordenados[base + 1] === undefined
    ? ordenados[base]
    : ordenados[base] + resto * (ordenados[base + 1] - ordenados[base]);
}

export const mediana = valores => quantil(valores, 0.5);

export function modas(valores) {
  const contagem = new Map();
  for (const x of valores) contagem.set(x, (contagem.get(x) || 0) + 1);
  const maior = Math.max(0, ...contagem.values());
  return [...contagem].filter(([, n]) => n === maior).map(([x]) => x).sort((a, b) => a - b);
}

export function variancia(valores, { amostral = false } = {}) {
  const n = valores.length;
  if (n < (amostral ? 2 : 1)) return null;
  const m = media(valores);
  return soma(valores.map(x => (x - m) ** 2)) / (amostral ? n - 1 : n);
}

export function desvioPadrao(valores, opcoes) {
  const v = variancia(valores, opcoes);
  return v === null ? null : Math.sqrt(v);
}

export function classificarAssimetria(coeficiente) {
  if (coeficiente === null) return 'não aplicável';
  const intensidade = Math.abs(coeficiente);
  if (intensidade < 0.15) return 'simétrica';
  const forca = intensidade < 1 ? 'moderada' : 'forte';
  return `assimetria ${forca} ${coeficiente > 0 ? 'positiva (à direita)' : 'negativa (à esquerda)'}`;
}

export function assimetria(valores) {
  const n = valores.length;
  const m = media(valores);
  const dp = desvioPadrao(valores);
  if (n < 3 || !dp) {
    return { pearson1: null, pearson2: null, fisher: null, bowley: null, classificacao: 'não aplicável' };
  }
  const listaModas = modas(valores);
  const q1 = quantil(valores, 0.25);
  const q2 = quantil(valores, 0.5);
  const q3 = quantil(valores, 0.75);
  const pearson2 = 3 * (m - q2) / dp;
  return {
    pearson1: listaModas.length === 1 ? (m - listaModas[0]) / dp : null,
    pearson2,
    fisher: soma(valores.map(x => (x - m) ** 3)) / n / dp ** 3,
    bowley: q3 === q1 ? null : (q3 + q1 - 2 * q2) / (q3 - q1),
    classificacao: classificarAssimetria(pearson2),
  };
}

export function curtose(valores) {
  const n = valores.length;
  const m = media(valores);
  const m2 = variancia(valores);
  const amplitude9010 = quantil(valores, 0.9) - quantil(valores, 0.1);
  const percentilica = n >= 4 && amplitude9010 > 0
    ? (quantil(valores, 0.75) - quantil(valores, 0.25)) / (2 * amplitude9010)
    : null;
  const excesso = n >= 4 && m2 > 0 ? soma(valores.map(x => (x - m) ** 4)) / n / m2 ** 2 - 3 : null;
  let classificacao = 'não aplicável';
  if (percentilica !== null) {
    classificacao = percentilica < 0.263 ? 'leptocúrtica' : percentilica > 0.263 ? 'platicúrtica' : 'mesocúrtica';
  }
  return { percentilica, excesso, classificacao };
}

export function resumoDescritivo(valores) {
  const m = media(valores);
  const dpPop = desvioPadrao(valores);
  const listaModas = modas(valores);
  return {
    n: valores.length,
    media: m,
    mediana: mediana(valores),
    modas: listaModas,
    unimodal: listaModas.length === 1,
    minimo: valores.length ? Math.min(...valores) : null,
    maximo: valores.length ? Math.max(...valores) : null,
    quartis: { q1: quantil(valores, 0.25), q2: quantil(valores, 0.5), q3: quantil(valores, 0.75) },
    variancia: variancia(valores),
    desvioPadraoPopulacional: dpPop,
    desvioPadraoAmostral: desvioPadrao(valores, { amostral: true }),
    coeficienteVariacao: m ? (dpPop / m) * 100 : null,
    assimetria: assimetria(valores),
    curtose: curtose(valores),
  };
}

export function frequencias(valores) {
  const contagem = new Map();
  for (const x of valores) contagem.set(x, (contagem.get(x) || 0) + 1);
  return [...contagem].sort(([a], [b]) => a - b)
    .map(([valor, frequencia]) => ({ valor, frequencia, relativa: frequencia / valores.length }));
}

export function histograma(valores) {
  if (valores.length < 2) return [];
  const menor = Math.min(...valores);
  const maior = Math.max(...valores);
  if (menor === maior) return [{ inicio: menor, fim: maior, frequencia: valores.length }];
  const classes = Math.ceil(1 + Math.log2(valores.length));
  const largura = (maior - menor) / classes;
  const contagem = Array(classes).fill(0);
  for (const x of valores) contagem[Math.min(Math.floor((x - menor) / largura), classes - 1)]++;
  return contagem.map((frequencia, i) => ({ inicio: menor + i * largura, fim: menor + (i + 1) * largura, frequencia }));
}

export function regressaoLinear(xs, ys) {
  const n = xs.length;
  if (n < 3 || ys.length !== n) return null;
  const mx = media(xs);
  const my = media(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  if (sxx === 0) return null;
  const b = sxy / sxx;
  const r = syy === 0 ? null : sxy / Math.sqrt(sxx * syy);
  return { a: my - b * mx, b, r, r2: r === null ? null : r * r, n };
}

export function normalCdf(z) {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

const LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];

function lnGamma(z) {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  const x = z - 1;
  let serie = LANCZOS[0];
  for (let i = 1; i < LANCZOS.length; i++) serie += LANCZOS[i] / (x + i);
  const t = x + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(serie);
}

function fracaoBeta(a, b, x) {
  const MINIMO = 1e-300;
  let c = 1;
  let d = 1 - (a + b) * x / (a + 1);
  d = 1 / (Math.abs(d) < MINIMO ? MINIMO : d);
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    for (const termo of [m * (b - m) * x / ((a - 1 + m2) * (a + m2)), -(a + m) * (a + b + m) * x / ((a + m2) * (a + 1 + m2))]) {
      d = 1 + termo * d;
      d = 1 / (Math.abs(d) < MINIMO ? MINIMO : d);
      c = 1 + termo / c;
      if (Math.abs(c) < MINIMO) c = MINIMO;
      h *= d * c;
    }
    if (Math.abs(d * c - 1) < 3e-14) break;
  }
  return h;
}

function betaRegularizada(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const frente = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? frente * fracaoBeta(a, b, x) / a : 1 - frente * fracaoBeta(b, a, 1 - x) / b;
}

export function tCdf(t, gl) {
  const cauda = 0.5 * betaRegularizada(gl / (gl + t * t), gl / 2, 0.5);
  return t >= 0 ? 1 - cauda : cauda;
}

export function tQuantil(p, gl) {
  let baixo = -1e4;
  let alto = 1e4;
  for (let i = 0; i < 200; i++) {
    const meio = (baixo + alto) / 2;
    if (tCdf(meio, gl) < p) baixo = meio; else alto = meio;
  }
  return (baixo + alto) / 2;
}

export function intervaloConfiancaMedia(valores, confianca = 0.95) {
  const n = valores.length;
  if (n < 2) return null;
  const m = media(valores);
  const erroPadrao = desvioPadrao(valores, { amostral: true }) / Math.sqrt(n);
  const t = tQuantil(1 - (1 - confianca) / 2, n - 1);
  return { confianca, media: m, inferior: m - t * erroPadrao, superior: m + t * erroPadrao, t, grausLiberdade: n - 1 };
}

export const NIVEIS_CONFIANCA = [0.9, 0.95, 0.98, 0.99];

export function normalQuantil(p) {
  if (p <= 0 || p >= 1) return null;
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const limite = 0.02425;
  if (p < limite) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - limite) return -normalQuantil(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q
    / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

export function intervaloMediaZ(mediaAmostra, sigma, n, confianca = 0.95) {
  if (!n || sigma === null || sigma === undefined || mediaAmostra === null) return null;
  const z = normalQuantil(1 - (1 - confianca) / 2);
  const erroMaximo = z * sigma / Math.sqrt(n);
  return { confianca, z, sigma, n, erroMaximo, media: mediaAmostra, inferior: mediaAmostra - erroMaximo, superior: mediaAmostra + erroMaximo };
}

export function intervaloMediaT(valores, confianca = 0.95) {
  const n = valores.length;
  if (n < 2) return null;
  const m = media(valores);
  const s = desvioPadrao(valores, { amostral: true });
  const t = tQuantil(1 - (1 - confianca) / 2, n - 1);
  const erroMaximo = t * s / Math.sqrt(n);
  return { confianca, t, grausLiberdade: n - 1, s, n, erroMaximo, media: m, inferior: m - erroMaximo, superior: m + erroMaximo };
}

export function intervaloProporcao(sucessos, n, confianca = 0.95) {
  if (!n) return null;
  const p = sucessos / n;
  const z = normalQuantil(1 - (1 - confianca) / 2);
  const erroMaximo = z * Math.sqrt((p * (1 - p)) / n);
  return {
    confianca, z, p, q: 1 - p, sucessos, n, erroMaximo,
    inferior: Math.max(0, p - erroMaximo), superior: Math.min(1, p + erroMaximo),
  };
}

export function correlacao(xs, ys) {
  const n = xs.length;
  if (n < 3 || ys.length !== n) return null;
  const mx = media(xs);
  const my = media(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return sxx === 0 || syy === 0 ? null : sxy / Math.sqrt(sxx * syy);
}

export function classificarCorrelacao(r) {
  if (r === null || r === undefined) return 'não calculável';
  const abs = Math.abs(r);
  if (abs < 0.2) return 'desprezível';
  const forca = abs >= 0.9 ? 'muito forte' : abs >= 0.7 ? 'forte' : abs >= 0.4 ? 'moderada' : 'fraca';
  return `${forca} ${r > 0 ? 'positiva' : 'negativa'}`;
}

function inverterMatriz(m) {
  const n = m.length;
  const a = m.map((linha, i) => [...linha, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    let pivo = col;
    for (let i = col + 1; i < n; i++) if (Math.abs(a[i][col]) > Math.abs(a[pivo][col])) pivo = i;
    if (Math.abs(a[pivo][col]) < 1e-12) return null;
    [a[col], a[pivo]] = [a[pivo], a[col]];
    const divisor = a[col][col];
    for (let j = 0; j < 2 * n; j++) a[col][j] /= divisor;
    for (let i = 0; i < n; i++) {
      if (i === col) continue;
      const fator = a[i][col];
      for (let j = 0; j < 2 * n; j++) a[i][j] -= fator * a[col][j];
    }
  }
  return a.map(linha => linha.slice(n));
}

export function regressaoMultipla(variaveis, ys, { alfa = 0.05 } = {}) {
  const n = ys.length;
  const k = variaveis.length;
  if (n < k + 2 || variaveis.some(v => v.valores.length !== n)) return null;
  const linhas = ys.map((_, i) => [1, ...variaveis.map(v => v.valores[i])]);
  const colunas = k + 1;
  const xtx = Array.from({ length: colunas }, (_, i) => Array.from({ length: colunas }, (_, j) => soma(linhas.map(l => l[i] * l[j]))));
  const inversa = inverterMatriz(xtx);
  if (!inversa) return null;
  const xty = Array.from({ length: colunas }, (_, i) => soma(linhas.map((l, idx) => l[i] * ys[idx])));
  const beta = inversa.map(linha => soma(linha.map((v, j) => v * xty[j])));
  const previstos = linhas.map(l => soma(l.map((v, j) => v * beta[j])));
  const my = media(ys);
  const sqTotal = soma(ys.map(y => (y - my) ** 2));
  const sqResiduo = soma(ys.map((y, i) => (y - previstos[i]) ** 2));
  const gl = n - k - 1;
  const varianciaResiduo = sqResiduo / gl;
  const r2 = sqTotal === 0 ? null : 1 - sqResiduo / sqTotal;
  const coeficientes = beta.map((b, j) => {
    const erroPadrao = Math.sqrt(Math.max(varianciaResiduo * inversa[j][j], 0));
    const t = erroPadrao < 1e-12 ? null : b / erroPadrao;
    const p = t === null ? null : 2 * (1 - tCdf(Math.abs(t), gl));
    return {
      nome: j === 0 ? 'intercepto' : variaveis[j - 1].nome,
      rotulo: j === 0 ? 'Intercepto' : variaveis[j - 1].rotulo ?? variaveis[j - 1].nome,
      b, erroPadrao, t, p, relevante: j === 0 ? null : p === null ? true : p < alfa,
    };
  });
  return {
    n, k, grausLiberdade: gl, alfa, coeficientes,
    r2, r2Ajustado: r2 === null ? null : 1 - (1 - r2) * (n - 1) / gl,
    erroPadraoResiduo: Math.sqrt(varianciaResiduo),
  };
}

export function testeTWelch(a, b, alfa = 0.05) {
  if (a.length < 2 || b.length < 2) return null;
  const va = variancia(a, { amostral: true }) / a.length;
  const vb = variancia(b, { amostral: true }) / b.length;
  if (va + vb === 0) return null;
  const t = (media(a) - media(b)) / Math.sqrt(va + vb);
  const gl = (va + vb) ** 2 / (va ** 2 / (a.length - 1) + vb ** 2 / (b.length - 1));
  const p = 2 * (1 - tCdf(Math.abs(t), gl));
  return { t, grausLiberdade: gl, p, alfa, rejeitaH0: p < alfa };
}

const formatoDia = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' });
const INDICE_SEMANA = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function diaLocal(ms) {
  const partes = Object.fromEntries(formatoDia.formatToParts(new Date(ms)).map(p => [p.type, p.value]));
  return { chave: `${partes.year}-${partes.month}-${partes.day}`, diaSemana: INDICE_SEMANA[partes.weekday] };
}

function diasDoPeriodo(deMs, ateMs) {
  const dias = [];
  const vistos = new Set();
  for (let t = deMs; t <= ateMs + DIA_MS; t += DIA_MS / 2) {
    const dia = diaLocal(Math.min(t, ateMs));
    if (!vistos.has(dia.chave)) { vistos.add(dia.chave); dias.push(dia); }
  }
  return dias;
}

function probabilidadeMeta({ totaisDiarios, faltaReais, diasRestantes }) {
  if (faltaReais <= 0) return 1;
  if (diasRestantes <= 0 || totaisDiarios.length < 2) return 0;
  const mu = media(totaisDiarios);
  const sigma = desvioPadrao(totaisDiarios, { amostral: true });
  if (!sigma) return mu * diasRestantes >= faltaReais ? 1 : 0;
  return 1 - normalCdf((faltaReais - mu * diasRestantes) / (sigma * Math.sqrt(diasRestantes)));
}

function analisarCorrelacao(porDia) {
  const dias = [...porDia.values()].filter(d => d.quantidade > 0);
  const y = dias.map(d => d.totalReais);
  const variaveis = [
    { nome: 'quantidade', rotulo: 'Depósitos no dia', valores: dias.map(d => d.quantidade) },
    { nome: 'fimDeSemana', rotulo: 'Fim de semana (1 = sim)', valores: dias.map(d => ([0, 6].includes(d.diaSemana) ? 1 : 0)) },
    { nome: 'diaDoMes', rotulo: 'Dia do mês', valores: dias.map(d => Number(d.data.slice(8, 10))) },
  ];
  const todas = [{ nome: 'total', rotulo: 'Total guardado no dia (R$)', valores: y }, ...variaveis];
  const matriz = todas.map(a => todas.map(b => {
    const r = a.nome === b.nome ? 1 : correlacao(a.valores, b.valores);
    return r === null ? null : arred(r);
  }));
  const regressao = regressaoMultipla(variaveis, y);
  return {
    descricao: 'Y = total guardado no dia; X1 = depósitos no dia; X2 = fim de semana; X3 = dia do mês',
    diasAnalisados: dias.length,
    variaveis: todas.map(v => ({ nome: v.nome, rotulo: v.rotulo })),
    matriz,
    comY: variaveis.map(v => {
      const r = correlacao(v.valores, y);
      return { nome: v.nome, rotulo: v.rotulo, r: arred(r), classificacao: classificarCorrelacao(r) };
    }),
    pontos: dias.map((d, i) => ({
      data: d.data, total: arred(d.totalReais, 2), quantidade: variaveis[0].valores[i],
      fimDeSemana: variaveis[1].valores[i], diaDoMes: variaveis[2].valores[i],
    })),
    regressao: regressao && {
      ...regressao,
      r2: arred(regressao.r2), r2Ajustado: arred(regressao.r2Ajustado), erroPadraoResiduo: arred(regressao.erroPadraoResiduo),
      coeficientes: regressao.coeficientes.map(c => ({ ...c, b: arred(c.b), erroPadrao: arred(c.erroPadrao), t: arred(c.t), p: arred(c.p) })),
    },
  };
}

function analisarIntervalos(valores, cedulas, populacao) {
  const n = valores.length;
  const mediaAmostra = n ? media(valores) : null;
  const sigma = populacao.length >= 2 ? desvioPadrao(populacao) : null;
  const arredObj = obj => obj && Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, typeof v === 'number' ? arred(v) : v]));
  return {
    amostra: { n, media: arred(mediaAmostra), desvioPadraoAmostral: arred(n >= 2 ? desvioPadrao(valores, { amostral: true }) : null), cedulas },
    populacao: {
      n: populacao.length, media: arred(populacao.length ? media(populacao) : null), desvioPadrao: arred(sigma),
      descricao: 'todos os depósitos desde que o cofrinho foi criado',
    },
    niveis: NIVEIS_CONFIANCA.map(confianca => ({
      confianca,
      mediaComSigma: arredObj(intervaloMediaZ(mediaAmostra, sigma, n, confianca)),
      mediaSemSigma: arredObj(intervaloMediaT(valores, confianca)),
      proporcaoCedulas: arredObj(intervaloProporcao(cedulas, n, confianca)),
    })),
  };
}

export function analisarDepositos(depositos, { deMs, ateMs, agoraMs = Date.now(), saldoCentavos = 0, metaCentavos = null, dataMetaMs = null, populacao = null }) {
  const ordenados = depositos.filter(d => d.registradoEm >= deMs && d.registradoEm <= ateMs)
    .sort((a, b) => a.registradoEm - b.registradoEm);
  const valores = ordenados.map(d => d.valorCentavos / 100);
  const dias = diasDoPeriodo(deMs, ateMs);

  const porDia = new Map(dias.map(d => [d.chave, { data: d.chave, diaSemana: d.diaSemana, totalReais: 0, quantidade: 0 }]));
  for (const d of ordenados) {
    const dia = porDia.get(diaLocal(d.registradoEm).chave);
    if (dia) { dia.totalReais += d.valorCentavos / 100; dia.quantidade++; }
  }
  let acumulado = 0;
  const serieDiaria = [...porDia.values()].map(d => {
    acumulado += d.totalReais;
    return { data: d.data, totalReais: arred(d.totalReais, 2), quantidade: d.quantidade, saldoAcumuladoReais: arred(acumulado, 2) };
  });

  const porDiaSemana = DIAS_SEMANA.map((nome, i) => {
    const doDia = [...porDia.values()].filter(d => d.diaSemana === i);
    const comDeposito = doDia.filter(d => d.quantidade > 0).length;
    return { dia: nome, diasNoPeriodo: doDia.length, diasComDeposito: comDeposito,
      probabilidade: doDia.length ? arred(comDeposito / doDia.length) : null };
  });

  const inicio = ordenados[0]?.registradoEm;
  let saldoPeriodo = 0;
  const tendencia = regressaoLinear(
    ordenados.map(d => (d.registradoEm - inicio) / DIA_MS),
    ordenados.map(d => (saldoPeriodo += d.valorCentavos / 100)),
  );

  let saldoMoedas = 0;
  const pares = ordenados.filter(d => d.forma === 'moeda').map(d => ({ peso: d.pesoGramas, saldo: (saldoMoedas += d.valorCentavos / 100) }))
    .filter(p => typeof p.peso === 'number');
  const calibracao = regressaoLinear(pares.map(p => p.peso), pares.map(p => p.saldo));

  const faltaReais = metaCentavos === null ? null : (metaCentavos - saldoCentavos) / 100;
  let previsaoMeta = null;
  if (faltaReais !== null) {
    previsaoMeta = faltaReais <= 0 ? new Date(agoraMs).toISOString()
      : tendencia?.b > 0 ? new Date(agoraMs + (faltaReais / tendencia.b) * DIA_MS).toISOString() : null;
  }

  const fimDeSemana = ordenados.filter(d => [0, 6].includes(diaLocal(d.registradoEm).diaSemana)).map(d => d.valorCentavos / 100);
  const diasUteis = ordenados.filter(d => ![0, 6].includes(diaLocal(d.registradoEm).diaSemana)).map(d => d.valorCentavos / 100);
  const welch = testeTWelch(fimDeSemana, diasUteis);
  const valoresPopulacao = (populacao ?? ordenados).map(d => d.valorCentavos / 100);
  const cedulas = ordenados.filter(d => d.forma === 'cedula').length;
  const ic = intervaloConfiancaMedia(valores);
  const descritiva = resumoDescritivo(valores);

  const arredObj = obj => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, typeof v === 'number' ? arred(v) : v]));
  return {
    periodo: { de: new Date(deMs).toISOString(), ate: new Date(ateMs).toISOString(), dias: dias.length },
    n: valores.length,
    origem: {
      sensor: ordenados.filter(d => d.origem !== 'simulado').length,
      simulado: ordenados.filter(d => d.origem === 'simulado').length,
    },
    descritiva: {
      ...arredObj(descritiva),
      quartis: arredObj(descritiva.quartis),
      assimetria: arredObj(descritiva.assimetria),
      curtose: arredObj(descritiva.curtose),
    },
    frequencias: frequencias(valores).map(arredObj),
    histograma: histograma(valores).map(arredObj),
    serieDiaria,
    probabilidade: {
      depositoPorDiaSemana: porDiaSemana,
      meta: faltaReais === null || dataMetaMs === null ? null : {
        dataMeta: new Date(dataMetaMs).toISOString(),
        faltaReais: arred(Math.max(faltaReais, 0), 2),
        probabilidade: arred(probabilidadeMeta({
          totaisDiarios: [...porDia.values()].map(d => d.totalReais),
          faltaReais,
          diasRestantes: Math.ceil((dataMetaMs - agoraMs) / DIA_MS),
        })),
      },
    },
    correlacao: analisarCorrelacao(porDia),
    regressao: {
      tendencia: tendencia && { ...arredObj(tendencia), descricao: 'saldo acumulado no período (R$) = a + b × dias desde o primeiro depósito' },
      calibracao: calibracao && { ...arredObj(calibracao), descricao: 'saldo em moedas (R$) = a + b × peso medido (g)' },
      previsaoMeta,
    },
    inferencia: {
      intervaloConfiancaMedia: ic && arredObj(ic),
      intervalos: analisarIntervalos(valores, cedulas, valoresPopulacao),
      fimDeSemanaVsDiasUteis: welch && {
        ...arredObj(welch),
        mediaFimDeSemana: arred(media(fimDeSemana)),
        mediaDiasUteis: arred(media(diasUteis)),
        nFimDeSemana: fimDeSemana.length,
        nDiasUteis: diasUteis.length,
        conclusao: welch.rejeitaH0
          ? 'Há diferença significativa (5%) entre o valor médio dos depósitos no fim de semana e nos dias úteis.'
          : 'Não há evidência (5%) de diferença entre o valor médio dos depósitos no fim de semana e nos dias úteis.',
      },
    },
  };
}
