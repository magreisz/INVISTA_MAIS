# Invista+ — Scanner fundamentalista com Mentor IA

O Invista+ ajuda a estudar ações e fundos imobiliários da B3. O servidor consulta indicadores no Investidor10 e a Selic no Banco Central; calcula estimativas de Graham/Bazin, margens de segurança e o efeito bola de neve dos FIIs. O perfil Conservador, Moderado ou Arrojado muda a interpretação dos indicadores. O Firebase gerencia login e favoritos. O **Cofrinho Invista+** (ESP32 + Blynk) registra depósitos reais, alimenta a análise estatística e pode ser controlado pela web e pelo app.

## Acesse

| O quê | Link |
| --- | --- |
| Site (dashboard do cofrinho) | https://invista-mais-brown.vercel.app |
| Cofre 3D (como o cofrinho funciona por dentro) | https://invista-mais-brown.vercel.app/cofre-3d |
| API e documentação OpenAPI | https://invista-mais-api.vercel.app/api/docs |
| Simulação do cofrinho no Wokwi | https://wokwi.com/projects/476253388257385473 |

## Problema e impacto social

O projeto trabalha a educação financeira desde cedo, usando um cofrinho físico conectado para transformar cada moeda guardada em aprendizado.

* **Público:** crianças, adolescentes e suas famílias em Franca (SP). A conta pertence ao responsável e o cofrinho é identificado só por um apelido.
* **Como ajuda:** o display do cofrinho mostra saldo e meta; o site e o app acompanham o hábito de poupar com estatística e simulam quanto o dinheiro renderia na poupança ou em um título Selic, sempre como conteúdo educativo.
* **ODS da ONU:** 4 (educação de qualidade) e 8 (trabalho decente e crescimento econômico).
* **Validação:** piloto com famílias voluntárias; os depósitos reais alimentam a análise estatística.

## Como rodar

O passo a passo completo (instalação, modo emulador sem senhas, app no celular, notebook e publicação) está em [`docs/como-rodar.md`](docs/como-rodar.md).

