#include "secrets.h"
#include "certificados.h"

#define BLYNK_PRINT Serial
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#ifdef BLYNK_SEM_TLS
#include <BlynkSimpleEsp32.h>
#else
#include <BlynkSimpleEsp32_SSL.h>
#endif
#include <ESP32Servo.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <HX711.h>
#include <Preferences.h>

const int PINO_LDR = 34;
const int PINO_POT = 35;
const int PINO_BOTAO = 4;
const int PINO_TAMPA = 27;
const int PINO_HX_DT = 16;
const int PINO_HX_SCK = 17;
const int PINO_SERVO = 18;
const int PINO_BUZZER = 19;
const int PINOS_RGB[3] = {25, 26, 33};

const int LIMIAR_SOMBRA = 500;
const unsigned long ESPERA_PESO_MS = 800;
const unsigned long PRESSAO_LONGA_MS = 2000;
const unsigned long TELEMETRIA_MS = 5UL * 60 * 1000;
const float FATOR_BALANCA = 0.42;
const int ANGULO_TRAVADO = 0;
const int ANGULO_DESTRAVADO = 90;
const int VALORES_CENTAVOS[] = {5, 10, 25, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000};
const int QTD_VALORES = sizeof(VALORES_CENTAVOS) / sizeof(VALORES_CENTAVOS[0]);
const uint8_t CORES_RGB[5][3] = {{0, 0, 0}, {0, 255, 0}, {255, 160, 0}, {255, 0, 0}, {0, 0, 255}};

Adafruit_SSD1306 tela(128, 64, &Wire, -1);
HX711 balanca;
Servo trava;
BlynkTimer timer;
Preferences memoria;

long saldoCentavos = 0;
long metaCentavos = 0;
bool travado = false;
bool tampaAberta = false;
bool tampaLida = false;
bool metaComemorada = false;
bool sombra = false;
int corAtual = 0;
int brilhoAtual = 60;
float linhaBaseLdr = 0;
unsigned long passagemEm = 0;
unsigned long tampaMudouEm = 0;
unsigned long botaoDesde = 0;
bool botaoLongoFeito = false;
volatile bool botaoApertou = false;
unsigned long ultimaVerificacaoBotao = 0;

void IRAM_ATTR aoApertarBotao() {
  botaoApertou = true;
}
uint32_t contadorBoot = 0;
uint32_t sequencia = 0;
char idChip[7];
char mensagem[22] = "";
unsigned long mensagemAte = 0;
unsigned long proximaTentativaBlynk = 0;
unsigned long esperaBlynk = 5000;
bool saldoSincronizado = false;
unsigned long proximaSincronia = 0;
int tentativasSincronia = 0;

struct Pendente {
  char caminho[16];
  char corpo[160];
};
const int MAX_PENDENTES = 20;
Pendente fila[MAX_PENDENTES];
int inicioFila = 0;
int tamanhoFila = 0;

bool apiConfigurada() { return DISPOSITIVO_ID[0] != '\0' && CHAVE_DISPOSITIVO[0] != '\0'; }

void mostrarMensagem(const char* texto) {
  strlcpy(mensagem, texto, sizeof(mensagem));
  mensagemAte = millis() + 4000;
}

void novoId(char* destino, size_t tamanho) {
  snprintf(destino, tamanho, "%s-%lu-%lu", idChip, (unsigned long)contadorBoot, (unsigned long)++sequencia);
}

int postarApi(const char* caminho, const char* corpo) {
  WiFiClientSecure cliente;
  cliente.setCACert(RAIZES_TLS);
  HTTPClient http;
  String url = String(API_URL) + "/api/dispositivos/" + DISPOSITIVO_ID + caminho;
  if (!http.begin(cliente, url)) return -1;
  http.setTimeout(10000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + CHAVE_DISPOSITIVO);
  int status = http.POST(String(corpo));
  if (status == 200 || status == 201) {
    String resposta = http.getString();
    int i = resposta.indexOf("\"saldoCentavos\":");
    if (i >= 0) {
      saldoCentavos = resposta.substring(i + 16).toInt();
      memoria.putLong("saldo", saldoCentavos);
    }
  }
  http.end();
  return status;
}

