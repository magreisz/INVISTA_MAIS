import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Switch, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { api, useApi } from '../api';
import { Botao, Campo, Cartao, Erro, Painel as Caixa, Progresso, Titulo, cores, estilos } from '../componentes/UI';
import { centavos, cotasCompraveis, diasParaMeta, lerReais, numero, reais, resumoDepositos } from '../processamento';

const CORES_LED = [
  { nome: 'desligado', cor: '#9aa5b1' },
  { nome: 'verde', cor: '#28a745' },
  { nome: 'amarelo', cor: '#f0ad00' },
  { nome: 'vermelho', cor: '#dc3545' },
  { nome: 'azul', cor: '#1f6feb' },
];

function Controles({ id }) {
  const estado = useApi(`/api/dispositivos/${id}/estado`);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [brilho, setBrilho] = useState(null);
  const recarregarEstado = estado.recarregar;

  useEffect(() => {
    const intervalo = setInterval(recarregarEstado, 5000);
    return () => clearInterval(intervalo);
  }, [recarregarEstado]);

  async function comandar(corpo) {
    setEnviando(true);
    setErro('');
    try {
      await api(`/api/dispositivos/${id}/atuadores`, { metodo: 'PATCH', corpo });
      await recarregarEstado();
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setEnviando(false);
    }
  }

  if (!estado.dados) {
    return (
      <Caixa>
        <Text style={estilos.subtitulo}>Controles</Text>
        {estado.erro ? <Erro mensagem={`Estado ao vivo indisponível: ${estado.erro}`} /> : <Text style={estilos.suave}>Conectando ao dispositivo...</Text>}
      </Caixa>
    );
  }

  const { sensores, atuadores, online } = estado.dados;

  return (
    <>
      <View style={estilos.grade}>
        <Cartao titulo="ESP32" valor={online ? 'Online' : 'Offline'} destaque={online} />
        <Cartao titulo="Tampa" valor={sensores.tampaAberta ? 'Aberta' : 'Fechada'} />
        <Cartao titulo="Peso" valor={`${numero(sensores.pesoGramas, 1)} g`} />
        <Cartao titulo="Luz" valor={`${numero(sensores.luzPercentual, 0)}%`} />
      </View>
      <Caixa>
        <Text style={estilos.subtitulo}>Controles</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={estilos.texto}>Trava da tampa</Text>
          <Switch
            value={atuadores.trava}
            disabled={enviando}
            onValueChange={valor => comandar({ trava: valor })}
            trackColor={{ true: cores.primaria }}
          />
        </View>
        <Text style={estilos.texto}>Cor do LED</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {CORES_LED.map(c => (
            <Pressable
              key={c.nome}
              accessibilityRole="button"
              accessibilityLabel={`LED ${c.nome}`}
              disabled={enviando}
              onPress={() => comandar({ cor: c.nome })}
              style={{
                width: 38, height: 38, borderRadius: 19, backgroundColor: c.cor,
                borderWidth: 3, borderColor: atuadores.cor === c.nome ? cores.primaria : '#fff',
              }}
            />
          ))}
        </View>
        <Text style={estilos.texto}>Brilho: {brilho ?? atuadores.brilho ?? 60}%</Text>
        <Slider
          minimumValue={0}
          maximumValue={100}
          step={5}
          value={atuadores.brilho ?? 60}
          disabled={enviando}
          minimumTrackTintColor={cores.primaria}
          onValueChange={setBrilho}
          onSlidingComplete={valor => comandar({ brilho: Math.round(valor) })}
        />
        <Botao titulo="Tocar bipe" secundario aoTocar={() => comandar({ buzzer: true })} desativado={enviando} />
        <Erro mensagem={erro} />
      </Caixa>
    </>
  );
}