| Parte | Pasta | Comando |
| --- | --- | --- |
| API | raiz | `npm start` |
| Site React | `web/` | `npm run web` |
| App React Native | `mobile/` | `npm run mobile` |
| Emuladores do Firebase | raiz | `npm run emuladores` |
| Firmware e circuito | `iot/` | [Simulação no Wokwi](https://wokwi.com/projects/476253388257385473) ou Arduino IDE |
| Notebook de estatística | `docs/estatistica/` | Jupyter |

## Equipe

* [@magreisz](https://github.com/magreisz)
* [@VIT0R-maker](https://github.com/VIT0R-maker)
* [@MarceloMoraisBueno](https://github.com/MarceloMoraisBueno)
* [@matheus-marques-dev](https://github.com/matheus-marques-dev)

## Mentor IA com Gemini

- Ao concluir uma pesquisa, usuários conectados recebem um resumo educativo do ativo, com indicadores, riscos e limitações. A IA é chamada após a pesquisa, não a cada tecla.
- O campo de perguntas aceita dúvidas financeiras e mantém as últimas quatro interações. As sugestões ajudam a interpretar indicadores, avaliar riscos e entender diversificação.
- O ticker, o tipo de ativo e o perfil selecionados acompanham a pergunta. **Nova conversa sem ativo** permite falar de finanças em geral. Trocar ativo, aba, perfil ou conta limpa a conversa; respostas atrasadas são descartadas.
- Os cards continuam funcionando mesmo quando a IA está indisponível. Há estados de carregamento, erro e nova tentativa.
- O Gemini recebe os indicadores obtidos pelo próprio servidor, usando a mesma função de análise dos cards. O corpo enviado pelo navegador não fornece os valores usados pela IA.
- As respostas usam texto simples, sem executar HTML. O sistema instrui a IA a reconhecer dados ausentes, evitar recomendações personalizadas e não inventar notícias, preços ou acesso a ferramentas. Essas instruções reduzem erros, mas não garantem exatidão.

Não há integração com BRAPI nesta versão. A IA não pesquisa a internet. Indicadores podem ter atraso; o horário mostrado é o da consulta, não da atualização na bolsa. A consulta da IA pode usar uma captura diferente da mostrada nos cards se a fonte mudar nesse intervalo. Valuations são estimativas, não preços garantidos. A Selic usada pode vir do cache ou do valor de contingência existente em `lib/bcb.js`.

## Executar localmente

Requer **Node.js 22.13 ou superior** (recomendado: Node 24).

```sh
npm ci
```

Copie `.env.example` para `.env`, preencha as variáveis e execute:

```sh
npm start
```

Abra <http://localhost:3000>. `npm run dev` reinicia o servidor ao editar arquivos. `.env` é carregado pelo Node e ignorado pelo Git. Sem credenciais de IA/Firebase Admin, o scanner continua acessível e o Mentor informa a indisponibilidade.

| Variável de servidor | Finalidade |
| --- | --- |
| `GEMINI_API_KEY` | Chave do Google AI Studio; necessária para o Mentor |
| `GEMINI_MODEL` | Opcional, padrão `gemini-3.5-flash-lite` |
| `FIREBASE_PROJECT_ID` | Mesmo projeto do Firebase Auth da interface |
| `FIREBASE_CLIENT_EMAIL` | E-mail da conta de serviço Firebase Admin |
| `FIREBASE_PRIVATE_KEY` | Chave privada da conta de serviço; aceita `\n` literal |
| `EMAIL_USER`, `EMAIL_PASS` | Gmail com senha de app, usado no relatório do cofrinho |
| `BLYNK_SERVER` | Servidor da região da conta Blynk (padrão `blynk.cloud`) |
| `CORS_ORIGINS` | Opcional: origens permitidas, separadas por vírgula |

O login da interface usa a configuração pública Firebase existente nos HTMLs. Essa configuração é distinta da chave Gemini e da chave privada de serviço. Para outro projeto Firebase, atualize os três HTMLs e as variáveis do servidor, e autorize o domínio de acesso no Firebase Authentication.

## Ativar na Vercel e no GitHub Pages

1. Publique este código no projeto Vercel que atende o backend. O `vercel.json` encaminha as requisições ao Express e inclui explicitamente HTML/CSS/JS públicos no pacote da função. Use Node 24 e um plano/configuração com tempo de execução suficiente para a consulta de indicadores e a IA (até 60 segundos).
2. Em **Settings → Environment Variables**, configure `GEMINI_API_KEY` e as três variáveis `FIREBASE_*`. Opcionalmente defina `GEMINI_MODEL`. Depois faça um novo deploy para aplicar as variáveis. Não use prefixos públicos e não coloque segredos em HTML, JavaScript do navegador ou Git.
3. No Firebase Console → Firestore → Rules, publique as regras de `firestore.rules`, compatíveis com as coleções usadas neste repositório. Se seu banco tiver outras aplicações/coleções, incorpore as regras mantendo os acessos necessários. Remova regras genéricas que liberem todas as coleções: permissões Firestore são cumulativas, e um `allow false` não anula outro `allow true`.
4. A coleção `mentorUsage` deve ficar inacessível a clientes. O Admin SDK do servidor acessa a coleção por IAM, independentemente dessas regras. Conceda à conta de serviço acesso ao Firestore. O arquivo também mantém favoritos privados por usuário e dispositivos acessíveis somente ao servidor.
5. No GitHub Pages, a interface usa o backend definido em `assets/config.js`, atualmente `https://invista-mais-api.vercel.app`. Altere essa URL se o projeto Vercel tiver outro domínio. Em localhost e na Vercel, a interface usa a própria origem. Para Pages, publique `index.html`, `login.html`, `cadastro.html` e a pasta `assets/`.
6. Entre com uma conta Firebase, pesquise PETR4 na aba Ações ou MXRF11 na aba FIIs, confira o resumo e envie uma pergunta. Também teste **Nova conversa sem ativo**.

As configurações remotas da Vercel e as regras Firestore **não são publicadas automaticamente** por editar esses arquivos. A chave usada em um teste local também não configura a produção. Chaves expostas em conversas devem ser substituídas antes da ativação definitiva.

## Uso, privacidade e falhas

`POST /api/mentor` exige um Firebase ID token no header `Authorization: Bearer ...`. Contas anônimas são recusadas. Há um limite transacional no Firestore de **30 solicitações por conta por dia UTC**, com intervalo mínimo de cinco segundos; ele funciona entre diferentes instâncias da Vercel. A renovação diária ocorre às 00h UTC (21h do dia anterior em Brasília).

As tentativas aceitas consomem a cota antes de consultar fontes externas, inclusive quando uma fonte falha. O limite por conta não é um teto global de gastos: contas diferentes têm cotas diferentes. Configure também cotas e alertas no projeto Google. A proteção depende de publicar as regras do Firestore indicadas acima.

Perguntas, histórico recente e indicadores são enviados ao Google. O servidor não persiste conversas nem registra chaves ou respostas do provedor em logs. O histórico fica somente na memória da página. O Firestore guarda apenas um identificador derivado do UID, dia, contador e horário da última solicitação; o documento é reutilizado no próximo dia. O tratamento de dados pelo Google segue os termos do serviço e do plano da conta.

| Resposta | Significado |
| --- | --- |
| 400 / 413 | Pergunta, ticker, perfil, histórico ou tamanho inválido |
| 401 | Login ausente, expirado, inválido ou anônimo |
| 422 | Geração bloqueada ou incompleta; reformule a pergunta |
| 429 | Limite da conta, intervalo mínimo ou cota do provedor |
| 502 / 504 | Falha da fonte de indicadores, resposta inválida ou timeout da IA |
| 503 | Chave/modelo/Firebase indisponível ou configuração pendente |

O timeout da chamada Gemini é de 20 segundos; o navegador espera até 65 segundos pela operação completa. O scraper mantém o cache original de cinco minutos por instância. Não há repetição automática de chamadas pagas nem cache persistente de respostas de IA.

## Cofrinho IoT e API REST

A documentação interativa (OpenAPI 3.1) fica em **`/api/docs`**, e o arquivo em [`docs/openapi.yaml`](docs/openapi.yaml).

| Recurso | Rotas |
| --- | --- |
| Ativos | `GET /api/ativos/{acoes\|fiis}/{ticker}?perfil=` |
| Favoritos | `GET /api/usuarios/me/favoritos`, `PUT` e `DELETE /api/usuarios/me/favoritos/{ticker}` |
| Cofrinhos | `POST`/`GET /api/dispositivos`, `GET`/`PATCH`/`DELETE /api/dispositivos/{id}`, `POST /api/dispositivos/{id}/chave` |
| Enviado pelo ESP32 | `POST /api/dispositivos/{id}/depositos`, `/eventos`, `/relatorios` (chave do dispositivo) |
| Análises | `GET /api/dispositivos/{id}/estatisticas`, `/simulacao`, `/depositos`, `/eventos` |
| Tempo real (Blynk) | `GET /api/dispositivos/{id}/estado`, `PATCH /api/dispositivos/{id}/atuadores` |

As rotas de usuário exigem o Firebase ID token e conferem se o cofrinho pertence à conta. Todo corpo é validado com lista de campos permitidos. Firmware, circuito do Wokwi e configuração do Blynk estão em [`iot/`](iot/README.md).

A estatística (`lib/estatistica.js`) calcula:
* média, mediana, moda, quartis, variância, desvios padrão e coeficiente de variação;
* assimetria (Pearson 1 e 2, Fisher, Bowley) e curtose (percentílica e por momentos);
* probabilidade de depósito por dia da semana e de atingir a meta;
* regressões de tendência e de calibração peso × saldo;
* intervalo de confiança de 95% e teste t de Welch.

Os resultados conferem com Python/scipy nos testes. Para ter volume antes dos dados reais, o script abaixo grava depósitos marcados como `simulado` (sem alterar o saldo físico do cofre):

```sh
node --env-file=.env scripts/simular-depositos.js <id-do-cofrinho> 60
node --env-file=.env scripts/simular-depositos.js <id-do-cofrinho> --limpar
```

## Arquitetura

```text
index.html + assets/    interface, login Firebase, cards e Mentor
server.js              Express, CORS, limite de requisições, rotas e documentação
lib/cofrinho.js         rotas REST do cofrinho (dispositivos, depósitos, atuadores)
lib/favoritos.js        favoritos do usuário pela API
lib/estatistica.js      estatística descritiva, probabilidade, regressão e inferência
lib/simulacao.js        simulação educativa: cofre x poupança x Selic
lib/blynk.js            cliente da API HTTPS do Blynk
lib/auth.js             Firebase ID token e chave do dispositivo
iot/                   firmware ESP32, circuito Wokwi e guia do Blynk
web/                   site em React (Vite, Recharts, Firebase Auth)
mobile/                app em React Native (Expo)
docs/openapi.yaml       especificação da API
docs/estatistica/       notebook de análise e dados de exemplo
docs/como-rodar.md      guia de instalação e execução
lib/analysis.js         análise compartilhada de ações e FIIs
lib/mentor.js           Gemini, validação, contexto e limite persistente
lib/scraper.js          Investidor10, retry e cache
lib/bcb.js              Selic, cache e contingência
lib/valuation.js        Graham/Bazin
lib/classify.js         classificação por perfil
lib/format.js           parsing e formatação pt-BR
firestore.rules        acesso das coleções do projeto
test/                  provas do backend e da interface
```

A adaptação Graham Tupiniquim existente continua como `LPA × (5,5 + 2g) × (4,4 / Selic)`, com crescimento e Selic em pontos percentuais. A integração não muda as fórmulas ou os critérios de classificação.

## Verificação

```sh
npm test
```

Os testes não usam chaves reais nem fazem consultas externas: verificam autenticação, contexto reconstruído no servidor, contratos do Gemini, erros sanitizados, limite de uso, cálculos e interface. Incluem respostas atrasadas, isolamento de histórico, login, erros recuperáveis e conteúdo HTML tratado como texto. Um teste real separado requer as variáveis e os serviços configurados.

Referências: [API Gemini](https://ai.google.dev/api/generate-content), [modelo padrão](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite), [segurança de chaves](https://ai.google.dev/gemini-api/docs/api-key).