void sincronizarSaldo() {
  if (saldoSincronizado || tentativasSincronia >= 3 || !apiConfigurada() || !Blynk.connected() || millis() < proximaSincronia) return;
  tentativasSincronia++;
  proximaSincronia = millis() + 30000;
  WiFiClientSecure cliente;
  cliente.setCACert(RAIZES_TLS);
  HTTPClient http;
  String url = String(API_URL) + "/api/dispositivos/" + DISPOSITIVO_ID + "/saldo";
  if (!http.begin(cliente, url)) return;
  http.setTimeout(10000);
  http.addHeader("Authorization", String("Bearer ") + CHAVE_DISPOSITIVO);
  int status = http.GET();
  if (status == 200) {
    String resposta = http.getString();
    int i = resposta.indexOf("\"saldoCentavos\":");
    if (i >= 0) {
      saldoCentavos = resposta.substring(i + 16).toInt();
      memoria.putLong("saldo", saldoCentavos);
    }
    int j = resposta.indexOf("\"metaCentavos\":");
    if (j >= 0) {
      long meta = resposta.substring(j + 15).toInt();
      if (meta > 0) metaCentavos = meta;
    }
    metaComemorada = metaCentavos > 0 && saldoCentavos >= metaCentavos;
    if (Blynk.connected()) Blynk.virtualWrite(V0, saldoCentavos / 100.0);
    saldoSincronizado = true;
    mostrarMensagem("Saldo atualizado");
    Serial.printf("Saldo lido da API: R$%.2f\n", saldoCentavos / 100.0);
  } else if (status == 401 || status == 404) {
    saldoSincronizado = true;
    Serial.printf("API recusou a leitura do saldo (HTTP %d).\n", status);
  }
  http.end();
}

void enviarPendentes() {
  if (!apiConfigurada() || WiFi.status() != WL_CONNECTED) return;
  while (tamanhoFila > 0) {
    Pendente& p = fila[inicioFila];
    int status = postarApi(p.caminho, p.corpo);
    if (status < 0 || status == 429 || status >= 500) return;
    if (status >= 400) Serial.printf("API recusou %s (HTTP %d): descartado.\n", p.caminho, status);
    inicioFila = (inicioFila + 1) % MAX_PENDENTES;
    tamanhoFila--;
  }
}

void enfileirar(const char* caminho, const char* corpo) {
  if (!apiConfigurada()) return;
  if (tamanhoFila == MAX_PENDENTES) {
    Serial.println("Fila cheia: o envio mais antigo foi descartado.");
    inicioFila = (inicioFila + 1) % MAX_PENDENTES;
    tamanhoFila--;
  }
  Pendente& p = fila[(inicioFila + tamanhoFila) % MAX_PENDENTES];
  strlcpy(p.caminho, caminho, sizeof(p.caminho));
  strlcpy(p.corpo, corpo, sizeof(p.corpo));
  tamanhoFila++;
  enviarPendentes();
}

void aplicarLed() {
  for (int i = 0; i < 3; i++) analogWrite(PINOS_RGB[i], CORES_RGB[corAtual][i] * brilhoAtual / 100);
}

void bip(int frequencia, int duracaoMs) {
  tone(PINO_BUZZER, frequencia, duracaoMs);
}

void comemorarMeta() {
  corAtual = 1;
  aplicarLed();
  Blynk.virtualWrite(V6, corAtual);
  const int notas[] = {1047, 1319, 1568, 2093};
  for (int nota : notas) {
    tone(PINO_BUZZER, nota, 120);
    delay(150);
  }
  mostrarMensagem("META ATINGIDA!");
  Blynk.logEvent("meta_atingida", "O cofrinho atingiu a meta");
}

void alarme() {
  for (int i = 0; i < 3; i++) {
    analogWrite(PINOS_RGB[0], 255);
    analogWrite(PINOS_RGB[1], 0);
    analogWrite(PINOS_RGB[2], 0);
    tone(PINO_BUZZER, 2500, 200);
    delay(250);
    for (int pino : PINOS_RGB) analogWrite(pino, 0);
    delay(150);
  }
  aplicarLed();
}

int valorSelecionado() {
  return VALORES_CENTAVOS[analogRead(PINO_POT) * QTD_VALORES / 4096];
}

float lerPeso() {
  if (!balanca.wait_ready_timeout(200)) return NAN;
  return max(0.0f, balanca.get_units(3));
}

int luminosidade() {
  return 100 - analogRead(PINO_LDR) * 100 / 4095;
}

void verificarMeta() {
  if (metaCentavos > 0 && saldoCentavos >= metaCentavos && !metaComemorada) {
    metaComemorada = true;
    comemorarMeta();
  }
}

