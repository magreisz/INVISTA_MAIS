import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, useApi } from '../api';
import { Carregando, Cartao, Erro, Progresso } from '../componentes/Estado';
import { centavos, dataHora, numero } from '../formatos';

const CORES = [
  { nome: 'desligado', rotulo: 'Desligado', cor: '#9aa5b1' },
  { nome: 'verde', rotulo: 'Verde', cor: '#28a745' },
  { nome: 'amarelo', rotulo: 'Amarelo', cor: '#f0ad00' },
  { nome: 'vermelho', rotulo: 'Vermelho', cor: '#dc3545' },
  { nome: 'azul', rotulo: 'Azul', cor: '#1f6feb' },
];

function EstadoAoVivo({ id }) {
  const { dados, erro, recarregar } = useApi(`/api/dispositivos/${id}/estado`);
  const [enviando, setEnviando] = useState(false);
  const [erroComando, setErroComando] = useState('');
  const [brilho, setBrilho] = useState(null);

  useEffect(() => {
    const intervalo = setInterval(recarregar, 5000);
    return () => clearInterval(intervalo);
  }, [recarregar]);

  async function comandar(corpo) {
    setEnviando(true);
    setErroComando('');
    try {
      await api(`/api/dispositivos/${id}/atuadores`, { metodo: 'PATCH', corpo });
      await recarregar();
    } catch (falha) {
      setErroComando(falha.message);
    } finally {
      setEnviando(false);
    }
  }

  if (erro && !dados) return <Erro mensagem={`Estado ao vivo indisponível: ${erro}`} tentarDeNovo={recarregar} />;
  if (!dados) return <Carregando texto="Conectando ao Blynk..." />;

  const { sensores, atuadores } = dados;
  const brilhoAtual = brilho ?? atuadores.brilho ?? 60;

  return (
    <>
      <div className="linha-titulo">
        <h2>Ao vivo</h2>
        <span className={`selo ${dados.online ? 'bom' : 'ruim'}`}>{dados.online ? 'ESP32 online' : 'ESP32 offline'}</span>
      </div>
      <div className="grade-cartoes">
        <Cartao titulo="Peso no cofre" valor={`${numero(sensores.pesoGramas, 1)} g`} />
        <Cartao titulo="Luminosidade" valor={`${numero(sensores.luzPercentual, 0)}%`} />
        <Cartao titulo="Último depósito" valor={sensores.ultimoDepositoReais === null ? 'n/d' : centavos(Math.round(sensores.ultimoDepositoReais * 100))} />
        <Cartao titulo="Tampa" valor={sensores.tampaAberta ? 'Aberta' : 'Fechada'} classe={sensores.tampaAberta ? 'ruim' : ''} />
      </div>

      <div className="painel controles">
        <h2>Controles</h2>
        <div className="controle">
          <span>Trava da tampa</span>
          <label className="interruptor">
            <input type="checkbox" checked={atuadores.trava} disabled={enviando} onChange={e => comandar({ trava: e.target.checked })} />
            <span />
          </label>
          <strong>{atuadores.trava ? 'Travada' : 'Destravada'}</strong>
        </div>
        <div className="controle">
          <span>Cor do LED</span>
          <div className="cores">
            {CORES.map(c => (
              <button
                key={c.nome}
                title={c.rotulo}
                aria-label={c.rotulo}
                className={`cor ${atuadores.cor === c.nome ? 'ativa' : ''}`}
                style={{ background: c.cor }}
                disabled={enviando}
                onClick={() => comandar({ cor: c.nome })}
              />
            ))}
          </div>
        </div>
        <div className="controle">
          <span>Brilho</span>
          <input
            type="range"
            min="0"
            max="100"
            value={brilhoAtual}
            disabled={enviando}
            onChange={e => setBrilho(Number(e.target.value))}
            onPointerUp={() => brilho !== null && comandar({ brilho })}
            onKeyUp={() => brilho !== null && comandar({ brilho })}
          />
          <strong>{brilhoAtual}%</strong>
        </div>
        <div className="controle">
          <span>Buzzer</span>
          <button className="botao secundario" disabled={enviando} onClick={() => comandar({ buzzer: true })}>Tocar bipe</button>
        </div>
        <Erro mensagem={erroComando} />
      </div>
    </>
  );
}

