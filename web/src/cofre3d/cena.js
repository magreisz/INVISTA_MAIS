import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { CORES_LED, PECAS, VALORES_CENTAVOS } from './pecas';

const LARGURA = 3.2;
const ALTURA = 2.4;
const PROFUNDIDADE = 2.4;
const ESPESSURA = 0.08;
const BASE_BALANCA = 0.26;
const ENTRADA = new THREE.Vector3(0, ALTURA + 1.2, 0.5);
const MAX_MOEDAS = 48;

const reais = centavos => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function material(cor, extra = {}) {
  return new THREE.MeshStandardMaterial({ color: cor, roughness: 0.55, metalness: 0.1, ...extra });
}

function caixa(l, a, p, mat) {
  return new THREE.Mesh(new THREE.BoxGeometry(l, a, p), mat);
}

function cilindro(r, a, mat, segmentos = 32) {
  return new THREE.Mesh(new THREE.CylinderGeometry(r, r, a, segmentos), mat);
}

function suavizar(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export function criarCena(container, { aoSelecionar, aoEtapa } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const rotulos = new CSS2DRenderer();
  rotulos.domElement.className = 'cofre3d-rotulos';
  container.appendChild(rotulos.domElement);

  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(5.2, 3.9, 6.3);

  const controles = new OrbitControls(camera, renderer.domElement);
  controles.target.set(0.5, 1.7, 0);
  controles.enableDamping = true;
  controles.minDistance = 4;
  controles.maxDistance = 16;
  controles.maxPolarAngle = Math.PI * 0.49;
  controles.autoRotateSpeed = 0.8;

  cena.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.4));
  const sol = new THREE.DirectionalLight(0xffffff, 2.2);
  sol.position.set(5, 9, 6);
  sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024);
  cena.add(sol);

  const chao = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.ShadowMaterial({ opacity: 0.18 }));
  chao.rotation.x = -Math.PI / 2;
  chao.receiveShadow = true;
  cena.add(chao);

  const partes = {};
  const registrar = (id, ...objetos) => {
    partes[id] = partes[id] || [];
    partes[id].push(...objetos);
  };

  const paredes = [];
  const matParede = () => material(0x3a4654, { metalness: 0.55, roughness: 0.35, transparent: true });

  const cofre = new THREE.Group();
  cena.add(cofre);

  const fundo = caixa(LARGURA, ESPESSURA, PROFUNDIDADE, matParede());
  fundo.position.set(0, ESPESSURA / 2, 0);
  const tras = caixa(LARGURA, ALTURA, ESPESSURA, matParede());
  tras.position.set(0, ALTURA / 2, -PROFUNDIDADE / 2);
  const esquerda = caixa(ESPESSURA, ALTURA, PROFUNDIDADE, matParede());
  esquerda.position.set(-LARGURA / 2, ALTURA / 2, 0);
  const direita = caixa(ESPESSURA, ALTURA, PROFUNDIDADE, matParede());
  direita.position.set(LARGURA / 2, ALTURA / 2, 0);
  const frente = caixa(LARGURA, ALTURA, ESPESSURA, matParede());
  frente.position.set(0, ALTURA / 2, PROFUNDIDADE / 2);
  for (const p of [fundo, tras, esquerda, direita, frente]) {
    p.castShadow = true;
    p.receiveShadow = true;
    cofre.add(p);
    paredes.push(p);
  }

  for (const [x, z] of [[-1.35, -1.05], [1.35, -1.05], [-1.35, 1.05], [1.35, 1.05]]) {
    const pe = cilindro(0.12, 0.12, material(0x222831));
    pe.position.set(x, -0.04, z);
    cofre.add(pe);
  }

  const tampa = new THREE.Group();
  tampa.position.set(0, ALTURA, -PROFUNDIDADE / 2);
  cofre.add(tampa);
  const placaTampa = caixa(LARGURA + 0.06, ESPESSURA, PROFUNDIDADE + 0.06, matParede());
  placaTampa.position.set(0, ESPESSURA / 2, PROFUNDIDADE / 2);
  placaTampa.castShadow = true;
  tampa.add(placaTampa);
  paredes.push(placaTampa);
  const fenda = caixa(0.95, 0.03, 0.16, material(0x0b0d10));
  fenda.position.set(0, ESPESSURA + 0.005, ENTRADA.z + PROFUNDIDADE / 2);
  tampa.add(fenda);
  const encaixe = caixa(0.3, 0.12, 0.12, material(0x9aa5b1, { metalness: 0.7 }));
  encaixe.position.set(1.15, -0.06, PROFUNDIDADE - 0.25);
  tampa.add(encaixe);

  const telaCanvas = document.createElement('canvas');
  telaCanvas.width = 512;
  telaCanvas.height = 256;
  const telaTextura = new THREE.CanvasTexture(telaCanvas);
  telaTextura.colorSpace = THREE.SRGBColorSpace;
  const molduraDisplay = caixa(1.25, 0.72, 0.06, material(0x1d4f91));
  molduraDisplay.position.set(-0.65, 1.72, PROFUNDIDADE / 2 + 0.06);
  const telaDisplay = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.55), new THREE.MeshBasicMaterial({ map: telaTextura }));
  telaDisplay.position.set(-0.65, 1.72, PROFUNDIDADE / 2 + 0.095);
  cofre.add(molduraDisplay, telaDisplay);
  registrar('display', molduraDisplay);

  const basePot = caixa(0.62, 0.62, 0.05, material(0x1d4f91));
  basePot.position.set(0.78, 1.72, PROFUNDIDADE / 2 + 0.06);
  const botaoGiro = new THREE.Group();
  botaoGiro.position.set(0.78, 1.72, PROFUNDIDADE / 2 + 0.1);
  const corpoPot = cilindro(0.24, 0.12, material(0xd9dee4));
  corpoPot.rotation.x = Math.PI / 2;
  const ponteiro = caixa(0.04, 0.18, 0.02, material(0x111111));
  ponteiro.position.set(0, 0.1, 0.07);
  botaoGiro.add(corpoPot, ponteiro);
  cofre.add(basePot, botaoGiro);
  registrar('pot', basePot, corpoPot);

  const baseBotao = caixa(0.42, 0.42, 0.06, material(0xf2f4f6));
  baseBotao.position.set(0.78, 0.98, PROFUNDIDADE / 2 + 0.06);
  const botaoVerde = cilindro(0.15, 0.1, material(0x1f9d46));
  botaoVerde.rotation.x = Math.PI / 2;
  botaoVerde.position.set(0.78, 0.98, PROFUNDIDADE / 2 + 0.13);
  cofre.add(baseBotao, botaoVerde);
  registrar('botao', baseBotao, botaoVerde);

  const matLed = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x2bd46a, emissiveIntensity: 1.2, roughness: 0.2, transparent: true, opacity: 0.92 });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16), matLed);
  led.position.set(-0.65, 1.02, PROFUNDIDADE / 2 + 0.12);
  const baseLed = cilindro(0.13, 0.06, material(0xcfd6dd));
  baseLed.rotation.x = Math.PI / 2;
  baseLed.position.set(-0.65, 1.02, PROFUNDIDADE / 2 + 0.06);
  const luzLed = new THREE.PointLight(0x2bd46a, 1.5, 3);
  luzLed.position.set(-0.65, 1.02, PROFUNDIDADE / 2 + 0.4);
  cofre.add(led, baseLed, luzLed);
  registrar('led', baseLed);

  const puxador = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 12, 32), material(0xb8c2cc, { metalness: 0.8, roughness: 0.25 }));
  puxador.position.set(0.05, 0.42, PROFUNDIDADE / 2 + 0.08);
  cofre.add(puxador);

  const esp32 = new THREE.Group();
  esp32.position.set(-0.2, 1.35, -PROFUNDIDADE / 2 + 0.09);
  const placaEsp = caixa(1.15, 0.62, 0.05, material(0x1b2330));
  const blindagem = caixa(0.42, 0.34, 0.05, material(0xc4ccd4, { metalness: 0.8, roughness: 0.3 }));
  blindagem.position.set(0.2, 0.06, 0.05);
  const antena = caixa(0.24, 0.12, 0.03, material(0x2c3644));
  antena.position.set(0.2, 0.3, 0.04);
  const pinosEsp = caixa(1.05, 0.05, 0.05, material(0xd4af37, { metalness: 0.9 }));
  pinosEsp.position.set(0, -0.28, 0.04);
  esp32.add(placaEsp, blindagem, antena, pinosEsp);
  cofre.add(esp32);
  registrar('esp32', placaEsp, blindagem);

  const balanca = new THREE.Group();
  balanca.position.set(0, 0.08, 0.15);
  const celula = caixa(1.3, 0.1, 0.18, material(0xdcdfe3, { metalness: 0.6 }));
  celula.position.set(0, 0.06, 0);
  const prato = cilindro(0.85, 0.05, material(0xaeb7c0, { metalness: 0.75, roughness: 0.25 }), 48);
  prato.position.set(0, BASE_BALANCA - 0.1, 0);
  const hx711 = caixa(0.42, 0.04, 0.3, material(0x1e7b3e));
  hx711.position.set(1.05, 0.03, -0.65);
  balanca.add(celula, prato, hx711);
  cofre.add(balanca);
  registrar('balanca', celula, prato, hx711);

  const ldr = new THREE.Group();
  ldr.position.set(0.62, ALTURA - 0.32, ENTRADA.z);
  const placaLdr = caixa(0.42, 0.22, 0.04, material(0x1c2a5a));
  const bulbo = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshStandardMaterial({ color: 0xb33a2a, emissive: 0x000000 }));
  bulbo.position.set(-0.26, 0, 0);
  ldr.add(placaLdr, bulbo);
  cofre.add(ldr);
  registrar('ldr', placaLdr);

  const servo = new THREE.Group();
  servo.position.set(1.15, ALTURA - 0.32, PROFUNDIDADE / 2 - 0.25);
  const corpoServo = caixa(0.28, 0.32, 0.18, material(0x5b6470));
  const braco = new THREE.Group();
  braco.position.set(0, 0.17, 0);
  const pa = caixa(0.36, 0.04, 0.06, material(0xf2f4f6));
  pa.position.set(0.12, 0, 0);
  braco.add(pa);
  servo.add(corpoServo, braco);
  cofre.add(servo);
  registrar('servo', corpoServo, pa);

  const chave = new THREE.Group();
  chave.position.set(-1.25, ALTURA - 0.2, -PROFUNDIDADE / 2 + 0.2);
  const corpoChave = caixa(0.26, 0.12, 0.12, material(0x6c7480));
  const alavanca = caixa(0.05, 0.12, 0.05, material(0x23272d));
  alavanca.position.set(0.05, 0.11, 0);
  chave.add(corpoChave, alavanca);
  cofre.add(chave);
  registrar('tampa', corpoChave);

  const buzzer = new THREE.Group();
  buzzer.position.set(-LARGURA / 2 + 0.14, 0.75, -0.55);
  const corpoBuzzer = cilindro(0.2, 0.14, material(0x15181c), 32);
  corpoBuzzer.rotation.z = Math.PI / 2;
  const furo = cilindro(0.04, 0.15, material(0x55595f), 16);
  furo.rotation.z = Math.PI / 2;
  furo.position.x = 0.005;
  buzzer.add(corpoBuzzer, furo);
  cofre.add(buzzer);
  registrar('buzzer', corpoBuzzer);

  const nuvem = new THREE.Group();
  nuvem.position.set(2.6, 3.7, -1.4);
  const matNuvem = material(0xffffff, { roughness: 0.9 });
  for (const [x, y, r] of [[0, 0, 0.42], [0.42, 0.06, 0.32], [-0.42, 0.02, 0.3], [0.18, 0.28, 0.3], [-0.2, 0.24, 0.26]]) {
    const bola = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), matNuvem);
    bola.position.set(x, y, 0);
    nuvem.add(bola);
  }
  cena.add(nuvem);
  registrar('nuvem', ...nuvem.children);

  const origemSinal = new THREE.Vector3(-0.2 + 0.2, 1.35 + 0.3, -PROFUNDIDADE / 2 + 0.15);
  const curvaSinal = new THREE.QuadraticBezierCurve3(origemSinal, new THREE.Vector3(1.4, 4.0, -1.5), nuvem.position.clone());
  const matLinhaSinal = new THREE.LineDashedMaterial({ color: 0x2f86ff, dashSize: 0.12, gapSize: 0.08 });
  const linhaSinal = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curvaSinal.getPoints(40)), matLinhaSinal);
  linhaSinal.computeLineDistances();
  cena.add(linhaSinal);

  const destinosFios = [
    ['ldr', ldr.position], ['pot', new THREE.Vector3(0.78, 1.72, PROFUNDIDADE / 2 - 0.05)],
    ['botao', new THREE.Vector3(0.78, 0.98, PROFUNDIDADE / 2 - 0.05)], ['tampa', chave.position],
    ['balanca', new THREE.Vector3(1.05, 0.12, -0.5)], ['display', new THREE.Vector3(-0.65, 1.72, PROFUNDIDADE / 2 - 0.05)],
    ['servo', servo.position], ['led', new THREE.Vector3(-0.65, 1.02, PROFUNDIDADE / 2 - 0.05)], ['buzzer', buzzer.position],
  ];
  const coresFios = [0xff4d4d, 0xffb020, 0x2f86ff, 0xb070ff, 0x20c997, 0xffd43b, 0xff7a45, 0x4dabf7, 0xe64980];
  const fios = new THREE.Group();
  destinosFios.forEach(([, destino], i) => {
    const inicio = new THREE.Vector3(-0.2 + (i - 4) * 0.1, 1.06, -PROFUNDIDADE / 2 + 0.12);
    const meio = new THREE.Vector3((inicio.x + destino.x) / 2, Math.max(inicio.y, destino.y) + 0.25, (inicio.z + destino.z) / 2);
    const curva = new THREE.QuadraticBezierCurve3(inicio, meio, destino.clone());
    const linha = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curva.getPoints(24)), new THREE.LineBasicMaterial({ color: coresFios[i], transparent: true, opacity: 0.85 }));
    fios.add(linha);
  });
  cofre.add(fios);

  const geoMoeda = new THREE.CylinderGeometry(0.13, 0.13, 0.035, 28);
  const matMoeda = material(0xe0b23a, { metalness: 0.85, roughness: 0.3 });
  const pilha = new THREE.Group();
  pilha.position.set(0, 0.08 + BASE_BALANCA - 0.07, 0.15);
  cofre.add(pilha);
  const posicaoMoeda = i => {
    const coluna = i % 8;
    const andar = Math.floor(i / 8);
    const angulo = (coluna / 8) * Math.PI * 2;
    const raio = coluna === 0 ? 0 : 0.42;
    return new THREE.Vector3(Math.cos(angulo) * raio * (coluna ? 1 : 0), andar * 0.04, Math.sin(angulo) * raio * (coluna ? 1 : 0));
  };
  const ajustarPilha = quantidade => {
    const alvo = Math.min(MAX_MOEDAS, quantidade);
    while (pilha.children.length < alvo) {
      const moeda = new THREE.Mesh(geoMoeda, matMoeda);
      moeda.position.copy(posicaoMoeda(pilha.children.length));
      moeda.rotation.y = Math.random() * Math.PI;
      moeda.castShadow = true;
      pilha.add(moeda);
    }
    while (pilha.children.length > alvo) pilha.remove(pilha.children[pilha.children.length - 1]);
  };
  const moedasPorSaldo = centavos => (centavos <= 0 ? 0 : Math.min(MAX_MOEDAS, 1 + Math.floor(Math.sqrt(centavos / 25))));

  const posRotulos = {
    ldr: new THREE.Vector3(0.3, ALTURA - 0.45, ENTRADA.z),
    pot: new THREE.Vector3(0.78, 2.12, PROFUNDIDADE / 2 + 0.15),
    botao: new THREE.Vector3(0.78, 0.68, PROFUNDIDADE / 2 + 0.15),
    tampa: new THREE.Vector3(-1.25, ALTURA - 0.02, -PROFUNDIDADE / 2 + 0.2),
    balanca: new THREE.Vector3(-0.75, 0.32, 0.6),
    esp32: new THREE.Vector3(-0.2, 1.8, -PROFUNDIDADE / 2 + 0.15),
    display: new THREE.Vector3(-0.65, 2.15, PROFUNDIDADE / 2 + 0.15),
    servo: new THREE.Vector3(1.32, ALTURA - 0.62, PROFUNDIDADE / 2 - 0.25),
    led: new THREE.Vector3(-0.65, 0.76, PROFUNDIDADE / 2 + 0.15),
    buzzer: new THREE.Vector3(-LARGURA / 2 + 0.14, 1.07, -0.55),
    nuvem: new THREE.Vector3(2.6, 4.3, -1.4),
  };
  const elementosRotulo = {};
  for (const peca of PECAS) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'cofre3d-pino';
    el.textContent = peca.numero;
    el.title = peca.nome;
    el.setAttribute('aria-label', `${peca.numero}. ${peca.nome}`);
    el.addEventListener('pointerdown', e => e.stopPropagation());
    el.addEventListener('click', () => aoSelecionar?.(peca.id));
    const objeto = new CSS2DObject(el);
    objeto.position.copy(posRotulos[peca.id]);
    cena.add(objeto);
    elementosRotulo[peca.id] = el;
  }

  const estado = {
    saldoCentavos: 0, metaCentavos: null, valorCentavos: 25, cor: 'verde', brilho: 60,
    trava: false, tampaAberta: false, online: true,
  };
  let selecionado = null;
  let transparente = false;
  const animacoes = [];
  let anguloTampa = 0;
  let anguloBraco = 0;
  let alarmeTempo = 0;
  let pulsoBuzzer = 0;
  let flashLdr = 0;
  let flashLed = 0;

  const desenharTela = () => {
    const ctx = telaCanvas.getContext('2d');
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#e8f4ff';
    ctx.font = '28px monospace';
    ctx.fillText('Cofrinho Invista+', 20, 42);
    ctx.fillText(estado.online ? 'B' : '-', 470, 42);
    ctx.font = 'bold 72px monospace';
    ctx.fillText(reais(estado.saldoCentavos), 20, 122);
    ctx.font = '26px monospace';
    const meta = estado.metaCentavos;
    const pct = meta ? Math.min(100, Math.floor((estado.saldoCentavos * 100) / meta)) : null;
    ctx.fillText(meta ? `Meta ${reais(meta)} ${pct}%` : 'Sem meta', 20, 168);
    ctx.fillText(`Valor: ${reais(estado.valorCentavos)}`, 20, 204);
    ctx.fillText(estado.trava ? 'Travado' : 'Destravado', 20, 240);
    telaTextura.needsUpdate = true;
  };

  const aplicarDestaque = () => {
    for (const [id, objetos] of Object.entries(partes)) {
      const ativo = id === selecionado;
      for (const obj of objetos) {
        if (!obj.material?.emissive) continue;
        obj.material.emissive.setHex(ativo ? 0x2f6fd6 : 0x000000);
        obj.material.emissiveIntensity = ativo ? 0.55 : 1;
      }
    }
    for (const [id, el] of Object.entries(elementosRotulo)) el.classList.toggle('ativo', id === selecionado);
  };

  const aplicarTransparencia = () => {
    for (const p of paredes) {
      p.material.opacity = transparente ? 0.16 : 1;
      p.material.depthWrite = !transparente;
      p.material.needsUpdate = true;
    }
    fios.visible = transparente;
  };

  const indiceValor = () => Math.max(0, VALORES_CENTAVOS.indexOf(estado.valorCentavos));

  function atualizar(novo) {
    Object.assign(estado, novo);
    desenharTela();
    matLinhaSinal.color.setHex(estado.online ? 0x2f86ff : 0x9aa5b1);
  }

  function depositar(valorCentavos, saldoFinal) {
    const valor = valorCentavos > 0 ? valorCentavos : estado.valorCentavos;
    const destinoSaldo = saldoFinal ?? estado.saldoCentavos + valor;
    const moeda = new THREE.Mesh(valor >= 200 ? new THREE.BoxGeometry(0.5, 0.01, 0.24) : geoMoeda, valor >= 200 ? material(0x6fbf73) : matMoeda);
    moeda.position.copy(ENTRADA);
    moeda.rotation.x = Math.PI / 2;
    cofre.add(moeda);
    const destino = pilha.position.clone().add(posicaoMoeda(Math.min(pilha.children.length, MAX_MOEDAS - 1)));
    aoEtapa?.('1. A moeda entra pela fenda e passa pelo sensor de luz');
    let ldrDisparado = false;
    animacoes.push({
      duracao: 1.6,
      t: 0,
      passo(p) {
        const q = p < 0.35 ? p / 0.35 : 1;
        const r = p < 0.35 ? 0 : (p - 0.35) / 0.65;
        if (p < 0.35) {
          moeda.position.set(ENTRADA.x, ENTRADA.y - q * 1.25, ENTRADA.z);
        } else {
          const e = r * r;
          moeda.position.set(
            THREE.MathUtils.lerp(ENTRADA.x, destino.x, suavizar(r)),
            THREE.MathUtils.lerp(ENTRADA.y - 1.25, destino.y + 0.04, e),
            THREE.MathUtils.lerp(ENTRADA.z, destino.z, suavizar(r)),
          );
          moeda.rotation.x = Math.PI / 2 * (1 - r);
          moeda.rotation.z += 0.25;
        }
        if (!ldrDisparado && moeda.position.y < ALTURA - 0.2) {
          ldrDisparado = true;
          flashLdr = 0.6;
        }
      },
      fim() {
        cofre.remove(moeda);
        if (moeda.geometry !== geoMoeda) moeda.geometry.dispose();
        estado.saldoCentavos = destinoSaldo;
        ajustarPilha(Math.max(moedasPorSaldo(destinoSaldo), pilha.children.length + 1));
        pulsoBuzzer = 0.5;
        flashLed = 0.5;
        desenharTela();
        aoEtapa?.('2. A balança pesa, o buzzer apita e o display atualiza o saldo');
        enviarSinal();
      },
    });
  }

  function enviarSinal() {
    const bolinha = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshBasicMaterial({ color: 0x2f86ff }));
    cena.add(bolinha);
    animacoes.push({
      duracao: 1.3,
      t: 0,
      passo(p) {
        bolinha.position.copy(curvaSinal.getPoint(suavizar(p)));
      },
      fim() {
        cena.remove(bolinha);
        bolinha.geometry.dispose();
        aoEtapa?.('3. O ESP32 envia pela internet: a API guarda no banco e o site, o app e o Blynk mostram o depósito');
        animacoes.push({
          duracao: 0.6,
          t: 0,
          passo(p) {
            nuvem.scale.setScalar(1 + Math.sin(p * Math.PI) * 0.18);
          },
          fim() {
            nuvem.scale.setScalar(1);
          },
        });
      },
    });
  }

  const relogio = new THREE.Clock();
  let quadro = 0;
  const tamanho = () => {
    const { clientWidth: l, clientHeight: a } = container;
    if (!l || !a) return;
    renderer.setSize(l, a);
    rotulos.setSize(l, a);
    camera.aspect = l / a;
    camera.fov = camera.aspect < 1 ? 38 / Math.max(camera.aspect, 0.55) : 38;
    camera.updateProjectionMatrix();
  };
  const observador = new ResizeObserver(tamanho);
  observador.observe(container);
  tamanho();

  const corLed = new THREE.Color();
  const vermelho = new THREE.Color(CORES_LED.vermelho);
  const branco = new THREE.Color(0xffffff);

  function quadroAnimacao() {
    quadro = requestAnimationFrame(quadroAnimacao);
    const dt = Math.min(relogio.getDelta(), 0.05);

    for (let i = animacoes.length - 1; i >= 0; i--) {
      const a = animacoes[i];
      a.t += dt;
      const p = Math.min(1, a.t / a.duracao);
      a.passo(p);
      if (p >= 1) {
        animacoes.splice(i, 1);
        a.fim?.();
      }
    }

    const alvoTampa = estado.tampaAberta ? -1.05 : 0;
    anguloTampa += (alvoTampa - anguloTampa) * Math.min(1, dt * 4);
    tampa.rotation.x = anguloTampa;

    const alvoBraco = estado.trava ? 0 : -Math.PI / 2;
    anguloBraco += (alvoBraco - anguloBraco) * Math.min(1, dt * 6);
    braco.rotation.z = anguloBraco;
    alavanca.position.x = estado.tampaAberta ? -0.05 : 0.05;

    const alvoPot = -2.2 + (indiceValor() / (VALORES_CENTAVOS.length - 1)) * 4.4;
    botaoGiro.rotation.z += (-alvoPot - botaoGiro.rotation.z) * Math.min(1, dt * 6);

    const alarme = estado.tampaAberta && estado.trava;
    if (alarme) {
      alarmeTempo += dt;
      pulsoBuzzer = Math.max(pulsoBuzzer, 0.2);
    } else {
      alarmeTempo = 0;
    }

    const intensidade = estado.cor === 'desligado' ? 0 : Math.max(0.15, (estado.brilho ?? 60) / 100);
    corLed.set(CORES_LED[estado.cor] ?? CORES_LED.verde);
    if (alarme) corLed.copy(Math.floor(alarmeTempo * 4) % 2 ? vermelho : new THREE.Color(0x200000));
    if (flashLed > 0) {
      flashLed -= dt;
      corLed.lerp(branco, Math.max(0, flashLed) * 1.6);
    }
    matLed.emissive.copy(corLed);
    matLed.emissiveIntensity = alarme ? 1.6 : 0.4 + intensidade * 1.4;
    luzLed.color.copy(corLed);
    luzLed.intensity = alarme ? 2.5 : intensidade * 2;

    if (flashLdr > 0) {
      flashLdr -= dt;
      bulbo.material.emissive.setHex(0xffdd55);
      bulbo.material.emissiveIntensity = Math.max(0, flashLdr) * 3;
    } else {
      bulbo.material.emissive.setHex(0x000000);
    }

    if (pulsoBuzzer > 0) {
      pulsoBuzzer -= dt;
      buzzer.scale.setScalar(1 + Math.abs(Math.sin(pulsoBuzzer * 40)) * 0.18);
    } else {
      buzzer.scale.setScalar(1);
    }

    matLinhaSinal.dashOffset -= dt * 0.6;
    nuvem.position.y = 3.7 + Math.sin(relogio.elapsedTime * 1.2) * 0.06;

    controles.update();
    renderer.render(cena, camera);
    rotulos.render(cena, camera);
  }

  desenharTela();
  aplicarTransparencia();
  quadroAnimacao();

  return {
    atualizar,
    depositar,
    definirSaldoInicial(centavos) {
      estado.saldoCentavos = centavos;
      ajustarPilha(moedasPorSaldo(centavos));
      desenharTela();
    },
    selecionar(id) {
      selecionado = id;
      aplicarDestaque();
    },
    definirTransparente(valor) {
      transparente = valor;
      aplicarTransparencia();
    },
    definirGiro(valor) {
      controles.autoRotate = valor;
    },
    destruir() {
      cancelAnimationFrame(quadro);
      observador.disconnect();
      controles.dispose();
      cena.traverse(obj => {
        obj.geometry?.dispose?.();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          m?.map?.dispose?.();
          m?.dispose?.();
        }
      });
      for (const el of Object.values(elementosRotulo)) el.remove();
      renderer.dispose();
      renderer.domElement.remove();
      rotulos.domElement.remove();
    },
  };
}
