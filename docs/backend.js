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
  signOut() { return signOut(auth); },
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