function Cotas({ saldoCentavos }) {
  const [ticker, setTicker] = useState('MXRF11');
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');
  const [buscando, setBuscando] = useState(false);

  async function calcular() {
    setErro('');
    setBuscando(true);
    try {
      const codigo = ticker.trim().toUpperCase();
      const fii = await api(`/api/ativos/fiis/${codigo}`, { autenticado: false });
      const cotacao = lerReais(fii.cotacao?.value);
      setResultado({ codigo, cotacao, cotas: cotasCompraveis(saldoCentavos, cotacao) });
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setBuscando(false);
    }
  }

  return (
    <Caixa>
      <Text style={estilos.subtitulo}>Simule a compra de cotas de FII</Text>
      <Text style={estilos.suave}>Veja quantas cotas caberiam no saldo atual do cofrinho, usando uma cotação indicativa.</Text>
      <Campo rotulo="Código do FII" value={ticker} onChangeText={setTicker} autoCapitalize="characters" />
      <Botao titulo="Simular cotas" aoTocar={calcular} carregando={buscando} />
      {resultado && resultado.cotas > 0 && (
        <Text style={estilos.texto}>
          Com {centavos(saldoCentavos)}, o saldo cobre {resultado.cotas} cota(s) de {resultado.codigo}, a {reais(resultado.cotacao)} cada, sem considerar taxas.
        </Text>
      )}
      {resultado && resultado.cotas === 0 && (
        <Text style={estilos.texto}>
          O saldo ainda não cobre uma cota de {resultado.codigo} ({reais(resultado.cotacao)}). Faltariam {reais(Math.max(0, resultado.cotacao - saldoCentavos / 100))}, sem considerar taxas.
        </Text>
      )}
      <Erro mensagem={erro} />
      <Text style={estilos.suave}>Simulação educativa com cotação indicativa. Não é recomendação de investimento; preços e riscos variam.</Text>
    </Caixa>
  );
}

export default function Painel({ dispositivo }) {
  const detalhe = useApi(`/api/dispositivos/${dispositivo.id}`);
  const depositos = useApi(`/api/dispositivos/${dispositivo.id}/depositos?limite=30`);
  const d = detalhe.dados ?? dispositivo;
  const lista = depositos.dados?.depositos ?? [];
  const resumo = resumoDepositos(lista);
  const diasCom = new Set(lista.map(x => x.registradoEm.slice(0, 10))).size;
  const dias = diasParaMeta(d.saldoCentavos, d.metaCentavos, diasCom ? resumo.totalReais / Math.max(diasCom, 1) : 0);

  function atualizar() {
    detalhe.recarregar();
    depositos.recarregar();
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={detalhe.carregando} onRefresh={atualizar} />}
    >
      <Titulo>{d.apelido}</Titulo>
      <Caixa>
        <Text style={estilos.suave}>VALOR ACUMULADO</Text>
        <Text style={{ fontSize: 34, fontWeight: '700', color: cores.primaria }}>{centavos(d.saldoCentavos)}</Text>
        {d.metaCentavos ? (
          <>
            <Text style={estilos.texto}>Meta de {centavos(d.metaCentavos)}</Text>
            <Progresso atual={d.saldoCentavos} total={d.metaCentavos} />
            {dias !== null && <Text style={estilos.suave}>{dias === 0 ? 'Meta atingida!' : `No ritmo atual, faltam cerca de ${numero(dias, 0)} dias.`}</Text>}
          </>
        ) : (
          <Text style={estilos.suave}>Defina uma meta no site para acompanhar seu planejamento.</Text>
        )}
      </Caixa>
      <Erro mensagem={detalhe.erro || depositos.erro} />
      <Controles id={dispositivo.id} />
      <View style={estilos.grade}>
        <Cartao titulo="Aportes recentes" valor={String(resumo.quantidade)} detalhe={`${resumo.moedas} moedas e ${resumo.cedulas} cédulas`} />
        <Cartao titulo="Aporte médio" valor={reais(resumo.mediaReais)} detalhe={`Maior aporte: ${reais(resumo.maiorReais)}`} />
      </View>
      <Cotas saldoCentavos={d.saldoCentavos} />
    </ScrollView>
  );
}
