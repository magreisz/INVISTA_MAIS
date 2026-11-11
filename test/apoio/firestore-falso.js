export function criarFirestoreFalso() {
  const dados = new Map();
  let contador = 0;

  const snapshot = ref => {
    const valor = dados.get(ref.path);
    return { id: ref.id, ref, exists: valor !== undefined, data: () => (valor === undefined ? undefined : structuredClone(valor)) };
  };

  function docRef(caminho) {
    const ref = {
      id: caminho.split('/').at(-1),
      path: caminho,
      collection: nome => colecao(`${caminho}/${nome}`),
      get: async () => snapshot(ref),
      set: async (valor, opcoes) => {
        dados.set(caminho, opcoes?.merge ? { ...(dados.get(caminho) || {}), ...structuredClone(valor) } : structuredClone(valor));
      },
      update: async valor => {
        if (!dados.has(caminho)) throw Object.assign(new Error('NOT_FOUND'), { code: 5 });
        dados.set(caminho, { ...dados.get(caminho), ...structuredClone(valor) });
      },
      create: async valor => {
        if (dados.has(caminho)) throw Object.assign(new Error('ALREADY_EXISTS'), { code: 6 });
        dados.set(caminho, structuredClone(valor));
      },
    };
    return ref;
  }

  const compara = { '==': (a, b) => a === b, '>=': (a, b) => a >= b, '<=': (a, b) => a <= b };

  function consulta(caminho, filtros = [], ordem = null, maximo = Infinity) {
    return {
      where: (campo, op, valor) => consulta(caminho, [...filtros, [campo, op, valor]], ordem, maximo),
      orderBy: (campo, direcao = 'asc') => consulta(caminho, filtros, [campo, direcao], maximo),
      limit: n => consulta(caminho, filtros, ordem, n),
      get: async () => {
        let docs = [...dados.keys()]
          .filter(chave => chave.startsWith(`${caminho}/`) && !chave.slice(caminho.length + 1).includes('/'))
          .map(chave => snapshot(docRef(chave)));
        for (const [campo, op, valor] of filtros) docs = docs.filter(d => compara[op](d.data()[campo], valor));
        if (ordem) docs.sort((a, b) => (a.data()[ordem[0]] - b.data()[ordem[0]]) * (ordem[1] === 'desc' ? -1 : 1));
        return { docs: docs.slice(0, maximo) };
      },
    };
  }

  const colecao = caminho => ({
    ...consulta(caminho),
    doc: id => docRef(`${caminho}/${id ?? `auto${String(++contador).padStart(12, '0')}`}`),
  });

  return {
    dados,
    collection: colecao,
    async runTransaction(fn) {
      const escritas = [];
      const resultado = await fn({
        get: ref => ref.get(),
        create: (ref, valor) => escritas.push(() => ref.create(valor)),
        set: (ref, valor, opcoes) => escritas.push(() => ref.set(valor, opcoes)),
        update: (ref, valor) => escritas.push(() => ref.update(valor)),
      });
      for (const escrever of escritas) await escrever();
      return resultado;
    },
    batch() {
      const escritas = [];
      return {
        set: (ref, valor, opcoes) => escritas.push(() => ref.set(valor, opcoes)),
        delete: ref => escritas.push(async () => { dados.delete(ref.path); }),
        commit: async () => { for (const escrever of escritas) await escrever(); },
      };
    },
    async recursiveDelete(ref) {
      for (const chave of [...dados.keys()]) if (chave === ref.path || chave.startsWith(`${ref.path}/`)) dados.delete(chave);
    },
  };
}
