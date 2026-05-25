import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc,
  addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, where
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDXWUjjQIvxukZIQQPTR9LNZ4w84zeVb-A",
  authDomain: "branch-report-541trd.firebaseapp.com",
  projectId: "branch-report-541trd",
  storageBucket: "branch-report-541trd.firebasestorage.app",
  messagingSenderId: "934546367696",
  appId: "1:934546367696:web:9a8f0ce748f0f0a9de2ad5",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ── USERS ─────────────────────────────────────────────────────────────────────
export const getUsers = async () => {
  const snap = await getDocs(collection(db,"users"));
  return snap.docs.map(d=>({id:d.id,...d.data()}));
};
export const saveUser = async (user) => {
  const {id,...data} = user;
  await setDoc(doc(db,"users",String(id)),data);
};
export const deleteUser = async (id) => { await deleteDoc(doc(db,"users",String(id))); };
export const updateUserPassword = async (id,passwordHash) => {
  await updateDoc(doc(db,"users",String(id)),{passwordHash});
};

// ── REPORTS ───────────────────────────────────────────────────────────────────
export const getReports = async () => {
  const q = query(collection(db,"reports"),orderBy("ts","desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d=>({firestoreId:d.id,...d.data()}));
};
export const saveReport = async (report) => {
  await addDoc(collection(db,"reports"),{...report,id:Date.now(),ts:new Date().toISOString()});
};

// ── TARGETS (plan) ────────────────────────────────────────────────────────────
export const getTargets = async () => {
  const snap = await getDocs(collection(db,"targets"));
  return snap.docs.map(d=>({id:d.id,...d.data()}));
};
export const saveTarget = async (target) => {
  const {id,...data} = target;
  await setDoc(doc(db,"targets",String(id)),data);
};
export const deleteTarget = async (id) => { await deleteDoc(doc(db,"targets",String(id))); };

// ── STAFF KPI ─────────────────────────────────────────────────────────────────
export const getKPIs = async () => {
  const snap = await getDocs(collection(db,"kpis"));
  return snap.docs.map(d=>({id:d.id,...d.data()}));
};
export const saveKPI = async (kpi) => {
  const {id,...data} = kpi;
  await setDoc(doc(db,"kpis",String(id)),data);
};

// ── ATTENDANCE ────────────────────────────────────────────────────────────────
export const getAttendance = async () => {
  const snap = await getDocs(collection(db,"attendance"));
  return snap.docs.map(d=>({id:d.id,...d.data()}));
};
export const saveAttendance = async (rec) => {
  const {id,...data} = rec;
  await setDoc(doc(db,"attendance",String(id)),data);
};

// ── ACTIVITIES ────────────────────────────────────────────────────────────────
export const getActivities = async () => {
  const q = query(collection(db,"activities"),orderBy("createdAt","desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d=>({firestoreId:d.id,...d.data()}));
};
export const saveActivity = async (act) => {
  const {firestoreId,...data} = act;
  if(firestoreId) await setDoc(doc(db,"activities",firestoreId),data);
  else await addDoc(collection(db,"activities"),data);
};
export const updateActivity = async (firestoreId,data) => {
  await updateDoc(doc(db,"activities",firestoreId),data);
};
export const deleteActivity = async (firestoreId) => {
  await deleteDoc(doc(db,"activities",firestoreId));
};

// ── SETTINGS ──────────────────────────────────────────────────────────────────
export const getBg = async () => {
  try { const s=await getDoc(doc(db,"settings","bg")); return s.exists()?s.data():null; }
  catch { return null; }
};
export const saveBg = async (bg) => { await setDoc(doc(db,"settings","bg"),bg); };

// ── REAL-TIME ─────────────────────────────────────────────────────────────────
export const onReportsChange = (cb) =>
  onSnapshot(query(collection(db,"reports"),orderBy("ts","desc")), snap=>
    cb(snap.docs.map(d=>({firestoreId:d.id,...d.data()}))));
export const onActivitiesChange = (cb) =>
  onSnapshot(query(collection(db,"activities"),orderBy("createdAt","desc")), snap=>
    cb(snap.docs.map(d=>({firestoreId:d.id,...d.data()}))));
