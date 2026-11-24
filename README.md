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
