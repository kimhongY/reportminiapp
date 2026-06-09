import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import {
  getUsers, saveUser, deleteUser, updateUserPassword,
  getReports, saveReport,
  getTargets, saveTargets,
  getKPIs, saveKPI,
  getAttendance, saveAttendance, deleteAttendance,
  getActivities, saveActivity, updateActivity, deleteActivity,
  getBg, saveBg,
  getStock, saveStock,
  getMaterialRequests, saveMaterialRequest, deleteMaterialRequest,
  getDeleteRequests, saveDeleteRequest, updateDeleteRequest, deleteDeleteRequest,
  deleteReportsBefore,
} from "./firebase";

const hashPassword = async (pw) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
};
const verifyPassword = async (pw, hash) => (await hashPassword(pw)) === hash;

const sendTelegram = async (msg) => {
  const TOKEN = "YOUR_BOT_TOKEN";
  const CHAT  = "YOUR_ADMIN_CHAT_ID";
  try {
    await fetch("https://api.telegram.org/bot"+TOKEN+"/sendMessage",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({chat_id:CHAT,text:msg,parse_mode:"HTML"}),
    });
  } catch(e){ console.log("TG:",e); }
};

// ─── SESSION ──────────────────────────────────────────────────────────────────
const SK = "bpro_sess";
const saveSession = (u) => {
  if(u.role==="admin") return;
  try { localStorage.setItem(SK, JSON.stringify({user:u, expiry:Date.now()+5*86400000})); } catch(e){}
};
const loadSession = () => {
  try {
    const d = JSON.parse(localStorage.getItem(SK)||"null");
    if(!d||Date.now()>d.expiry||d.user.role==="admin") { localStorage.removeItem(SK); return null; }
    return d.user;
  } catch { return null; }
};
const clearSession = () => { try { localStorage.removeItem(SK); } catch(e){} };

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const DEFAULT_TARGETS = {
  khqr:    { label:"KHQR Onboard",      icon:"📱", color:"#7c3aed", unit:"",  plan:200,  actual:0 },
  cif:     { label:"New CIF",           icon:"🪪", color:"#059669", unit:"",  plan:150,  actual:0 },
  deposit: { label:"Deposit",           icon:"🏦", color:"#2563eb", unit:"USD", plan:2000, actual:0 },
  loan:    { label:"Loan Disbursement", icon:"💳", color:"#db2777", unit:"USD", plan:500,  actual:0 },
};

const ROLE = {
  admin:             { icon:"👑", color:"#7c3aed", label:"Admin",             nav:["home","analytics","staff","activities","materials","summary","admin"],   team:"" },
  supervisor_teller: { icon:"🏦", color:"#2563eb", label:"Supervisor Teller", nav:["report","team"],                                               team:"teller" },
  supervisor_csa:    { icon:"🧾", color:"#059669", label:"Supervisor CSA",    nav:["report","team","activities","materials"],                       team:"csa" },
  supervisor_loan:   { icon:"💳", color:"#7c3aed", label:"Supervisor Loan",   nav:["report","team","activities"],                                   team:"loan" },
  loan_officer:      { icon:"📄", color:"#9333ea", label:"Loan Officer",      nav:["report","activities"],                                          team:"loan" },
  csa_officer:       { icon:"🪪", color:"#16a34a", label:"CSA Officer",       nav:["report","activities","materials"],                              team:"csa" },
  ma_khqr:           { icon:"📱", color:"#0891b2", label:"MA KHQR",           nav:["report","activities"],                                          team:"khqr" },
  ms_khqr:           { icon:"🔖", color:"#be185d", label:"MS KHQR",           nav:["report","activities"],                                          team:"khqr" },
  dbmc:              { icon:"📊", color:"#ea580c", label:"DBMC",              nav:["home","analytics","report","activities","materials","staff","summary"],    team:"" },
  bm:                { icon:"🏢", color:"#0f766e", label:"BM",               nav:["home","analytics","activities","materials","staff","summary"],             team:"" },
};

const MATERIAL_ITEMS = [
  {id:"pen",       label:"Pen",          icon:"🖊️",  unit:"ដើម"},
  {id:"notepad",   label:"Notepad",      icon:"📓",  unit:"ក្បាល"},
  {id:"cardcase",  label:"Card Case",    icon:"💳",  unit:"ប្រអប់"},
  {id:"cap",       label:"Cap",          icon:"🧢",  unit:"មួក"},
  {id:"umbrella",  label:"Umbrella",     icon:"☂️",  unit:"ឆ័ត្រ"},
  {id:"tshirt",    label:"T-Shirt",      icon:"👕",  unit:"ខ្នង"},
  {id:"keychain",  label:"Keychain",     icon:"🗝️",  unit:"គ្រាប់"},
  {id:"jersey",    label:"Jersey",       icon:"🎽",  unit:"ខ្នង"},
  {id:"raincoat",  label:"Raincoat",     icon:"🧥",  unit:"ខ្នង"},
  {id:"brochure",  label:"IA Brochure",  icon:"📄",  unit:"ក្រដាស"},
  {id:"balloon",   label:"Balloon",      icon:"🎈",  unit:"គ្រាប់"},
  {id:"helmet",    label:"Helmet",       icon:"⛑️",  unit:"មួក"},
  {id:"ecobag",    label:"Eco-Bag",      icon:"👜",  unit:"ថង់"},
];

const NAV_META = {
  home:       { icon:"⌂",  label:"Home" },
  analytics:  { icon:"◈",  label:"Analytics" },
  report:     { icon:"✎",  label:"Report" },
  team:       { icon:"◎",  label:"ក្រុម" },
  activities: { icon:"◆",  label:"Activity" },
  staff:      { icon:"◐",  label:"Staff" },
  admin:      { icon:"⚙",  label:"Admin" },
  materials:  { icon:"📦",  label:"Materials" },
  summary:    { icon:"📈",  label:"Summary" },
};

const MONTHS = ["មករា","កុម្ភៈ","មីនា","មេសា","ឧសភា","មិថុនា","កក្កដា","សីហា","កញ្ញា","តុលា","វិច្ឆិកា","ធ្នូ"];
const TTS = { background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, fontSize:11, color:"#374151", padding:"8px 12px", boxShadow:"0 4px 12px rgba(0,0,0,.08)" };

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;overflow:hidden;background:#f8f7ff}
:root{
  --p:#7c3aed;--p2:#6d28d9;--pl:#ede9fe;--pm:rgba(124,58,237,.12);
  --g:#f8f7ff;--g2:#f3f2ff;--g3:#eeedf8;
  --w:#ffffff;
  --t0:#111827;--t1:#374151;--t2:#6b7280;--t3:#9ca3af;--t4:#d1d5db;
  --bd:#e5e7eb;--bd2:#ede9fe;
  --r:16px;--r2:12px;--r3:8px;
  --sh:0 2px 12px rgba(0,0,0,.07);
  --sh2:0 8px 32px rgba(0,0,0,.1);
  --shp:0 8px 24px rgba(124,58,237,.25);
}
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Khmer:wght@300;400;500;600;700&display=swap');
body{font-family:'Noto Sans Khmer',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;line-height:1.55;color:var(--t0);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}

/* APP */
.app{max-width:430px;margin:0 auto;height:100vh;display:flex;flex-direction:column;background:var(--g);position:relative;overflow:hidden}
/* VERSION FOOTER */
.ver-tag{position:fixed;bottom:76px;right:10px;font-size:8px;color:var(--t4);z-index:40;pointer-events:none;letter-spacing:.04em;text-align:right;line-height:1.5}
.app>*{position:relative;z-index:1}

/* SCROLL */
.sb{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:0 0 90px}
.sb::-webkit-scrollbar{width:0}

