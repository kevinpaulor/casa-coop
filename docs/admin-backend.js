// Casa Co-op — © 2026 Kevin Paulo · Licença MIT
// Ponte da central do administrador com o Firebase.
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, onSnapshot, query, where, orderBy, limit, doc, updateDoc }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const fs = getFirestore(app);
const snapList = s => s.docs.map(d => ({ id: d.id, ...d.data() }));

window.__adminResolve({
  onAuth: cb => onAuthStateChanged(auth, cb),
  signIn: () => signInWithPopup(auth, new GoogleAuthProvider()),
  signOut: () => signOut(auth),
  watchPresence: (next, err) => onSnapshot(collection(fs, 'presence'), s => next(snapList(s)), err),
  watchSessions: (sinceMs, next, err) => onSnapshot(query(collection(fs, 'sessions'), where('start', '>=', sinceMs), orderBy('start', 'desc'), limit(1000)), s => next(snapList(s)), err),
  watchHouses: (next, err) => onSnapshot(collection(fs, 'houses'), s => next(snapList(s)), err),
  watchFeedback: (next, err) => onSnapshot(query(collection(fs, 'feedback'), orderBy('createdAt', 'desc'), limit(300)), s => next(snapList(s)), err),
  setFeedback: (id, data) => updateDoc(doc(fs, 'feedback', id), data)
});
