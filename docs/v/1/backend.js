// Casa Co-op — © 2026 Kevin Paulo · Licença MIT
// Ponte entre o jogo e o Firebase (login com Google + banco Firestore em tempo real).
import { firebaseConfig, recaptchaSiteKey } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut,
  sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, signInAnonymously, linkWithPopup, linkWithRedirect, linkWithCredential, EmailAuthProvider }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, collection, getDoc, setDoc, updateDoc,
  deleteDoc, onSnapshot, query, orderBy, limit, arrayUnion, where, addDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const notConfigured = !firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith('COLE');
if (notConfigured) {
  document.addEventListener('DOMContentLoaded', () => {});
  const g = document.getElementById('gate');
  const msg = '<div class="gbox"><h2>FALTA CONFIGURAR</h2><p class="hint">Cole as chaves do seu projeto Firebase no arquivo <b>firebase-config.js</b> (veja o passo a passo do README).</p></div>';
  if (g) { g.innerHTML = msg; g.hidden = false; }
  throw new Error('firebase-config.js ainda não foi preenchido');
}

const app = initializeApp(firebaseConfig);

const AI_V = '13.4.0', AI_DAILY = 8;
let _ai = null, getGenerativeModelFn = null;
async function aiInstance() {
  if (_ai) return _ai;
  if (!recaptchaSiteKey) { const e = new Error('sem chave'); e.code = 'ia-desligada'; throw e; }
  const base = `https://www.gstatic.com/firebasejs/${AI_V}/`;
  const [{ initializeApp: initAI }, { initializeAppCheck, ReCaptchaEnterpriseProvider }, { getAI, getGenerativeModel, GoogleAIBackend }] =
    await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-app-check.js'), import(base + 'firebase-ai.js')]);
  const aiApp = initAI(firebaseConfig, 'casa-coop-ia');
  initializeAppCheck(aiApp, { provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey), isTokenAutoRefreshEnabled: true });
  getGenerativeModelFn = getGenerativeModel;
  _ai = getAI(aiApp, { backend: new GoogleAIBackend() });
  return _ai;
}

