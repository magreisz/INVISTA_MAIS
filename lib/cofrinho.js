import express from 'express';
import { z } from 'zod';
import { HttpError, chaveConfere, exigirUsuario, gerarChaveDispositivo } from './auth.js';
import { BlynkError, CORES, PINOS } from './blynk.js';
import { analisarDepositos, diaLocal } from './estatistica.js';
import { simularRendimento } from './simulacao.js';

const DIA_MS = 86400000;
const MAX_DISPOSITIVOS = 5;
const INTERVALO_RELATORIO_MS = 10 * 60000;

const idEvento = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/);
const tokenBlynk = z.string().regex(/^[A-Za-z0-9_-]{20,64}$/);
const meta = z.number().int().min(100).max(100_000_000);
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(dia => diaLocal(new Date(`${dia}T12:00:00-03:00`).getTime() || 0).chave === dia, 'Data inválida. Use AAAA-MM-DD.');

const esquemas = {
  novoDispositivo: z.object({ apelido: z.string().trim().min(1).max(40), blynkToken: tokenBlynk, metaCentavos: meta.optional() }).strict(),
  edicaoDispositivo: z.object({ apelido: z.string().trim().min(1).max(40).optional(), blynkToken: tokenBlynk.optional(), metaCentavos: meta.nullable().optional() })
    .strict().refine(dados => Object.keys(dados).length > 0, 'Informe ao menos um campo.'),
  deposito: z.object({
    id: idEvento, valorCentavos: z.number().int().min(1).max(100_000),
    forma: z.enum(['moeda', 'cedula']), pesoGramas: z.number().min(0).max(50_000).nullable().optional(),
  }).strict(),
  evento: z.object({ id: idEvento, tipo: z.enum(['tampa_aberta', 'tampa_fechada', 'violacao']) }).strict(),
  atuadores: z.object({
    trava: z.boolean().optional(), cor: z.enum(CORES).optional(),
    brilho: z.number().int().min(0).max(100).optional(), buzzer: z.literal(true).optional(),
  }).strict().refine(dados => Object.keys(dados).length > 0, 'Informe ao menos um atuador.'),
  lista: z.object({ de: data.optional(), ate: data.optional(), limite: z.coerce.number().int().min(1).max(500).default(100) }).strict(),
  estatisticas: z.object({ de: data.optional(), ate: data.optional(), dataMeta: data.optional() }).strict(),
  simulacao: z.object({
    meses: z.coerce.number().int().min(1).max(120).default(12),
    aporteMensalCentavos: z.coerce.number().int().min(0).max(10_000_000).default(0),
  }).strict(),
};

export function validar(esquema, dados) {
  const resultado = esquema.safeParse(dados ?? {});
  if (resultado.success) return resultado.data;
  const problema = resultado.error.issues[0];
  if (problema.code === 'unrecognized_keys') throw new HttpError(400, `Campo não permitido: ${problema.keys.join(', ')}.`);
  if (problema.code === 'custom') throw new HttpError(400, problema.message);
  throw new HttpError(400, `Campo inválido: ${problema.path.join('.') || 'corpo da requisição'}.`);
}

const iso = ms => (typeof ms === 'number' ? new Date(ms).toISOString() : null);
const inicioDoDia = dia => new Date(`${dia}T00:00:00-03:00`).getTime();
const fimDoDia = dia => new Date(`${dia}T23:59:59.999-03:00`).getTime();
const rota = fn => (req, res, next) => fn(req, res).catch(next);

const dispositivoPublico = (id, d) => ({
  id, apelido: d.apelido, metaCentavos: d.metaCentavos ?? null, saldoCentavos: d.saldoCentavos ?? 0,
  criadoEm: iso(d.criadoEm), ultimoDepositoEm: iso(d.ultimoDepositoEm),
});