void registrarDeposito(int valor, float pesoGramas) {
  Serial.printf("Deposito: R$%.2f\n", valor / 100.0);
  saldoCentavos += valor;
  memoria.putLong("saldo", saldoCentavos);
  const char* forma = valor <= 100 ? "moeda" : "cedula";
  char id[40];
  novoId(id, sizeof(id));
  char corpo[160];
  if (isnan(pesoGramas)) {
    snprintf(corpo, sizeof(corpo), "{\"id\":\"%s\",\"valorCentavos\":%d,\"forma\":\"%s\"}", id, valor, forma);
  } else {
    snprintf(corpo, sizeof(corpo), "{\"id\":\"%s\",\"valorCentavos\":%d,\"forma\":\"%s\",\"pesoGramas\":%.1f}", id, valor, forma, pesoGramas);
    Blynk.virtualWrite(V2, pesoGramas);
  }
  Blynk.virtualWrite(V0, saldoCentavos / 100.0);
  Blynk.virtualWrite(V1, valor / 100.0);
  bip(1800, 60);
  char texto[22];
  snprintf(texto, sizeof(texto), "+ R$ %.2f", valor / 100.0);
  mostrarMensagem(texto);
  enfileirar("/depositos", corpo);
  verificarMeta();
}

void enviarEvento(const char* tipo) {
  char id[40];
  novoId(id, sizeof(id));
  char corpo[96];
  snprintf(corpo, sizeof(corpo), "{\"id\":\"%s\",\"tipo\":\"%s\"}", id, tipo);
  enfileirar("/eventos", corpo);
}

void pedirRelatorio() {
  if (!apiConfigurada() || WiFi.status() != WL_CONNECTED) {
    mostrarMensagem("Sem conexao");
    return;
  }
  mostrarMensagem("Enviando...");
  int status = postarApi("/relatorios", "{}");
  mostrarMensagem(status == 202 ? "Relatorio enviado" : status == 429 ? "Aguarde 10 min" : "Falha no relatorio");
}

void verificarFenda() {
  int leitura = analogRead(PINO_LDR);
  float diferenca = fabs(leitura - linhaBaseLdr);
  if (!sombra && diferenca > LIMIAR_SOMBRA) {
    sombra = true;
    if (passagemEm == 0) passagemEm = millis();
  } else if (sombra && diferenca < LIMIAR_SOMBRA / 2) {
    sombra = false;
  }
  if (!sombra && passagemEm == 0) linhaBaseLdr += (leitura - linhaBaseLdr) * 0.01;
  if (passagemEm != 0 && millis() - passagemEm >= ESPERA_PESO_MS) {
    passagemEm = 0;
    registrarDeposito(valorSelecionado(), lerPeso());
  }
}

void verificarBotao() {
  bool pressionado = digitalRead(PINO_BOTAO) == LOW;
  unsigned long agora = millis();
  if ((pressionado || botaoApertou) && botaoDesde == 0) {
    botaoDesde = max(agora, 1UL);
    botaoLongoFeito = false;
  }
  botaoApertou = false;
  if (botaoDesde != 0 && agora - ultimaVerificacaoBotao > 300) botaoDesde = max(agora, 1UL);
  ultimaVerificacaoBotao = agora;
  if (pressionado && !botaoLongoFeito && agora - botaoDesde >= PRESSAO_LONGA_MS) {
    botaoLongoFeito = true;
    pedirRelatorio();
  }
  if (!pressionado && botaoDesde != 0) {
    if (!botaoLongoFeito) registrarDeposito(valorSelecionado(), lerPeso());
    botaoDesde = 0;
  }
}

void verificarTampa() {
  bool aberta = digitalRead(PINO_TAMPA) == HIGH;
  if (aberta != tampaLida) {
    tampaLida = aberta;
    tampaMudouEm = millis();
  }
  if (aberta == tampaAberta || millis() - tampaMudouEm < 50) return;
  tampaAberta = aberta;
  Blynk.virtualWrite(V4, tampaAberta ? 1 : 0);
  enviarEvento(tampaAberta ? "tampa_aberta" : "tampa_fechada");
  if (tampaAberta && travado) {
    enviarEvento("violacao");
    Blynk.logEvent("violacao", "Tampa aberta com a trava ligada");
    alarme();
  }
}

void enviarTelemetria() {
  float peso = lerPeso();
  if (!isnan(peso)) Blynk.virtualWrite(V2, peso);
  Blynk.virtualWrite(V3, luminosidade());
  Blynk.virtualWrite(V4, tampaAberta ? 1 : 0);
}

