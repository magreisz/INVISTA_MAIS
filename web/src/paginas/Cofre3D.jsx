import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { criarCena } from '../cofre3d/cena';
import { CORES_LED, GRUPOS, PECAS, VALORES_CENTAVOS } from '../cofre3d/pecas';
import { centavos } from '../formatos';

const NOMES_CORES = { desligado: 'Desligado', verde: 'Verde', amarelo: 'Amarelo', vermelho: 'Vermelho', azul: 'Azul' };
const ETAPA_INICIAL = 'Clique em "Simular depósito" para ver o caminho da moeda até o site.';

export default function Cofre3D() {
  const { id } = useParams();
  const caixaRef = useRef(null);
  const cenaRef = useRef(null);
  const [selecionado, setSelecionado] = useState(null);
  const [transparente, setTransparente] = useState(true);
  const [giro, setGiro] = useState(false);
  const [etapa, setEtapa] = useState(ETAPA_INICIAL);
  const [modo, setModo] = useState(id ? 'vivo' : 'demo');
  const [demo, setDemo] = useState({ saldoCentavos: 0, metaCentavos: 15000, valorCentavos: 25, cor: 'verde', brilho: 70, trava: false, tampaAberta: false });
  const [vivo, setVivo] = useState({ apelido: '', online: null, erro: '' });
  const ultimoRef = useRef(null);

  useEffect(() => {
    const cena = criarCena(caixaRef.current, { aoSelecionar: setSelecionado, aoEtapa: setEtapa });
    cenaRef.current = cena;
    return () => {
      cena.destruir();
      cenaRef.current = null;
    };
  }, []);

  useEffect(() => { cenaRef.current?.selecionar(selecionado); }, [selecionado]);
  useEffect(() => { cenaRef.current?.definirTransparente(transparente); }, [transparente]);
  useEffect(() => { cenaRef.current?.definirGiro(giro); }, [giro]);

  useEffect(() => {
    if (modo !== 'demo') return;
    const { saldoCentavos: _saldo, ...resto } = demo;
    cenaRef.current?.atualizar({ ...resto, online: true });
  }, [modo, demo]);

  useEffect(() => {
    if (modo !== 'demo') return;
    cenaRef.current?.definirSaldoInicial(demo.saldoCentavos);
    setEtapa(ETAPA_INICIAL);
  }, [modo]);

  useEffect(() => {
    if (modo !== 'vivo' || !id) return undefined;
    let ativo = true;
    ultimoRef.current = null;
    setEtapa('Faça um depósito no Wokwi: a moeda cai aqui assim que chegar na API.');

    async function buscar() {
      try {
        const disp = await api(`/api/dispositivos/${id}`);
        let estado = null;
        try {
          estado = await api(`/api/dispositivos/${id}/estado`);
        } catch {
          estado = null;
        }
        if (!ativo) return;
        const cena = cenaRef.current;
        const atuadores = estado?.atuadores ?? {};
        const sensores = estado?.sensores ?? {};
        const valorSensor = sensores.ultimoDepositoReais ? Math.round(sensores.ultimoDepositoReais * 100) : null;
        cena?.atualizar({
          metaCentavos: disp.metaCentavos,
          valorCentavos: VALORES_CENTAVOS.includes(valorSensor) ? valorSensor : 25,
          cor: atuadores.cor ?? 'verde',
          brilho: atuadores.brilho ?? 60,
          trava: Boolean(atuadores.trava),
          tampaAberta: Boolean(sensores.tampaAberta),
          online: Boolean(estado?.online),
        });
        const anterior = ultimoRef.current;
        if (!anterior) {
          cena?.definirSaldoInicial(disp.saldoCentavos);
        } else if (disp.ultimoDepositoEm && disp.ultimoDepositoEm !== anterior.ultimoDepositoEm) {
          const diferenca = disp.saldoCentavos - anterior.saldoCentavos;
          cena?.depositar(diferenca > 0 ? diferenca : valorSensor ?? 0, disp.saldoCentavos);
        }
        ultimoRef.current = { ultimoDepositoEm: disp.ultimoDepositoEm, saldoCentavos: disp.saldoCentavos };
        setVivo({ apelido: disp.apelido, online: estado ? estado.online : null, erro: '' });
      } catch (falha) {
        if (ativo) setVivo(atual => ({ ...atual, erro: falha.message }));
      }
    }

    buscar();
    const intervalo = setInterval(buscar, 4000);
    return () => {
      ativo = false;
      clearInterval(intervalo);
    };
  }, [modo, id]);

  const depositarDemo = () => {
    const novoSaldo = demo.saldoCentavos + demo.valorCentavos;
    cenaRef.current?.depositar(demo.valorCentavos, novoSaldo);
    setDemo(d => ({ ...d, saldoCentavos: novoSaldo }));
  };

  const peca = PECAS.find(p => p.id === selecionado);

  return (
    <section className="cofre3d">
      <div className="linha-titulo">
        <div>
          <h1>Cofre 3D</h1>
          <p className="aviso cofre3d-sub">Veja por dentro como o Cofrinho Invista+ funciona. Arraste para girar e use a roda do mouse para aproximar.</p>
        </div>
        <div className="acoes">
          {id && (
            <div className="cofre3d-modos" role="group" aria-label="Modo">
              <button className={`botao ${modo === 'vivo' ? '' : 'secundario'}`} onClick={() => setModo('vivo')}>Ao vivo</button>
              <button className={`botao ${modo === 'demo' ? '' : 'secundario'}`} onClick={() => setModo('demo')}>Demonstração</button>
            </div>
          )}
          {id ? <Link className="botao secundario" to={`/cofrinhos/${id}`}>Voltar ao painel</Link> : <Link className="botao secundario" to="/entrar">Entrar</Link>}
        </div>
      </div>

      <div className="cofre3d-grade">
        <div className="cofre3d-palco">
          <div ref={caixaRef} className="cofre3d-canvas" />
          <div className="cofre3d-etapa" aria-live="polite">{etapa}</div>
          <div className="cofre3d-opcoes">
            <label><input type="checkbox" checked={transparente} onChange={e => setTransparente(e.target.checked)} /> Ver por dentro</label>
            <label><input type="checkbox" checked={giro} onChange={e => setGiro(e.target.checked)} /> Girar sozinho</label>
          </div>
        </div>

        <aside className="cofre3d-lado">
          <div className="painel">
            {peca ? (
              <>
                <span className="cofre3d-tipo">{peca.tipo}</span>
                <h2 className="cofre3d-nome"><span className="cofre3d-num">{peca.numero}</span> {peca.nome}</h2>
                <p>{peca.texto}</p>
              </>
            ) : (
              <p className="aviso">Clique em um número no cofre ou na lista abaixo para saber o que cada peça faz.</p>
            )}
          </div>

          {modo === 'demo' ? (
            <div className="painel">
              <h3>Demonstração</h3>
              <p className="aviso cofre3d-mini">Simulação só nesta tela. Nada é gravado no banco.</p>
              <label className="cofre3d-campo">
                Valor da moeda ou cédula
                <select value={demo.valorCentavos} onChange={e => setDemo(d => ({ ...d, valorCentavos: Number(e.target.value) }))}>
                  {VALORES_CENTAVOS.map(v => <option key={v} value={v}>{centavos(v)}</option>)}
                </select>
              </label>
              <button className="botao cofre3d-largo" onClick={depositarDemo}>Simular depósito</button>
              <div className="cofre3d-controles">
                <button className="botao secundario" onClick={() => setDemo(d => ({ ...d, trava: !d.trava }))}>{demo.trava ? 'Destravar tampa' : 'Travar tampa'}</button>
                <button className="botao secundario" onClick={() => setDemo(d => ({ ...d, tampaAberta: !d.tampaAberta }))}>{demo.tampaAberta ? 'Fechar tampa' : 'Abrir tampa'}</button>
              </div>
              <div className="cofre3d-cores" role="group" aria-label="Cor do LED">
                {Object.keys(CORES_LED).map(cor => (
                  <button
                    key={cor}
                    title={NOMES_CORES[cor]}
                    aria-label={NOMES_CORES[cor]}
                    className={`cor ${demo.cor === cor ? 'ativa' : ''}`}
                    style={{ background: CORES_LED[cor] }}
                    onClick={() => setDemo(d => ({ ...d, cor }))}
                  />
                ))}
              </div>
              {demo.trava && demo.tampaAberta && <p className="cofre3d-alarme">Alarme! A tampa foi aberta com a trava ligada.</p>}
            </div>
          ) : (
            <div className="painel">
              <h3>Ao vivo: {vivo.apelido || 'carregando...'}</h3>
              <p className="aviso cofre3d-mini">O cofre 3D acompanha o cofrinho real a cada 4 segundos: saldo, trava, tampa e cor do LED.</p>
              {vivo.online !== null && <span className={`selo ${vivo.online ? 'bom' : 'ruim'}`}>{vivo.online ? 'ESP32 online' : 'ESP32 offline'}</span>}
              {vivo.erro && <p className="erro">{vivo.erro}</p>}
            </div>
          )}

          <div className="painel">
            {GRUPOS.map(g => (
              <div key={g.id} className="cofre3d-grupo">
                <h3>{g.titulo}</h3>
                <div className="cofre3d-lista">
                  {PECAS.filter(p => p.grupo === g.id).map(p => (
                    <button key={p.id} className={`cofre3d-item ${selecionado === p.id ? 'ativo' : ''}`} onClick={() => setSelecionado(p.id)}>
                      <span className="cofre3d-num">{p.numero}</span> {p.nome}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
