import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const PALETAS = {
  claro: {
    tema: 'claro', fundo: '#f4f7fa', painel: '#ffffff', primaria: '#004a9f', texto: '#25303b', suave: '#667788',
    borda: '#dde4ec', bom: '#28a745', ruim: '#dc3545', sutil: '#eef2f7', erroFundo: '#fdecee',
    sobrePrimaria: '#ffffff', campo: '#ffffff', topo: '#ffffff', linha: 'rgba(37, 48, 59, 0.18)',
  },
  escuro: {
    tema: 'escuro', fundo: '#0e141b', painel: '#17202a', primaria: '#5aa2ff', texto: '#e6edf3', suave: '#97a5b4',
    borda: '#2a3644', bom: '#3ccf6b', ruim: '#ff6b6b', sutil: '#222d39', erroFundo: '#3a1d22',
    sobrePrimaria: '#071a33', campo: '#1d2731', topo: '#121a22', linha: 'rgba(230, 237, 243, 0.14)',
  },
};

export const cores = { ...PALETAS.claro };
let versaoTema = 0;

export function definirTema(nome) {
  Object.assign(cores, PALETAS[nome] ?? PALETAS.claro);
  versaoTema += 1;
}

export function Botao({ titulo, aoTocar, secundario, desativado, carregando }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={aoTocar}
      disabled={desativado || carregando}
      style={({ pressed }) => [estilos.botao, secundario && estilos.botaoSecundario, (desativado || carregando) && { opacity: 0.5 }, pressed && { opacity: 0.8 }]}
    >
      {carregando ? (
        <ActivityIndicator color={secundario ? cores.primaria : cores.sobrePrimaria} />
      ) : (
        <Text style={[estilos.botaoTexto, secundario && { color: cores.primaria }]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

export function Campo({ rotulo, ...props }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <TextInput placeholderTextColor="#9aa5b1" style={estilos.campo} {...props} />
    </View>
  );
}

export function Painel({ children, estilo }) {
  return <View style={[estilos.painel, estilo]}>{children}</View>;
}

export function Cartao({ titulo, valor, detalhe, destaque }) {
  return (
    <View style={[estilos.cartao, destaque && { borderLeftColor: cores.bom }]}>
      <Text style={estilos.cartaoTitulo}>{titulo}</Text>
      <Text style={estilos.cartaoValor}>{valor}</Text>
      {detalhe ? <Text style={estilos.cartaoDetalhe}>{detalhe}</Text> : null}
    </View>
  );
}

export function Erro({ mensagem }) {
  if (!mensagem) return null;
  return <Text style={estilos.erro}>{mensagem}</Text>;
}

export function Titulo({ children }) {
  return <Text style={estilos.titulo}>{children}</Text>;
}

export function Progresso({ atual, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((atual / total) * 100)) : 0;
  return (
    <View style={estilos.progresso}>
      <View style={[estilos.progressoBarra, { width: `${pct}%` }]} />
      <Text style={estilos.progressoTexto}>{pct}% da meta</Text>
    </View>
  );
}

function criarEstilos() {
  return StyleSheet.create({
  botao: { backgroundColor: cores.primaria, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1, borderColor: cores.primaria },
  botaoSecundario: { backgroundColor: cores.painel },
  botaoTexto: { color: cores.sobrePrimaria, fontWeight: '700', fontSize: 15 },
  rotulo: { color: cores.suave, fontWeight: '600', fontSize: 13 },
  campo: { borderWidth: 1, borderColor: cores.borda, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, backgroundColor: cores.campo, color: cores.texto },
  painel: { backgroundColor: cores.painel, borderRadius: 14, borderWidth: 1, borderColor: cores.borda, padding: 16, gap: 10 },
  cartao: { flexBasis: '47%', flexGrow: 1, backgroundColor: cores.painel, borderRadius: 12, borderWidth: 1, borderColor: cores.borda, borderLeftWidth: 4, borderLeftColor: cores.borda, padding: 12, gap: 2 },
  cartaoTitulo: { color: cores.suave, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  cartaoValor: { color: cores.texto, fontSize: 18, fontWeight: '700' },
  cartaoDetalhe: { color: cores.suave, fontSize: 12 },
  erro: { color: cores.ruim, backgroundColor: cores.erroFundo, borderRadius: 8, padding: 10 },
  titulo: { fontSize: 22, fontWeight: '700', color: cores.texto },
  subtitulo: { fontSize: 16, fontWeight: '700', color: cores.texto },
  texto: { color: cores.texto, fontSize: 15 },
  suave: { color: cores.suave, fontSize: 13 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  progresso: { height: 24, backgroundColor: cores.sutil, borderRadius: 12, overflow: 'hidden', justifyContent: 'center' },
  progressoBarra: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: cores.bom },
  progressoTexto: { textAlign: 'center', fontSize: 12, fontWeight: '700', color: cores.texto },
});
}

let estilosAtuais = criarEstilos();
let versaoEstilos = versaoTema;

export const estilos = new Proxy({}, {
  get(_, chave) {
    if (versaoEstilos !== versaoTema) {
      estilosAtuais = criarEstilos();
      versaoEstilos = versaoTema;
    }
    return estilosAtuais[chave];
  },
});
