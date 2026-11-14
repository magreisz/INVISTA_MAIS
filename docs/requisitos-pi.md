# Requisitos do PI (4º semestre DSM) e onde cada um é atendido

Tema do semestre: solução IoT com visualização de dados (dashboard) multiplataforma, web e mobile.

Legenda: ✅ implementado · ⏳ pendente

## Objetivo geral

| Requisito | Onde | Status |
| --- | --- | --- |
| Linguagens para web e mobile | API em Node.js, firmware em C++, web em React, app em React Native (Expo) | ✅ |
| Coleta e envio de dados IoT para web e mobile | `iot/firmware`, `POST /api/dispositivos/{id}/depositos`, `GET .../estado` | ✅ |
| Front-end para visualizar os dados | `web/src/paginas`, `mobile/src/telas` | ✅ |
| Back-end para receber e processar os dados | `lib/cofrinho.js`, `lib/estatistica.js` | ✅ |
| Integração com banco de dados | Firestore: `dispositivos`, `depositos`, `eventos`, `users` | ✅ |
| Controle de versão | GitHub, commits de todos os integrantes | ⏳ repositório na org FatecFranca |

## Laboratório de Desenvolvimento Web (disciplina-chave)

| Requisito | Onde | Status |
| --- | --- | --- |
| API RESTful | Recursos, verbos e códigos HTTP em `lib/cofrinho.js` e `lib/favoritos.js` | ✅ |
| Documentação OpenAPI | `docs/openapi.yaml` e `/api/docs` | ✅ |
| API integrada ao banco (persistência e consulta) | CRUD de dispositivos e favoritos; consultas por período | ✅ |
| Front-end em React integrado à API | `web/`: login, cofrinhos, painel ao vivo, controles, estatísticas, simulação, scanner, favoritos e Mentor | ✅ |

## Internet das Coisas e Aplicações

| Requisito | Onde | Status |
| --- | --- | --- |
| Sensores analógicos | LDR (GPIO 34) e potenciômetro (GPIO 35) | ✅ |
| Sensores digitais | Botão (GPIO 4) e chave da tampa (GPIO 27) | ✅ |
| Acionamento de atuadores | Servo, LED RGB e buzzer via Blynk (V5 a V8) e `PATCH .../atuadores` | ✅ |
| Persistência e protocolos de comunicação | Blynk (TLS), HTTPS/REST, I2C (OLED), Firestore | ✅ |
| Dashboard para consolidação dos dados | Web Dashboard do Blynk (`iot/README.md`) | ⏳ montar no console |

## Estatística

| Requisito | Onde | Status |
| --- | --- | --- |
| Média, moda, mediana, desvio padrão | `lib/estatistica.js` → `GET .../estatisticas` | ✅ |
| Assimetria e curtose | Pearson 1 e 2, Fisher, Bowley; curtose percentílica e por momentos | ✅ |
| Probabilidades | Depósito por dia da semana; chance de atingir a meta (normal) | ✅ |
| Correlação | Pearson entre o total guardado no dia (Y) e depósitos no dia, fim de semana e dia do mês (X1, X2, X3); matriz de correlação e gráficos de dispersão | ✅ |
| Regressão | Simples: tendência do saldo e calibração peso × saldo. Múltipla: Y = b0 + b1·X1 + b2·X2 + b3·X3, com t, p-valor, relevância a 5%, R² ajustado e projeção | ✅ |
| Intervalo de confiança | Média com desvio populacional conhecido (Z), média sem desvio populacional (t de Student) e proporção de cédulas (Z), a 90, 95, 98 e 99% | ✅ |
| Teste de hipóteses | Os 5 passos (hipóteses, significância, dados, estatística, decisão) com o teste t de Welch fim de semana × dias úteis | ✅ |
| Gráficos e interpretação dos dados do projeto | `docs/estatistica/analise_cofrinho.ipynb` (dados simulados; refazer com os reais) | ✅ |

## Programação para Dispositivos Móveis I

| Requisito | Onde | Status |
| --- | --- | --- |
| Consumir a API com dados dos sensores | `mobile/src/telas/Painel.js` e `Estatisticas.js` | ✅ |
| Widgets para mudar o estado dos atuadores | Switch (trava), seletor de cor, Slider (brilho) e botão (buzzer) em `Painel.js` | ✅ |
| Processamento dos dados recebidos | `mobile/src/processamento.js`: média móvel, dias para a meta, cotas de FII, resumo dos depósitos | ✅ |
| Apresentação gráfica | `mobile/src/componentes/Graficos.js`: linhas e barras em SVG | ✅ |

## Problema social

| Item | Onde | Status |
| --- | --- | --- |
| Problema ligado à sociedade (educação financeira de crianças e famílias, ODS 4 e 8) | README, seção "Problema e impacto social" | ✅ |
| Benefício para pessoas reais | Piloto com famílias voluntárias | ⏳ |

## Entrega

| Item | Status |
| --- | --- |
| Repositório na organização github.com/FatecFranca, com commits de todos | ⏳ |
| Vídeo de até 5 min no YouTube, público, com fala de todos | ✅ https://youtu.be/fG7aRtdNYPg (4 min 57 s) |
| Link do vídeo e documentos no README | ✅ seção "Acesse" do README |
| Entrega pelo formulário até 1 mês antes do fim das aulas | ⏳ |
