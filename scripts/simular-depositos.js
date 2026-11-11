import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { gerarDepositosSimulados, gravarEmLotes } from '../lib/dadosSimulados.js';

const [dispositivoId, argumento = '60'] = process.argv.slice(2);
if (!/^[A-Za-z0-9]{10,40}$/.test(dispositivoId || '')) {
  console.error('Uso: node --env-file=.env scripts/simular-depositos.js <dispositivoId> [dias|--limpar]');
  process.exit(1);
}

initializeApp(process.env.FIRESTORE_EMULATOR_HOST ? { projectId: process.env.FIREBASE_PROJECT_ID || 'demo-invista' } : {
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});
const db = getFirestore();
const depositos = db.collection('dispositivos').doc(dispositivoId).collection('depositos');

if (argumento === '--limpar') {
  const simulados = await depositos.where('origem', '==', 'simulado').get();
  await gravarEmLotes(db, simulados.docs.map(doc => lote => lote.delete(doc.ref)));
  console.log(`${simulados.docs.length} depósitos simulados removidos.`);
  process.exit(0);
}

const dias = Math.min(Math.max(parseInt(argumento, 10) || 60, 1), 365);
const lote = gerarDepositosSimulados({ dias });
await gravarEmLotes(db, lote.map(({ id, dados }) => escrita => escrita.set(depositos.doc(id), dados)));
console.log(`${lote.length} depósitos simulados gravados em ${dias} dias (origem: "simulado").`);
