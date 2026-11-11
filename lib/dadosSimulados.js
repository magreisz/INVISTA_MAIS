const DIA_MS = 86400000;

const MOEDAS = [
  { valor: 5, gramas: 4.10, peso: 2 }, { valor: 10, gramas: 4.80, peso: 3 }, { valor: 25, gramas: 7.55, peso: 3 },
  { valor: 50, gramas: 7.81, peso: 3 }, { valor: 100, gramas: 7.00, peso: 4 },
];
const CEDULAS = [{ valor: 200, peso: 4 }, { valor: 500, peso: 3 }, { valor: 1000, peso: 2 }, { valor: 2000, peso: 1 }];
const CHANCE_POR_DIA = [0.6, 0.3, 0.3, 0.35, 0.35, 0.55, 0.65];

export function gerarDepositosSimulados({ dias = 60, agoraMs = Date.now(), semente = 20261001 } = {}) {
  let estado = semente;
  const aleatorio = () => {
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const sortear = opcoes => {
    let r = aleatorio() * opcoes.reduce((s, o) => s + o.peso, 0);
    return opcoes.find(o => (r -= o.peso) < 0) ?? opcoes.at(-1);
  };

  const hoje = new Date(agoraMs);
  hoje.setUTCHours(15, 0, 0, 0);
  let pesoTotal = 0;
  let diasSemDeposito = 0;
  const lista = [];
  for (let d = dias; d >= 1; d--) {
    const dia = new Date(hoje.getTime() - d * DIA_MS);
    if (aleatorio() > CHANCE_POR_DIA[dia.getUTCDay()] && diasSemDeposito < 3) {
      diasSemDeposito++;
      continue;
    }
    diasSemDeposito = 0;
    const quantidade = 1 + Math.floor(aleatorio() * 3);
    for (let i = 0; i < quantidade; i++) {
      const cedula = aleatorio() < 0.15;
      const item = sortear(cedula ? CEDULAS : MOEDAS);
      pesoTotal += cedula ? 1 : item.gramas + (aleatorio() - 0.5) * 0.2;
      lista.push({
        id: `sim-${dia.toISOString().slice(0, 10)}-${i}`,
        dados: {
          valorCentavos: item.valor, forma: cedula ? 'cedula' : 'moeda', pesoGramas: Math.round(pesoTotal * 10) / 10,
          registradoEm: dia.getTime() - 3 * 3600000 + Math.floor(aleatorio() * 10 * 3600000) + i * 60000, origem: 'simulado',
        },
      });
    }
  }
  return lista;
}

export async function gravarEmLotes(db, operacoes) {
  for (let i = 0; i < operacoes.length; i += 400) {
    const lote = db.batch();
    operacoes.slice(i, i + 400).forEach(operacao => operacao(lote));
    await lote.commit();
  }
}