const escaparHtml = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const reais = centavos => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function criarRotasDispositivos({ db, verifyToken, blynk, enviarEmail, getSelic, analisarAtivo, agora = () => Date.now() }) {
  const router = express.Router();
  const usuario = exigirUsuario(verifyToken);
  const colecao = () => db.collection('dispositivos');

  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next(db ? undefined : new HttpError(503, 'Banco de dados indisponível no momento.'));
  });

  async function doDono(req) {
    if (!/^[A-Za-z0-9]{10,40}$/.test(req.params.id)) throw new HttpError(404, 'Dispositivo não encontrado.');
    const ref = colecao().doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().dono !== req.usuario.uid) throw new HttpError(404, 'Dispositivo não encontrado.');
    return { ref, dados: doc.data() };
  }

  async function doDispositivo(req) {
    const doc = /^[A-Za-z0-9]{10,40}$/.test(req.params.id) ? await colecao().doc(req.params.id).get() : null;
    if (!doc?.exists || !chaveConfere(req, doc.data().chaveHash)) throw new HttpError(401, 'Chave do dispositivo inválida.');
    return { ref: doc.ref ?? colecao().doc(req.params.id), dados: doc.data() };
  }

  async function enviarMetaAoBlynk(token, metaCentavos) {
    await blynk.atualizar(token, { [PINOS.meta]: metaCentavos === null ? 0 : metaCentavos / 100 }).catch(() => {});
  }

  async function listarPeriodo(ref, subcolecao, { de, ate, limite }) {
    const fim = ate ? fimDoDia(ate) : agora();
    const inicio = de ? inicioDoDia(de) : fim - 90 * DIA_MS;
    if (inicio > fim) throw new HttpError(400, 'A data inicial é posterior à final.');
    const snapshot = await ref.collection(subcolecao).where('registradoEm', '>=', inicio).where('registradoEm', '<=', fim)
      .orderBy('registradoEm', 'desc').limit(limite).get();
    return { inicio, fim, docs: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) };
  }

  router.post('/', usuario, rota(async (req, res) => {
    const entrada = validar(esquemas.novoDispositivo, req.body);
    const existentes = await colecao().where('dono', '==', req.usuario.uid).get();
    if (existentes.docs.length >= MAX_DISPOSITIVOS) throw new HttpError(409, `Limite de ${MAX_DISPOSITIVOS} dispositivos por conta.`);
    const { chave, hash } = gerarChaveDispositivo();
    const ref = colecao().doc();
    const dados = {
      dono: req.usuario.uid, emailDono: req.usuario.email, apelido: entrada.apelido, blynkToken: entrada.blynkToken,
      metaCentavos: entrada.metaCentavos ?? null, saldoCentavos: 0, chaveHash: hash, criadoEm: agora(),
    };
    await ref.set(dados);
    if (dados.metaCentavos !== null) await enviarMetaAoBlynk(dados.blynkToken, dados.metaCentavos);
    res.status(201).location(`/api/dispositivos/${ref.id}`)
      .json({ ...dispositivoPublico(ref.id, dados), chaveDispositivo: chave, aviso: 'Guarde a chave: ela não será mostrada de novo.' });
  }));

  router.get('/', usuario, rota(async (req, res) => {
    const snapshot = await colecao().where('dono', '==', req.usuario.uid).get();
    res.json({ dispositivos: snapshot.docs.map(doc => dispositivoPublico(doc.id, doc.data())) });
  }));

  router.get('/:id', usuario, rota(async (req, res) => {
    const { dados } = await doDono(req);
    res.json(dispositivoPublico(req.params.id, dados));
  }));

  router.patch('/:id', usuario, rota(async (req, res) => {
    const entrada = validar(esquemas.edicaoDispositivo, req.body);
    const { ref, dados } = await doDono(req);
    await ref.update(entrada);
    const atualizado = { ...dados, ...entrada };
    if ('metaCentavos' in entrada || 'blynkToken' in entrada) await enviarMetaAoBlynk(atualizado.blynkToken, atualizado.metaCentavos ?? null);
    res.json(dispositivoPublico(req.params.id, atualizado));
  }));

  router.delete('/:id', usuario, rota(async (req, res) => {
    const { ref } = await doDono(req);
    await db.recursiveDelete(ref);
    res.status(204).end();
  }));

  router.post('/:id/chave', usuario, rota(async (req, res) => {
    const { ref } = await doDono(req);
    const { chave, hash } = gerarChaveDispositivo();
    await ref.update({ chaveHash: hash });
    res.json({ chaveDispositivo: chave });
  }));

  router.post('/:id/depositos', rota(async (req, res) => {
    const { ref } = await doDispositivo(req);
    const entrada = validar(esquemas.deposito, req.body);
    const depositoRef = ref.collection('depositos').doc(entrada.id);
    const resultado = await db.runTransaction(async tx => {
      const [dispositivo, existente] = [await tx.get(ref), await tx.get(depositoRef)];
      const saldo = dispositivo.data().saldoCentavos ?? 0;
      if (existente.exists) return { duplicado: true, saldoCentavos: saldo };
      const registradoEm = agora();
      tx.create(depositoRef, {
        valorCentavos: entrada.valorCentavos, forma: entrada.forma, pesoGramas: entrada.pesoGramas ?? null,
        registradoEm, origem: 'sensor',
      });
      tx.update(ref, { saldoCentavos: saldo + entrada.valorCentavos, ultimoDepositoEm: registradoEm });
      return { duplicado: false, saldoCentavos: saldo + entrada.valorCentavos };
    });
    res.status(resultado.duplicado ? 200 : 201).json({ id: entrada.id, ...resultado });
  }));

  router.get('/:id/saldo', rota(async (req, res) => {
    const { dados } = await doDispositivo(req);
    res.json({ saldoCentavos: dados.saldoCentavos ?? 0, metaCentavos: dados.metaCentavos ?? null });
  }));

  router.post('/:id/eventos', rota(async (req, res) => {
    const { ref } = await doDispositivo(req);
    const entrada = validar(esquemas.evento, req.body);
    try {
      await ref.collection('eventos').doc(entrada.id).create({ tipo: entrada.tipo, registradoEm: agora() });
    } catch (error) {
      if (error.code !== 6) throw error;
      return res.status(200).json({ id: entrada.id, duplicado: true });
    }
    res.status(201).json({ id: entrada.id, duplicado: false });
  }));

  router.post('/:id/relatorios', rota(async (req, res) => {
    const { ref, dados } = await doDispositivo(req);
    if (!dados.emailDono) throw new HttpError(409, 'A conta dona do cofrinho não tem e-mail verificado.');
    await db.runTransaction(async tx => {
      const atual = (await tx.get(ref)).data();
      if (agora() - (atual.ultimoRelatorioEm || 0) < INTERVALO_RELATORIO_MS) {
        throw new HttpError(429, 'Um relatório foi enviado há pouco. Aguarde 10 minutos.');
      }
      tx.update(ref, { ultimoRelatorioEm: agora() });
    });
    const { docs } = await listarPeriodo(ref, 'depositos', { limite: 500, de: undefined, ate: undefined });
    const fim = agora();
    const estatisticas = analisarDepositos(docs, { deMs: fim - 30 * DIA_MS, ateMs: fim, agoraMs: fim, saldoCentavos: dados.saldoCentavos ?? 0 });
    const usuarioDoc = await db.collection('users').doc(dados.dono).get();
    const favoritos = (usuarioDoc.exists ? usuarioDoc.data().favoritos ?? [] : []).slice(0, 5);
    const linhas = await Promise.all(favoritos.map(async ticker => {
      try {
        const a = await analisarAtivo({ ticker, perfil: 'moderado', tipo: /11$/.test(ticker) ? 'fiis' : 'acoes' });
        return `<li><b>${escaparHtml(ticker)}</b>: cotação ${escaparHtml(a.cotacao?.value)}, DY ${escaparHtml(a.dy?.value)}</li>`;
      } catch { return `<li><b>${escaparHtml(ticker)}</b>: indisponível no momento</li>`; }
    }));
    await enviarEmail({
      para: dados.emailDono,
      assunto: `Relatório do cofrinho ${dados.apelido}`,
      html: `<div style="font-family: Arial; color: #333;">
        <h2 style="color: #004a9f;">Cofrinho ${escaparHtml(dados.apelido)}</h2>
        <p>Saldo: <b>${reais(dados.saldoCentavos ?? 0)}</b>${dados.metaCentavos ? ` de ${reais(dados.metaCentavos)} (meta)` : ''}.</p>
        <p>Últimos 30 dias: ${estatisticas.n} depósitos, média de ${reais(Math.round((estatisticas.descritiva.media ?? 0) * 100))}.</p>
        ${linhas.length ? `<h3>Ativos favoritos</h3><ul>${linhas.join('')}</ul>` : ''}
        <p style="font-size: 0.85em; color: #666;">Conteúdo educativo. Não é recomendação de investimento.</p></div>`,
    });
    res.status(202).json({ mensagem: 'Relatório enviado para o e-mail da conta.' });
  }));

  router.get('/:id/depositos', usuario, rota(async (req, res) => {
    const filtros = validar(esquemas.lista, req.query);
    const { ref } = await doDono(req);
    const { docs } = await listarPeriodo(ref, 'depositos', filtros);
    res.json({ depositos: docs.map(d => ({ ...d, registradoEm: iso(d.registradoEm) })) });
  }));

  router.get('/:id/eventos', usuario, rota(async (req, res) => {
    const filtros = validar(esquemas.lista, req.query);
    const { ref } = await doDono(req);
    const { docs } = await listarPeriodo(ref, 'eventos', filtros);
    res.json({ eventos: docs.map(d => ({ ...d, registradoEm: iso(d.registradoEm) })) });
  }));

  router.get('/:id/estatisticas', usuario, rota(async (req, res) => {
    const filtros = validar(esquemas.estatisticas, req.query);
    const { ref, dados } = await doDono(req);
    const { inicio, fim, docs } = await listarPeriodo(ref, 'depositos', { ...filtros, limite: 5000 });
    const historico = await ref.collection('depositos').orderBy('registradoEm', 'desc').limit(5000).get();
    res.json(analisarDepositos(docs, {
      populacao: historico.docs.map(doc => doc.data()),
      deMs: inicio, ateMs: fim, agoraMs: agora(), saldoCentavos: dados.saldoCentavos ?? 0,
      metaCentavos: dados.metaCentavos ?? null, dataMetaMs: filtros.dataMeta ? fimDoDia(filtros.dataMeta) : null,
    }));
  }));

  router.get('/:id/simulacao', usuario, rota(async (req, res) => {
    const filtros = validar(esquemas.simulacao, req.query);
    const { dados } = await doDono(req);
    res.json(simularRendimento({ ...filtros, saldoCentavos: dados.saldoCentavos ?? 0, selicAnual: await getSelic() }));
  }));

  router.get('/:id/estado', usuario, rota(async (req, res) => {
    const { dados } = await doDono(req);
    const [online, v] = await Promise.all([blynk.conectado(dados.blynkToken), blynk.ler(dados.blynkToken, Object.values(PINOS))]);
    const numero = x => (x === undefined || x === null || x === '' || Number.isNaN(Number(x)) ? null : Number(x));
    res.json({
      online,
      sensores: {
        saldoReais: numero(v[PINOS.saldo]), ultimoDepositoReais: numero(v[PINOS.ultimoDeposito]),
        pesoGramas: numero(v[PINOS.peso]), luzPercentual: numero(v[PINOS.luz]), tampaAberta: numero(v[PINOS.tampa]) === 1,
      },
      atuadores: {
        trava: numero(v[PINOS.trava]) === 1, cor: CORES[numero(v[PINOS.cor])] ?? 'desligado',
        brilho: numero(v[PINOS.brilho]), metaReais: numero(v[PINOS.meta]),
      },
    });
  }));

  router.patch('/:id/atuadores', usuario, rota(async (req, res) => {
    const entrada = validar(esquemas.atuadores, req.body);
    const { dados } = await doDono(req);
    const comandos = {};
    if (entrada.trava !== undefined) comandos[PINOS.trava] = entrada.trava ? 1 : 0;
    if (entrada.cor !== undefined) comandos[PINOS.cor] = CORES.indexOf(entrada.cor);
    if (entrada.brilho !== undefined) comandos[PINOS.brilho] = entrada.brilho;
    if (entrada.buzzer) comandos[PINOS.buzzer] = 1;
    await blynk.atualizar(dados.blynkToken, comandos);
    res.json({ enviado: entrada });
  }));

  router.use((error, _req, res, _next) => {
    if (error instanceof HttpError || error instanceof BlynkError) return res.status(error.status).json({ error: error.message });
    console.error('Erro nas rotas do cofrinho:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  });

  return router;
}
