export const PECAS = [
  {
    id: 'ldr', numero: 1, nome: 'Sensor de luz (LDR)', tipo: 'Sensor analógico', grupo: 'sensores',
    texto: 'Fica logo abaixo da entrada de moedas. Quando a moeda passa, ela faz sombra e o sensor percebe que entrou dinheiro.',
  },
  {
    id: 'pot', numero: 2, nome: 'Potenciômetro', tipo: 'Sensor analógico', grupo: 'sensores',
    texto: 'É o botão de girar da frente. Ele escolhe o valor que está sendo guardado, de R$ 0,05 a R$ 200.',
  },
  {
    id: 'botao', numero: 3, nome: 'Botão de depósito', tipo: 'Sensor digital', grupo: 'sensores',
    texto: 'Um clique registra o depósito na hora. Segurando por 2 segundos, o cofrinho envia um relatório por e-mail.',
  },
  {
    id: 'tampa', numero: 4, nome: 'Sensor da tampa', tipo: 'Sensor digital', grupo: 'sensores',
    texto: 'Percebe quando a tampa é aberta. Se alguém abrir com a trava ligada, o alarme dispara.',
  },
  {
    id: 'balanca', numero: 5, nome: 'Balança (HX711)', tipo: 'Sensor', grupo: 'sensores',
    texto: 'Pesa as moedas guardadas. Serve para conferir se o valor registrado bate com o que está dentro do cofre.',
  },
  {
    id: 'esp32', numero: 6, nome: 'ESP32', tipo: 'Microcontrolador', grupo: 'cerebro',
    texto: 'É o cérebro do cofrinho. Lê todos os sensores, controla as peças e se conecta à internet pelo Wi-Fi.',
  },
  {
    id: 'display', numero: 7, nome: 'Display OLED', tipo: 'Atuador', grupo: 'atuadores',
    texto: 'A telinha da frente. Mostra o saldo, a meta e o valor escolhido no potenciômetro.',
  },
  {
    id: 'servo', numero: 8, nome: 'Trava (servo motor)', tipo: 'Atuador', grupo: 'atuadores',
    texto: 'Um motorzinho que gira e tranca a tampa. Pode ser travado à distância pelo site, pelo app ou pelo Blynk.',
  },
  {
    id: 'led', numero: 9, nome: 'LED RGB', tipo: 'Atuador', grupo: 'atuadores',
    texto: 'Uma luz que muda de cor. Fica verde quando a meta é atingida e pisca em vermelho no alarme. A cor e o brilho podem ser escolhidos à distância.',
  },
  {
    id: 'buzzer', numero: 10, nome: 'Buzzer', tipo: 'Atuador', grupo: 'atuadores',
    texto: 'Um alto-falante pequeno. Apita a cada depósito, toca uma música quando a meta é atingida e soa o alarme.',
  },
  {
    id: 'nuvem', numero: 11, nome: 'Internet (API + Blynk)', tipo: 'Comunicação', grupo: 'cerebro',
    texto: 'Cada depósito sai do ESP32 pela internet: vai para a nossa API, que guarda no banco de dados, e para o Blynk, o painel de IoT. Assim o site e o app mostram tudo em tempo real.',
  },
];

export const GRUPOS = [
  { id: 'sensores', titulo: 'Sensores (percebem)' },
  { id: 'atuadores', titulo: 'Atuadores (agem)' },
  { id: 'cerebro', titulo: 'Cérebro e internet' },
];

export const VALORES_CENTAVOS = [5, 10, 25, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];

export const CORES_LED = {
  desligado: '#20262e',
  verde: '#2bd46a',
  amarelo: '#ffc21a',
  vermelho: '#ff3b3b',
  azul: '#2f86ff',
};