/* ─── HEADER ─── */
.hdr{
  padding:14px 18px 12px;
  background:rgba(255,255,255,.92);
  border-bottom:1px solid var(--bd);
  backdrop-filter:blur(20px);
  display:flex;align-items:center;gap:12px;flex-shrink:0;
}
.hav{
  width:40px;height:40px;border-radius:14px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;font-size:20px;
  background:var(--pm);
}
.htxt{flex:1;min-width:0}
.hn{font-size:14px;font-weight:700;color:var(--t0);letter-spacing:-.02em;line-height:1.2}
.hrl{font-size:11px;color:var(--t2);margin-top:1px}
.hpill{font-size:10px;font-weight:700;padding:4px 11px;border-radius:20px;background:var(--p);color:#fff;flex-shrink:0;letter-spacing:.03em}
.btn-out{background:var(--g2);border:1px solid var(--bd);color:var(--t2);padding:7px 12px;font-size:11px;border-radius:10px;cursor:pointer;font-family:inherit;font-weight:600;transition:all .15s;white-space:nowrap}
.btn-out:hover{background:var(--g3);color:var(--t0)}

/* ─── BOTTOM NAV ─── */
.bnav{
  position:absolute;bottom:0;left:0;right:0;z-index:50;
  background:rgba(255,255,255,.96);
  border-top:1px solid var(--bd);
  backdrop-filter:blur(20px);
  display:flex;padding:10px 8px 22px;gap:4px;
  box-shadow:0 -4px 24px rgba(0,0,0,.06);
}
.bni{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 4px;border:none;border-radius:12px;cursor:pointer;background:transparent;font-family:inherit;color:var(--t3);transition:all .18s}
.bni:hover{color:var(--t2);background:var(--g2)}
.bni.on{color:var(--p);background:var(--pm)}
.bni .ni{font-size:18px;transition:transform .2s;line-height:1}
.bni.on .ni{transform:scale(1.1)}
.bni .nl{font-size:9px;font-weight:700;letter-spacing:.03em;white-space:nowrap}

/* ─── SECTION PADDING ─── */
.px{padding-left:18px;padding-right:18px}
.pt{padding-top:16px}

/* ─── CARDS ─── */
.card{background:var(--w);border:1px solid var(--bd);border-radius:var(--r);box-shadow:var(--sh);overflow:hidden;margin:0 18px}
.card+.card{margin-top:12px}
.card-head{padding:14px 16px;border-bottom:1px solid var(--bd);display:flex;align-items:center;gap:10px}
.card-icon{width:36px;height:36px;border-radius:11px;flex-shrink:0;background:var(--pm);display:flex;align-items:center;justify-content:center;font-size:17px}
.card-title{font-size:13px;font-weight:700;color:var(--t0);letter-spacing:-.01em}
.card-sub{font-size:10px;color:var(--t2);margin-top:2px}
.card-body{padding:14px 16px;display:flex;flex-direction:column;gap:12px}
.card-action{margin-left:auto;flex-shrink:0}

/* ─── WELCOME BANNER ─── */
.welcome{
  margin:16px 18px 0;
  background:linear-gradient(135deg,var(--p) 0%,#5b21b6 100%);
  border-radius:20px;padding:20px;
  box-shadow:var(--shp);
  position:relative;overflow:hidden;
}
.welcome::before{
  content:'';position:absolute;top:-30px;right:-30px;
  width:120px;height:120px;border-radius:50%;
  background:rgba(255,255,255,.08);
}
.welcome::after{
  content:'';position:absolute;bottom:-40px;right:20px;
  width:100px;height:100px;border-radius:50%;
  background:rgba(255,255,255,.05);
}
.welcome-greet{font-size:11px;color:rgba(255,255,255,.75);letter-spacing:.05em;text-transform:uppercase;margin-bottom:4px}
.welcome-name{font-size:20px;font-weight:800;color:#fff;letter-spacing:-.02em;margin-bottom:2px}
.welcome-sub{font-size:11px;color:rgba(255,255,255,.7)}
.welcome-emoji{position:absolute;right:20px;top:50%;transform:translateY(-50%);font-size:44px;opacity:.9}

/* ─── STAT GRID ─── */
.sg2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 18px 0}
.sg4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin:12px 18px 0}
.scard{background:var(--w);border:1px solid var(--bd);border-radius:var(--r2);padding:14px 12px;box-shadow:var(--sh);display:flex;flex-direction:column;gap:3px}
.scard-val{font-size:24px;font-weight:800;line-height:1;letter-spacing:-.03em}
.scard-lbl{font-size:9px;font-weight:600;color:var(--t2);text-transform:uppercase;letter-spacing:.06em;margin-top:2px}
.scard-icon{font-size:18px;margin-bottom:4px}

/* ─── SECTION TITLE ─── */
.sec-title{font-size:16px;font-weight:800;color:var(--t0);letter-spacing:-.02em;margin:18px 18px 10px;display:flex;align-items:center;justify-content:space-between}
.sec-more{font-size:12px;font-weight:600;color:var(--p)}

/* ─── TARGET CARD (new style) ─── */
.tgt{background:var(--w);border:1px solid var(--bd);border-radius:var(--r2);padding:14px 15px;margin:0 18px;box-shadow:var(--sh);display:flex;flex-direction:column;gap:10px}
.tgt+.tgt{margin-top:10px}
.tgt-top{display:flex;align-items:center;gap:10px}
.tgt-ic{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.tgt-info{flex:1;min-width:0}
.tgt-name{font-size:13px;font-weight:700;color:var(--t0);margin-bottom:2px}
.tgt-nums{font-size:11px;color:var(--t2)}
.tgt-pct{font-size:22px;font-weight:900;flex-shrink:0;letter-spacing:-.03em}
.bar-bg{height:6px;background:var(--g3);border-radius:20px;overflow:hidden}
.bar-fill{height:100%;border-radius:20px;transition:width .8s cubic-bezier(.34,1.56,.64,1)}
.tgt-bot{display:flex;justify-content:space-between;font-size:10px;color:var(--t3)}

/* ─── ACTIVITY CARD (new style) ─── */
.act-card{background:var(--w);border:1px solid var(--bd);border-radius:var(--r);margin:0 18px;box-shadow:var(--sh);overflow:hidden}
.act-card+.act-card{margin-top:10px}
.act-img{height:130px;width:100%;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.act-img-inner{width:100%;height:100%;object-fit:cover;display:flex;align-items:center;justify-content:center;font-size:56px}
.act-type-badge{position:absolute;top:10px;left:10px;font-size:10px;font-weight:700;padding:4px 10px;border-radius:20px;backdrop-filter:blur(12px)}
.act-type-badge.booth{background:rgba(124,58,237,.85);color:#fff}
.act-type-badge.roadshow{background:rgba(234,88,12,.85);color:#fff}
.act-date-badge{position:absolute;top:10px;right:10px;font-size:10px;font-weight:600;padding:4px 10px;background:rgba(255,255,255,.9);border-radius:20px;color:var(--t0)}
.act-body2{padding:14px 15px;display:flex;flex-direction:column;gap:9px}
.act-title2{font-size:15px;font-weight:800;color:var(--t0);letter-spacing:-.02em}
.act-loc{font-size:11px;color:var(--t2);display:flex;align-items:center;gap:4px}
.act-members2{display:flex;flex-wrap:wrap;gap:5px}
.act-member2{font-size:10px;font-weight:600;padding:3px 10px;border-radius:20px;border:1px solid}
.act-member2.approved{background:#f0fdf4;border-color:#86efac;color:#16a34a}
.act-member2.pending{background:#fffbeb;border-color:#fcd34d;color:#d97706}

/* ─── PROGRESS BAR ─── */
.prog{display:flex;flex-direction:column;gap:4px}
.prog-row{display:flex;justify-content:space-between;align-items:center}
.prog-lbl{font-size:12px;font-weight:600;color:var(--t1)}
.prog-val{font-size:12px;font-weight:700;color:var(--p)}
.prog-bg{height:6px;background:var(--g3);border-radius:20px;overflow:hidden}
.prog-bar{height:100%;border-radius:20px;background:var(--p);transition:width .7s cubic-bezier(.34,1.56,.64,1)}
.prog-pct{font-size:10px;color:var(--t3);text-align:right}

/* ─── KPI RING ─── */
.kring{display:flex;flex-direction:column;align-items:center;gap:5px}
.kring-name{font-size:10px;font-weight:600;color:var(--t1);text-align:center;line-height:1.3;max-width:75px}

/* ─── TABS ─── */
.tabs{display:flex;gap:4px;padding:14px 18px 0;overflow-x:auto;scrollbar-width:none}
.tabs::-webkit-scrollbar{display:none}
.tab{flex-shrink:0;padding:8px 16px;border:1.5px solid var(--bd);border-radius:20px;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;transition:all .18s;background:var(--w);color:var(--t2);white-space:nowrap}
.tab.on{background:var(--p);border-color:var(--p);color:#fff;box-shadow:0 4px 12px rgba(124,58,237,.25)}

/* ─── FORM ─── */
.field{display:flex;flex-direction:column;gap:5px}
.field label{font-size:11px;font-weight:600;color:var(--t1);letter-spacing:.01em}
.iw{position:relative}
.ii{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:14px;pointer-events:none;color:var(--t3)}
.field input,.field select,.field textarea{
  width:100%;padding:11px 13px 11px 36px;
  background:var(--g2);border:1.5px solid var(--bd);
  border-radius:var(--r2);color:var(--t0);font-size:13px;font-family:inherit;
  outline:none;transition:all .18s;-webkit-appearance:none;
}
.field input.nb,.field select.nb,.field textarea.nb{padding-left:13px}
.field input:focus,.field select:focus,.field textarea:focus{
  border-color:var(--p);background:var(--w);
  box-shadow:0 0 0 3px rgba(124,58,237,.1);
}
.field input::placeholder,.field textarea::placeholder{color:var(--t4)}
.field select option{background:#fff;color:var(--t0)}
.field textarea{resize:none;padding:11px 13px;line-height:1.6}
.r2{display:grid;grid-template-columns:1fr 1fr;gap:10px}

/* ─── BUTTONS ─── */
.btn{border:none;border-radius:var(--r2);padding:13px 18px;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;transition:all .18s;display:flex;align-items:center;justify-content:center;gap:7px;width:100%;letter-spacing:-.01em}
.btn:active{transform:scale(.97)}
.btn-p{background:var(--p);color:#fff;box-shadow:var(--shp)}
.btn-p:hover{background:var(--p2);transform:translateY(-1px)}
.btn-green{background:#059669;color:#fff;box-shadow:0 4px 14px rgba(5,150,105,.25)}
.btn-green:hover{filter:brightness(1.08);transform:translateY(-1px)}
.btn-orange{background:#ea580c;color:#fff;box-shadow:0 4px 14px rgba(234,88,12,.22)}
.btn-orange:hover{filter:brightness(1.08);transform:translateY(-1px)}
.btn-ghost{background:var(--g2);border:1.5px solid var(--bd);color:var(--t1);padding:9px 14px;font-size:12px;border-radius:10px;width:auto;font-weight:600}
.btn-ghost:hover{background:var(--g3)}
.btn-red{background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;border:none;}
.btn-red:hover{filter:brightness(1.1);transform:translateY(-1px)}
.btn-out{background:var(--g2);border:1.5px solid var(--bd);color:var(--t2);padding:10px;cursor:pointer;border-radius:12px;font-family:inherit;font-weight:600;font-size:13px;display:flex;align-items:center;justify-content:center;}
.btn-out:hover{background:var(--g3);color:var(--t0)}
.btn-del{background:#fef2f2;border:1.5px solid #fecaca;color:#dc2626;padding:7px 12px;font-size:11px;border-radius:9px;width:auto;flex-shrink:0;cursor:pointer;font-family:inherit;font-weight:600}
.btn-sm{padding:7px 13px;font-size:12px;border-radius:10px;width:auto}
.btn-xs{padding:5px 11px;font-size:10px;border-radius:8px;width:auto;font-weight:700;border:none;cursor:pointer;font-family:inherit;transition:all .15s}
.btn-approve{background:#f0fdf4;border:1px solid #86efac;color:#16a34a}
.btn-reject-s{background:#fef2f2;border:1px solid #fecaca;color:#dc2626}

/* ─── SBOX ─── */
.sbox{background:var(--g2);border:1.5px solid var(--bd);border-radius:var(--r2);padding:13px;display:flex;flex-direction:column;gap:10px}
.sbox-lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--t2);display:flex;align-items:center;gap:6px;padding-bottom:5px}
.sbox-lbl::before{content:'';width:3px;height:12px;border-radius:2px;background:var(--p);flex-shrink:0}

/* ─── REPORT ITEM ─── */
.ri{background:var(--w);border:1.5px solid var(--bd);border-radius:var(--r2);padding:13px;display:flex;flex-direction:column;gap:5px;transition:all .15s}
.ri:hover{border-color:var(--bd2);box-shadow:0 2px 8px rgba(124,58,237,.08)}
.ri-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
.ri-tag{font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;background:var(--pm);color:var(--p);flex-shrink:0}
.ri-time{font-size:10px;color:var(--t3)}
.ri-user{font-size:11px;color:var(--t2)}
.ri-body{font-size:11px;color:var(--t2);line-height:1.7;white-space:pre-wrap;margin-top:2px}

/* ─── USER ROW ─── */
.u-row{display:flex;align-items:center;gap:11px;padding:12px 16px;border-bottom:1px solid var(--bd);transition:background .14s}
.u-row:last-child{border-bottom:none}.u-row:hover{background:var(--g2)}
.u-av{width:38px;height:38px;border-radius:12px;flex-shrink:0;background:var(--pm);border:1.5px solid var(--bd2);display:flex;align-items:center;justify-content:center;font-size:18px}
.u-name{font-size:13px;font-weight:600;color:var(--t0)}.u-role{font-size:10px;color:var(--t2);margin-top:1px}

/* ─── STAFF CARD ─── */
.staff-c{background:var(--w);border:1px solid var(--bd);border-radius:var(--r2);padding:13px 14px;display:flex;align-items:center;gap:12px;box-shadow:var(--sh)}
.staff-av{width:42px;height:42px;border-radius:13px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px}

/* ─── ATT GRID ─── */
.att-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.att-cell{aspect-ratio:1;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;cursor:pointer;transition:all .14s;border:1.5px solid transparent}
.att-cell.present{background:#dcfce7;color:#16a34a;border-color:#86efac}
.att-cell.absent{background:#fee2e2;color:#dc2626;border-color:#fca5a5}
.att-cell.leave{background:#fef9c3;color:#ca8a04;border-color:#fde047}
.att-cell.empty{background:var(--g2);color:var(--t4);border-color:var(--bd)}

/* ─── BADGES ─── */
.badge{display:inline-flex;align-items:center;font-size:10px;font-weight:600;padding:3px 9px;border-radius:20px}
.b-p{background:var(--pm);color:var(--p)}
.b-green{background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0}
.b-red{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}
.b-gold{background:#fffbeb;color:#d97706;border:1px solid #fde68a}

/* ─── BOXES ─── */
.info-b{background:var(--pm);border:1.5px solid var(--bd2);border-radius:var(--r2);padding:11px 14px;font-size:12px;color:var(--p);line-height:1.6}
.warn-b{background:#fffbeb;border:1.5px solid #fde68a;border-radius:var(--r2);padding:11px 14px;font-size:11px;color:#92400e;line-height:1.7}
.err-b{background:#fef2f2;border:1.5px solid #fecaca;border-radius:var(--r2);padding:11px 14px;font-size:12px;color:#dc2626}
.ok-b{background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:var(--r2);padding:11px 14px;font-size:12px;color:#16a34a}
.div{height:1px;background:var(--bd);margin:2px 0}
.note{font-size:10px;color:var(--t3);text-align:center;line-height:1.6}

/* ─── SCROLL TABS ─── */
.stabs{display:flex;gap:6px;overflow-x:auto;padding:14px 18px 0;scrollbar-width:none}
.stabs::-webkit-scrollbar{display:none}
.stab{flex-shrink:0;padding:7px 14px;border:1.5px solid var(--bd);border-radius:20px;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;transition:all .18s;background:var(--w);color:var(--t2);white-space:nowrap}
.stab.on{background:var(--p);border-color:var(--p);color:#fff}

/* ─── LOGIN ─── */
.lw{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px 20px;gap:24px;overflow-y:auto;background:var(--g)}
.logo-ring{
  width:88px;height:88px;border-radius:28px;
  background:linear-gradient(135deg,var(--p),#5b21b6);
  display:flex;align-items:center;justify-content:center;font-size:42px;
  box-shadow:var(--shp);
  animation:popIn .65s cubic-bezier(.34,1.56,.64,1) both;margin:0 auto;
}
@keyframes popIn{from{opacity:0;transform:scale(.5) translateY(28px)}to{opacity:1;transform:scale(1) translateY(0)}}
.logo-wrap{display:flex;flex-direction:column;align-items:center;gap:14px}
.brand-h1{font-size:26px;font-weight:900;color:var(--t0);text-align:center;letter-spacing:-.03em}
.brand-sub{font-size:11px;color:var(--t2);text-align:center;margin-top:2px;letter-spacing:.04em}
.brand-tag{display:inline-flex;align-items:center;gap:5px;margin-top:8px;background:var(--pm);border:1px solid var(--bd2);border-radius:30px;padding:4px 13px;font-size:11px;color:var(--p);font-weight:700}
.login-card{
  width:100%;max-width:360px;
  background:var(--w);border:1.5px solid var(--bd);
  border-radius:24px;
  box-shadow:0 24px 64px rgba(0,0,0,.1);
  padding:24px 20px;display:flex;flex-direction:column;gap:14px;
  animation:slideUp .45s .15s cubic-bezier(.22,1,.36,1) both;
}
@keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
.login-ttl{font-size:18px;font-weight:800;color:var(--t0);letter-spacing:-.02em}

/* ─── CHART WRAP ─── */
.chart-w{background:var(--w);border:1px solid var(--bd);border-radius:var(--r2);padding:14px 10px 8px;overflow:hidden;margin:0 18px;box-shadow:var(--sh)}
.chart-t{font-size:12px;font-weight:700;color:var(--t0);padding:0 6px 10px;display:flex;align-items:center;justify-content:space-between}

/* ─── TOAST ─── */
.toast{position:fixed;bottom:92px;left:50%;transform:translateX(-50%);background:var(--p);color:#fff;padding:11px 22px;border-radius:50px;font-size:12px;font-weight:700;z-index:999;box-shadow:var(--shp);white-space:nowrap;animation:tpop .3s cubic-bezier(.34,1.56,.64,1) both}
@keyframes tpop{from{opacity:0;transform:translateX(-50%) translateY(16px) scale(.9)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
.toast.err{background:#dc2626;box-shadow:0 8px 24px rgba(220,38,38,.3)}
.toast.ok2{background:#059669;box-shadow:0 8px 24px rgba(5,150,105,.25)}

/* ─── REQ ROW ─── */
.req-row{display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--g2);border:1px solid var(--bd);border-radius:10px}
.req-name{font-size:12px;font-weight:600;color:var(--t0)}.req-sub{font-size:10px;color:var(--t2)}

/* ─── STATUS ─── */
.s-pending{background:#fffbeb;color:#d97706;border:1px solid #fde68a;font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;display:inline-block}
.s-approved{background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;display:inline-block}
.s-rejected{background:#fef2f2;color:#dc2626;border:1px solid #fecaca;font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;display:inline-block}

/* ─── BG PICKER ─── */
.bg-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.bg-sw{height:52px;border-radius:13px;cursor:pointer;border:2px solid transparent;transition:all .22s;display:flex;align-items:flex-end;justify-content:center;padding-bottom:5px;position:relative;overflow:hidden}
.bg-sw::after{content:'';position:absolute;inset:0;background:rgba(0,0,0,.18);border-radius:11px}
.bg-sw-lbl{position:relative;z-index:1;font-size:9px;font-weight:700;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.5)}
.bg-sw.sel{border-color:var(--p);box-shadow:0 0 0 3px rgba(124,58,237,.2)}
.bg-sw.sel::before{content:'✓';position:absolute;top:5px;right:6px;font-size:11px;color:#fff;font-weight:900;z-index:2}
.color-inp{width:100%;height:44px;border-radius:11px;border:1.5px solid var(--bd);background:var(--g2);cursor:pointer;padding:3px;outline:none}
.color-prev{height:44px;border-radius:11px;border:1.5px solid var(--bd)}

/* ─── SPINNER ─── */
.spinner{width:32px;height:32px;border:3px solid var(--bd);border-top-color:var(--p);border-radius:50%;animation:spin .7s linear infinite;margin:0 auto}
@keyframes spin{to{transform:rotate(360deg)}}
.loading-full{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:var(--g)}

/* ─── INSIGHT ─── */
.insight{background:linear-gradient(135deg,var(--pm),rgba(124,58,237,.04));border:1.5px solid var(--bd2);border-radius:var(--r2);padding:13px;display:flex;gap:10px}
.ins-icon{font-size:22px;flex-shrink:0}
.ins-title{font-size:12px;font-weight:700;color:var(--t0);margin-bottom:3px}
.ins-body{font-size:11px;color:var(--t2);line-height:1.6}
`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function Toast({msg,type="ok",onDone}){
  useEffect(()=>{const t=setTimeout(onDone,2800);return()=>clearTimeout(t)},[onDone]);
  return <div className={`toast ${type}`}>{ type==="err"?"❌":type==="ok2"?"✅":"✅"} {msg}</div>;
}

function F({label,ph="",val,set,type="text",icon,nb=false}){
  return(
    <div className="field">
      {label&&<label>{label}</label>}
      <div className="iw">
        {icon&&<span className="ii">{icon}</span>}
        <input className={nb||!icon?"nb":""} type={type} placeholder={ph} value={val} onChange={e=>set(e.target.value)}/>
      </div>
    </div>
  );
}

function Sel({label,val,set,opts}){
  return(
    <div className="field">
      {label&&<label>{label}</label>}
      <select className="nb" value={val} onChange={e=>set(e.target.value)}>
        {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

function Card({icon,title,sub,children,accent,action,flat=false}){
  return(
    <div className="card">
      <div className="card-head">
        <div className="card-icon" style={accent?{background:`color-mix(in srgb,${accent} 15%,#f5f3ff)`}:{}}>{icon}</div>
        <div style={{flex:1,minWidth:0}}><div className="card-title">{title}</div>{sub&&<div className="card-sub">{sub}</div>}</div>
        {action&&<div className="card-action">{action}</div>}
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

function SBox({label,children}){
  return <div className="sbox"><div className="sbox-lbl">{label}</div>{children}</div>;
}

function Prog({label,value,max,color="var(--p)",unit=""}){
  const pct=max>0?Math.min((value/max)*100,100):0;
  const col=pct>=100?"#2563eb":pct>=75?"#059669":pct>=50?"#7c3aed":pct>=30?"#d97706":"#dc2626";
  return(
    <div className="prog">
      <div className="prog-row">
        <span className="prog-lbl">{label}</span>
        <span className="prog-val" style={{color:col}}>{pct.toFixed(1)}%</span>
      </div>
      <div className="prog-bg"><div className="prog-bar" style={{width:`${pct}%`,background:col}}/></div>
      <div className="prog-pct">{value.toLocaleString()}{unit} / {max.toLocaleString()}{unit}</div>
    </div>
  );
}

function KRing({pct,name,size=84}){
  const r=32; const c=2*Math.PI*r; const off=c*(1-Math.min(pct,100)/100);
  const col=pct>=90?"#059669":pct>=70?"#7c3aed":pct>=50?"#d97706":"#dc2626";
  return(
    <div className="kring">
      <div style={{position:"relative",width:size,height:size}}>
        <svg width={size} height={size} viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#f3f4f6" strokeWidth="7"/>
          <circle cx="40" cy="40" r={r} fill="none" stroke={col} strokeWidth="7"
            strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
            transform="rotate(-90 40 40)" style={{transition:"stroke-dashoffset .8s cubic-bezier(.34,1.56,.64,1)"}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{fontSize:size<80?13:16,fontWeight:900,color:col}}>{pct}%</div>
        </div>
      </div>
      {name&&<div className="kring-name">{name}</div>}
    </div>
  );
}

function TargetCard({cat,data}){
  const pct=data.plan>0?Math.min((data.actual/data.plan)*100,100):0;
  const col=pct>=100?"#2563eb":pct>=80?"#059669":pct>=60?"#7c3aed":pct>=40?"#d97706":"#dc2626";
  const gap=data.plan-data.actual;
  return(
    <div className="tgt">
      <div className="tgt-top">
        <div className="tgt-ic" style={{background:`color-mix(in srgb,${data.color} 12%,#fff)`}}>{data.icon}</div>
        <div className="tgt-info">
          <div className="tgt-name">{data.label}</div>
          <div className="tgt-nums">Plan: <b>{data.unit==="USD"?"$":""}{data.plan.toLocaleString()}{data.unit!=="USD"?" "+data.unit:""}</b> · Actual: <b style={{color:col}}>{data.unit==="USD"?"$":""}{(parseFloat(data.actual)||0).toLocaleString()}{data.unit!=="USD"?" "+data.unit:""}</b></div>
        </div>
        <div className="tgt-pct" style={{color:col}}>{pct.toFixed(0)}%</div>
      </div>
      <div className="bar-bg"><div className="bar-fill" style={{width:`${pct}%`,background:col}}/></div>
      <div className="tgt-bot">
        <span>Gap: <b style={{color:gap<=0?"#059669":"#dc2626"}}>{gap<=0?"✅ Achieved!":"-"+(data.unit==="USD"?"$":"")+Math.abs(gap).toLocaleString()+(data.unit!=="USD"?" "+data.unit:"")}</b></span>
        <span style={{color:col}}>{pct>=100?"🏆":pct>=80?"🔥":pct>=50?"📈":"⚠️"} {pct>=100?"Target Reached!":pct>=80?"Almost!":pct>=50?"On track":"Needs push"}</span>
      </div>
    </div>
  );
}

function ReportList({reports}){
  const [f,sf]=useState("all");
  const types=[...new Set(reports.map(r=>r.type))];
  const filtered=f==="all"?reports:reports.filter(r=>r.type===f);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div className="stabs">
        <button className={`stab ${f==="all"?"on":""}`} onClick={()=>sf("all")}>ទំាងអស់ ({reports.length})</button>
        {types.map(t=><button key={t} className={`stab ${f===t?"on":""}`} onClick={()=>sf(t)}>{t}</button>)}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8,padding:"0 18px"}}>
        {filtered.length===0&&<div className="info-b">មិនទាន់មាន Report</div>}
        {filtered.map(r=>(
          <div key={r.id||r.fid} className="ri">
            <div className="ri-row"><span className="ri-tag">{r.type}</span><span className="ri-time">{new Date(r.ts).toLocaleString()}</span></div>
            <div className="ri-user">👤 {r.user}</div>
            <div className="ri-body">{r.msg}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SETUP WIZARD ─────────────────────────────────────────────────────────────
function SetupWizard({onDone}){
  const [u,su]=useState(""); const [p,sp]=useState(""); const [p2,sp2]=useState("");
  const [name,sn]=useState(""); const [err,se]=useState(""); const [loading,sl]=useState(false);
  const go=async()=>{
    if(!u||!p||!name){se("សូមបំពេញគ្រប់ field!");return;}
    if(p!==p2){se("ពាក្យសម្ងាត់មិនដូចគ្នា!");return;}
    if(p.length<8){se("ពាក្យសម្ងាត់ 8+ តួ!");return;}
    sl(true);
    const hash=await hashPassword(p);
    await saveUser({id:"admin_001",username:u,passwordHash:hash,role:"admin",display:name});
    sl(false); onDone();
  };
  return(
    <div className="lw">
      <div className="logo-wrap">
        <div className="logo-ring">⚙️</div>
        <div>
          <div className="brand-h1">Setup Admin</div>
          <div className="brand-sub">ការដំឡើងដំបូង · First Time</div>
          <div style={{textAlign:"center"}}><span className="brand-tag">📍 541-TRD</span></div>
        </div>
      </div>
      <div className="login-card">
        <div className="login-ttl">បង្កើត Admin Account</div>
        <div className="warn-b">🔐 Password Hash SHA-256 · Firebase Cloud</div>
        <F label="ឈ្មោះបង្ហាញ" ph="ឧ. Heng Kimhong" val={name} set={sn} icon="👤"/>
        <F label="Username" ph="admin username" val={u} set={su} icon="🪪"/>
        <F label="ពាក្យសម្ងាត់" ph="8+ តួ" val={p} set={sp} icon="🔒" type="password"/>
        <F label="បញ្ជាក់" ph="Type again..." val={p2} set={sp2} icon="🔒" type="password"/>
        {err&&<div className="err-b">{err}</div>}
        <button className="btn btn-p" onClick={go} disabled={loading}>{loading?"កំពុងដំណើរការ...":"✅ បង្កើត Admin"}</button>
        <div className="note">Setup ១ ដងគ្រប់គ្រាន់ · Firebase Cloud</div>
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({onLogin}){
  const [u,su]=useState(""); const [p,sp]=useState(""); const [err,se]=useState(""); const [loading,sl]=useState(false);
  const go=async()=>{
    sl(true); se("");
    try {
      const users=await getUsers();
      const m=users.find(x=>x.username===u);
      if(m&&await verifyPassword(p,m.passwordHash)){sl(false);onLogin(m);return;}
    } catch(e){ console.log(e); }
    sl(false); se("ឈ្មោះ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ");
  };
  return(
    <div className="lw">
      <div className="logo-wrap">
        <div className="logo-ring">🏦</div>
        <div>
          <div className="brand-h1">Branch Pro</div>
          <div className="brand-sub">Staff Management System</div>
          <div style={{textAlign:"center"}}><span className="brand-tag">📍 541-TRD</span></div>
        </div>
      </div>
      <div className="login-card">
        <div className="login-ttl">ចូលប្រើប្រាស់</div>
        <F label="Username" ph="username" val={u} set={su} icon="👤"/>
        <F label="Password" ph="••••••••" val={p} set={sp} icon="🔒" type="password"/>
        {err&&<div className="err-b">{err}</div>}
        <button className="btn btn-p" onClick={go} disabled={loading}>{loading?"កំពុងផ្ទៀងផ្ទាត់...":"ចូលប្រើ →"}</button>
      </div>
    </div>
  );
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function Header({user,onLogout}){
  const cfg=ROLE[user.role]||{};
  const tod=new Date();
  const hr=tod.getHours();
  const gr=hr<12?"Good Morning ☀️":hr<17?"Good Afternoon 🌤":hr<20?"Good Evening 🌅":"Good Night 🌙";
  return(
    <div className="hdr">
      <div className="hav" style={{background:`color-mix(in srgb,${cfg.color||"#7c3aed"} 15%,#f5f3ff)`}}>{cfg.icon||"👤"}</div>
      <div className="htxt">
        <div style={{fontSize:10,color:"var(--t2)",marginBottom:1}}>{gr}</div>
        <div className="hn">{user.display}</div>
        <div className="hrl">{cfg.label} · 541-TRD</div>
      </div>
      <div className="hpill">PRO</div>
      <button className="btn-out" style={{marginLeft:6}} onClick={onLogout}>ចេញ</button>
    </div>
  );
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
function BNav({pages,active,set}){
  return(
    <div className="bnav">
      {pages.map(p=>(
        <button key={p} className={`bni ${active===p?"on":""}`} onClick={()=>set(p)}>
          <span className="ni">{NAV_META[p]?.icon||"●"}</span>
          <span className="nl">{NAV_META[p]?.label||p}</span>
        </button>
      ))}
    </div>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
// Logic: loan team → activities only | csa/khqr → activities + data | others → full
function HomePage({user,targets}){
  const [acts,sa]=useState([]); const [rpts,sr]=useState([]);
  const [loading,sl]=useState(true);
  const today=new Date(); const mon=today.getMonth();
  const team=ROLE[user.role]?.team||"";

  useEffect(()=>{
    const ps=[getActivities()];
    if(team!=="loan") ps.push(getReports());
    Promise.all(ps).then(([a,r])=>{ sa(a); if(r) sr(r); sl(false); });
  },[]);

  if(loading) return <div className="loading-full"><div className="spinner"/></div>;

  const todayStr=today.toDateString();
  const todayRpts=rpts.filter(r=>new Date(r.ts).toDateString()===todayStr);
  const monRpts=rpts.filter(r=>new Date(r.ts).getMonth()===mon);

  // Team loan: show only activities
  if(team==="loan") return(
    <div className="sb">
      <div className="welcome">
        <div className="welcome-greet">📍 541-TRD · ខែ{MONTHS[mon]}</div>
        <div className="welcome-name">{user.display}</div>
        <div className="welcome-sub">{ROLE[user.role]?.label}</div>
        <div className="welcome-emoji">💳</div>
      </div>
      <div className="sec-title">📣 ផែនការផ្សព្វផ្សាយ</div>
      {acts.length===0&&<div className="info-b" style={{margin:"0 18px"}}>មិនទាន់មានផែនការ</div>}
      {acts.map(a=><ActivityCard key={a.fid||a.id} act={a} user={user} mini/>)}
      <div style={{height:8}}/>
    </div>
  );

  // CSA / KHQR: show activities + their data
  if(team==="csa"||team==="khqr"){
    const myTypes=team==="csa"?["CSA","CSA_Officer"]:["MA_KHQR","MS_KHQR"];
    const myRpts=rpts.filter(r=>myTypes.includes(r.type));
    return(
      <div className="sb">
        <div className="welcome">
          <div className="welcome-greet">📍 541-TRD · ខែ{MONTHS[mon]}</div>
          <div className="welcome-name">{user.display}</div>
          <div className="welcome-sub">{ROLE[user.role]?.label}</div>
          <div className="welcome-emoji">{team==="csa"?"🧾":"📱"}</div>
        </div>
        <div className="sg2" style={{marginTop:14}}>
          <div className="scard"><div className="scard-icon">{team==="csa"?"🧾":"📱"}</div><div className="scard-val" style={{color:"var(--p)"}}>{myRpts.length}</div><div className="scard-lbl">Reports ខែនេះ</div></div>
          <div className="scard"><div className="scard-icon">📅</div><div className="scard-val" style={{color:"#059669"}}>{todayRpts.length}</div><div className="scard-lbl">Reports ថ្ងៃនេះ</div></div>
        </div>
        <div className="sec-title">📊 Reports ក្រុម{team==="csa"?"CSA":"KHQR"}</div>
        <div style={{padding:"0 18px",display:"flex",flexDirection:"column",gap:8}}>
          {myRpts.slice(0,5).map(r=>(
            <div key={r.id} className="ri">
              <div className="ri-row"><span className="ri-tag">{r.type}</span><span className="ri-time">{new Date(r.ts).toLocaleString()}</span></div>
              <div className="ri-user">👤 {r.user}</div>
              <div className="ri-body">{r.msg}</div>
            </div>
          ))}
          {myRpts.length===0&&<div className="info-b">មិនទាន់មាន Report</div>}
        </div>
        <div className="sec-title">📣 ផែនការផ្សព្វផ្សាយ</div>
        {acts.map(a=><ActivityCard key={a.fid||a.id} act={a} user={user} mini/>)}
        <div style={{height:8}}/>
      </div>
    );
  }

  // Admin / DBMC / BM / Teller: full dashboard
  return(
    <div className="sb">
      <div className="welcome">
        <div className="welcome-greet">📍 541-TRD · ខែ{MONTHS[mon]}</div>
        <div className="welcome-name">{user.display}</div>
        <div className="welcome-sub">{rpts.length} Reports · {MONTHS[mon]}</div>
        <div className="welcome-emoji">🏦</div>
      </div>

      {/* Stats */}
      <div className="sg2" style={{marginTop:14}}>
        <div className="scard"><div className="scard-icon">📋</div><div className="scard-val" style={{color:"var(--p)"}}>{todayRpts.length}</div><div className="scard-lbl">Reports ថ្ងៃនេះ</div></div>
        <div className="scard"><div className="scard-icon">📊</div><div className="scard-val" style={{color:"#059669"}}>{monRpts.length}</div><div className="scard-lbl">Reports ខែនេះ</div></div>
        <div className="scard" style={{marginTop:0}}><div className="scard-icon">📣</div><div className="scard-val" style={{color:"#ea580c"}}>{acts.length}</div><div className="scard-lbl">Activities</div></div>
        <div className="scard" style={{marginTop:0}}><div className="scard-icon">👥</div><div className="scard-val" style={{color:"#0891b2"}}>{[...new Set(monRpts.map(r=>r.user))].length}</div><div className="scard-lbl">Staff Active</div></div>
      </div>

      {/* Targets */}
      <div className="sec-title">🎯 Target ខែ{MONTHS[mon]}</div>
      {Object.entries(targets).map(([k,d])=><TargetCard key={k} cat={k} data={d}/>)}

      {/* Insights */}
      <div className="sec-title">💡 Insights</div>
      <div style={{padding:"0 18px",display:"flex",flexDirection:"column",gap:8}}>
        {Object.entries(targets).map(([k,d])=>{
          const pct=d.plan>0?(d.actual/d.plan*100):0;
          return(
            <div key={k} className="insight">
              <div className="ins-icon">{pct>=80?"🔥":pct>=50?"📈":"⚠️"}</div>
              <div>
                <div className="ins-title">{d.label} — {pct.toFixed(1)}%</div>
                <div className="ins-body">{pct>=100?"🏆 Target Reached! ":pct>=80?"ជិតដល់! ":"ត្រូវការ "}
                  {pct<100&&<><b style={{color:"var(--p)"}}>{d.unit==="USD"?"$":""}{Math.abs(d.plan-d.actual).toLocaleString()}{d.unit!=="USD"?" "+d.unit:""}</b> {pct>=80?"more!":pct>=50?"to go":"— push harder!"}</>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent activities */}
      {acts.length>0&&<>
        <div className="sec-title">📣 ផែនការផ្សព្វផ្សាយ</div>
        {acts.slice(0,2).map(a=><ActivityCard key={a.fid||a.id} act={a} user={user} mini/>)}
      </>}
      <div style={{height:8}}/>
    </div>
  );
}

// ─── ACTIVITY CARD COMPONENT ──────────────────────────────────────────────────
function ActivityCard({act,user,mini=false,onApprove,onJoin}){
  const TYPE_EMOJI={booth:"🏪",roadshow:"🚗"};
  const canApprove=["dbmc","bm","admin"].includes(user.role);
  const canJoin=["loan_officer","ma_khqr","ms_khqr","csa_officer"].includes(user.role);
  const approved=(act.requests||[]).filter(r=>r.status==="approved");
  const pending=(act.requests||[]).filter(r=>r.status==="pending");
  const myReq=(act.requests||[]).find(r=>r.user===user.display);
  const pct=act.targetNew>0?Math.min(((act.actualNew||0)/act.targetNew)*100,100):0;

  // Activity date match for Actual — only count reports on activity date
  const actDate=act.date||"";
  // Sum actual from reports matching activity date
  const actKHQR=(act.relatedReports||[]).filter(r=>(r.ts||"").startsWith(actDate)).reduce((s,r)=>s+(parseInt(r.data?.nK||0)),0);
  const actCIF=(act.relatedReports||[]).filter(r=>(r.ts||"").startsWith(actDate)).reduce((s,r)=>s+(parseInt(r.data?.newCif||0)),0);

  return(
    <div className="act-card" style={{margin:"0 18px",borderRadius:16,border:"1.5px solid var(--bd)",background:"#fff",boxShadow:"var(--sh)",overflow:"hidden"}}>
      {/* Header strip — no image, clean info */}
      <div style={{background:`linear-gradient(135deg,${act.type==="booth"?"#7c3aed":"#ea580c"},${act.type==="booth"?"#6d28d9":"#c2410c"})`,padding:"13px 15px",position:"relative"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",gap:6,marginBottom:5,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontSize:10,fontWeight:700,padding:"2px 9px",background:"rgba(255,255,255,.22)",color:"#fff",borderRadius:20}}>
                {act.type==="booth"?"🏪 Booth":"🚗 Roadshow"}
              </span>
              <span style={{fontSize:10,color:"rgba(255,255,255,.8)"}}>📅 {act.date}</span>
            </div>
            <div style={{fontSize:15,fontWeight:800,color:"#fff",letterSpacing:"-.01em",lineHeight:1.3}}>{act.title}</div>
          </div>
          {(act.targetNew>0||act.targetCIF>0)&&(
            <div style={{background:"rgba(255,255,255,.2)",borderRadius:10,padding:"6px 10px",textAlign:"center",flexShrink:0}}>
              <div style={{fontSize:16,fontWeight:900,color:"#fff"}}>{pct.toFixed(0)}%</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,.75)"}}>KHQR</div>
            </div>
          )}
        </div>
      </div>

      <div style={{padding:"13px 15px",display:"flex",flexDirection:"column",gap:10}}>
        {/* Location */}
        <div style={{fontSize:11,color:"var(--t2)",display:"flex",alignItems:"flex-start",gap:5}}>
          <span style={{flexShrink:0}}>📍</span>
          <span>{[act.location,act.village,act.commune,act.district].filter(Boolean).join(" · ")}</span>
        </div>

        {/* Staff List — full name + role */}
        {(act.staffList||[]).length>0&&(
          <div>
            <div style={{fontSize:10,fontWeight:700,color:"var(--t2)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:5}}>👥 Staff ទទួលខុសត្រូវ</div>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {(act.staffList||[]).map((s,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:"var(--g2)",borderRadius:10,border:"1px solid var(--bd2)"}}>
                  <span style={{fontSize:16,flexShrink:0}}>{ROLE[s.role]?.icon||"👤"}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:"var(--t0)"}}>{s.name}</div>
                    <div style={{fontSize:10,color:"var(--t2)"}}>{ROLE[s.role]?.label||s.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Target vs Actual — from reports matching activity date */}
        {(act.targetNew>0||act.targetCIF>0||act.targetReprint>0)&&(
          <div>
            <div style={{fontSize:10,fontWeight:700,color:"var(--t2)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>🎯 Target vs Actual</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {act.targetNew>0&&(
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--t2)",marginBottom:3}}>
                    <span>📱 KHQR New</span>
                    <span><b style={{color:"var(--p)"}}>{act.actualNew||0}</b> / {act.targetNew} <span style={{color:act.actualNew>=act.targetNew?"#059669":"#d97706"}}>{act.targetNew>0?((act.actualNew||0)/act.targetNew*100).toFixed(0):0}%</span></span>
                  </div>
                  <div style={{height:6,background:"var(--g3)",borderRadius:20,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${act.targetNew>0?Math.min(((act.actualNew||0)/act.targetNew)*100,100):0}%`,background:"var(--p)",borderRadius:20,transition:"width .6s"}}/>
                  </div>
                </div>
              )}
              {act.targetReprint>0&&(
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--t2)",marginBottom:3}}>
                    <span>🔄 KHQR Reprint</span>
                    <span><b style={{color:"#0891b2"}}>{act.actualReprint||0}</b> / {act.targetReprint}</span>
                  </div>
                  <div style={{height:6,background:"var(--g3)",borderRadius:20,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${act.targetReprint>0?Math.min(((act.actualReprint||0)/act.targetReprint)*100,100):0}%`,background:"#0891b2",borderRadius:20,transition:"width .6s"}}/>
                  </div>
                </div>
              )}
              {act.targetCIF>0&&(
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--t2)",marginBottom:3}}>
                    <span>🪪 New CIF</span>
                    <span><b style={{color:"#059669"}}>{act.actualCIF||0}</b> / {act.targetCIF}</span>
                  </div>
                  <div style={{height:6,background:"var(--g3)",borderRadius:20,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${act.targetCIF>0?Math.min(((act.actualCIF||0)/act.targetCIF)*100,100):0}%`,background:"#059669",borderRadius:20,transition:"width .6s"}}/>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Approved members */}
        {approved.length>0&&(
          <div>
            <div style={{fontSize:10,fontWeight:700,color:"var(--t2)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:5}}>✅ អ្នកចូលរួម</div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {approved.map(r=>(
                <div key={r.user} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 10px",background:"#f0fdf4",border:"1px solid #86efac",borderRadius:9}}>
                  <span style={{fontSize:10,fontWeight:700,color:"#059669"}}>✅</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#065f46"}}>{r.user}</div>
                    <div style={{fontSize:10,color:"#6b7280"}}>📅 {r.date} · {ROLE[r.role]?.label||r.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending approvals */}
        {!mini&&canApprove&&pending.length>0&&(
          <div>
            <div style={{fontSize:10,fontWeight:700,color:"var(--t2)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:5}}>🔔 សំណើរចូលរួម</div>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {pending.map(r=>(
                <div key={r.user} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:700,color:"var(--t0)"}}>{r.user}</div>
                    <div style={{fontSize:10,color:"var(--t2)"}}>📅 {r.date} · {ROLE[r.role]?.label||r.role}</div>
                  </div>
                  <button className="btn-xs btn-approve" onClick={()=>onApprove&&onApprove(act,r.user,true)}>✓</button>
                  <button className="btn-xs btn-reject-s" onClick={()=>onApprove&&onApprove(act,r.user,false)}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Join button */}
        {canJoin&&!mini&&(
          myReq
            ? <span className={`s-${myReq.status}`}>{myReq.status==="pending"?"⏳ រង់ចាំអនុម័ត":myReq.status==="approved"?"✅ បានអនុម័ត":"❌ បានបដិសេធ"}</span>
            : <button className="btn btn-p btn-sm" style={{alignSelf:"flex-start"}} onClick={()=>onJoin&&onJoin(act)}>📋 Request Join</button>
        )}
      </div>
    </div>
  );
}


// ─── STAFF PERFORMANCE PANEL ─────────────────────────────────────────────────
function StaffPerformancePanel({rpts,kpiData,mon,perfByPeriod}){
  const [period,sp]=useState("monthly");
  const yr=new Date().getFullYear();

  const getPeriodRpts=()=>perfByPeriod(period);

  const staffPerf=()=>{
    const pr=getPeriodRpts();
    const map={};
    pr.forEach(r=>{
      if(!map[r.user]) map[r.user]={name:r.user,count:0,cif:0,khqr:0,loan:0,deposit:0};
      const d=r.data||{};
      map[r.user].count++;
      if(r.type==="CSA"||r.type==="CSA_Officer"){
        map[r.user].cif+=parseInt(d.newCif||0);
        map[r.user].khqr+=parseInt(d.newKhqr||0);
        map[r.user].deposit+=parseFloat(d.deposit||0)/1e6;
      }
      if(r.type==="Loan"||r.type==="Loan_Officer"){
        map[r.user].loan+=["mK","tK","wK","thK","fK"].reduce((s,k)=>s+parseFloat(d[k]||0),0)/1e6;
      }
      if(r.type==="MA_KHQR"||r.type==="MS_KHQR"){
        map[r.user].khqr+=parseInt(d.nK||0)+parseInt(d.rK||0);
      }
    });
    return Object.values(map).sort((a,b)=>b.count-a.count);
  };

  const perf=staffPerf();
  const maxCount=perf[0]?.count||1;
  const kpiMap={};
  kpiData.forEach(k=>{ kpiMap[k.name]=k.v; });

  const periodLabel={weekly:"ប្រចាំសប្ដាហ៍",monthly:"ប្រចាំខែ",quarterly:"ប្រចាំ Q"};

  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {/* Period selector */}
      <div style={{display:"flex",gap:6,padding:"0 18px",overflowX:"auto"}}>
        {[["weekly","📅 សប្ដាហ៍"],["monthly","📆 ខែ"],["quarterly","📊 Q"]].map(([k,l])=>(
          <button key={k} className={`stab ${period===k?"on":""}`} onClick={()=>sp(k)}>{l}</button>
        ))}
      </div>

      {/* Stats row */}
      <div style={{padding:"0 18px",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {[
          {icon:"👥",lbl:"Staff",val:perf.length,c:"#7c3aed"},
          {icon:"📋",lbl:"Reports",val:getPeriodRpts().length,c:"#2563eb"},
          {icon:"📅",lbl:periodLabel[period],val:"",c:"#059669"},
        ].map(x=>(
          <div key={x.lbl} style={{background:"#fff",border:"1px solid var(--bd)",borderRadius:12,padding:"11px 10px",textAlign:"center",boxShadow:"var(--sh)"}}>
            <div style={{fontSize:18,marginBottom:3}}>{x.icon}</div>
            <div style={{fontSize:20,fontWeight:800,color:x.c,letterSpacing:"-.02em"}}>{x.val||""}</div>
            <div style={{fontSize:9,fontWeight:700,color:"var(--t2)",textTransform:"uppercase",letterSpacing:".06em"}}>{x.lbl}</div>
          </div>
        ))}
      </div>

      {/* Staff cards */}
      <div style={{padding:"0 18px",display:"flex",flexDirection:"column",gap:10}}>
        {perf.length===0&&(
          <div style={{background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:12,padding:"14px 16px",fontSize:12,color:"#0369a1",textAlign:"center"}}>
            មិនទាន់មានទិន្នន័យ{periodLabel[period]}
          </div>
        )}
        {perf.map((s,i)=>{
          const kpiScore=kpiMap[s.name]||0;
          const col=kpiScore>=90?"#059669":kpiScore>=70?"#7c3aed":kpiScore>=50?"#d97706":"#9ca3af";
          return(
            <div key={s.name} style={{background:"#fff",border:"1px solid var(--bd)",borderRadius:14,overflow:"hidden",boxShadow:"var(--sh)"}}>
              {/* Header */}
              <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:11,borderBottom:"1px solid var(--bd)"}}>
                <div style={{width:38,height:38,borderRadius:11,background:i===0?"linear-gradient(135deg,#fbbf24,#f59e0b)":i===1?"linear-gradient(135deg,#d1d5db,#9ca3af)":i===2?"linear-gradient(135deg,#fdba74,#f97316)":"var(--g2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:i<3?"14px":"13px",fontWeight:800,color:i<3?"#fff":"var(--t2)",flexShrink:0}}>
                  {i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}`}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--t0)",letterSpacing:"-.01em"}}>{s.name}</div>
                  <div style={{fontSize:10,color:"var(--t2)",marginTop:1}}>{s.count} reports · {periodLabel[period]}</div>
                </div>
                {/* KPI ring mini */}
                {kpiScore>0&&(
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flexShrink:0}}>
                    <div style={{position:"relative",width:44,height:44}}>
                      <svg width="44" height="44" viewBox="0 0 44 44">
                        <circle cx="22" cy="22" r="17" fill="none" stroke="#f3f4f6" strokeWidth="4"/>
                        <circle cx="22" cy="22" r="17" fill="none" stroke={col} strokeWidth="4"
                          strokeDasharray={2*Math.PI*17}
                          strokeDashoffset={2*Math.PI*17*(1-kpiScore/100)}
                          strokeLinecap="round" transform="rotate(-90 22 22)"
                          style={{transition:"stroke-dashoffset .6s"}}/>
                      </svg>
                      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:col}}>{kpiScore}%</div>
                    </div>
                    <div style={{fontSize:8,color:"var(--t2)",fontWeight:600}}>KPI</div>
                  </div>
                )}
              </div>
              {/* Metrics */}
              <div style={{padding:"10px 14px",display:"flex",flexWrap:"wrap",gap:6}}>
                {s.cif>0&&<span style={{fontSize:10,fontWeight:600,padding:"3px 10px",background:"#f0fdf4",border:"1px solid #86efac",color:"#059669",borderRadius:20}}>🪪 CIF: {s.cif}</span>}
                {s.khqr>0&&<span style={{fontSize:10,fontWeight:600,padding:"3px 10px",background:"#f5f3ff",border:"1px solid #c4b5fd",color:"#7c3aed",borderRadius:20}}>📱 KHQR: {s.khqr}</span>}
                {s.loan>0&&<span style={{fontSize:10,fontWeight:600,padding:"3px 10px",background:"#eff6ff",border:"1px solid #93c5fd",color:"#2563eb",borderRadius:20}}>💳 Loan: {s.loan.toFixed(1)}M</span>}
                {s.deposit>0&&<span style={{fontSize:10,fontWeight:600,padding:"3px 10px",background:"#fff7ed",border:"1px solid #fdba74",color:"#ea580c",borderRadius:20}}>🏦 Dep: {s.deposit.toFixed(1)}M</span>}
                {/* Bar */}
                <div style={{width:"100%",marginTop:2}}>
                  <div style={{height:5,background:"var(--g3)",borderRadius:20,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${(s.count/maxCount)*100}%`,background:i===0?"linear-gradient(90deg,#f59e0b,#fbbf24)":i===1?"linear-gradient(90deg,#6b7280,#9ca3af)":i===2?"linear-gradient(90deg,#f97316,#fdba74)":"linear-gradient(90deg,#7c3aed,#a78bfa)",borderRadius:20,transition:"width .6s"}}/>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ANALYTICS PAGE ───────────────────────────────────────────────────────────
function AnalyticsPage({targets,user,onUpdateTargets}){
  const [tab,st]=useState("kpi");
  const [rpts,sr]=useState([]); const [loading,sl]=useState(true);
  const mon=new Date().getMonth();
  const canEdit=["dbmc","admin"].includes(user.role);
  const [editMode,setEdit]=useState(false);
  const [draft,setDraft]=useState(()=>JSON.parse(JSON.stringify(targets)));

  const [kpis,sk]=useState([]);

  useEffect(()=>{
    Promise.all([getReports(),getKPIs()]).then(([r,k])=>{sr(r);sk(k);sl(false);});
  },[]);

  const save=async()=>{ await saveTargets(draft); onUpdateTargets(draft); setEdit(false); };

  const monRpts=rpts.filter(r=>new Date(r.ts).getMonth()===mon);
  const yr=new Date().getFullYear();
  const mk=yr+"-"+String(mon+1).padStart(2,"0");

  // Real KPI data from Firebase
  const kpiData=kpis.filter(k=>k.month===mk).map(k=>({
    name:k.userName||"",
    v:parseInt(k.score)||Math.round([parseFloat(k.deposit)||0,parseFloat(k.cif)||0,parseFloat(k.khqr)||0].filter(v=>v>0).reduce((a,b,_,arr)=>a+b/arr.length,0)),
    deposit:parseFloat(k.deposit)||0, cif:parseFloat(k.cif)||0, khqr:parseFloat(k.khqr)||0,
    uid:k.uid,
  }));

  // Monthly trend from real reports (last 6 months)
  const monthly=Array.from({length:6},(_,i)=>{
    const m=(mon-5+i+12)%12;
    const yr2=new Date().getFullYear()-(mon-5+i<0?1:0);
    const mr=rpts.filter(r=>{const d=new Date(r.ts);return d.getMonth()===m&&d.getFullYear()===yr2;});
    return{name:MONTHS[m].slice(0,3),Teller:mr.filter(r=>r.type==="Teller").length,CSA:mr.filter(r=>r.type==="CSA"||r.type==="CSA_Officer").length,Loan:mr.filter(r=>r.type==="Loan"||r.type==="Loan_Officer").length};
  });

  // Actual from reports: CSA=newCIF+newKhqr, Loan=sum KHR, KHQR=nK
  const calcActual=()=>{
    let khqr=0,cif=0,deposit=0,loan=0;
    monRpts.forEach(r=>{
      if(r.type==="MA_KHQR"||r.type==="MS_KHQR"){ khqr+=parseInt(r.data?.nK||0)+parseInt(r.data?.rK||0); }
      if(r.type==="CSA"||r.type==="CSA_Officer"){ cif+=parseInt(r.data?.newCif||0); deposit+=parseFloat(r.data?.deposit||0); }
      if(r.type==="Loan"||r.type==="Loan_Officer"){ loan+=parseFloat(r.data?.mK||0)+parseFloat(r.data?.tK||0)+parseFloat(r.data?.wK||0)+parseFloat(r.data?.thK||0)+parseFloat(r.data?.fK||0); }
    });
    // deposit and loan stored as raw M values (staff enter in M), no division needed
    return{khqr, cif, deposit:parseFloat(deposit.toFixed(2)), loan:parseFloat(loan.toFixed(2))};
  };
  const actuals=calcActual();

  // Merge actuals into targets for display
  const targetsWithActual={};
  Object.entries(targets).forEach(([k,d])=>{
    targetsWithActual[k]={...d,actual:actuals[k]??d.actual};
  });

  const tgtChart=Object.entries(targetsWithActual).map(([k,d])=>({name:d.label.split(" ")[0]+(d.unit==="USD"?" ($)":""),Plan:d.plan,Actual:parseFloat(d.actual)||0,color:d.color}));

  // Staff performance: weekly/monthly/quarterly
  const perfByPeriod=(period)=>{
    const now=new Date(); const yr=now.getFullYear(); const m=now.getMonth();
    return rpts.filter(r=>{
      const d=new Date(r.ts);
      if(period==="weekly"){const diff=(now-d)/864e5;return diff<=7;}
      if(period==="monthly") return d.getMonth()===m&&d.getFullYear()===yr;
      if(period==="quarterly") return Math.floor(d.getMonth()/3)===Math.floor(m/3)&&d.getFullYear()===yr;
      return true;
    });
  };

  if(loading) return <div className="loading-full"><div className="spinner"/></div>;

  return(
    <div className="sb">
      <div className="tabs">
        {[["kpi","🎯 KPI"],["target","📊 Target"],["trend","📈 Trend"],["staff","🏆 Staff"]].map(([k,l])=>(
          <button key={k} className={`tab ${tab===k?"on":""}`} onClick={()=>st(k)}>{l}</button>
        ))}
      </div>
      <div style={{height:14}}/>

      {tab==="kpi"&&<>
        <Card icon="📊" title="KPI Overview" sub={`ខែ ${MONTHS[mon]}`} accent="#7c3aed">
          <div style={{display:"flex",flexWrap:"wrap",gap:14,justifyContent:"center",padding:"4px 0"}}>
            {kpiData.length===0&&<div className="info-b">DBMC មិនទាន់បំពេញ KPI</div>}
          {kpiData.map(k=>(
            <div key={k.name} style={{background:"var(--g2)",borderRadius:14,padding:"11px 13px",border:"1px solid var(--bd2)"}}>
              <div style={{fontSize:12,fontWeight:700,color:"var(--t0)",marginBottom:8}}>{k.name}</div>
              <div style={{display:"flex",gap:8,justifyContent:"space-around"}}>
                {[{lbl:"Deposit",val:k.deposit,color:"#2563eb"},{lbl:"CIF",val:k.cif,color:"#059669"},{lbl:"KHQR",val:k.khqr,color:"#7c3aed"}].map(m=>(
                  <div key={m.lbl} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                    <div style={{position:"relative",width:62,height:62}}>
                      <svg width="62" height="62" viewBox="0 0 62 62">
                        <circle cx="31" cy="31" r="25" fill="none" stroke="#f3f4f6" strokeWidth="6"/>
                        <circle cx="31" cy="31" r="25" fill="none" stroke={m.color} strokeWidth="6"
                          strokeDasharray={2*Math.PI*25}
                          strokeDashoffset={2*Math.PI*25*(1-Math.min(m.val||0,100)/100)}
                          strokeLinecap="round" transform="rotate(-90 31 31)"
                          style={{transition:"stroke-dashoffset .6s"}}/>
                      </svg>
                      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:(m.val||0)>0?m.color:"#9ca3af"}}>
                        {(m.val||0)>0?(m.val||0)+"%":"—"}
                      </div>
                    </div>
                    <div style={{fontSize:9,fontWeight:700,color:"var(--t2)",textTransform:"uppercase",letterSpacing:".05em"}}>{m.lbl}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          </div>
        </Card>
        <div style={{height:12}}/>
        <div className="chart-w">
          <div className="chart-t">📊 KPI Score</div>
          <ResponsiveContainer width="100%" height={155}>
            <BarChart data={kpiData} margin={{top:0,right:4,left:-24,bottom:0}}>
              <XAxis dataKey="name" tick={{fill:"#9ca3af",fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis domain={[0,100]} tick={{fill:"#9ca3af",fontSize:9}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={TTS} cursor={{fill:"rgba(124,58,237,.06)"}}/>
              <Bar dataKey="v" name="KPI%" radius={[5,5,0,0]} maxBarSize={28}>
                {kpiData.map((d,i)=><Cell key={i} fill={d.v>=90?"#059669":d.v>=75?"#7c3aed":d.v>=55?"#d97706":"#dc2626"}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </>}

      {tab==="target"&&<>
        {canEdit&&(
          <div style={{padding:"0 18px",display:"flex",justifyContent:"flex-end",marginBottom:4}}>
            {!editMode
              ? <button className="btn-ghost btn-sm" onClick={()=>setEdit(true)}>✏️ កែ Target</button>
              : <div style={{display:"flex",gap:8}}>
                  <button className="btn-ghost btn-sm" onClick={()=>{setDraft(JSON.parse(JSON.stringify(targets)));setEdit(false);}}>បោះបង់</button>
                  <button className="btn btn-green btn-sm" onClick={save}>💾 Save</button>
                </div>
            }
          </div>
        )}
        {editMode&&canEdit ? (
          <Card icon="✏️" title="កែ Target (Plan)" sub="DBMC Only · Actual ចេញ​ Auto ពី Reports" accent="#f59e0b">
            <div className="info-b" style={{fontSize:11}}>📊 <b>Actual</b> គណនា​ Auto ពី​ Reports​ Staff ប្រចាំថ្ងៃ — DBMC​ set <b>Plan</b> តែប៉ុណ្ណោះ</div>
            {Object.entries(draft).map(([k,d])=>(
              <div key={k} style={{background:"var(--g2)",border:"1px solid var(--bd2)",borderRadius:12,padding:"11px 13px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <span style={{fontSize:18}}>{d.icon}</span>
                  <span style={{fontSize:12,fontWeight:700,color:"var(--t0)"}}>{d.label}</span>
                  <span style={{marginLeft:"auto",fontSize:11,color:"var(--t2)"}}>Actual: <b style={{color:"var(--p)"}}>{(actuals[k]||0).toLocaleString()}{d.unit}</b></span>
                </div>
                <F label={`Plan Target (${d.unit==="USD"?"$USD":d.unit||"unit"})`} ph="គោលដៅ" val={String(d.plan)} set={v=>setDraft(p=>({...p,[k]:{...p[k],plan:parseFloat(v)||0}}))} nb/>
              </div>
            ))}
          </Card>
        ) : (
          Object.entries(targetsWithActual).map(([k,d])=><TargetCard key={k} cat={k} data={d}/>)
        )}
        <div style={{height:10}}/>
        <div className="chart-w">
          <div className="chart-t"><span>Plan vs Actual</span><span className="badge b-p">ខែ{MONTHS[mon]}</span></div>
          <ResponsiveContainer width="100%" height={155}>
            <BarChart data={tgtChart} margin={{top:0,right:4,left:-22,bottom:0}}>
              <XAxis dataKey="name" tick={{fill:"#9ca3af",fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"#9ca3af",fontSize:9}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={TTS} cursor={{fill:"rgba(124,58,237,.06)"}}/>
              <Bar dataKey="Plan" fill="#e5e7eb" radius={[4,4,0,0]} maxBarSize={24} name="Plan"/>
              <Bar dataKey="Actual" radius={[4,4,0,0]} maxBarSize={24} name="Actual">
                {tgtChart.map((d,i)=><Cell key={i} fill={d.color}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </>}

      {tab==="trend"&&<>
        <div className="chart-w">
          <div className="chart-t">📈 Reports ប្រចាំខែ</div>
          <ResponsiveContainer width="100%" height={155}>
            <BarChart data={monthly} margin={{top:0,right:4,left:-24,bottom:0}}>
              <XAxis dataKey="name" tick={{fill:"#9ca3af",fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"#9ca3af",fontSize:9}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={TTS} cursor={{fill:"rgba(124,58,237,.06)"}}/>
              <Bar dataKey="Teller" fill="#2563eb" radius={[4,4,0,0]} maxBarSize={16}/>
              <Bar dataKey="CSA" fill="#059669" radius={[4,4,0,0]} maxBarSize={16}/>
              <Bar dataKey="Loan" fill="#7c3aed" radius={[4,4,0,0]} maxBarSize={16}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{height:10}}/>
        <div className="chart-w">
          <div className="chart-t">📉 Trend</div>
          <ResponsiveContainer width="100%" height={125}>
            <LineChart data={monthly.map(d=>({...d,Total:d.Teller+d.CSA+d.Loan}))} margin={{top:4,right:4,left:-24,bottom:0}}>
              <XAxis dataKey="name" tick={{fill:"#9ca3af",fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"#9ca3af",fontSize:9}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={TTS}/>
              <Line type="monotone" dataKey="Total" stroke="#7c3aed" strokeWidth={2.5} dot={{r:3,fill:"#7c3aed"}} activeDot={{r:5}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </>}

      {tab==="staff"&&<StaffPerformancePanel rpts={rpts} kpiData={kpiData} mon={mon} perfByPeriod={perfByPeriod}/>}
      <div style={{height:8}}/>
    </div>
  );
}

// ─── ACTIVITIES PAGE ──────────────────────────────────────────────────────────
function ActivitiesPage({user}){
  const [acts,sa]=useState([]); const [tab,st]=useState("list");
  const [toast,stt]=useState(""); const [loading,sl]=useState(true);
  const [form,sf]=useState({title:"",type:"booth",date:"",location:"",village:"",commune:"",district:"",staffList:[],targetNew:0,targetReprint:0,targetCIF:0});
  const [newStaff,setNS]=useState({name:"",role:"loan_officer"});
  const ff=(k,v)=>sf(p=>({...p,[k]:v}));
  const canEdit=["dbmc","admin"].includes(user.role);
  const canApprove=["dbmc","bm","admin"].includes(user.role);
  const canJoin=["loan_officer","ma_khqr","ms_khqr","csa_officer"].includes(user.role);

  const load=useCallback(async()=>{ sl(true); const a=await getActivities(); sa(a); sl(false); },[]);
  useEffect(()=>{ load(); },[]);

  const addStaff=()=>{
    if(!newStaff.name.trim())return;
    if(form.staffList.length>=2){alert("អាចដាក់ Staff បានតែ 2 នាក់");return;}
    sf(p=>({...p,staffList:[...p.staffList,{name:newStaff.name.trim(),role:newStaff.role}]}));
    setNS({name:"",role:"loan_officer"});
  };
  const removeStaff=(i)=>sf(p=>({...p,staffList:p.staffList.filter((_,idx)=>idx!==i)}));

  const create=async()=>{
    if(!form.title||!form.date){stt("err|សូមបំពេញ field ចាំបាច់!");return;}
    await saveActivity({...form,actualNew:0,actualReprint:0,createdBy:user.display,createdAt:new Date().toISOString(),requests:[]});
    await load();
    sf({title:"",type:"booth",date:"",location:"",village:"",commune:"",district:"",staffList:[],targetNew:0,targetReprint:0,targetCIF:0});
    stt("ok2|ផែនការបានបង្កើត!");
  };

  const approve=async(act,u2,ok)=>{
    const reqs=(act.requests||[]).map(r=>r.user===u2?{...r,status:ok?"approved":"rejected"}:r);
    await updateActivity(act.fid,{requests:reqs});
    await load(); stt(ok?"ok2|អនុម័ត!":"err|បដិសេធ!");
  };

  const join=async(act)=>{
    const already=(act.requests||[]).find(r=>r.user===user.display);
    if(already){stt("err|អ្នកបានស្នើរហើយ!");return;}
    const reqs=[...(act.requests||[]),{user:user.display,role:user.role,date:new Date().toISOString().split("T")[0],status:"pending"}];
    await updateActivity(act.fid,{requests:reqs});
    await load(); stt("ok2|ស្នើរបានផ្ញើ!");
  };

  const tt=(m)=>{
    const p=m.split("|"); return {msg:p.length>1?p[1]:p[0], type:p[0]==="err"?"err":p[0]==="ok2"?"ok2":"ok"};
  };

  return(
    <div className="sb">
      {toast&&<Toast {...tt(toast)} onDone={()=>stt("")}/>}
      <div className="tabs">
        {[["list","📋 ផែនការ"],...(canEdit?[["create","➕ បង្កើត"]]:canJoin?[]:  []),["analytics","📊 Stats"]].map(([k,l])=>(
          <button key={k} className={`tab ${tab===k?"on":""}`} onClick={()=>st(k)}>{l}</button>
        ))}
      </div>
      <div style={{height:14}}/>

      {loading&&<div style={{textAlign:"center",padding:32}}><div className="spinner"/></div>}

      {!loading&&tab==="analytics"&&<>
        <div className="sg2" style={{marginTop:0}}>
          {[{icon:"📋",lbl:"ផែនការ",v:acts.length,c:"#ea580c"},{icon:"👥",lbl:"ចូលរួម",v:acts.reduce((s,a)=>s+(a.requests||[]).filter(r=>r.status==="approved").length,0),c:"#059669"}].map(x=>(
            <div key={x.lbl} className="scard"><div className="scard-icon">{x.icon}</div><div className="scard-val" style={{color:x.c}}>{x.v}</div><div className="scard-lbl">{x.lbl}</div></div>
          ))}
        </div>
        <div style={{height:10}}/>
        <Card icon="📊" title="Activity Performance" sub="Target vs Actual" accent="#ea580c">
          {acts.filter(a=>a.targetNew>0).map(a=>(
            <Prog key={a.fid||a.id} label={a.title.slice(0,28)} value={a.actualNew||0} max={a.targetNew||1}/>
          ))}
          {acts.filter(a=>a.targetNew>0).length===0&&<div className="info-b">មិនទាន់មាន data</div>}
        </Card>
      </>}

      {!loading&&tab==="create"&&canEdit&&(
        <Card icon="📣" title="បង្កើតផែនការ" sub="Booth / Roadshow" accent="#ea580c">
          <F label="ឈ្មោះសកម្មភាព *" ph="ឧ. ផ្សព្វផ្សាយ KHQR..." val={form.title} set={v=>ff("title",v)} icon="📣"/>
          <div className="r2">
            <Sel label="ប្រភេទ" val={form.type} set={v=>ff("type",v)} opts={[["booth","🏪 Booth"],["roadshow","🚗 Roadshow"]]}/>
            <F label="ថ្ងៃ *" val={form.date} set={v=>ff("date",v)} nb type="date" ph=""/>
          </div>
          <F label="ទីតាំង *" ph="ឧ. ផ្សារថ្មី..." val={form.location} set={v=>ff("location",v)} icon="📍"/>
          <div className="r2">
            <F label="ភូមិ" ph="ភូមិ..." val={form.village} set={v=>ff("village",v)} nb/>
            <F label="ឃុំ" ph="ឃុំ..." val={form.commune} set={v=>ff("commune",v)} nb/>
          </div>
          <F label="ស្រុក" ph="ស្រុក..." val={form.district} set={v=>ff("district",v)} nb/>
          <div className="div"/>
          <div className="r2">
            <F label="📱 KHQR New Target" ph="0" val={String(form.targetNew)} set={v=>ff("targetNew",parseFloat(v)||0)} nb/>
            <F label="🔄 KHQR Reprint Target" ph="0" val={String(form.targetReprint)} set={v=>ff("targetReprint",parseFloat(v)||0)} nb/>
          </div>
          <div className="r2">
            <F label="🪪 New CIF Target" ph="0" val={String(form.targetCIF)} set={v=>ff("targetCIF",parseFloat(v)||0)} nb/>
            <div/>
          </div>
          <div className="div"/>
          <div className="sbox-lbl" style={{fontSize:11,fontWeight:700,color:"var(--t1)"}}>👥 Staff ទទួលខុសត្រូវ (add ២-៣ នាក់)</div>
          <div className="r2">
            <F label="ឈ្មោះ Staff" ph="ឈ្មោះ..." val={newStaff.name} set={v=>setNS(p=>({...p,name:v}))} nb/>
            <Sel label="តួនាទី" val={newStaff.role} set={v=>setNS(p=>({...p,role:v}))} opts={Object.entries(ROLE).filter(([k])=>!["admin","bm","dbmc"].includes(k)).map(([k,v])=>[k,v.icon+" "+v.label])}/>
          </div>
          <button className="btn-ghost btn-sm" style={{alignSelf:"flex-start"}} onClick={addStaff}>➕ Add Staff</button>
          {form.staffList.length>0&&(
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {form.staffList.map((s,i)=>(
                <span key={i} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,background:"var(--pm)",border:"1px solid var(--bd2)",borderRadius:20,padding:"4px 11px",color:"var(--p)",fontWeight:600}}>
                  {ROLE[s.role]?.icon} {s.name}
                  <span style={{cursor:"pointer",opacity:.55,marginLeft:2,fontSize:12}} onClick={()=>removeStaff(i)}>✕</span>
                </span>
              ))}
            </div>
          )}
          <button className="btn btn-orange" onClick={create}>✅ បង្កើតផែនការ</button>
        </Card>
      )}

      {!loading&&tab==="list"&&<>
        {acts.length===0&&<div className="info-b" style={{margin:"0 18px"}}>មិនទាន់មានផែនការ</div>}
        {acts.map(a=><ActivityCard key={a.fid||a.id} act={a} user={user} onApprove={approve} onJoin={join}/>)}
      </>}
      <div style={{height:8}}/>
    </div>
  );
}

// ─── STAFF PAGE ───────────────────────────────────────────────────────────────
// ─── KPI EDITOR COMPONENT ────────────────────────────────────────────────────
function KPIEditor({staff,kpi,monthKey,onSave}){
  const [deposit,setDeposit]=useState(String(kpi.deposit||""));
  const [cif,setCif]=useState(String(kpi.cif||""));
  const [khqr,setKhqr]=useState(String(kpi.khqr||""));
  const [notes,setNotes]=useState(kpi.notes||"");
  const [open,so]=useState(false);

  // Avg of 3 metrics as overall KPI
  const vals=[parseFloat(deposit)||0, parseFloat(cif)||0, parseFloat(khqr)||0].filter(v=>v>0);
  const avg=vals.length>0?(vals.reduce((a,b)=>a+b,0)/vals.length):0;
  const col=avg>=90?"#059669":avg>=70?"#7c3aed":avg>=50?"#d97706":avg>0?"#dc2626":"#9ca3af";

  const metrics=[
    {key:"deposit",icon:"🏦",label:"KPI Deposit (%)",val:deposit,set:setDeposit,color:"#2563eb"},
    {key:"cif",    icon:"🪪",label:"KPI New CIF (%)", val:cif,    set:setCif,    color:"#059669"},
    {key:"khqr",   icon:"📱",label:"KPI KHQR (%)",    val:khqr,  set:setKhqr,   color:"#7c3aed"},
  ];

  return(
    <div className="card">
      <div className="card-head" onClick={()=>so(!open)} style={{cursor:"pointer"}}>
        <div className="card-icon" style={{background:`color-mix(in srgb,${ROLE[staff.role]?.color||"#7c3aed"} 14%,#f5f3ff)`}}>{ROLE[staff.role]?.icon||"👤"}</div>
        <div style={{flex:1}}><div className="card-title">{staff.display}</div><div className="card-sub">{ROLE[staff.role]?.label}</div></div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {/* 3 mini bars */}
          <div style={{display:"flex",flexDirection:"column",gap:3,minWidth:60}}>
            {metrics.map(m=>(
              <div key={m.key} style={{display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:36,height:4,background:"#f3f4f6",borderRadius:20,overflow:"hidden",flex:1}}>
                  <div style={{height:"100%",width:`${Math.min(parseFloat(m.val)||0,100)}%`,background:m.color,borderRadius:20}}/>
                </div>
                <span style={{fontSize:9,fontWeight:700,color:m.color,minWidth:24,textAlign:"right"}}>{parseFloat(m.val)||0}%</span>
              </div>
            ))}
          </div>
          <div style={{fontSize:11,color:"var(--t3)"}}>{open?"▲":"▼"}</div>
        </div>
      </div>
      {open&&<div className="card-body">
        {metrics.map(m=>(
          <div key={m.key}>
            <div className="field">
              <label style={{display:"flex",alignItems:"center",gap:5}}>
                <span>{m.icon}</span>{m.label}
              </label>
              <div style={{position:"relative"}}>
                <input className="nb" type="number" min="0" max="100" placeholder="0–100"
                  value={m.val} onChange={e=>m.set(e.target.value)}
                  style={{paddingRight:36}}/>
                <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:13,fontWeight:700,color:m.color}}>%</span>
              </div>
            </div>
            {/* Progress bar preview */}
            <div style={{height:5,background:"#f3f4f6",borderRadius:20,overflow:"hidden",marginTop:-4,marginBottom:4}}>
              <div style={{height:"100%",width:`${Math.min(parseFloat(m.val)||0,100)}%`,background:m.color,borderRadius:20,transition:"width .4s"}}/>
            </div>
          </div>
        ))}
        <div className="field">
          <label>Notes / មតិយោបល់</label>
          <textarea className="nb" rows={2} placeholder="មតិ..." value={notes} onChange={e=>setNotes(e.target.value)}/>
        </div>
        <button className="btn btn-p btn-sm" style={{width:"auto",alignSelf:"flex-end"}} onClick={()=>onSave({deposit,cif,khqr,notes})}>💾 Save KPI</button>
      </div>}
    </div>
  );
}

function StaffPage(){
  const [tab,st]=useState("overview");
  const [users,su]=useState([]); const [kpis,sk]=useState([]); const [att,sat]=useState([]);
  const [toast,stt]=useState(""); const [loading,sl]=useState(true);
  const mon=new Date().getMonth(); const yr=new Date().getFullYear();
  const mk=yr+"-"+String(mon+1).padStart(2,"0");

  const load=useCallback(async()=>{
    sl(true);
    const [u,k,a]=await Promise.all([getUsers(),getKPIs(),getAttendance()]);
    su(u); sk(k); sat(a); sl(false);
  },[]);
  useEffect(()=>{ load(); },[]);

  const staff=users.filter(u=>!["admin","bm","dbmc"].includes(u.role));
  const getKPI=uid=>kpis.find(k=>k.uid===uid&&k.month===mk)||{score:0,notes:""};
  const getAtt=(uid,day)=>att.find(a=>a.uid===uid&&a.day===day&&a.month===mk);
  const toggleAtt=async(uid,day)=>{
    const cur=getAtt(uid,day)?.s;
    const next=cur==="present"?"absent":cur==="absent"?"leave":cur==="leave"?null:"present";
    const id=uid+"_"+mk+"_"+day;
    if(!next){ await deleteAttendance(id); sat(a=>a.filter(x=>x.id!==id)); return; }
    const rec={id,uid,day,month:mk,s:next};
    await saveAttendance(rec);
    sat(a=>{const f=a.filter(x=>x.id!==id);return[...f,rec];});
  };
  const attSum=uid=>{const m=att.filter(a=>a.uid===uid&&a.month===mk); return{p:m.filter(a=>a.s==="present").length,ab:m.filter(a=>a.s==="absent").length,l:m.filter(a=>a.s==="leave").length};};

  if(loading) return <div className="loading-full"><div className="spinner"/></div>;

  return(
    <div className="sb">
      {toast&&<Toast msg={toast} type="ok2" onDone={()=>stt("")}/>}
      <div className="tabs">
        {[["overview","👥 Overview"],["kpi","🏆 KPI"],["attendance","📅 Attend"]].map(([k,l])=>(
          <button key={k} className={`tab ${tab===k?"on":""}`} onClick={()=>st(k)}>{l}</button>
        ))}
      </div>
      <div style={{height:14}}/>

      {tab==="overview"&&<div style={{padding:"0 18px",display:"flex",flexDirection:"column",gap:10}}>
        {staff.map(s=>{
          const k=getKPI(s.id); const sum=attSum(s.id);
          return(
            <div key={s.id} className="staff-c">
              <div className="staff-av" style={{background:`color-mix(in srgb,${ROLE[s.role]?.color||"#7c3aed"} 14%,#f5f3ff)`,border:`1.5px solid color-mix(in srgb,${ROLE[s.role]?.color||"#7c3aed"} 25%,#ede9fe)`}}>
                {ROLE[s.role]?.icon||"👤"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:"var(--t0)"}}>{s.display}</div>
                <div style={{fontSize:10,color:"var(--t2)",margin:"2px 0 6px"}}>{ROLE[s.role]?.label}</div>
                <div style={{display:"flex",gap:6}}>
                  <span className="badge b-green">✅ {sum.p}</span>
                  <span className="badge b-red">❌ {sum.ab}</span>
                  <span className="badge b-gold">🟡 {sum.l}</span>
                </div>
              </div>
              <KRing pct={parseInt(k.score)||0} size={60}/>
            </div>
          );
        })}
      </div>}

      {tab==="kpi"&&<>
        <Card icon="🏆" title="KPI Score" sub={`ខែ ${MONTHS[mon]}`} accent="#f59e0b">
          {staff.length===0&&<div className="info-b">មិនទាន់មានទិន្នន័យ</div>}
          {staff.map(s=>{
            const k=getKPI(s.id);
            const metrics=[
              {lbl:"Deposit",val:parseFloat(k.deposit)||0,color:"#2563eb"},
              {lbl:"CIF",    val:parseFloat(k.cif)||0,    color:"#059669"},
              {lbl:"KHQR",   val:parseFloat(k.khqr)||0,   color:"#7c3aed"},
            ];
            return(
              <div key={s.id} style={{background:"var(--g2)",borderRadius:14,padding:"11px 13px",border:"1px solid var(--bd2)"}}>
                <div style={{fontSize:12,fontWeight:700,color:"var(--t0)",marginBottom:8}}>{s.display}</div>
                <div style={{display:"flex",gap:8,justifyContent:"space-around"}}>
                  {metrics.map(m=>(
                    <div key={m.lbl} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                      <div style={{position:"relative",width:62,height:62}}>
                        <svg width="62" height="62" viewBox="0 0 62 62">
                          <circle cx="31" cy="31" r="25" fill="none" stroke="#f3f4f6" strokeWidth="6"/>
                          <circle cx="31" cy="31" r="25" fill="none" stroke={m.color} strokeWidth="6"
                            strokeDasharray={2*Math.PI*25}
                            strokeDashoffset={2*Math.PI*25*(1-Math.min(m.val,100)/100)}
                            strokeLinecap="round" transform="rotate(-90 31 31)"
                            style={{transition:"stroke-dashoffset .6s"}}/>
                        </svg>
                        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:m.val>0?m.color:"#9ca3af"}}>
                          {m.val>0?m.val+"%":"—"}
                        </div>
                      </div>
                      <div style={{fontSize:9,fontWeight:700,color:"var(--t2)",textTransform:"uppercase",letterSpacing:".05em"}}>{m.lbl}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </Card>
        <div style={{height:12}}/>
        {staff.map(s=>(
          <KPIEditor key={s.id} staff={s} kpi={getKPI(s.id)} monthKey={mk} onSave={async(data)=>{
            await saveKPI({id:s.id+"_"+mk,uid:s.id,userName:s.display,
              deposit:data.deposit||0, cif:data.cif||0, khqr:data.khqr||0,
              score:String(Math.round(([parseFloat(data.deposit)||0,parseFloat(data.cif)||0,parseFloat(data.khqr)||0].filter(v=>v>0).reduce((a,b)=>a+b,0)/([parseFloat(data.deposit)||0,parseFloat(data.cif)||0,parseFloat(data.khqr)||0].filter(v=>v>0).length||1))),
              notes:data.notes||"", month:mk});
            await load(); stt("KPI បានរក្សាទុក!");
          }}/>
        ))}
      </>}

      {tab==="attendance"&&<>
        <div className="warn-b" style={{margin:"0 18px"}}>ចុច cell: 🟢 Present → 🔴 Absent → 🟡 Leave</div>
        <div style={{height:10}}/>
        {staff.slice(0,5).map(s=>{
          const sum=attSum(s.id);
          return(
            <div key={s.id} className="card">
              <div className="card-head">
                <div className="card-icon" style={{background:`color-mix(in srgb,${ROLE[s.role]?.color||"#7c3aed"} 14%,#f5f3ff)`}}>{ROLE[s.role]?.icon}</div>
                <div><div className="card-title">{s.display}</div><div className="card-sub">✅{sum.p} ❌{sum.ab} 🟡{sum.l}</div></div>
              </div>
              <div className="card-body">
                <div className="att-grid">
                  {Array.from({length:31},(_,i)=>{
                    const d=i+1; const a=getAtt(s.id,d); const st2=a?.s;
                    return <div key={d} className={`att-cell ${st2||"empty"}`} onClick={()=>toggleAtt(s.id,d)}>{d}</div>;
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </>}
      <div style={{height:8}}/>
    </div>
  );
}

// ─── REPORT FORMS ─────────────────────────────────────────────────────────────
function ReportPage({user}){
  const [toast,stt]=useState(""); const [tab,st]=useState("report");
  const r=user.role;

  const tt=(m)=>{const p=m.split("|"); return{msg:p.length>1?p[1]:p[0],type:p[0]==="err"?"err":"ok2"};};

  if(r==="supervisor_teller"){
    const e={w1:"",wc1:"",d1:"",dc1:"",w2:"",wc2:"",d2:"",dc2:""};
    const [f,sf]=useState(e); const s=(k,v)=>sf(p=>({...p,[k]:v}));
    return(<>{toast&&<Toast {...tt(toast)} onDone={()=>stt("")}/>}
      <div className="sb">
        <Card icon="🏦" title="Supervisor Teller Report" sub="ប្រចាំថ្ងៃ · 541-TRD" accent="#2563eb">
          <SBox label="អតិថិជននៅសាខា 541-TRD">
            <F label="Withdrawal Amount" ph="KHR / USD" val={f.w1} set={v=>s("w1",v)} nb/>
            <F label="ចំនួនអតិថិជន" ph="ចំនួន..." val={f.wc1} set={v=>s("wc1",v)} nb/>
            <div className="div"/>
            <F label="Deposits Amount" ph="KHR / USD" val={f.d1} set={v=>s("d1",v)} nb/>
            <F label="ចំនួនអតិថិជន" ph="ចំនួន..." val={f.dc1} set={v=>s("dc1",v)} nb/>
          </SBox>
          <SBox label="អតិថិជនក្រៅសាខា">
            <F label="Withdrawal Amount" ph="KHR / USD" val={f.w2} set={v=>s("w2",v)} nb/>
            <F label="ចំនួនអតិថិជន" ph="ចំនួន..." val={f.wc2} set={v=>s("wc2",v)} nb/>
            <div className="div"/>
            <F label="Deposits Amount" ph="KHR / USD" val={f.d2} set={v=>s("d2",v)} nb/>
            <F label="ចំនួនអតិថិជន" ph="ចំនួន..." val={f.dc2} set={v=>s("dc2",v)} nb/>
          </SBox>
          <button className="btn btn-green" onClick={async()=>{
            const msg="🏦 <b>Supervisor Teller Report</b>\n📍 541-TRD\n📅 "+new Date().toLocaleString()+"\n\n▸ Withdrawal: "+f.w1+" | "+f.wc1+" នាក់\n▸ Deposits: "+f.d1+" | "+f.dc1+" នាក់\n▸ W(out): "+f.w2+" | Dep(out): "+f.d2+"\n\n👤 "+user.display;
            await saveReport({type:"Teller",user:user.display,data:f,msg});
            await sendTelegram(msg); sf(e); stt("ok2|Report បានផ្ញើ! ✅");
          }}>📤 Submit Report</button>
        </Card>
        <div style={{height:8}}/>
      </div>
    </>);
  }

  if(r==="supervisor_csa"||r==="csa_officer"){
    const isOff=r==="csa_officer";
    const e={staffName:isOff?user.display:"",newCif:"",newKhqr:"",deposit:"",ia:""};
    const [f,sf]=useState(e); const s=(k,v)=>sf(p=>({...p,[k]:v}));
    const [rpts,sr]=useState([]);
    useEffect(()=>{ if(tab==="team") getReports().then(r=>sr(r.filter(x=>x.type==="CSA"||x.type==="CSA_Officer"))); },[tab]);
    return(<>{toast&&<Toast {...tt(toast)} onDone={()=>stt("")}/>}
      <div className="sb">
        {!isOff&&<><div className="tabs">{[["report","📝 Report"],["team","📋 ក្រុម"]].map(([k,l])=><button key={k} className={`tab ${tab===k?"on":""}`} onClick={()=>st(k)}>{l}</button>)}</div><div style={{height:14}}/></>}
        {tab==="report"&&<Card icon="🧾" title={`${isOff?"CSA Officer":"Supervisor CSA"} Report`} sub={isOff?user.display:"ប្រចាំថ្ងៃ"} accent="#059669">
          {isOff&&<div className="ok-b">👤 Staff Name: <b>{user.display}</b></div>}
          {!isOff&&<F label="Staff Name" ph="ឈ្មោះ Staff..." val={f.staffName} set={v=>s("staffName",v)} icon="👤"/>}
          <div className="r2"><F label="New CIF" ph="ចំនួន..." val={f.newCif} set={v=>s("newCif",v)} nb/><F label="New KHQR" ph="ចំនួន..." val={f.newKhqr} set={v=>s("newKhqr",v)} nb/></div>
          <div className="r2"><F label="Deposit" ph="ចំនួន..." val={f.deposit} set={v=>s("deposit",v)} nb/><F label="IA" ph="ចំនួន..." val={f.ia} set={v=>s("ia",v)} nb/></div>
          <button className="btn btn-green" onClick={async()=>{
            const msg="🧾 <b>"+(isOff?"CSA Officer":"Supervisor CSA")+" Report</b>\n📅 "+new Date().toLocaleString()+"\n• Staff: "+f.staffName+"\n• CIF: "+f.newCif+" | KHQR: "+f.newKhqr+"\n• Deposit: "+f.deposit+" | IA: "+f.ia+"\n\n👤 "+user.display;
            await saveReport({type:isOff?"CSA_Officer":"CSA",user:user.display,data:f,msg});
            await sendTelegram(msg); sf(e); stt("ok2|Report បានផ្ញើ!");
          }}>📤 Submit Report</button>
        </Card>}
        {tab==="team"&&<ReportList reports={rpts}/>}
        <div style={{height:8}}/>
      </div>
    </>);
  }

  if(r==="supervisor_loan"||r==="loan_officer"){
    const isOff=r==="loan_officer";
    const td=new Date().toISOString().split("T")[0];
    const e={df:td,dt:td,mK:"",mU:"",tK:"",tU:"",wK:"",wU:"",thK:"",thU:"",fK:"",fU:""};
    const [f,sf]=useState(e); const s=(k,v)=>sf(p=>({...p,[k]:v}));
    const [rpts,sr]=useState([]);
    const days=[{l:"ថ្ងៃចន្ទ",khr:"mK",usd:"mU"},{l:"ថ្ងៃអង្គារ",khr:"tK",usd:"tU"},{l:"ថ្ងៃពុធ",khr:"wK",usd:"wU"},{l:"ថ្ងៃព្រហស្បតិ៍",khr:"thK",usd:"thU"},{l:"ថ្ងៃសុក្រ",khr:"fK",usd:"fU"}];
    useEffect(()=>{ if(tab==="team") getReports().then(r=>sr(r.filter(x=>x.type==="Loan"||x.type==="Loan_Officer"))); },[tab]);
    return(<>{toast&&<Toast {...tt(toast)} onDone={()=>stt("")}/>}
      <div className="sb">
        <div className="tabs">{[["report","📝 Report"],...(!isOff?[["team","📋 ក្រុម"]]:  [])].map(([k,l])=><button key={k} className={`tab ${tab===k?"on":""}`} onClick={()=>st(k)}>{l}</button>)}</div>
        <div style={{height:14}}/>
        {tab==="report"&&<>
          {isOff&&<div className="ok-b" style={{margin:"0 18px"}}>👤 Loan Name: <b>{user.display}</b></div>}
          {!isOff&&<Card icon="💳" title="Supervisor Loan" sub="ប្រចាំសប្ដាហ៍" accent="#7c3aed"><div className="r2"><F label="ពីថ្ងៃ" val={f.df} set={v=>s("df",v)} nb type="date" ph=""/><F label="ដល់ថ្ងៃ" val={f.dt} set={v=>s("dt",v)} nb type="date" ph=""/></div></Card>}
          {isOff&&<Card icon="📄" title="Loan Officer" sub={user.display} accent="#9333ea"><div className="r2"><F label="ពីថ្ងៃ" val={f.df} set={v=>s("df",v)} nb type="date" ph=""/><F label="ដល់ថ្ងៃ" val={f.dt} set={v=>s("dt",v)} nb type="date" ph=""/></div></Card>}
          <div style={{height:10}}/>
          <Card icon="📅" title="ចំនួន Loan ប្រចាំថ្ងៃ" sub="KHR / USD" accent={isOff?"#9333ea":"#7c3aed"}>
            {days.map((d,i)=><div key={d.khr}>{i>0&&<div className="div"/>}<div style={{fontSize:12,fontWeight:700,color:"var(--p)",marginBottom:7}}>{d.l}</div><div className="r2"><F label="KHR" ph="0" val={f[d.khr]} set={v=>s(d.khr,v)} nb/><F label="USD" ph="0" val={f[d.usd]} set={v=>s(d.usd,v)} nb/></div></div>)}
          </Card>
          <div style={{padding:"12px 18px 0"}}>
            <button className="btn btn-green" onClick={async()=>{
              const rows=days.map(d=>"• "+d.l+": KHR "+(f[d.khr]||"—")+" | USD "+(f[d.usd]||"—")).join("\n");
              const msg="💳 <b>"+(isOff?"Loan Officer":"Supervisor Loan")+" Report</b>\n📅 "+f.df+" → "+f.dt+"\n👤 "+user.display+"\n\n"+rows;
              await saveReport({type:isOff?"Loan_Officer":"Loan",user:user.display,data:f,msg});
              await sendTelegram(msg); sf(e); stt("ok2|Report បានផ្ញើ!");
            }}>📤 Submit Report</button>
          </div>
        </>}
        {tab==="team"&&<ReportList reports={rpts}/>}
        <div style={{height:8}}/>
      </div>
    </>);
  }

  if(r==="ma_khqr"||r==="ms_khqr"){
    const isMS=r==="ms_khqr"; const td=new Date().toISOString().split("T")[0];
    const e={name:"",date:td,nK:"",nU:"",rK:"",rU:"",sK:"",sU:""};
    const [f,sf]=useState(e); const s=(k,v)=>sf(p=>({...p,[k]:v}));
    return(<>{toast&&<Toast {...tt(toast)} onDone={()=>stt("")}/>}
      <div className="sb">
        <Card icon={isMS?"🔖":"📱"} title={`${isMS?"MS":"MA"} KHQR Report`} sub="KHQR Onboard" accent={isMS?"#be185d":"#0891b2"}>
          <div className="r2"><F label={`${isMS?"MS":"MA"} Name`} ph="ឈ្មោះ..." val={f.name} set={v=>s("name",v)} nb/><F label="ថ្ងៃទី" val={f.date} set={v=>s("date",v)} nb type="date" ph=""/></div>
          <SBox label="New KHQR"><div className="r2"><F label="KHR" ph="0" val={f.nK} set={v=>s("nK",v)} nb/><F label="USD" ph="0" val={f.nU} set={v=>s("nU",v)} nb/></div></SBox>
          <SBox label="Reprint KHQR"><div className="r2"><F label="KHR" ph="0" val={f.rK} set={v=>s("rK",v)} nb/><F label="USD" ph="0" val={f.rU} set={v=>s("rU",v)} nb/></div></SBox>
          {!isMS&&<SBox label="Sound Box"><div className="r2"><F label="KHR" ph="0" val={f.sK} set={v=>s("sK",v)} nb/><F label="USD" ph="0" val={f.sU} set={v=>s("sU",v)} nb/></div></SBox>}
          <button className="btn btn-green" onClick={async()=>{
            const msg=(isMS?"🔖 MS":"📱 MA")+" <b>KHQR Report</b>\n👤 "+f.name+"\n📅 "+f.date+"\n\n▸ New: KHR "+f.nK+" | USD "+f.nU+"\n▸ Reprint: KHR "+f.rK+" | USD "+f.rU+(isMS?"":"\n▸ SoundBox: KHR "+f.sK+" | USD "+f.sU)+"\n\n👤 "+user.display;
            await saveReport({type:isMS?"MS_KHQR":"MA_KHQR",user:user.display,data:f,msg});
            await sendTelegram(msg); sf(e); stt("ok2|Report បានផ្ញើ!");
          }}>📤 Submit Report</button>
        </Card>
        <div style={{height:8}}/>
      </div>
    </>);
  }

  if(r==="dbmc"){
    const e={deposit:"",cif:"",khqr:"",vU:"",vUL:"",vK:"",vKL:""};
    const [f,sf]=useState(e); const s=(k,v)=>sf(p=>({...p,[k]:v}));
    return(<>{toast&&<Toast {...tt(toast)} onDone={()=>stt("")}/>}
      <div className="sb">
        <Card icon="📊" title="DBMC Report" sub="Branch Summary" accent="#ea580c">
          <F label="Branch Deposit" ph="ចំនួន M..." val={f.deposit} set={v=>s("deposit",v)} icon="💰"/>
          <div className="r2"><F label="Branch CIF" ph="ចំនួន..." val={f.cif} set={v=>s("cif",v)} nb/><F label="Branch KHQR" ph="ចំនួន..." val={f.khqr} set={v=>s("khqr",v)} nb/></div>
          <SBox label="B_Vault">
            <div className="r2"><F label="Vault USD" ph="0" val={f.vU} set={v=>s("vU",v)} nb/><F label="Over USD" ph="0" val={f.vUL} set={v=>s("vUL",v)} nb/></div>
            <div className="r2"><F label="Vault KHR" ph="0" val={f.vK} set={v=>s("vK",v)} nb/><F label="Over KHR" ph="0" val={f.vKL} set={v=>s("vKL",v)} nb/></div>
          </SBox>
          <button className="btn btn-green" onClick={async()=>{
            const msg="📊 <b>DBMC Report</b>\n📅 "+new Date().toLocaleString()+"\n\n• Deposit: "+f.deposit+"\n• CIF: "+f.cif+" | KHQR: "+f.khqr+"\n• Vault USD: "+f.vU+" | Over: "+f.vUL+"\n• Vault KHR: "+f.vK+" | Over: "+f.vKL+"\n\n👤 "+user.display;
            await saveReport({type:"DBMC",user:user.display,data:f,msg});
            await sendTelegram(msg); sf(e); stt("ok2|Report បានផ្ញើ!");
          }}>📤 Submit Report</button>
        </Card>
        <div style={{height:8}}/>
      </div>
    </>);
  }

  return <div className="sb"><div className="info-b" style={{margin:"18px"}}>Role មិនស្គាល់</div></div>;
}


// ─── REPORT SUMMARY (DBMC → Admin delete workflow) ───────────────────────────
function ReportSummaryPage({user}){
  const [rpts,sr]=useState([]); const [acts,sa]=useState([]);
  const [delReqs,sdr]=useState([]); const [loading,sl]=useState(true);
  const [toast,stt]=useState(""); const [tab,st]=useState("summary");
  const canDelete=user.role==="admin";
  const canRequest=user.role==="dbmc";

  const load=useCallback(async()=>{
    sl(true);
    const [r,a,d]=await Promise.all([getReports(),getActivities(),getDeleteRequests()]);
    sr(r); sa(a); sdr(d); sl(false);
  },[]);
  useEffect(()=>{ load(); },[]);

  const mon=new Date().getMonth(); const yr=new Date().getFullYear();
  const mk=yr+"-"+String(mon+1).padStart(2,"0");
  const monRpts=rpts.filter(r=>new Date(r.ts).getMonth()===mon&&new Date(r.ts).getFullYear()===yr);

  // Team summary
  const teamSummary=[
    { team:"Teller",    icon:"🏦", color:"#2563eb", types:["Teller"],
      metrics:[{lbl:"Transactions",val:monRpts.filter(r=>r.type==="Teller").length,unit:""}] },
    { team:"CSA",       icon:"🧾", color:"#059669", types:["CSA","CSA_Officer"],
      metrics:[
        {lbl:"New CIF",  val:monRpts.filter(r=>r.type==="CSA"||r.type==="CSA_Officer").reduce((s,r)=>s+(parseInt(r.data?.newCif)||0),0), unit:""},
        {lbl:"KHQR",     val:monRpts.filter(r=>r.type==="CSA"||r.type==="CSA_Officer").reduce((s,r)=>s+(parseInt(r.data?.newKhqr)||0),0), unit:""},
        {lbl:"Deposit",  val:parseFloat((monRpts.filter(r=>r.type==="CSA"||r.type==="CSA_Officer").reduce((s,r)=>s+(parseFloat(r.data?.deposit)||0),0)).toFixed(2)), unit:"USD"},
      ]},
    { team:"Loan",      icon:"💳", color:"#7c3aed", types:["Loan","Loan_Officer"],
      metrics:[
        {lbl:"Disbursement",val:monRpts.filter(r=>r.type==="Loan"||r.type==="Loan_Officer").reduce((s,r)=>s+(["mK","tK","wK","thK","fK"].reduce((ss,k)=>ss+(parseFloat(r.data?.[k])||0),0)),0)/1e6, unit:"USD"},
      ]},
    { team:"KHQR",      icon:"📱", color:"#0891b2", types:["MA_KHQR","MS_KHQR"],
      metrics:[
        {lbl:"New KHQR",val:monRpts.filter(r=>r.type==="MA_KHQR"||r.type==="MS_KHQR").reduce((s,r)=>s+(parseInt(r.data?.nK)||0),0),unit:""},
        {lbl:"Reprint",  val:monRpts.filter(r=>r.type==="MA_KHQR"||r.type==="MS_KHQR").reduce((s,r)=>s+(parseInt(r.data?.rK)||0),0),unit:""},
      ]},
  ];

  // Activity performance
  const actPerf=acts.map(a=>{
    const pctK=a.targetNew>0?Math.min(((a.actualNew||0)/a.targetNew)*100,100):0;
    const pctC=a.targetCIF>0?Math.min(((a.actualCIF||0)/a.targetCIF)*100,100):0;
    return{...a,pctK,pctC};
  });

  // Delete request
  const [reason,setReason]=useState("");
  const [months,setMonths]=useState("3");
  const sendDeleteReq=async()=>{
    if(!reason.trim()){stt("err|សូមបញ្ចូលមូលហេតុ!");return;}
    const cutoff=new Date();
    cutoff.setMonth(cutoff.getMonth()-parseInt(months));
    await saveDeleteRequest({
      requestedBy:user.display,
      role:user.role,
      reason,
      monthsAgo:parseInt(months),
      cutoffDate:cutoff.toISOString().split("T")[0],
      status:"pending",
      rptCount:rpts.filter(r=>r.ts<cutoff.toISOString()).length,
    });
    await sendTelegram("🗑️ <b>Delete Report Request</b>\n👤 "+user.display+"\n📋 Reason: "+reason+"\n📅 Delete before: "+cutoff.toISOString().split("T")[0]+"\n📊 Reports: "+rpts.filter(r=>r.ts<cutoff.toISOString()).length+" records");
    setReason(""); await load(); stt("ការស្នើ Delete បានផ្ញើ!");
  };

  const approveDelete=async(req)=>{
    if(!window.confirm("Approve Delete "+req.rptCount+" reports?"))return;
    const n=await deleteReportsBefore(req.cutoffDate+"T00:00:00");
    await updateDeleteRequest(req.fid,{status:"approved",approvedAt:new Date().toISOString(),deletedCount:n});
    stt("លុបបាន "+n+" reports!");
    await load();
  };
  const rejectDelete=async(req)=>{
    await updateDeleteRequest(req.fid,{status:"rejected"});
    stt("បានបដិសេធ!");
    await load();
  };

  // Generate PDF summary (print)
  const printSummary=()=>{
    const w=window.open("","_blank");
    const html=`<html><head><title>Branch Report Summary ${mk}</title>
    <style>body{font-family:sans-serif;padding:20px;color:#111}h1{font-size:18px;color:#7c3aed}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #e5e7eb;padding:8px;font-size:12px;text-align:left}th{background:#f3f4f6;font-weight:700}.badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700}</style></head>
    <body>
    <h1>📊 Branch Pro Report Summary — ខែ ${mk}</h1>
    <p style="font-size:11px;color:#6b7280">Generated: ${new Date().toLocaleString()} · @byhengkimhong</p>
    ${teamSummary.map(t=>`
      <h3 style="color:${t.color};margin-top:18px">${t.icon} Team ${t.team}</h3>
      <table><tr><th>Metric</th><th>Value</th></tr>
      ${t.metrics.map(m=>`<tr><td>${m.lbl}</td><td><b>${typeof m.val==="number"?m.val.toFixed(m.unit==="M"||m.unit==="M KHR"?2:0):m.val} ${m.unit}</b></td></tr>`).join("")}
      </table>
    `).join("")}
    <h3 style="margin-top:18px">📣 Activities Performance</h3>
    <table><tr><th>Activity</th><th>Date</th><th>KHQR %</th><th>CIF %</th></tr>
    ${actPerf.map(a=>`<tr><td>${a.title}</td><td>${a.date}</td><td>${a.pctK.toFixed(1)}%</td><td>${a.pctC.toFixed(1)}%</td></tr>`).join("")}
    </table>
    </body></html>`;
    w.document.write(html);
    w.document.close();
    w.print();
  };

  if(loading) return <div className="loading-full"><div className="spinner"/></div>;

  return(
    <div className="sb">
      {toast&&<Toast msg={toast.replace(/^err\|/,"")} type={toast.startsWith("err")?"err":"ok2"} onDone={()=>stt("")}/>}
      <div className="scroll-tabs" style={{padding:"0 18px"}}>
        {[["summary","📊 Summary"],["activities","📣 Activities"],...(canRequest?[["delete","🗑️ Delete Req"]]:canDelete?[["delete","🗑️ Approve"]]:  [])].map(([k,l])=>(
          <button key={k} className={`stab ${tab===k?"on":""}`} onClick={()=>st(k)}>{l}</button>
        ))}
      </div>

      {/* ── SUMMARY TAB ── */}
      {tab==="summary"&&<>
        <div style={{padding:"0 18px",display:"flex",flexDirection:"column",gap:12}}>
          {/* Header */}
          <div style={{background:"linear-gradient(135deg,#7c3aed,#5b21b6)",borderRadius:16,padding:"14px 16px",color:"#fff",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:10,opacity:.75,textTransform:"uppercase",letterSpacing:".06em"}}>Branch Report</div>
              <div style={{fontSize:16,fontWeight:800,marginTop:2}}>ខែ {MONTHS[mon]} {yr}</div>
              <div style={{fontSize:11,opacity:.8,marginTop:3}}>{monRpts.length} Reports · {acts.length} Activities</div>
            </div>
            <button onClick={printSummary} style={{background:"rgba(255,255,255,.18)",border:"1px solid rgba(255,255,255,.3)",borderRadius:10,padding:"8px 14px",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
              📄 Export PDF
            </button>
          </div>

          {/* Team summaries */}
          {teamSummary.map(t=>(
            <div key={t.team} style={{background:"#fff",border:"1px solid var(--bd)",borderRadius:16,overflow:"hidden",boxShadow:"var(--sh)"}}>
              <div style={{background:`linear-gradient(135deg,${t.color},color-mix(in srgb,${t.color} 80%,#000))`,padding:"11px 15px",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:20}}>{t.icon}</span>
                <div style={{fontSize:13,fontWeight:800,color:"#fff"}}>Team {t.team}</div>
                <span style={{marginLeft:"auto",fontSize:10,background:"rgba(255,255,255,.2)",color:"#fff",padding:"2px 9px",borderRadius:20,fontWeight:600}}>
                  {monRpts.filter(r=>t.types.includes(r.type)).length} reports
                </span>
              </div>
              <div style={{padding:"12px 15px",display:"flex",flexWrap:"wrap",gap:8}}>
                {t.metrics.map(m=>(
                  <div key={m.lbl} style={{background:"var(--g2)",border:"1px solid var(--bd2)",borderRadius:12,padding:"10px 14px",flex:"1 1 120px"}}>
                    <div style={{fontSize:20,fontWeight:900,color:t.color,letterSpacing:"-.02em"}}>{typeof m.val==="number"?m.val.toFixed(m.unit==="M"||m.unit==="M KHR"?2:0):m.val}{m.unit&&<span style={{fontSize:11,fontWeight:600,marginLeft:2}}>{m.unit}</span>}</div>
                    <div style={{fontSize:10,color:"var(--t2)",marginTop:2,fontWeight:600}}>{m.lbl}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </>}

      {/* ── ACTIVITIES PERFORMANCE TAB ── */}
      {tab==="activities"&&<div style={{padding:"0 18px",display:"flex",flexDirection:"column",gap:10}}>
        {actPerf.length===0&&<div className="info-b">មិនទាន់មាន Activity</div>}
        {actPerf.map(a=>(
          <div key={a.fid||a.id} style={{background:"#fff",border:"1px solid var(--bd)",borderRadius:14,overflow:"hidden",boxShadow:"var(--sh)"}}>
            <div style={{background:a.type==="booth"?"linear-gradient(135deg,#7c3aed,#6d28d9)":"linear-gradient(135deg,#ea580c,#c2410c)",padding:"11px 14px"}}>
              <div style={{fontSize:13,fontWeight:800,color:"#fff"}}>{a.title}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,.75)",marginTop:2}}>📅 {a.date} · {a.type==="booth"?"🏪 Booth":"🚗 Roadshow"}</div>
            </div>
            <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:7}}>
              {a.targetNew>0&&<div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                  <span style={{color:"var(--t2)",fontWeight:600}}>📱 KHQR New</span>
                  <span style={{fontWeight:700,color:a.pctK>=100?"#059669":a.pctK>=50?"#7c3aed":"#dc2626"}}>{a.pctK.toFixed(1)}% ({a.actualNew||0}/{a.targetNew})</span>
                </div>
                <div style={{height:7,background:"#f3f4f6",borderRadius:20,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${a.pctK}%`,background:a.pctK>=100?"#059669":"#7c3aed",borderRadius:20,transition:"width .5s"}}/>
                </div>
              </div>}
              {a.targetCIF>0&&<div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                  <span style={{color:"var(--t2)",fontWeight:600}}>🪪 New CIF</span>
                  <span style={{fontWeight:700,color:a.pctC>=100?"#059669":a.pctC>=50?"#059669":"#dc2626"}}>{a.pctC.toFixed(1)}% ({a.actualCIF||0}/{a.targetCIF})</span>
                </div>
                <div style={{height:7,background:"#f3f4f6",borderRadius:20,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${a.pctC}%`,background:"#059669",borderRadius:20,transition:"width .5s"}}/>
                </div>
              </div>}
              {/* Approved members */}
              {(a.requests||[]).filter(r=>r.status==="approved").length>0&&(
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:2}}>
                  {(a.requests||[]).filter(r=>r.status==="approved").map(r=>(
                    <span key={r.user} style={{fontSize:10,fontWeight:600,padding:"2px 9px",background:"#f0fdf4",border:"1px solid #86efac",color:"#059669",borderRadius:20}}>✅ {r.user}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>}

      {/* ── DELETE REQUEST TAB ── */}
      {tab==="delete"&&<div style={{padding:"0 18px",display:"flex",flexDirection:"column",gap:12}}>
        {canRequest&&<>
          <div style={{background:"#fef2f2",border:"1.5px solid #fecaca",borderRadius:12,padding:"11px 14px",fontSize:11,color:"#991b1b"}}>
            ⚠️ Report Delete Request ត្រូវផ្ញើទៅ Admin ពិនិត្យ — Admin ជាអ្នក Approve ហើយ Delete
          </div>
          <Card icon="🗑️" title="ស្នើ Delete Reports" sub="DBMC → Admin Approval" accent="#dc2626">
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              <label style={{fontSize:11,fontWeight:600,color:"var(--t2)"}}>Delete Reports ចាស់ជាង (ខែ)</label>
              <select className="nb" value={months} onChange={e=>setMonths(e.target.value)}>
                <option value="3">3 ខែ</option>
                <option value="6">6 ខែ</option>
                <option value="12">12 ខែ (1 ឆ្នាំ)</option>
              </select>
            </div>
            <div style={{background:"#fff8f0",border:"1px solid #fed7aa",borderRadius:10,padding:"9px 12px",fontSize:11,color:"#9a3412"}}>
              📊 Reports ក្នុង {months} ខែចុងក្រោយ: <b>{rpts.filter(r=>{const d=new Date(r.ts);const c=new Date();c.setMonth(c.getMonth()-parseInt(months));return d<c;}).length}</b> records នឹងត្រូវ Delete
            </div>
            <div className="field"><label>មូលហេតុ / Reason</label><textarea className="nb" rows={3} placeholder="ហេតុអ្វីបានជា Delete..." value={reason} onChange={e=>setReason(e.target.value)}/></div>
            <button className="btn btn-red" onClick={sendDeleteReq}>📤 ផ្ញើការស្នើ Delete ទៅ Admin</button>
          </Card>
          <div className="sec-title">📋 ការស្នើ Delete ពីមុន</div>
          {delReqs.filter(r=>r.requestedBy===user.display).map(r=>(
            <div key={r.fid} style={{background:"#fff",border:`1.5px solid ${r.status==="pending"?"#fde68a":r.status==="approved"?"#86efac":"#fecaca"}`,borderRadius:12,padding:"11px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                <div style={{fontSize:12,fontWeight:700,color:"var(--t0)"}}>Delete &lt; {r.cutoffDate}</div>
                <span style={{fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:20,background:r.status==="pending"?"#fffbeb":r.status==="approved"?"#f0fdf4":"#fef2f2",color:r.status==="pending"?"#d97706":r.status==="approved"?"#059669":"#dc2626",border:`1px solid ${r.status==="pending"?"#fde68a":r.status==="approved"?"#86efac":"#fecaca"}`}}>
                  {r.status==="pending"?"⏳ Pending":r.status==="approved"?"✅ Approved":"❌ Rejected"}
                </span>
              </div>
              <div style={{fontSize:11,color:"var(--t2)"}}>📋 {r.rptCount} records · {r.reason}</div>
            </div>
          ))}
        </>}

        {canDelete&&<>
          <div className="sec-title">🔔 Delete Requests ពី DBMC</div>
          {delReqs.filter(r=>r.status==="pending").length===0&&<div className="info-b">មិនទាន់មានការស្នើ Delete</div>}
          {delReqs.filter(r=>r.status==="pending").map(r=>(
            <div key={r.fid} style={{background:"#fff",border:"1.5px solid #fde68a",borderRadius:14,overflow:"hidden",boxShadow:"var(--sh)"}}>
              <div style={{background:"linear-gradient(135deg,#d97706,#b45309)",padding:"11px 14px"}}>
                <div style={{fontSize:13,fontWeight:800,color:"#fff"}}>🗑️ Delete Request</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,.8)",marginTop:2}}>📤 {r.requestedBy} · {r.ts?.slice(0,10)}</div>
              </div>
              <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div style={{background:"#fef2f2",borderRadius:10,padding:"8px 11px",border:"1px solid #fecaca"}}>
                    <div style={{fontSize:18,fontWeight:900,color:"#dc2626"}}>{r.rptCount}</div>
                    <div style={{fontSize:9,color:"#991b1b",fontWeight:600}}>Reports នឹង Delete</div>
                  </div>
                  <div style={{background:"#fff8f0",borderRadius:10,padding:"8px 11px",border:"1px solid #fed7aa"}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#9a3412"}}>Before</div>
                    <div style={{fontSize:11,color:"#9a3412"}}>{r.cutoffDate}</div>
                  </div>
                </div>
                <div style={{fontSize:11,color:"var(--t2)",background:"var(--g2)",borderRadius:9,padding:"8px 11px"}}>💬 {r.reason}</div>
                <div style={{display:"flex",gap:8}}>
                  <button className="btn btn-red" style={{flex:1,padding:"10px"}} onClick={()=>approveDelete(r)}>✅ Approve & Delete</button>
                  <button className="btn btn-out" style={{flex:1,padding:"10px"}} onClick={()=>rejectDelete(r)}>❌ Reject</button>
                </div>
              </div>
            </div>
          ))}

          {delReqs.filter(r=>r.status!=="pending").length>0&&<>
            <div className="sec-title">📋 History</div>
            {delReqs.filter(r=>r.status!=="pending").map(r=>(
              <div key={r.fid} style={{background:"#fff",border:`1px solid ${r.status==="approved"?"#86efac":"#fecaca"}`,borderRadius:12,padding:"11px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"var(--t0)"}}>Delete &lt; {r.cutoffDate}</div>
                  <span style={{fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:20,background:r.status==="approved"?"#f0fdf4":"#fef2f2",color:r.status==="approved"?"#059669":"#dc2626"}}>
                    {r.status==="approved"?"✅ Done ("+r.deletedCount+" deleted)":"❌ Rejected"}
                  </span>
                </div>
                <div style={{fontSize:11,color:"var(--t2)",marginTop:4}}>By: {r.requestedBy} · {r.reason}</div>
              </div>
            ))}
          </>}
        </>}
      </div>}
      <div style={{height:8}}/>
    </div>
  );
}

// ─── ADMIN PAGE ───────────────────────────────────────────────────────────────
function ResetPW({users,onDone}){
  const [sel,ss]=useState(""); const [p,sp]=useState(""); const [p2,sp2]=useState(""); const [err,se]=useState("");
  const go=async()=>{
    if(!sel){se("ជ្រើស User!");return;} if(p.length<8){se("8+ chars!");return;} if(p!==p2){se("មិនដូចគ្នា!");return;}
    se(""); const h=await hashPassword(p); await updateUserPassword(sel,h); sp(""); sp2(""); ss(""); onDone();
  };
  return(
    <Card icon="🔑" title="Reset Password" sub="SHA-256 · Firebase" accent="#d97706">
      <div className="warn-b">🔐 Hash SHA-256 ភ្លាមៗ — គ្មាន plaintext ទេ</div>
      <div className="field"><label>ជ្រើស User</label>
        <select className="nb" value={sel} onChange={e=>ss(e.target.value)}>
          <option value="">-- ជ្រើស --</option>
          {users.map(x=><option key={x.id} value={x.id}>{x.display} (@{x.username})</option>)}
        </select>
      </div>
      <F label="Password ថ្មី" ph="8+ chars" val={p} set={sp} icon="🔒" type="password"/>
      <F label="បញ្ជាក់" ph="Type again..." val={p2} set={sp2} icon="🔒" type="password"/>
      {err&&<div className="err-b">{err}</div>}
      <button className="btn btn-green" onClick={go}>🔑 ប្ដូរ Password</button>
    </Card>
  );
}

function AdminPage({onBgChange}){
  const [tab,st]=useState("users");
  const [users,su]=useState([]); const [rpts,sr]=useState([]);
  const [loading,sl]=useState(true); const [toast,stt]=useState("");
  const [nu,snu]=useState({username:"",password:"",role:"supervisor_teller",display:""});

  const load=useCallback(async()=>{ sl(true); const [u,r]=await Promise.all([getUsers(),getReports()]); su(u); sr(r); sl(false); },[]);
  useEffect(()=>{ load(); },[tab]);

  const addU=async()=>{
    if(!nu.username||!nu.password||!nu.display){stt("err|សូមបំពេញ!");return;}
    const hash=await hashPassword(nu.password);
    await saveUser({id:"user_"+Date.now(),username:nu.username,passwordHash:hash,role:nu.role,display:nu.display});
    snu({username:"",password:"",role:"supervisor_teller",display:""});
    stt("ok2|User បានបង្កើត ✅"); load();
  };
  const delU=async(id)=>{
    if(!window.confirm("លុប User?"))return;
    await deleteUser(id); stt("ok2|User បានលុប!"); load();
  };

  const tt=(m)=>{const p=m.split("|"); return{msg:p.length>1?p[1]:p[0],type:p[0]==="err"?"err":"ok2"};};

  return(
    <div className="sb">
      {toast&&<Toast {...tt(toast)} onDone={()=>stt("")}/>}
      <div className="stabs">
        {[["users","👥 Users"],["reports","📋 Reports"],["new","➕ Add User"],["pw","🔑 PW"],["theme","🎨 Theme"]].map(([k,l])=>(
          <button key={k} className={`stab ${tab===k?"on":""}`} onClick={()=>st(k)}>{l}</button>
        ))}
      </div>
      <div style={{height:14}}/>

      {tab==="users"&&(
        <div className="card">
          <div className="card-head">
            <div className="card-icon">👥</div>
            <div><div className="card-title">Users ទាំងអស់</div><div className="card-sub">{users.length} accounts · Firebase</div></div>
          </div>
          {loading?<div style={{padding:24,textAlign:"center"}}><div className="spinner"/></div>:
          users.map(u=>(
            <div key={u.id} className="u-row">
              <div className="u-av" style={{background:`color-mix(in srgb,${ROLE[u.role]?.color||"#7c3aed"} 14%,#f5f3ff)`,borderColor:`color-mix(in srgb,${ROLE[u.role]?.color||"#7c3aed"} 25%,#ede9fe)`}}>{ROLE[u.role]?.icon||"👤"}</div>
              <div style={{flex:1,minWidth:0}}><div className="u-name">{u.display}</div><div className="u-role">@{u.username} · {ROLE[u.role]?.label||u.role}</div></div>
              {u.role!=="admin"&&<button className="btn-del" onClick={()=>delU(u.id)}>លុប</button>}
            </div>
          ))}
        </div>
      )}

      {tab==="reports"&&<ReportList reports={rpts}/>}

      {tab==="new"&&(
        <Card icon="➕" title="បង្កើត User ថ្មី" accent="#059669">
          <F label="ឈ្មោះបង្ហាញ" ph="Display Name..." val={nu.display} set={v=>snu(p=>({...p,display:v}))} icon="✏️"/>
          <div className="r2">
            <F label="Username" ph="username" val={nu.username} set={v=>snu(p=>({...p,username:v}))} nb/>
            <F label="Password" ph="8+ chars" val={nu.password} set={v=>snu(p=>({...p,password:v}))} nb type="password"/>
          </div>
          <Sel label="Role" val={nu.role} set={v=>snu(p=>({...p,role:v}))} opts={Object.entries(ROLE).filter(([k])=>k!=="admin").map(([k,v])=>[k,v.icon+" "+v.label])}/>
          <button className="btn btn-green" onClick={addU}>✅ បង្កើត User</button>
        </Card>
      )}

      {tab==="pw"&&<ResetPW users={users} onDone={()=>{load();stt("ok2|Password ✅");}}/>}

      {tab==="theme"&&(
        <Card icon="🎨" title="ប្ដូរ Background" sub="Admin Only" accent="#7c3aed">
          <div className="warn-b">⚠️ Branch Pro ប្រើ Light Theme — Background ជា White Clean Style ស្អាត។ ការប្ដូរ theme នៅ production version ក្នុង Firebase settings។</div>
        </Card>
      )}
      <div style={{height:8}}/>
    </div>
  );
}

// ─── TEAM REPORTS ─────────────────────────────────────────────────────────────
function TeamReports({user}){
  const [rpts,sr]=useState([]); const [kpis,sk]=useState([]); const [att,sat]=useState([]);
  const [loading,sl]=useState(true); const [tab,st]=useState("reports");
  const today=new Date(); const mon=today.getMonth(); const yr=today.getFullYear();
  const monthKey=yr+"-"+String(mon+1).padStart(2,"0");

  const typeMap={
    supervisor_teller:["Teller"],
    supervisor_csa:["CSA","CSA_Officer"],
    supervisor_loan:["Loan","Loan_Officer"],
  };
  const teamLabel={supervisor_teller:"Teller",supervisor_csa:"CSA",supervisor_loan:"Loan"};
  const types=typeMap[user.role]||[];
  // Teller Sup and CSA Sup can also see Loan weekly plans
  const canSeeLoan=["supervisor_teller","supervisor_csa"].includes(user.role);

  useEffect(()=>{
    const ps=[getReports(),getKPIs(),getAttendance()];
    Promise.all(ps).then(([r,k,a])=>{
      sr(r.filter(x=>types.includes(x.type)));
      sk(k.filter(x=>x.month===monthKey));
      sat(a.filter(x=>x.month===monthKey));
      sl(false);
    });
  },[]);

  if(loading) return <div className="loading-full"><div className="spinner"/></div>;

  const monRpts=rpts.filter(r=>new Date(r.ts).getMonth()===mon);
  const todayRpts=rpts.filter(r=>new Date(r.ts).toDateString()===today.toDateString());
  const teamStaff=[...new Set(rpts.map(r=>r.user))];

  const attSum=(name)=>{
    const m=att.filter(a=>a.userName===name||a.uid===name);
    return{p:m.filter(a=>a.s==="present").length,ab:m.filter(a=>a.s==="absent").length,l:m.filter(a=>a.s==="leave").length};
  };
  const getKPI=(name)=>kpis.find(k=>k.userName===name)||{score:0};

  return(
    <div className="sb">
      {/* Banner */}
      <div className="welcome" style={{background:`linear-gradient(135deg,${ROLE[user.role]?.color||"#7c3aed"},color-mix(in srgb,${ROLE[user.role]?.color||"#7c3aed"} 70%,#000))`}}>
        <div className="welcome-greet">ក្រុម {teamLabel[user.role]||""} · ខែ{MONTHS[mon]}</div>
        <div className="welcome-name">{user.display}</div>
        <div className="welcome-sub">{monRpts.length} Reports ខែនេះ</div>
        <div className="welcome-emoji">{ROLE[user.role]?.icon||"👥"}</div>
      </div>

      {/* Quick stats */}
      <div className="sg2" style={{marginTop:14}}>
        <div className="scard">
          <div className="scard-icon">📋</div>
          <div className="scard-val" style={{color:"var(--p)"}}>{monRpts.length}</div>
          <div className="scard-lbl">Reports ខែនេះ</div>
        </div>
        <div className="scard">
          <div className="scard-icon">📅</div>
          <div className="scard-val" style={{color:"#059669"}}>{todayRpts.length}</div>
          <div className="scard-lbl">Reports ថ្ងៃនេះ</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          ["reports","📋 Reports"],
          ["members","👥 Members"],
          ...(canSeeLoan?[["loan","💳 Loan Plan"]]:user.role==="supervisor_loan"?[["loan","💳 Loan Plan"]]:[]),
        ].map(([k,l])=>(
          <button key={k} className={`tab ${tab===k?"on":""}`} onClick={()=>st(k)}>{l}</button>
        ))}
      </div>

      {tab==="reports"&&(
        <div style={{padding:"12px 18px 0",display:"flex",flexDirection:"column",gap:8}}>
          {rpts.length===0&&<div className="info-b">មិនទាន់មាន Report</div>}
          {rpts.map(r=>(
            <div key={r.id||r.fid} className="ri">
              <div className="ri-row">
                <span className="ri-tag">{r.type}</span>
                <span className="ri-time">{new Date(r.ts).toLocaleString()}</span>
              </div>
              <div className="ri-user">👤 {r.user}</div>
              <div className="ri-body">{r.msg}</div>
            </div>
          ))}
        </div>
      )}

      {tab==="members"&&(
        <div style={{padding:"12px 18px 0",display:"flex",flexDirection:"column",gap:10}}>
          {teamStaff.length===0&&<div className="info-b">មិនទាន់មានទិន្នន័យ Member</div>}
          {teamStaff.map(name=>{
            const k=getKPI(name); const sum=attSum(name);
            const sc=parseInt(k.score)||0;
            const col=sc>=90?"#059669":sc>=70?"#7c3aed":sc>=50?"#d97706":"#dc2626";
            return(
              <div key={name} style={{background:"#fff",border:"1px solid var(--bd)",borderRadius:14,padding:"13px 14px",boxShadow:"var(--sh)",display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:44,height:44,borderRadius:13,background:"var(--pm)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                  {ROLE[user.role]?.icon||"👤"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:"var(--t0)",marginBottom:4}}>{name}</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",background:"#f0fdf4",border:"1px solid #86efac",color:"#16a34a",borderRadius:20}}>✅ {sum.p}</span>
                    <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",background:"#fef2f2",border:"1px solid #fecaca",color:"#dc2626",borderRadius:20}}>❌ {sum.ab}</span>
                    <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",background:"#fffbeb",border:"1px solid #fcd34d",color:"#d97706",borderRadius:20}}>🟡 {sum.l}</span>
                  </div>
                </div>
                {/* KPI Ring mini */}
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,flexShrink:0}}>
                  <div style={{position:"relative",width:52,height:52}}>
                    <svg width="52" height="52" viewBox="0 0 52 52">
                      <circle cx="26" cy="26" r="21" fill="none" stroke="#f3f4f6" strokeWidth="5"/>
                      <circle cx="26" cy="26" r="21" fill="none" stroke={col} strokeWidth="5"
                        strokeDasharray={2*Math.PI*21}
                        strokeDashoffset={2*Math.PI*21*(1-sc/100)}
                        strokeLinecap="round" transform="rotate(-90 26 26)"
                        style={{transition:"stroke-dashoffset .6s"}}/>
                    </svg>
                    <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:col}}>{sc}%</div>
                  </div>
                  <div style={{fontSize:9,color:"var(--t2)",fontWeight:600}}>KPI</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {tab==="loan"&&<LoanWeeklyView user={user} isReadOnly={canSeeLoan}/>}
      <div style={{height:8}}/>
    </div>
  );
}

// ─── LOAN WEEKLY VIEW ─────────────────────────────────────────────────────────
function LoanWeeklyView({user,isReadOnly=false}){
  const [rpts,sr]=useState([]); const [loading,sl]=useState(true);
  const DAYS_KH=["ថ្ងៃចន្ទ","ថ្ងៃអង្គារ","ថ្ងៃពុធ","ថ្ងៃព្រហស្បតិ៍","ថ្ងៃសុក្រ"];

  useEffect(()=>{
    getReports().then(r=>{
      sr(r.filter(x=>x.type==="Loan"||x.type==="Loan_Officer"));
      sl(false);
    });
  },[]);

  if(loading) return <div style={{padding:24,textAlign:"center"}}><div className="spinner" style={{margin:"0 auto"}}/></div>;

  // Group by user+week
  const grouped={};
  rpts.forEach(r=>{
    const key=r.user+"_"+(r.data?.df||r.ts?.slice(0,10));
    if(!grouped[key]) grouped[key]={user:r.user,type:r.type,df:r.data?.df||"",dt:r.data?.dt||"",days:{},ts:r.ts};
    const d=r.data||{};
    DAYS_KH.forEach((lbl,i)=>{
      const kK=["mK","tK","wK","thK","fK"][i];
      const kU=["mU","tU","wU","thU","fU"][i];
      if(d[kK]||d[kU]) grouped[key].days[lbl]={khr:d[kK]||"—",usd:d[kU]||"—"};
    });
  });

  const plans=Object.values(grouped).sort((a,b)=>new Date(b.ts)-new Date(a.ts));

  return(
    <div style={{padding:"12px 18px 0",display:"flex",flexDirection:"column",gap:12}}>
      {isReadOnly&&(
        <div style={{background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:12,padding:"10px 13px",fontSize:11,color:"#92400e",display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:16}}>👁️</span>
          <span>អ្នកកំពុងមើល Loan Disbursement Plan — <b>View Only</b></span>
        </div>
      )}
      {plans.length===0&&<div className="info-b">មិនទាន់មាន Loan Report</div>}
      {plans.map((p,i)=>(
        <div key={i} style={{background:"#fff",border:"1px solid var(--bd)",borderRadius:16,overflow:"hidden",boxShadow:"var(--sh)"}}>
          {/* Header */}
          <div style={{background:"linear-gradient(135deg,#7c3aed,#5b21b6)",padding:"13px 15px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.75)",marginBottom:2}}>💳 Loan Disbursement</div>
              <div style={{fontSize:14,fontWeight:800,color:"#fff",letterSpacing:"-.01em"}}>👤 {p.user}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,.7)",background:"rgba(255,255,255,.15)",padding:"3px 10px",borderRadius:20,fontWeight:600}}>
                {p.df||""}{p.dt&&p.df&&" → "}{p.dt||""}
              </div>
              <div style={{fontSize:9,color:"rgba(255,255,255,.55)",marginTop:3}}>{new Date(p.ts).toLocaleDateString()}</div>
            </div>
          </div>
          {/* Daily breakdown */}
          <div style={{padding:"12px 15px",display:"flex",flexDirection:"column",gap:6}}>
            {Object.entries(p.days).length===0&&(
              <div style={{fontSize:11,color:"var(--t3)",textAlign:"center",padding:"8px 0"}}>គ្មានទិន្នន័យ</div>
            )}
            {Object.entries(p.days).map(([day,val])=>(
              <div key={day} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 10px",background:"var(--g2)",borderRadius:10}}>
                <div style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>{day}</div>
                <div style={{display:"flex",gap:10}}>
                  <span style={{fontSize:11,background:"#ede9fe",color:"#7c3aed",padding:"2px 10px",borderRadius:20,fontWeight:700}}>
                    KHR {val.khr}
                  </span>
                  <span style={{fontSize:11,background:"#f0fdf4",color:"#059669",padding:"2px 10px",borderRadius:20,fontWeight:700}}>
                    USD {val.usd}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}


// ─── MATERIALS PAGE ───────────────────────────────────────────────────────────
function MaterialsPage({user}){
  const [tab,st]=useState(()=>{
    if(user.role==="dbmc"||user.role==="admin") return "stock";
    if(user.role==="supervisor_csa") return "stock";
    return "request";
  });
  const [stock,ss]=useState({});
  const [reqs,sr]=useState([]);
  const [loading,sl]=useState(true);
  const [toast,stt]=useState("");
  const today=new Date().toISOString().split("T")[0];

  const canManageStock=["dbmc","admin"].includes(user.role);
  const canRequest=["supervisor_csa","csa_officer"].includes(user.role);
  const canViewStock=["dbmc","admin","bm","supervisor_csa"].includes(user.role);

  const load=useCallback(async()=>{
    sl(true);
    const [s,r]=await Promise.all([getStock(),getMaterialRequests()]);
    ss(s); sr(r); sl(false);
  },[]);
  useEffect(()=>{ load(); },[]);

  // Today's requests
  const todayReqs=reqs.filter(r=>r.date===today);
  const morningReq=todayReqs.find(r=>r.session==="morning"&&r.user===user.display);
  const eveningReq=todayReqs.find(r=>r.session==="evening"&&r.user===user.display);

  // Calc today's usage = morning requested - evening returned
  const calcUsage=()=>{
    const usage={};
    MATERIAL_ITEMS.forEach(m=>{
      const morning=todayReqs.filter(r=>r.session==="morning");
      const evening=todayReqs.filter(r=>r.session==="evening");
      const outQty=morning.reduce((s,r)=>s+(parseInt(r.items?.[m.id])||0),0);
      const retQty=evening.reduce((s,r)=>s+(parseInt(r.items?.[m.id])||0),0);
      usage[m.id]={out:outQty,ret:retQty,used:outQty-retQty};
    });
    return usage;
  };
  const usage=calcUsage();

  // Stock edit
  const [stockEdit,setSE]=useState({});
  const saveStockFn=async()=>{
    const merged={...stock};
    Object.entries(stockEdit).forEach(([k,v])=>{ merged[k]=(parseInt(merged[k])||0)+(parseInt(v)||0); });
    await saveStock(merged); ss(merged); setSE({});
    stt("Stock បានរក្សាទុក!");
  };
  const setStockDirect=async(id,val)=>{
    const merged={...stock,[id]:parseInt(val)||0};
    await saveStock(merged); ss(merged);
  };

  // Request form
  const [reqItems,sri]=useState({});
  const [session,sse]=useState("morning");
  const submitReq=async()=>{
    const hasItems=Object.values(reqItems).some(v=>parseInt(v)>0);
    if(!hasItems){stt("err|សូមបញ្ចូលចំនួន Items!"); return;}

    // For morning: deduct from stock; for evening: add back to stock
    const newStock={...stock};
    if(session==="morning"){
      // Check stock
      for(const [id,qty] of Object.entries(reqItems)){
        const q=parseInt(qty)||0;
        if(q>0 && (parseInt(newStock[id])||0)<q){
          stt(`err|${MATERIAL_ITEMS.find(m=>m.id===id)?.label} ស្តុកមិនគ្រប់!`); return;
        }
        if(q>0) newStock[id]=(parseInt(newStock[id])||0)-q;
      }
    } else {
      // Evening return — add back
      for(const [id,qty] of Object.entries(reqItems)){
        const q=parseInt(qty)||0;
        if(q>0) newStock[id]=(parseInt(newStock[id])||0)+q;
      }
    }

    const req={
      user:user.display,
      role:user.role,
      date:today,
      session,
      items:reqItems,
      ts:new Date().toISOString(),
      note:session==="morning"?"ស្នើសុំ Materials":"ប្រគល់ Materials ដែលនៅសល់",
    };
    await saveStock(newStock);
    await saveMaterialRequest(req);
    await load();
    sri({}); stt(session==="morning"?"ស្នើសុំបានផ្ញើ!":"ប្រគល់ Materials ដោយជោគជ័យ!");
  };

  if(loading) return <div className="loading-full"><div className="spinner"/></div>;

  return(
    <div className="sb">
      {toast&&<Toast msg={toast.replace(/^err\|/,"")} type={toast.startsWith("err")?"err":"ok2"} onDone={()=>stt("")}/>}

      {/* Tabs */}
      <div className="scroll-tabs" style={{padding:"0 18px"}}>
        {[
          ...(canViewStock?[["stock","📦 Stock"]]:[]),
          ...(canRequest?[["request","📋 ស្នើសុំ"],["evening","🌙 ប្រគល់"]]:[]),
          ["history","📊 History"],
          ...(canManageStock?[["manage","⚙️ Manage"]]:[]),
        ].map(([k,l])=>(
          <button key={k} className={`stab ${tab===k?"on":""}`} onClick={()=>st(k)}>{l}</button>
        ))}
      </div>

      {/* ── STOCK TAB ── */}
      {tab==="stock"&&(
        <div style={{padding:"0 18px",display:"flex",flexDirection:"column",gap:10}}>
          {/* Today summary */}
          <div style={{background:"linear-gradient(135deg,#7c3aed,#6d28d9)",borderRadius:16,padding:"14px 16px",color:"#fff",position:"relative",overflow:"hidden"}}>
            <div style={{fontSize:10,opacity:.75,textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>📦 Stock ថ្ងៃនេះ · {today}</div>
            <div style={{fontSize:17,fontWeight:800,letterSpacing:"-.01em",marginBottom:6}}>Materials Booth 541-TRD</div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              <div style={{background:"rgba(255,255,255,.15)",borderRadius:10,padding:"6px 12px",textAlign:"center"}}>
                <div style={{fontSize:18,fontWeight:800}}>{todayReqs.filter(r=>r.session==="morning").length}</div>
                <div style={{fontSize:9,opacity:.8}}>ស្នើសុំ</div>
              </div>
              <div style={{background:"rgba(255,255,255,.15)",borderRadius:10,padding:"6px 12px",textAlign:"center"}}>
                <div style={{fontSize:18,fontWeight:800}}>{todayReqs.filter(r=>r.session==="evening").length}</div>
                <div style={{fontSize:9,opacity:.8}}>ប្រគល់</div>
              </div>
            </div>
            <div style={{position:"absolute",right:16,top:"50%",transform:"translateY(-50%)",fontSize:48,opacity:.15}}>📦</div>
          </div>

          {/* Stock grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {MATERIAL_ITEMS.map(m=>{
              const qty=parseInt(stock[m.id])||0;
              const used=usage[m.id]?.used||0;
              const pct=qty+used>0?(used/(qty+used)*100):0;
              const col=qty===0?"#dc2626":qty<=5?"#d97706":"#059669";
              return(
                <div key={m.id} style={{background:"#fff",border:`1.5px solid ${qty===0?"#fecaca":qty<=5?"#fde68a":"#e5e7eb"}`,borderRadius:14,padding:"12px 13px",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div style={{fontSize:22}}>{m.icon}</div>
                    <div style={{fontSize:16,fontWeight:900,color:col}}>{qty}</div>
                  </div>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--t0)",marginBottom:2}}>{m.label}</div>
                  <div style={{fontSize:9,color:"var(--t2)",marginBottom:6}}>{m.unit} · ប្រើ: {used}</div>
                  {/* Usage bar */}
                  <div style={{height:4,background:"#f3f4f6",borderRadius:20,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${Math.min(pct,100)}%`,background:qty===0?"#dc2626":qty<=5?"#f59e0b":"#7c3aed",borderRadius:20,transition:"width .5s"}}/>
                  </div>
                  {qty===0&&<div style={{fontSize:9,color:"#dc2626",fontWeight:700,marginTop:3}}>⚠️ អស់ស្តុក!</div>}
                  {qty>0&&qty<=5&&<div style={{fontSize:9,color:"#d97706",fontWeight:700,marginTop:3}}>⚠️ ជិតអស់!</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── REQUEST TAB (Morning) ── */}
      {(tab==="request"||tab==="evening")&&canRequest&&(
        <div style={{padding:"0 18px",display:"flex",flexDirection:"column",gap:12}}>
          {/* Session indicator */}
          <div style={{background:tab==="request"?"#eff6ff":"#fef9c3",border:`1.5px solid ${tab==="request"?"#bfdbfe":"#fde68a"}`,borderRadius:12,padding:"11px 14px",display:"flex",gap:10,alignItems:"center"}}>
            <div style={{fontSize:24}}>{tab==="request"?"🌅":"🌙"}</div>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:tab==="request"?"#1d4ed8":"#92400e"}}>
                {tab==="request"?"ព្រឹក — ស្នើសុំ Materials":"ល្ងាច — ប្រគល់ Materials ដែលនៅសល់"}
              </div>
              <div style={{fontSize:10,color:"var(--t2)",marginTop:2}}>
                {tab==="request"
                  ? morningReq?"✅ បានស្នើហើយ":"អ្នកអាចស្នើ Materials ១ ដង/ថ្ងៃ"
                  : eveningReq?"✅ បានប្រគល់ហើយ":"ប្រគល់ materials ដែលមិនទាន់ប្រើ"}
              </div>
            </div>
          </div>

          {(tab==="request"&&morningReq)||(tab==="evening"&&eveningReq) ? (
            <div style={{background:"#f0fdf4",border:"1.5px solid #86efac",borderRadius:12,padding:"12px 14px"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#065f46",marginBottom:8}}>
                ✅ {tab==="request"?"ការស្នើ":"ការប្រគល់"} ថ្ងៃនេះ
              </div>
              {Object.entries((tab==="request"?morningReq:eveningReq)?.items||{}).filter(([,v])=>parseInt(v)>0).map(([id,qty])=>{
                const m=MATERIAL_ITEMS.find(x=>x.id===id);
                return m?(
                  <div key={id} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#065f46",marginBottom:3}}>
                    <span>{m.icon} {m.label}</span><b>{qty} {m.unit}</b>
                  </div>
                ):null;
              })}
            </div>
          ) : (
            <>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {MATERIAL_ITEMS.map(m=>{
                  const stockQty=parseInt(stock[m.id])||0;
                  return(
                    <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,background:"#fff",border:"1px solid var(--bd)",borderRadius:12,padding:"10px 13px",boxShadow:"0 1px 3px rgba(0,0,0,.05)"}}>
                      <div style={{fontSize:20,flexShrink:0}}>{m.icon}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:700,color:"var(--t0)"}}>{m.label}</div>
                        <div style={{fontSize:10,color:"var(--t2)"}}>ស្តុក: {tab==="request"?stockQty:usage[m.id]?.out||0} {m.unit}</div>
                      </div>
                      <input
                        type="number" min="0"
                        max={tab==="request"?stockQty:(usage[m.id]?.out||999)}
                        placeholder="0"
                        value={reqItems[m.id]||""}
                        onChange={e=>sri(p=>({...p,[m.id]:e.target.value}))}
                        style={{width:64,padding:"7px 8px",border:`1.5px solid ${parseInt(reqItems[m.id])>0?"#7c3aed":"var(--bd)"}`,borderRadius:10,fontSize:13,fontWeight:700,textAlign:"center",outline:"none",color:"var(--t0)",background:parseInt(reqItems[m.id])>0?"#f5f3ff":"#fff"}}
                      />
                    </div>
                  );
                })}
              </div>
              <button className="btn btn-p" style={{margin:"4px 0 8px"}}
                onClick={()=>{ const s=tab==="request"?"morning":"evening"; sse(s); submitReq(); }}>
                {tab==="request"?"📋 ស្នើសុំ Materials":"🌙 ប្រគល់ Materials"}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab==="history"&&(
        <div style={{padding:"0 18px",display:"flex",flexDirection:"column",gap:10}}>
          {/* Today summary by item */}
          <div style={{background:"#fff",border:"1px solid var(--bd)",borderRadius:16,overflow:"hidden",boxShadow:"var(--sh)"}}>
            <div style={{background:"linear-gradient(135deg,#059669,#047857)",padding:"12px 15px"}}>
              <div style={{fontSize:11,color:"rgba(255,255,255,.8)",marginBottom:2}}>📊 សង្ខេបថ្ងៃនេះ · {today}</div>
              <div style={{fontSize:14,fontWeight:800,color:"#fff"}}>Stock Usage Summary</div>
            </div>
            <div style={{padding:"12px 15px",display:"flex",flexDirection:"column",gap:6}}>
              {MATERIAL_ITEMS.filter(m=>usage[m.id]?.out>0||usage[m.id]?.ret>0).map(m=>(
                <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:"var(--g2)",borderRadius:10}}>
                  <span style={{fontSize:16,flexShrink:0}}>{m.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:700,color:"var(--t0)"}}>{m.label}</div>
                    <div style={{height:4,background:"#e5e7eb",borderRadius:20,overflow:"hidden",marginTop:3}}>
                      <div style={{height:"100%",width:`${usage[m.id]?.out>0?(usage[m.id].used/usage[m.id].out*100):0}%`,background:"#7c3aed",borderRadius:20}}/>
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#dc2626"}}>-{usage[m.id]?.used||0}</div>
                    <div style={{fontSize:9,color:"var(--t2)"}}>នៅ: {parseInt(stock[m.id])||0}</div>
                  </div>
                </div>
              ))}
              {MATERIAL_ITEMS.every(m=>!usage[m.id]?.out)&&<div style={{fontSize:12,color:"var(--t2)",textAlign:"center",padding:"8px 0"}}>មិនទាន់មានការស្នើសុំថ្ងៃនេះ</div>}
            </div>
          </div>

          {/* Request history */}
          {reqs.slice(0,20).map((r,i)=>(
            <div key={r.fid||i} style={{background:"#fff",border:`1px solid ${r.session==="morning"?"#bfdbfe":"#fde68a"}`,borderRadius:12,padding:"11px 14px",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <span style={{fontSize:14}}>{r.session==="morning"?"🌅":"🌙"}</span>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:"var(--t0)"}}>{r.user}</div>
                    <div style={{fontSize:10,color:"var(--t2)"}}>{r.date} · {r.session==="morning"?"ស្នើ":"ប្រគល់"}</div>
                  </div>
                </div>
                <span style={{fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:20,background:r.session==="morning"?"#eff6ff":"#fffbeb",color:r.session==="morning"?"#2563eb":"#d97706",border:`1px solid ${r.session==="morning"?"#bfdbfe":"#fde68a"}`}}>
                  {r.session==="morning"?"🌅 ព្រឹក":"🌙 ល្ងាច"}
                </span>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {Object.entries(r.items||{}).filter(([,v])=>parseInt(v)>0).map(([id,qty])=>{
                  const m=MATERIAL_ITEMS.find(x=>x.id===id);
                  return m?(
                    <span key={id} style={{fontSize:10,fontWeight:600,padding:"2px 9px",background:"#f5f3ff",border:"1px solid #c4b5fd",color:"#6d28d9",borderRadius:20}}>
                      {m.icon} {m.label}: {qty}
                    </span>
                  ):null;
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MANAGE TAB (DBMC/Admin) ── */}
      {tab==="manage"&&canManageStock&&(
        <div style={{padding:"0 18px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:"#fffbeb",border:"1.5px solid #fde68a",borderRadius:12,padding:"10px 13px",fontSize:11,color:"#92400e"}}>
            ⚙️ DBMC Set Stock — បញ្ចូលចំនួន Stock ថ្មី ឬ Add ទៅ Stock បច្ចុប្បន្ន
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {MATERIAL_ITEMS.map(m=>(
              <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,background:"#fff",border:"1px solid var(--bd)",borderRadius:12,padding:"10px 13px"}}>
                <div style={{fontSize:20,flexShrink:0}}>{m.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:"var(--t0)"}}>{m.label}</div>
                  <div style={{fontSize:10,color:"var(--t2)"}}>Stock: <b style={{color:"var(--p)"}}>{parseInt(stock[m.id])||0}</b> {m.unit}</div>
                </div>
                <div style={{display:"flex",gap:5,alignItems:"center"}}>
                  <button style={{width:28,height:28,borderRadius:8,border:"1.5px solid var(--bd)",background:"#fff",fontSize:14,cursor:"pointer",fontWeight:700,color:"#dc2626",display:"flex",alignItems:"center",justifyContent:"center"}}
                    onClick={()=>setStockDirect(m.id,Math.max(0,(parseInt(stock[m.id])||0)-1))}>−</button>
                  <input type="number" min="0" value={parseInt(stock[m.id])||0}
                    onChange={e=>setStockDirect(m.id,e.target.value)}
                    style={{width:58,padding:"6px 4px",border:"1.5px solid #c4b5fd",borderRadius:10,fontSize:13,fontWeight:700,textAlign:"center",outline:"none",color:"#7c3aed",background:"#f5f3ff"}}/>
                  <button style={{width:28,height:28,borderRadius:8,border:"1.5px solid var(--bd)",background:"#fff",fontSize:14,cursor:"pointer",fontWeight:700,color:"#059669",display:"flex",alignItems:"center",justifyContent:"center"}}
                    onClick={()=>setStockDirect(m.id,(parseInt(stock[m.id])||0)+1)}>+</button>
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-green" onClick={async()=>{await saveStock(stock);stt("Stock បានរក្សាទុក!");}}>💾 Save All Stock</button>
        </div>
      )}
      <div style={{height:8}}/>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App(){
  const [user,su]=useState(null);
  const [targets,setTargets]=useState(DEFAULT_TARGETS);
  const [status,ss]=useState("loading");
  const [page,sp]=useState("home");

  useEffect(()=>{
    Promise.all([getUsers(),getTargets()]).then(([users,tgtData])=>{
      if(tgtData) setTargets(tgtData);
      const hasAdmin=users.some(u=>u.role==="admin");
      if(!hasAdmin){ ss("setup"); return; }
      const saved=loadSession();
      if(saved){ su(saved); sp(ROLE[saved.role]?.nav[0]||"report"); ss("ready"); }
      else { ss("ready"); }
    }).catch(()=>ss("setup"));
  },[]);

  const handleLogin=(u)=>{ saveSession(u); su(u); sp(ROLE[u.role]?.nav[0]||"report"); };
  const handleLogout=()=>{ clearSession(); su(null); };
  const pages=user?ROLE[user.role]?.nav||["report"]:[];

  const renderPage=()=>{
    switch(page){
      case "home":       return <HomePage user={user} targets={targets}/>;
      case "analytics":  return <AnalyticsPage targets={targets} user={user} onUpdateTargets={setTargets}/>;
      case "staff":      return <StaffPage/>;
      case "activities": return <ActivitiesPage user={user}/>;
      case "admin":      return <AdminPage onBgChange={v=>{sbg(v);}} onTargetsChange={setTargets}/>;
      case "team":       return <TeamReports user={user}/>;
      case "report":     return <ReportPage user={user}/>;
      case "materials":  return <MaterialsPage user={user}/>;
      case "summary":   return <ReportSummaryPage user={user}/>;
      default: return <div style={{padding:18}}><div className="info-b">Page មិនស្គាល់</div></div>;
    }
  };

  return(
    <>
      <style>{CSS}</style>
      <div className="app">
        {status==="loading"&&(
          <div className="loading-full">
            <div style={{width:72,height:72,borderRadius:22,background:"linear-gradient(135deg,#7c3aed,#5b21b6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,boxShadow:"0 8px 24px rgba(124,58,237,.3)"}}>🏦</div>
            <div className="spinner"/>
            <div style={{fontSize:11,color:"var(--t2)",fontWeight:600,letterSpacing:".05em"}}>Branch Pro · 541-TRD</div>
          </div>
        )}
        {status==="setup"&&<SetupWizard onDone={()=>ss("ready")}/>}
        {status==="ready"&&!user&&<Login onLogin={handleLogin}/>}
        {status==="ready"&&user&&(
          <>
            <Header user={user} onLogout={handleLogout}/>
            {renderPage()}
            <BNav pages={pages} active={page} set={sp}/>
          </>
        )}
      </div>
    </>
  );
}
