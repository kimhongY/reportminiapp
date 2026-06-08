import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc,
  addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy
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

// ── USERS ──────────────────────────────────────────────────────────────────
export const getUsers = async () => {
  const snap = await getDocs(collection(db,"users"));
  return snap.docs.map(d=>({id:d.id,...d.data()}));
};
export const saveUser = async (user) => {
  const {id,...data} = user;
  await setDoc(doc(db,"users",String(id)),data);
};
export const deleteUser = async (id) => { await deleteDoc(doc(db,"users",String(id))); };
export const updateUserPassword = async (id,hash) => {
  await updateDoc(doc(db,"users",String(id)),{passwordHash:hash});
};

// ── REPORTS ────────────────────────────────────────────────────────────────
export const getReports = async () => {
  const q = query(collection(db,"reports"),orderBy("ts","desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d=>({fid:d.id,...d.data()}));
};
export const saveReport = async (r) => {
  await addDoc(collection(db,"reports"),{...r,id:Date.now(),ts:new Date().toISOString()});
};

// ── TARGETS ────────────────────────────────────────────────────────────────
export const getTargets = async () => {
  try {
    const snap = await getDoc(doc(db,"settings","targets"));
    return snap.exists() ? snap.data() : null;
  } catch { return null; }
};
export const saveTargets = async (targets) => {
  await setDoc(doc(db,"settings","targets"),targets);
};

// ── KPI ────────────────────────────────────────────────────────────────────
export const getKPIs = async () => {
  const snap = await getDocs(collection(db,"kpis"));
  return snap.docs.map(d=>({id:d.id,...d.data()}));
};
export const saveKPI = async (kpi) => {
  const {id,...data} = kpi;
  await setDoc(doc(db,"kpis",String(id)),data);
};

// ── ATTENDANCE ─────────────────────────────────────────────────────────────
export const getAttendance = async () => {
  const snap = await getDocs(collection(db,"attendance"));
  return snap.docs.map(d=>({id:d.id,...d.data()}));
};
export const saveAttendance = async (rec) => {
  await setDoc(doc(db,"attendance",String(rec.id)),rec);
};
export const deleteAttendance = async (id) => {
  await deleteDoc(doc(db,"attendance",String(id)));
};

// ── ACTIVITIES ─────────────────────────────────────────────────────────────
export const getActivities = async () => {
  const q = query(collection(db,"activities"),orderBy("createdAt","desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d=>({fid:d.id,...d.data()}));
};
export const saveActivity = async (act) => {
  const {fid,...data} = act;
  if(fid) await setDoc(doc(db,"activities",fid),data);
  else await addDoc(collection(db,"activities"),data);
};
export const updateActivity = async (fid,data) => {
  await updateDoc(doc(db,"activities",fid),data);
};
export const deleteActivity = async (fid) => {
  await deleteDoc(doc(db,"activities",fid));
};

// ── SETTINGS ───────────────────────────────────────────────────────────────
export const getBg = async () => {
  try { const s=await getDoc(doc(db,"settings","bg")); return s.exists()?s.data():null; }
  catch { return null; }
};
export const saveBg = async (bg) => { await setDoc(doc(db,"settings","bg"),bg); };

// ── MATERIALS STOCK ────────────────────────────────────────────────────────
// Stock = master inventory set by DBMC
export const getStock = async () => {
  try {
    const snap = await getDoc(doc(db,"settings","materials_stock"));
    return snap.exists() ? snap.data() : {};
  } catch { return {}; }
};
export const saveStock = async (stock) => {
  await setDoc(doc(db,"settings","materials_stock"), stock);
};

// Material Requests = CSA morning request + evening return
export const getMaterialRequests = async () => {
  const q = query(collection(db,"material_requests"), orderBy("ts","desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d=>({fid:d.id,...d.data()}));
};
export const saveMaterialRequest = async (req) => {
  if(req.fid){
    const {fid,...data}=req;
    await setDoc(doc(db,"material_requests",fid),data);
  } else {
    await addDoc(collection(db,"material_requests"),req);
  }
};
export const deleteMaterialRequest = async (fid) => {
  await deleteDoc(doc(db,"material_requests",fid));
};

// Delete Requests (DBMC → Admin)
export const getDeleteRequests = async () => {
  const snap = await getDocs(collection(db,"delete_requests"));
  return snap.docs.map(d=>({fid:d.id,...d.data()}));
};
export const saveDeleteRequest = async (req) => {
  await addDoc(collection(db,"delete_requests"),{...req,ts:new Date().toISOString()});
};
export const updateDeleteRequest = async (fid,data) => {
  await updateDoc(doc(db,"delete_requests",fid),data);
};
export const deleteDeleteRequest = async (fid) => {
  await deleteDoc(doc(db,"delete_requests",fid));
};

// Bulk delete reports older than N months
export const deleteReportsBefore = async (beforeDate) => {
  const snap = await getDocs(collection(db,"reports"));
  const toDelete = snap.docs.filter(d=>(d.data().ts||"") < beforeDate);
  await Promise.all(toDelete.map(d=>deleteDoc(d.ref)));
  return toDelete.length;
};