void desenharTela() {
  tela.clearDisplay();
  tela.setTextColor(SSD1306_WHITE);
  tela.setTextSize(1);
  tela.setCursor(0, 0);
  tela.print("Cofrinho Invista+");
  tela.setCursor(116, 0);
  tela.print(Blynk.connected() ? "B" : "-");
  tela.setTextSize(2);
  tela.setCursor(0, 13);
  tela.printf("R$%.2f", saldoCentavos / 100.0);
  tela.setTextSize(1);
  tela.setCursor(0, 34);
  if (metaCentavos > 0) {
    tela.printf("Meta R$%.2f %ld%%", metaCentavos / 100.0, min(100L, saldoCentavos * 100 / metaCentavos));
  } else {
    tela.print("Sem meta definida");
  }
  tela.setCursor(0, 45);
  tela.printf("Valor: R$%.2f", valorSelecionado() / 100.0);
  tela.setCursor(0, 56);
  if (millis() < mensagemAte) {
    tela.print(mensagem);
  } else {
    tela.print(travado ? "Travado" : "Destravado");
    if (tamanhoFila > 0) tela.printf("  fila:%d", tamanhoFila);
  }
  tela.display();
}

void manterBlynk() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (Blynk.connected()) {
    Blynk.run();
    esperaBlynk = 5000;
    return;
  }
  if (millis() < proximaTentativaBlynk) return;
  Blynk.connect(3000);
  if (!Blynk.connected()) esperaBlynk = min(esperaBlynk * 2, 60000UL);
  proximaTentativaBlynk = millis() + esperaBlynk;
}

BLYNK_CONNECTED() {
  Blynk.syncVirtual(V5, V6, V7, V9);
  Blynk.virtualWrite(V0, saldoCentavos / 100.0);
  Blynk.virtualWrite(V4, tampaAberta ? 1 : 0);
}

BLYNK_WRITE(V5) {
  travado = param.asInt() == 1;
  trava.write(travado ? ANGULO_TRAVADO : ANGULO_DESTRAVADO);
}

BLYNK_WRITE(V6) {
  corAtual = constrain(param.asInt(), 0, 4);
  aplicarLed();
}

BLYNK_WRITE(V7) {
  brilhoAtual = constrain(param.asInt(), 0, 100);
  aplicarLed();
}

BLYNK_WRITE(V8) {
  if (param.asInt() == 1) {
    bip(2000, 150);
    Blynk.virtualWrite(V8, 0);
  }
}

BLYNK_WRITE(V9) {
  metaCentavos = lround(param.asDouble() * 100);
  metaComemorada = metaCentavos > 0 && saldoCentavos >= metaCentavos;
}

void setup() {
  Serial.begin(115200);
  pinMode(PINO_BOTAO, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PINO_BOTAO), aoApertarBotao, FALLING);
  pinMode(PINO_TAMPA, INPUT_PULLUP);
  analogReadResolution(12);

  trava.setPeriodHertz(50);
  trava.attach(PINO_SERVO, 500, 2400);
  trava.write(ANGULO_DESTRAVADO);
  for (int pino : PINOS_RGB) pinMode(pino, OUTPUT);
  aplicarLed();

  Wire.begin(21, 22);
  if (!tela.begin(SSD1306_SWITCHCAPVCC, 0x3C)) Serial.println("Display OLED nao encontrado.");

  memoria.begin("cofrinho", false);
  saldoCentavos = memoria.getLong("saldo", 0);
  contadorBoot = memoria.getUInt("boots", 0) + 1;
  memoria.putUInt("boots", contadorBoot);
  snprintf(idChip, sizeof(idChip), "%06lx", (unsigned long)(ESP.getEfuseMac() & 0xFFFFFF));

  balanca.begin(PINO_HX_DT, PINO_HX_SCK);
  balanca.set_scale(FATOR_BALANCA);
  if (digitalRead(PINO_BOTAO) == LOW || !memoria.isKey("tara")) {
    balanca.tare(10);
    memoria.putLong("tara", balanca.get_offset());
    Serial.println("Balanca zerada (tara).");
  } else {
    balanca.set_offset(memoria.getLong("tara", 0));
  }

  long soma = 0;
  for (int i = 0; i < 20; i++) {
    soma += analogRead(PINO_LDR);
    delay(5);
  }
  linhaBaseLdr = soma / 20.0;
  tampaAberta = tampaLida = digitalRead(PINO_TAMPA) == HIGH;

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Blynk.config(BLYNK_AUTH_TOKEN, BLYNK_SERVIDOR);

  timer.setInterval(TELEMETRIA_MS, enviarTelemetria);
  timer.setInterval(15000L, enviarPendentes);
  timer.setInterval(300L, desenharTela);
}

void loop() {
  manterBlynk();
  sincronizarSaldo();
  timer.run();
  verificarFenda();
  verificarBotao();
  verificarTampa();
}
