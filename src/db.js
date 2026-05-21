// ─── Firestore DB helpers (replaces localStorage) ────────────────────────────
import { db } from "./firebase";
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, onSnapshot, query, orderBy
} from "firebase/firestore";

// ── USERS ────────────────────────────────────────────────────────────────────
export const getUsers = async () => {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const saveUser = async (user) => {
  const { id, ...data } = user;
  await setDoc(doc(db, "users", String(id)), data);
};

export const deleteUser = async (id) => {
  await deleteDoc(doc(db, "users", String(id)));
};

export const updateUserPassword = async (id, passwordHash) => {
  await updateDoc(doc(db, "users", String(id)), { passwordHash });
};

// ── REPORTS ──────────────────────────────────────────────────────────────────
export const getReports = async () => {
  const q = query(collection(db, "reports"), orderBy("ts", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
};

export const saveReport = async (report) => {
  await addDoc(collection(db, "reports"), {
    ...report,
    id: Date.now(),
    ts: new Date().toISOString()
  });
};

// ── ACTIVITIES ───────────────────────────────────────────────────────────────
export const getActivities = async () => {
  const q = query(collection(db, "activities"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
};

export const saveActivity = async (act) => {
  const { firestoreId, ...data } = act;
  if (firestoreId) {
    await setDoc(doc(db, "activities", firestoreId), data);
  } else {
    await addDoc(collection(db, "activities"), data);
  }
};

export const updateActivity = async (firestoreId, data) => {
  await updateDoc(doc(db, "activities", firestoreId), data);
};

// ── BG SETTINGS ──────────────────────────────────────────────────────────────
export const getBg = async () => {
  try {
    const snap = await getDoc(doc(db, "settings", "bg"));
    return snap.exists() ? snap.data() : null;
  } catch { return null; }
};

export const saveBg = async (bg) => {
  await setDoc(doc(db, "settings", "bg"), bg);
};

// ── REAL-TIME LISTENERS ───────────────────────────────────────────────────────
export const onUsersChange = (cb) =>
  onSnapshot(collection(db, "users"), snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const onReportsChange = (cb) =>
  onSnapshot(query(collection(db, "reports"), orderBy("ts", "desc")), snap =>
    cb(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }))));

export const onActivitiesChange = (cb) =>
  onSnapshot(query(collection(db, "activities"), orderBy("createdAt", "desc")), snap =>
    cb(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }))));
