// Casa Co-op — © 2026 Kevin Paulo · Licença MIT
// Ponte entre o jogo e o Firebase (login com Google + banco Firestore em tempo real).
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, collection, getDoc, setDoc, updateDoc,
  deleteDoc, onSnapshot, query, orderBy, limit, arrayUnion } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const notConfigured = !firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith('COLE');
if (notConfigured) {
  document.addEventListener('DOMContentLoaded', () => {});
  const g = document.getElementById('gate');
  const msg = '<div class="gbox"><h2>FALTA CONFIGURAR</h2><p class="hint">Cole as chaves do seu projeto Firebase no arquivo <b>firebase-config.js</b> (veja o passo a passo do README).</p></div>';
  if (g) { g.innerHTML = msg; g.hidden = false; }
  throw new Error('firebase-config.js ainda não foi preenchido');
}

const app = initializeApp(firebaseConfig);
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
    await setDoc(doc(fs, 'presence', u.uid), { uid: u.uid, name: u.displayName || '', email: u.email || '', state, lastSeen: now,
      device: dev, sessionId: sid, ...info }, { merge: true });
    await setDoc(doc(fs, 'sessions', sid), { uid: u.uid, name: u.displayName || '', start: startAt, last: now, activeMs,
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

const FB = {
  user: null,
  onAuth(cb) { onAuthStateChanged(auth, u => { FB.user = u; cb(u); }); },
  async signIn() {
    const p = new GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    try { await signInWithPopup(auth, p); }
    catch (e) {
      if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code))
        return signInWithRedirect(auth, p);
      throw e;
    }
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
