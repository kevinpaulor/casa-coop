# Casa Co-op — Tarefas Arcade (versão aberta)

Jogo arcade para casais dividirem as tarefas da casa: cartas com XP, listas de cada um,
corrida de foguetes, placar e log em tempo real. Cada casal entra com o Google, cria a sua
"casa" e convida o par por um link. Só os dois membros veem os dados da casa.

- `docs/` — o site (vai para o GitHub Pages)
  - `index.html` — o jogo
  - `backend.js` — login Google + banco Firestore
  - `firebase-config.js` — **cole aqui as chaves do seu projeto Firebase**
  - `politica.html` — política de privacidade (troque o contato)
  - `manifest.webmanifest`, `icon-*.png` — para "Adicionar à tela de início"
- `firestore.rules` — regras de segurança do banco (cole no Console do Firebase)

O passo a passo completo de publicação está no documento que acompanha este projeto.

Resumo:
1. Firebase: criar projeto → Authentication (Google) → Firestore → colar `firestore.rules` → registrar app Web e copiar o `firebaseConfig` para `docs/firebase-config.js`.
2. GitHub: criar repositório público, enviar estes arquivos, Settings → Pages → branch `main`, pasta `/docs`.
3. Firebase → Authentication → Settings → Authorized domains → adicionar `SEU-USUARIO.github.io`.
4. Abrir `https://SEU-USUARIO.github.io/NOME-DO-REPO/`, entrar com Google, criar a casa e mandar o convite.

## Autoria e licença

Criado por **Kevin Paulo** ([@Arkev.arq](https://www.instagram.com/arkev.arq/)) em 2026, com ajuda do Claude.
Licença [MIT](LICENSE): qualquer pessoa pode usar, copiar e modificar, desde que mantenha o aviso de autoria.

## Atualizações em duas etapas
- `docs/index.html` é só a porta de entrada: lê no Firestore (`release/current.stable`) qual versão está liberada e abre `docs/v/<versão>/`.
- Versão nova entra como pasta `docs/v/<n>/` e em `docs/versions.json` como `beta`. Só o administrador vê o atalho **🧪 TESTAR** e aprova na central (**✅ APROVAR PARA TODOS**). Na central também dá para **↩ VOLTAR** para a versão anterior.
- Correção direta para todos = alterar a pasta da versão que já está liberada.
- Todas as versões usam os mesmos dados: mudanças precisam manter os dados compatíveis.

## Backups
A partir da v2, cada casa guarda sozinha 1 backup por dia em `houses/{casa}/backups` (últimos 30 dias). Em ⚙ → 🛟 BACKUPS dá para salvar agora, baixar o arquivo e (só o dono) restaurar.
