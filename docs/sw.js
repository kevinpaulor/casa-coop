// Casa Co-op — service worker mínimo: só permite instalar como app.
// Não guarda nada em cache: o jogo sempre carrega a versão mais nova do site.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