const auth = getAuth(app);
let fs;
try {
  fs = initializeFirestore(app, { ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
} catch (e) {
  fs = initializeFirestore(app, { ignoreUndefinedProperties: true });
}
getRedirectResult(auth).catch(() => {});


// ---------- Presença e sessões (para a central do administrador) ----------
let sid = null, info = {}, hb = null, startAt = 0, activeMs = 0, visibleSince = null;
function device() {
  const u = navigator.userAgent, m = /Mobi|Android|iPhone|iPad/i.test(u);
  const os = /iPhone|iPad/.test(u) ? 'iOS' : /Android/.test(u) ? 'Android' : /Windows/.test(u) ? 'Windows' : /Mac/.test(u) ? 'Mac' : 'outro';
  return (m ? 'celular' : 'computador') + ' · ' + os;
}
function tick() { if (visibleSince) { const n = Date.now(); activeMs += n - visibleSince; visibleSince = n; } }
async function beat(state) {
  const u = auth.currentUser; if (!u || !sid) return;
  tick();
  const now = Date.now(), dev = device();
  try {
    await setDoc(doc(fs, 'presence', u.uid), { uid: u.uid, name: u.displayName || info.player || '', email: u.email || '', anon: !!u.isAnonymous, state, lastSeen: now,
      device: dev, sessionId: sid, ...info }, { merge: true });
    await setDoc(doc(fs, 'sessions', sid), { uid: u.uid, name: u.displayName || info.player || '', start: startAt, last: now, activeMs,
      device: dev, houseName: info.houseName || '', player: info.player || '' }, { merge: true });
  } catch (e) { /* sem conexão: tenta de novo no próximo pulso */ }
}
function stopTrack() { clearInterval(hb); hb = null; sid = null; }
function onVis() {
  if (!sid) return;
  if (document.visibilityState === 'visible') { visibleSince = Date.now(); beat('online'); }
  else { tick(); visibleSince = null; beat('away'); }
}
document.addEventListener('visibilitychange', onVis);
addEventListener('pagehide', () => { if (sid) beat('offline'); });

const POPUP_FALLBACK = ['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'];
const FB = {
  user: null,
  onAuth(cb) { onAuthStateChanged(auth, u => { FB.user = u; cb(u); }); },
  async signIn() {
    const p = new GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    try { await signInWithPopup(auth, p); }
    catch (e) {
      if (POPUP_FALLBACK.includes(e.code)) return signInWithRedirect(auth, p);
      throw e;
    }
  },
  // Link mágico por e-mail (sem senha)
  async sendEmailLink(email) {
    await sendSignInLinkToEmail(auth, email, { url: (window.CC_ROOT || (location.origin + location.pathname)), handleCodeInApp: true });
    try { localStorage.setItem('cc-email-link', email); } catch (e) {}
  },
  isEmailLink() { return isSignInWithEmailLink(auth, location.href); },
  savedEmail() { try { return localStorage.getItem('cc-email-link') || ''; } catch (e) { return ''; } },
  async finishEmailLink(email) {
    await signInWithEmailLink(auth, email, location.href);
    try { localStorage.removeItem('cc-email-link'); } catch (e) {}
    history.replaceState(null, '', location.pathname);
  },
  // E-mail e senha
  signInPassword(email, pw) { return signInWithEmailAndPassword(auth, email, pw); },
  signUpPassword(email, pw) { return createUserWithEmailAndPassword(auth, email, pw); },
  resetPassword(email) { return sendPasswordResetEmail(auth, email); },
  // Sem conta (anônimo) + salvar depois
  signInAnon() { return signInAnonymously(auth); },
  isAnon() { return !!(auth.currentUser && auth.currentUser.isAnonymous); },
  async linkGoogle() {
    const p = new GoogleAuthProvider();
    try { await linkWithPopup(auth.currentUser, p); }
    catch (e) { if (POPUP_FALLBACK.includes(e.code)) return linkWithRedirect(auth.currentUser, p); throw e; }
    await auth.currentUser.reload(); FB.user = auth.currentUser;
  },
  async linkPassword(email, pw) {
    await linkWithCredential(auth.currentUser, EmailAuthProvider.credential(email, pw));
    await auth.currentUser.reload(); FB.user = auth.currentUser;
  },
  async signOut() { try { await beat('offline'); } catch (e) {} stopTrack(); return signOut(auth); },
  async myHouse() {
    const s = await getDoc(doc(fs, 'users', auth.currentUser.uid));
    return s.exists() ? (s.data().houseId || null) : null;
  },
  async createHouse(d) {
    const uid = auth.currentUser.uid;
    const ref = doc(collection(fs, 'houses'));
    await setDoc(ref, { appName: d.appName, inviteCode: d.inviteCode, owner: uid, members: [uid],
      p1: { name: d.p1.name, color: d.p1.color, uid }, p2: { name: d.p2.name, color: d.p2.color, uid: null }, createdAt: Date.now() });
    await setDoc(doc(fs, 'users', uid), { houseId: ref.id });
    return ref.id;
  },
  async joinHouse(h, code, name) {
    const uid = auth.currentUser.uid;
    const upd = { members: arrayUnion(uid), 'p2.uid': uid, joinCode: code };
    if (name) upd['p2.name'] = name;
    await updateDoc(doc(fs, 'houses', h), upd);
    await setDoc(doc(fs, 'users', uid), { houseId: h });
  },
  trackStart() {
    if (hb || !auth.currentUser) return;
    sid = auth.currentUser.uid.slice(0, 10) + '-' + Date.now().toString(36);
    startAt = Date.now(); activeMs = 0; visibleSince = document.visibilityState === 'visible' ? Date.now() : null;
    beat(visibleSince ? 'online' : 'away');
    hb = setInterval(() => { if (document.visibilityState === 'visible') beat('online'); }, 90000);
  },
  trackInfo(o) { info = { ...info, ...o }; beat(document.visibilityState === 'visible' ? 'online' : 'away'); },
  // Sugestões enviadas ao administrador
  sendFeedback(d) {
    const u = auth.currentUser;
    return addDoc(collection(fs, 'feedback'), { text: String(d.text).slice(0, 600), uid: u.uid, name: d.name || u.displayName || '',
      email: u.email || '', houseId: d.houseId || '', houseName: d.houseName || '', status: 'nova', createdAt: Date.now() });
  },
  watchMyFeedback(next, err) {
    return onSnapshot(query(collection(fs, 'feedback'), where('uid', '==', auth.currentUser.uid)),
      s => next(s.docs.map(d => ({ id: d.id, ...d.data() }))), err);
  },
  // ===== Desenho automático de ícones (Gemini grátis via Firebase AI Logic + App Check) =====
  // Carregado só quando alguém pede um desenho. Usa um "app" separado só para a IA.
  // Limite: AI_DAILY desenhos por casa por dia (contador em houses/{h}/events/ai-AAAA-MM-DD).
  async aiDraw(h, prompt, opts = {}) {
    const day = new Date().toISOString().slice(0, 10), qref = doc(fs, 'houses', h, 'events', 'ai-' + day);
    const qs = await getDoc(qref), used = qs.exists() ? (qs.data().n || 0) : 0;
    if (used >= AI_DAILY) { const e = new Error('limite'); e.code = 'limite-diario'; throw e; }
    const ai = await aiInstance();
    const cfg = { temperature: opts.temperature ?? 0.8, maxOutputTokens: opts.maxTokens || 4000 };
    if (opts.json) cfg.responseMimeType = 'application/json';
    const parts = Array.isArray(prompt) ? prompt : [prompt];
    let r;
    try { r = await getGenerativeModelFn(ai, { model: 'gemini-3.5-flash-lite', generationConfig: cfg }).generateContent(parts); }
    catch (e) { if (/not.?found|404/i.test(String(e && e.message))) r = await getGenerativeModelFn(ai, { model: 'gemini-3.1-flash-lite', generationConfig: cfg }).generateContent(parts); else throw e; }
    await setDoc(qref, { n: used + 1, day }, { merge: true });
    return r.response.text();
  },
  aiLeft: async h => { const s = await getDoc(doc(fs, 'houses', h, 'events', 'ai-' + new Date().toISOString().slice(0, 10)));
    return AI_DAILY - (s.exists() ? (s.data().n || 0) : 0); },
  watchHouse(h, next, err) { return onSnapshot(doc(fs, 'houses', h), s => next(s.exists() ? s.data() : null), err); },
  updateHouse(h, patch) { return updateDoc(doc(fs, 'houses', h), patch); },
  // Mesmo formato que o jogo já usa: db.collection('tasks').doc(id).set(...), .onSnapshot(...), .orderBy().limit().onSnapshot()
  houseDB(h) {
    const ref = (c, id) => doc(fs, 'houses', h, c, id);
    return {
      collection(c) {
        const col = collection(fs, 'houses', h, c);
        return {
          doc: id => ({
            set: d => setDoc(ref(c, id), d),
            update: d => updateDoc(ref(c, id), d),
            delete: () => deleteDoc(ref(c, id)),
            onSnapshot: (n, e) => onSnapshot(ref(c, id), n, e)
          }),
          onSnapshot: (n, e) => onSnapshot(col, n, e),
          orderBy: (f, dir) => ({ limit: k => ({ onSnapshot: (n, e) => onSnapshot(query(col, orderBy(f, dir || 'asc'), limit(k)), n, e) }) })
        };
      }
    };
  }
};
window.__fbResolve(FB);
