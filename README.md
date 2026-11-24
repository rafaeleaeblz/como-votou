# Como votou | Poder360

Página estática para consultar votações nominais abertas do Plenário da Câmara e do Senado. Identidade visual baseada no HTML original do atlas de distritos informais V7.1: logo original, azul #1F4378, laranja #E85F2A, créditos e cabeçalho. Não depende do Sheets nem do Apps Script.

## Publicar no GitHub Pages

1. Crie um repositório público chamado `como-votou` (não sobrescreva o atlas antigo).
2. Descompacte o ZIP. Na raiz do repositório, envie `index.html`, `api.js`, `config.js`, `README.md`, a pasta `assets` e, se desejar, a pasta `opcional`. Mantenha `assets/poder360.png` dentro da pasta `assets`. Não envie o ZIP como único arquivo.
3. No repositório, acesse **Settings → Pages → Build and deployment → Deploy from a branch**. Escolha `main` e `/(root)` e salve.
4. Abra o endereço que o GitHub mostrar. Se usar a conta `rafaeleaeblz` e o nome sugerido, o endereço esperado será `https://rafaeleaeblz.github.io/como-votou/` (somente após publicação).
5. Teste com uma votação nominal da Câmara e outra do Senado; compare com a fonte oficial antes da divulgação.

## Uso e integração

Escolha a Casa, a data, clique em buscar, selecione a votação e gere o infográfico. Há 3 abas: seleção, resultado por partido e lista nominal. Os downloads Excel (.xlsx) e CSV são produzidos no navegador. Não há armazenamento de dados pessoais nem credenciais no projeto. Cada busca tenta acessar as fontes oficiais sem cache próprio. Não há atualização diária fixa, mas a publicação na API pode atrasar em relação ao painel do Plenário. Na Câmara, a composição é consultada na data oficial da votação quando faltam parlamentares; a geração é bloqueada se houver divergência de ID, partido, UF ou total. No Senado, listas históricas incompletas continuam bloqueadas. O seletor usa proposições afetadas, objetos possíveis e descrição da abertura da votação, sem presumir um projeto quando a fonte não o identifica. A consulta pode incluir votações simbólicas, recusadas na geração quando identificadas ou quando os votos são insuficientes. A coluna “ausentes + abstenção” inclui todos os registros diferentes de sim e não, conforme nota explicativa.

Para conferir a aparência sem depender das APIs, acrescente `?demo=1` à URL, ou abra `index.html` localmente junto com os demais arquivos. A demonstração usa apenas os totais do print de referência e não tem votos nominais fictícios.

### Se ocorrer bloqueio de CORS

O GitHub Pages só hospeda arquivos estáticos. Por padrão, o navegador consulta diretamente as APIs oficiais. A disponibilidade de CORS não pôde ser confirmada ao vivo neste ambiente. Não use proxies públicos de terceiros. Se o erro persistir, `opcional/worker.js` oferece uma ponte restrita às rotas oficiais necessárias (Cloudflare Workers, serviço separado):

- Crie um Worker na sua conta Cloudflare, cole o código em `opcional/worker.js` e publique. Ajuste `ORIGINS` para o domínio real da página, se diferente do padrão.
- Copie a URL HTTPS do Worker e configure `VOTE_PROXY` em `config.js`. Faça commit desse arquivo. O site continuará tentando a fonte direta primeiro; a ponte será usada se a rede/CORS impedir a consulta.
- Essa ponte não está implantada. Teste-a antes de divulgar. Para grande volume de leitores, peça à infraestrutura do Poder360 para avaliar limites, proteção contra abuso e cache controlado.

### Incorporação no WordPress

Depois de publicado e testado, use um iframe com largura 100%, altura inicial suficiente e título acessível. `?hideHeader=true` oculta a marca do cabeçalho caso ela já esteja presente na matéria; os créditos permanecem. O iframe não redimensiona automaticamente sem integração adicional no CMS.

Fontes: https://dadosabertos.camara.leg.br/swagger/api.html e https://legis.senado.leg.br/dadosabertos/docs/.

## Atualização V2
Substitua `api.js` e `index.html` na raiz do GitHub. O `index.html` contém `noindex, nofollow` e força o carregamento da versão atualizada do JS. Nenhuma alteração em `config.js` ou na logo é necessária.

## V3 — falha de rede/CORS e lista vazia

A V3 evita repetir a mesma consulta diária, tenta novamente em falhas transitórias e consulta as sessões do Plenário. Uma falha de acesso não é apresentada como ausência de votação. Mantém o enriquecimento de títulos da V2 e os controles de placar. Se a ponte estiver configurada, ela passa a ser a primeira rota de consulta.

### Instalação recomendada da ponte no Cloudflare Workers

1. Acesse https://dash.cloudflare.com/ e abra Workers & Pages (Compute & AI).
2. Crie um Worker (Hello World), por exemplo `como-votou-api`, e publique.
3. Abra Edit code, substitua o código pelo arquivo `opcional/worker.js` deste pacote e clique em Deploy.
4. Abra a URL HTTPS exibida pelo Cloudflare: o retorno esperado é `{"ok":true,"servico":"Como votou — Poder360","versao":3}`. Esse teste só comprova a instalação, não o acesso às APIs.
5. Edite `config.js`: coloque a URL HTTPS real do Worker entre as aspas em `const VOTE_PROXY = "";`. Não adicione parâmetros nem a rota `/?url=`.
6. No repositório https://github.com/rafaeleaeblz/como-votou, substitua `index.html`, `api.js`, `config.js` e `README.md`. A logo permanece. O Worker é publicado no Cloudflare, não executado pelo GitHub Pages.
7. Reabra https://rafaeleaeblz.github.io/como-votou/ depois do deploy do GitHub e teste Câmara, 23/11/2026, PLP 299/2026. Em seguida, teste Senado. A ponte aceita chamadas do domínio do GitHub Pages e restringe rotas oficiais; CORS não é autenticação. Para uso público intenso, aplique cotas/rate limiting e monitore os limites do provedor.

A ponte consulta a fonte a cada requisição; não é uma atualização diária. Não contorna indisponibilidade dos próprios órgãos. As consultas reais precisam ser validadas depois da implantação; os testes locais usam respostas simuladas.
