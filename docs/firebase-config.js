// Casa Co-op — © 2026 Kevin Paulo · Licença MIT
// Configuração do projeto Firebase "casa-co-op".
// Essas chaves NÃO são secretas: quem protege os dados são as regras do arquivo firestore.rules.
export const firebaseConfig = {
  apiKey: "AIzaSyCbh0w46HwqkXSZlyHpfZAV6Yei4c5DyKE",
  authDomain: "casa-co-op.firebaseapp.com",
  projectId: "casa-co-op",
  storageBucket: "casa-co-op.firebasestorage.app",
  messagingSenderId: "111781861411",
  appId: "1:111781861411:web:38264259478ff6db19f996"
};

// Chave PÚBLICA do reCAPTCHA v3 (App Check). Protege a cota do Gemini contra uso fora deste site.
// A chave SECRETA nunca entra aqui: ela fica só no console do Firebase (App Check).
export const recaptchaSiteKey = "6Lfw4DAuAAAAAIXPMjFDApDYiZTiSuONVyVajVPT";
