import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { criarRotasDispositivos } from '../lib/cofrinho.js';
import { criarRotasFavoritos } from '../lib/favoritos.js';
import { criarClienteBlynk } from '../lib/blynk.js';
import { simularRendimento } from '../lib/simulacao.js';
import { criarFirestoreFalso } from './apoio/firestore-falso.js';

const TOKEN_BLYNK = 'AbCdEfGhIjKlMnOpQrStUvWxYz012345';
const usuarios = {
  u1: { uid: 'u1', email: 'dono@exemplo.com' },
  u2: { uid: 'u2', email: 'outra@exemplo.com' },
  anon: { uid: 'x', firebase: { sign_in_provider: 'anonymous' } },
};

function montar(t) {
  const db = criarFirestoreFalso();
  const chamadasBlynk = [];
  const emails = [];
  let relogio = Date.UTC(2026, 9, 1, 15);
  let blynkQuebrado = false;
  const blynk = {
    atualizar: async (token, valores) => { chamadasBlynk.push({ token, valores }); },
    ler: async () => {
      if (blynkQuebrado) throw new Error('detalhe interno do provedor');
      return { v0: 12.5, v1: 1, v2: 90.5, v3: 40, v4: 0, v5: 1, v6: 3, v7: 80, v9: 50 };
    },
    conectado: async () => true,
  };
  const app = express();
  app.use(express.json());
  const verifyToken = async token => { if (!usuarios[token]) throw new Error('inválido'); return usuarios[token]; };
  app.use('/api/usuarios/me/favoritos', criarRotasFavoritos({ db, verifyToken }));
  app.use('/api/dispositivos', criarRotasDispositivos({
    db, verifyToken, blynk, agora: () => relogio,
    enviarEmail: async email => { emails.push(email); },
    getSelic: async () => 15,
    analisarAtivo: async ({ ticker }) => ({ cotacao: { value: 'R$ 10,00' }, dy: { value: '12,00%' }, ticker }),
  }));
  const servidor = app.listen(0);
  t.after(() => servidor.close());
  const chamar = (metodo, caminho, { token, corpo } = {}) => fetch(`http://127.0.0.1:${servidor.address().port}${caminho}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  return {
    db, chamadasBlynk, emails, chamar,
    avancar: ms => { relogio += ms; },
    quebrarBlynk: () => { blynkQuebrado = true; },
  };
}

async function cadastrar(ctx, dados = {}) {
  const resposta = await ctx.chamar('POST', '/api/dispositivos', { token: 'u1', corpo: { apelido: 'Cofre da Ana', blynkToken: TOKEN_BLYNK, ...dados } });
  assert.equal(resposta.status, 201);
  return resposta.json();
}

test('cadastro exige login, rejeita campos extras e nunca devolve segredos', async t => {
  const ctx = montar(t);
  assert.equal((await ctx.chamar('POST', '/api/dispositivos', { corpo: {} })).status, 401);
  assert.equal((await ctx.chamar('POST', '/api/dispositivos', { token: 'anon', corpo: {} })).status, 401);
  const extra = await ctx.chamar('POST', '/api/dispositivos', { token: 'u1', corpo: { apelido: 'A', blynkToken: TOKEN_BLYNK, dono: 'u2' } });
  assert.equal(extra.status, 400);
  assert.match((await extra.json()).error, /não permitido: dono/);

  const criado = await cadastrar(ctx, { metaCentavos: 5000 });
  assert.ok(criado.chaveDispositivo.length >= 30);
  for (const segredo of ['blynkToken', 'chaveHash', 'dono', 'emailDono']) assert.equal(criado[segredo], undefined);
  assert.deepEqual(ctx.chamadasBlynk.at(-1), { token: TOKEN_BLYNK, valores: { v9: 50 } });
  const salvo = ctx.db.dados.get(`dispositivos/${criado.id}`);
  assert.notEqual(salvo.chaveHash, criado.chaveDispositivo);

  const lista = await (await ctx.chamar('GET', '/api/dispositivos', { token: 'u1' })).json();
  assert.equal(lista.dispositivos.length, 1);
  assert.equal(JSON.stringify(lista).includes(TOKEN_BLYNK), false);
  assert.equal((await (await ctx.chamar('GET', '/api/dispositivos', { token: 'u2' })).json()).dispositivos.length, 0);

  for (let i = 0; i < 4; i++) await cadastrar(ctx);
  assert.equal((await ctx.chamar('POST', '/api/dispositivos', { token: 'u1', corpo: { apelido: 'B', blynkToken: TOKEN_BLYNK } })).status, 409);
});

test('IDOR: outra conta recebe 404 em todas as rotas do dispositivo', async t => {
  const ctx = montar(t);
  const { id } = await cadastrar(ctx);
  for (const [metodo, caminho, corpo] of [
    ['GET', ''], ['PATCH', '', { apelido: 'x' }], ['DELETE', ''], ['POST', '/chave'], ['GET', '/depositos'], ['GET', '/eventos'],
    ['GET', '/estatisticas'], ['GET', '/simulacao'], ['GET', '/estado'], ['PATCH', '/atuadores', { trava: false }],
  ]) {
    assert.equal((await ctx.chamar(metodo, `/api/dispositivos/${id}${caminho}`, { token: 'u2', corpo })).status, 404, `${metodo} ${caminho}`);
  }
  assert.equal(ctx.chamadasBlynk.length, 0);
});

test('ESP32 registra depósitos com a chave, sem duplicar reenvios', async t => {
  const ctx = montar(t);
  const { id, chaveDispositivo } = await cadastrar(ctx);
  const deposito = { id: 'esp-1-0001', valorCentavos: 100, forma: 'moeda', pesoGramas: 7.1 };
  assert.equal((await ctx.chamar('POST', `/api/dispositivos/${id}/depositos`, { corpo: deposito })).status, 401);
  assert.equal((await ctx.chamar('POST', `/api/dispositivos/${id}/depositos`, { token: 'chave-errada', corpo: deposito })).status, 401);
  assert.equal((await ctx.chamar('POST', `/api/dispositivos/${id}/depositos`, { token: 'u1', corpo: deposito })).status, 401);

  const primeiro = await ctx.chamar('POST', `/api/dispositivos/${id}/depositos`, { token: chaveDispositivo, corpo: deposito });
  assert.equal(primeiro.status, 201);
  assert.deepEqual(await primeiro.json(), { id: 'esp-1-0001', duplicado: false, saldoCentavos: 100 });
  const reenvio = await ctx.chamar('POST', `/api/dispositivos/${id}/depositos`, { token: chaveDispositivo, corpo: deposito });
  assert.equal(reenvio.status, 200);
  assert.equal((await reenvio.json()).saldoCentavos, 100);

  for (const invalido of [{ ...deposito, id: 'x' }, { ...deposito, valorCentavos: -5 }, { ...deposito, forma: 'pix' }, { ...deposito, saldoCentavos: 1e9 }]) {
    assert.equal((await ctx.chamar('POST', `/api/dispositivos/${id}/depositos`, { token: chaveDispositivo, corpo: invalido })).status, 400);
  }
  const lista = await (await ctx.chamar('GET', `/api/dispositivos/${id}/depositos`, { token: 'u1' })).json();
  assert.equal(lista.depositos.length, 1);

  assert.equal((await ctx.chamar('GET', `/api/dispositivos/${id}/saldo`)).status, 401);
  assert.equal((await ctx.chamar('GET', `/api/dispositivos/${id}/saldo`, { token: 'u1' })).status, 401);
  const saldo = await ctx.chamar('GET', `/api/dispositivos/${id}/saldo`, { token: chaveDispositivo });
  assert.equal(saldo.status, 200);
  assert.deepEqual(await saldo.json(), { saldoCentavos: 100, metaCentavos: null });
  assert.equal(lista.depositos[0].origem, 'sensor');

  const evento = { id: 'esp-1-0002', tipo: 'tampa_aberta' };
  assert.equal((await ctx.chamar('POST', `/api/dispositivos/${id}/eventos`, { token: chaveDispositivo, corpo: evento })).status, 201);
  assert.equal((await ctx.chamar('POST', `/api/dispositivos/${id}/eventos`, { token: chaveDispositivo, corpo: evento })).status, 200);

  const nova = await (await ctx.chamar('POST', `/api/dispositivos/${id}/chave`, { token: 'u1' })).json();
  const comAntiga = await ctx.chamar('POST', `/api/dispositivos/${id}/depositos`, { token: chaveDispositivo, corpo: { ...deposito, id: 'esp-1-0003' } });
  assert.equal(comAntiga.status, 401);
  assert.equal((await ctx.chamar('POST', `/api/dispositivos/${id}/depositos`, { token: nova.chaveDispositivo, corpo: { ...deposito, id: 'esp-1-0003' } })).status, 201);
});

test('estatísticas e simulação usam os depósitos e a Selic', async t => {
  const ctx = montar(t);
  const { id, chaveDispositivo } = await cadastrar(ctx, { metaCentavos: 10000 });
  for (let i = 0; i < 12; i++) {
    await ctx.chamar('POST', `/api/dispositivos/${id}/depositos`, {
      token: chaveDispositivo, corpo: { id: `esp-1-${String(i).padStart(4, '0')}`, valorCentavos: [25, 50, 100][i % 3], forma: 'moeda', pesoGramas: 7 * (i + 1) },
    });
    ctx.avancar(86400000);
  }
  const est = await (await ctx.chamar('GET', `/api/dispositivos/${id}/estatisticas?dataMeta=2026-12-31`, { token: 'u1' })).json();
  assert.equal(est.n, 12);
  assert.equal(est.descritiva.mediana, 0.5);
  assert.ok(est.regressao.tendencia.b > 0);
  assert.ok(est.probabilidade.meta.probabilidade >= 0 && est.probabilidade.meta.probabilidade <= 1);
  assert.equal((await ctx.chamar('GET', `/api/dispositivos/${id}/estatisticas?de=2026-13-01`, { token: 'u1' })).status, 400);
  assert.equal((await ctx.chamar('GET', `/api/dispositivos/${id}/estatisticas?de=2026-10-10&ate=2026-10-01`, { token: 'u1' })).status, 400);

  const sim = await (await ctx.chamar('GET', `/api/dispositivos/${id}/simulacao?meses=6&aporteMensalCentavos=1000`, { token: 'u1' })).json();
  assert.equal(sim.serie.length, 7);
  assert.equal(sim.taxasMensais.poupanca, 0.005);
  assert.ok(sim.serie.at(-1).selic > sim.serie.at(-1).poupanca && sim.serie.at(-1).poupanca > sim.serie.at(-1).cofre);
  assert.match(sim.aviso, /Não é recomendação/);
});

test('simulação aplica a regra da poupança abaixo de 8,5% de Selic', () => {
  const r = simularRendimento({ saldoCentavos: 10000, meses: 12, selicAnual: 8 });
  assert.equal(r.taxasMensais.poupanca, Math.round(((1 + 0.056) ** (1 / 12) - 1) * 1e6) / 1e6);
});

test('estado e atuadores passam pelo Blynk; erro interno não vaza detalhes', async t => {
  const ctx = montar(t);
  const { id } = await cadastrar(ctx);
  const estado = await (await ctx.chamar('GET', `/api/dispositivos/${id}/estado`, { token: 'u1' })).json();
  assert.deepEqual(estado.atuadores, { trava: true, cor: 'vermelho', brilho: 80, metaReais: 50 });
  assert.equal(estado.sensores.pesoGramas, 90.5);

  const ok = await ctx.chamar('PATCH', `/api/dispositivos/${id}/atuadores`, { token: 'u1', corpo: { trava: true, cor: 'vermelho', buzzer: true } });
  assert.equal(ok.status, 200);
  assert.deepEqual(ctx.chamadasBlynk.at(-1).valores, { v5: 1, v6: 3, v8: 1 });
  for (const corpo of [{}, { cor: 'rosa' }, { brilho: 101 }, { buzzer: false }, { servo: 1 }]) {
    assert.equal((await ctx.chamar('PATCH', `/api/dispositivos/${id}/atuadores`, { token: 'u1', corpo })).status, 400);
  }
  ctx.quebrarBlynk();
  const erro = await ctx.chamar('GET', `/api/dispositivos/${id}/estado`, { token: 'u1' });
  assert.equal(erro.status, 500);
  assert.equal(JSON.stringify(await erro.json()).includes('provedor'), false);
});

test('relatório por e-mail escapa HTML e respeita o intervalo de 10 minutos', async t => {
  const ctx = montar(t);
  const { id, chaveDispositivo } = await cadastrar(ctx, { apelido: '<img src=x onerror=alert(1)>' });
  await ctx.db.collection('users').doc('u1').set({ favoritos: ['MXRF11', 'PETR4'] });
  const primeiro = await ctx.chamar('POST', `/api/dispositivos/${id}/relatorios`, { token: chaveDispositivo });
  assert.equal(primeiro.status, 202);
  assert.equal(ctx.emails[0].para, 'dono@exemplo.com');
  assert.ok(!ctx.emails[0].html.includes('<img'));
  assert.ok(ctx.emails[0].html.includes('&lt;img'));
  assert.ok(ctx.emails[0].html.includes('MXRF11'));
  assert.equal((await ctx.chamar('POST', `/api/dispositivos/${id}/relatorios`, { token: chaveDispositivo })).status, 429);
  ctx.avancar(10 * 60000);
  assert.equal((await ctx.chamar('POST', `/api/dispositivos/${id}/relatorios`, { token: chaveDispositivo })).status, 202);
});

test('excluir apaga o dispositivo e o histórico', async t => {
  const ctx = montar(t);
  const { id, chaveDispositivo } = await cadastrar(ctx);
  await ctx.chamar('POST', `/api/dispositivos/${id}/depositos`, { token: chaveDispositivo, corpo: { id: 'esp-1-0001', valorCentavos: 50, forma: 'moeda' } });
  assert.equal((await ctx.chamar('DELETE', `/api/dispositivos/${id}`, { token: 'u1' })).status, 204);
  assert.equal((await ctx.chamar('GET', `/api/dispositivos/${id}`, { token: 'u1' })).status, 404);
  assert.equal([...ctx.db.dados.keys()].some(chave => chave.includes(id)), false);
});

test('favoritos pela API: login, validação e limite', async t => {
  const ctx = montar(t);
  assert.equal((await ctx.chamar('GET', '/api/usuarios/me/favoritos')).status, 401);
  assert.deepEqual(await (await ctx.chamar('PUT', '/api/usuarios/me/favoritos/petr4', { token: 'u1' })).json(), { favoritos: ['PETR4'] });
  await ctx.chamar('PUT', '/api/usuarios/me/favoritos/PETR4', { token: 'u1' });
  await ctx.chamar('PUT', '/api/usuarios/me/favoritos/MXRF11', { token: 'u1' });
  assert.deepEqual(await (await ctx.chamar('GET', '/api/usuarios/me/favoritos', { token: 'u1' })).json(), { favoritos: ['PETR4', 'MXRF11'] });
  assert.equal((await ctx.chamar('PUT', '/api/usuarios/me/favoritos/..%2Fadmin', { token: 'u1' })).status, 400);
  assert.deepEqual(await (await ctx.chamar('DELETE', '/api/usuarios/me/favoritos/PETR4', { token: 'u1' })).json(), { favoritos: ['MXRF11'] });
  assert.deepEqual(await (await ctx.chamar('GET', '/api/usuarios/me/favoritos', { token: 'u2' })).json(), { favoritos: [] });
});

test('cliente Blynk monta URLs documentadas e trata erros', async () => {
  const urls = [];
  const cliente = criarClienteBlynk({
    servidor: 'ny3.blynk.cloud',
    fetchImpl: async url => {
      urls.push(String(url));
      if (String(url).includes('isHardwareConnected')) return new Response('true');
      if (String(url).includes('/get?')) return new Response('{"v0":10,"v5":1}');
      return new Response('');
    },
  });
  assert.equal(await cliente.conectado('tok'), true);
  assert.deepEqual(await cliente.ler('tok', ['v0', 'v5']), { v0: 10, v5: 1 });
  await cliente.atualizar('tok', { v5: 1, v6: 3 });
  assert.deepEqual(urls, [
    'https://ny3.blynk.cloud/external/api/isHardwareConnected?token=tok',
    'https://ny3.blynk.cloud/external/api/get?token=tok&v0=&v5=',
    'https://ny3.blynk.cloud/external/api/update?token=tok&v5=1',
    'https://ny3.blynk.cloud/external/api/update?token=tok&v6=3',
  ]);
  const recusa = criarClienteBlynk({ fetchImpl: async () => new Response('{"error":{"message":"Invalid token."}}', { status: 400 }) });
  await assert.rejects(recusa.conectado('tok'), erro => erro.status === 502);
  const fora = criarClienteBlynk({ fetchImpl: async () => { throw new Error('timeout'); } });
  await assert.rejects(fora.ler('tok', ['v0']), erro => erro.status === 504);
  assert.throws(() => criarClienteBlynk({ servidor: 'evil.com/x?' }));
});