function Configuracoes({ dispositivo, aoMudar }) {
  const navegar = useNavigate();
  const [apelido, setApelido] = useState(dispositivo.apelido);
  const [meta, setMeta] = useState(dispositivo.metaCentavos ? String(dispositivo.metaCentavos / 100).replace('.', ',') : '');
  const [tokenBlynk, setTokenBlynk] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [novaChave, setNovaChave] = useState('');

  async function executar(acao) {
    setErro('');
    setMensagem('');
    try {
      await acao();
    } catch (falha) {
      setErro(falha.message);
    }
  }

  const salvar = evento => {
    evento.preventDefault();
    executar(async () => {
      const metaCentavos = meta ? Math.round(Number(meta.replace(',', '.')) * 100) : null;
      const corpo = { apelido: apelido.trim(), metaCentavos };
      if (tokenBlynk.trim()) corpo.blynkToken = tokenBlynk.trim();
      await api(`/api/dispositivos/${dispositivo.id}`, { metodo: 'PATCH', corpo });
      setTokenBlynk('');
      setMensagem('Alterações salvas.');
      aoMudar();
    });
  };

  const gerarChave = () => executar(async () => {
    if (!window.confirm('A chave atual deixará de funcionar. Continuar?')) return;
    const { chaveDispositivo } = await api(`/api/dispositivos/${dispositivo.id}/chave`, { metodo: 'POST' });
    setNovaChave(chaveDispositivo);
  });

  const excluir = () => executar(async () => {
    if (!window.confirm(`Excluir "${dispositivo.apelido}" e todo o histórico?`)) return;
    await api(`/api/dispositivos/${dispositivo.id}`, { metodo: 'DELETE' });
    navegar('/');
  });

  return (
    <details className="painel">
      <summary>Configurações</summary>
      <form onSubmit={salvar} className="grade-form">
        <label>
          Apelido
          <input required maxLength={40} value={apelido} onChange={e => setApelido(e.target.value)} />
        </label>
        <label>
          Meta (R$)
          <input inputMode="decimal" value={meta} onChange={e => setMeta(e.target.value)} placeholder="Sem meta" />
        </label>
        <label>
          Novo token do Blynk
          <input type="password" autoComplete="off" value={tokenBlynk} onChange={e => setTokenBlynk(e.target.value)} placeholder="Deixe em branco para manter" />
        </label>
        <button className="botao">Salvar</button>
      </form>
      {mensagem && <p className="sucesso">{mensagem}</p>}
      <Erro mensagem={erro} />
      {novaChave && <p>Nova chave: <code>{novaChave}</code> (atualize o secrets.h)</p>}
      <div className="acoes">
        <button className="botao secundario" onClick={gerarChave}>Gerar nova chave do ESP32</button>
        <button className="botao perigo" onClick={excluir}>Excluir cofrinho</button>
      </div>
    </details>
  );
}

export default function Painel() {
  const { id } = useParams();
  const dispositivo = useApi(`/api/dispositivos/${id}`);
  const depositos = useApi(`/api/dispositivos/${id}/depositos?limite=10`);
  const d = dispositivo.dados;

  if (dispositivo.erro) return <Erro mensagem={dispositivo.erro} tentarDeNovo={dispositivo.recarregar} />;
  if (!d) return <Carregando />;

  return (
    <section>
      <div className="linha-titulo">
        <h1>{d.apelido}</h1>
        <div className="acoes">
          <Link className="botao secundario" to={`/cofrinhos/${id}/estatisticas`}>Estatísticas</Link>
          <Link className="botao secundario" to={`/cofrinhos/${id}/simulacao`}>Simulação</Link>
          <Link className="botao secundario" to={`/cofrinhos/${id}/cofre-3d`}>Cofre 3D</Link>
        </div>
      </div>

      <div className="painel resumo">
        <span className="cartao-titulo">Saldo no cofre</span>
        <strong className="saldo grande">{centavos(d.saldoCentavos)}</strong>
        {d.metaCentavos ? (
          <>
            <span>Meta de {centavos(d.metaCentavos)}</span>
            <Progresso atual={d.saldoCentavos} total={d.metaCentavos} />
          </>
        ) : (
          <span>Defina uma meta em Configurações.</span>
        )}
        <small>Último depósito: {dataHora(d.ultimoDepositoEm)}</small>
      </div>

      <EstadoAoVivo id={id} />

      <div className="painel">
        <div className="linha-titulo">
          <h2>Últimos depósitos</h2>
          <button className="botao secundario" onClick={() => { depositos.recarregar(); dispositivo.recarregar(); }}>Atualizar</button>
        </div>
        <Erro mensagem={depositos.erro} />
        {depositos.dados?.depositos.length === 0 && <p className="aviso">Nenhum depósito nos últimos 90 dias.</p>}
        {depositos.dados?.depositos.length > 0 && (
          <table className="tabela">
            <thead>
              <tr><th>Quando</th><th>Valor</th><th>Forma</th><th>Peso</th><th>Origem</th></tr>
            </thead>
            <tbody>
              {depositos.dados.depositos.map(x => (
                <tr key={x.id}>
                  <td>{dataHora(x.registradoEm)}</td>
                  <td>{centavos(x.valorCentavos)}</td>
                  <td>{x.forma === 'moeda' ? 'Moeda' : 'Cédula'}</td>
                  <td>{x.pesoGramas === null ? 'n/d' : `${numero(x.pesoGramas, 1)} g`}</td>
                  <td>{x.origem === 'simulado' ? 'Simulado' : 'Sensor'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Configuracoes key={`${d.apelido}-${d.metaCentavos}`} dispositivo={d} aoMudar={dispositivo.recarregar} />
    </section>
  );
}
