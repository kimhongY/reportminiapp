import { useState, useEffect, useCallback } from "react";
import {
  getUsers, saveUser, deleteUser, updateUserPassword,
  getReports, saveReport,
  getActivities, saveActivity, updateActivity,
  getBg, saveBg,
  onUsersChange, onReportsChange, onActivitiesChange
} from "./db";

const TELEGRAM_BOT_TOKEN = "YOUR_BOT_TOKEN";
const TELEGRAM_ADMIN_CHAT_ID = "YOUR_ADMIN_CHAT_ID";

const hashPassword = async (pw) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
};
const verifyPassword = async (pw, hash) => (await hashPassword(pw)) === hash;

const BG_PRESETS = [
  { id:"cosmos", label:"Cosmos", a:"#06080f", b:"#0c1428", c:"#030408", accent:"#3b82f6" },
  { id:"ocean",  label:"Ocean",  a:"#030d1c", b:"#07233e", c:"#010810", accent:"#0ea5e9" },
  { id:"forest", label:"Forest", a:"#030d07", b:"#061e0f", c:"#010803", accent:"#22c55e" },
  { id:"royal",  label:"Royal",  a:"#0a0416", b:"#160830", c:"#050209", accent:"#a855f7" },
  { id:"ember",  label:"Ember",  a:"#120300", b:"#230800", c:"#080100", accent:"#f97316" },
  { id:"rose",   label:"Rose",   a:"#130108", b:"#260316", c:"#0a0105", accent:"#ec4899" },
  { id:"slate",  label:"Slate",  a:"#070a12", b:"#101620", c:"#040609", accent:"#94a3b8" },
  { id:"pitch",  label:"Pitch",  a:"#000000", b:"#050505", c:"#000000", accent:"#ffffff" },
];

const roleConfig = {
  admin:             { icon:"👑", color:"#fbbf24", label:"Admin" },
  supervisor_teller: { icon:"🏦", color:"#60a5fa", label:"Supervisor Teller" },
  supervisor_csa:    { icon:"🧾", color:"#34d399", label:"Supervisor CSA" },
  supervisor_loan:   { icon:"💳", color:"#a78bfa", label:"Supervisor Loan" },
  loan_officer:      { icon:"📄", color:"#c084fc", label:"Loan Officer" },
  csa_officer:       { icon:"🪪", color:"#6ee7b7", label:"CSA Officer" },
  ma_khqr:           { icon:"📱", color:"#22d3ee", label:"MA KHQR" },
  ms_khqr:           { icon:"🔖", color:"#f472b6", label:"MS KHQR" },
  dbmc:              { icon:"📊", color:"#fb923c", label:"DBMC" },
  bm:                { icon:"🏢", color:"#86efac", label:"BM" },
};

const sendTelegram = async (msg) => {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ chat_id: TELEGRAM_ADMIN_CHAT_ID, text: msg, parse_mode:"HTML" }),
    });
  } catch(e) { console.log("TG:",e) }
};

// ─── CSS ──────────────────────────────────────────────────────────────────────
const mkCss = ({a,b,c,accent="#3b82f6"}) => `
@import url('https://fonts.googleapis.com/css2?family=Moul&family=Noto+Sans+Khmer:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;overflow:hidden}
:root{
  --acc:${accent};--acc2:color-mix(in srgb,${accent} 70%,white);
  --bg0:${a};--bg1:${b};--bg2:${c};
  --glass:rgba(255,255,255,.055);--glass2:rgba(255,255,255,.09);
  --border:rgba(255,255,255,.09);--border2:rgba(255,255,255,.15);
  --t0:#f0f6ff;--t1:rgba(200,220,255,.7);--t2:rgba(160,195,255,.42);--t3:rgba(130,175,255,.22);
}
body{font-family:'Plus Jakarta Sans','Noto Sans Khmer',sans-serif;font-size:13px;line-height:1.55;color:var(--t0);background:var(--bg0)}
.app{max-width:430px;margin:0 auto;height:100vh;min-height:0;display:flex;flex-direction:column;position:relative;overflow:hidden;
  background:radial-gradient(ellipse 160% 90% at 20% -10%,color-mix(in srgb,var(--acc) 12%,transparent) 0%,transparent 55%),
  radial-gradient(ellipse 100% 60% at 85% 100%,color-mix(in srgb,var(--acc) 7%,transparent) 0%,transparent 50%),
  linear-gradient(170deg,var(--bg1) 0%,var(--bg0) 50%,var(--bg2) 100%);}
.app>*{position:relative;z-index:1}
.sb{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px 16px 40px;display:flex;flex-direction:column;gap:13px}
.sb::-webkit-scrollbar{width:3px}.sb::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px}
.lw{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 20px;gap:28px;overflow-y:auto}
.logo-ring{width:96px;height:96px;border-radius:28px;background:linear-gradient(145deg,var(--glass2),rgba(255,255,255,.025));border:1.5px solid var(--border2);box-shadow:0 20px 60px rgba(0,0,0,.55),inset 0 1.5px 0 rgba(255,255,255,.2),0 0 40px color-mix(in srgb,var(--acc) 18%,transparent);display:flex;align-items:center;justify-content:center;font-size:48px;margin:0 auto}
.logo-shell{display:flex;flex-direction:column;align-items:center;gap:14px;animation:popIn .7s cubic-bezier(.34,1.56,.64,1) both}
@keyframes popIn{from{opacity:0;transform:scale(.55) translateY(32px)}to{opacity:1;transform:scale(1) translateY(0)}}
.brand-text{text-align:center}.brand-text h1{font-family:'Moul',serif;font-size:21px;color:#fff;letter-spacing:.04em}
.brand-text .sub{font-size:10px;color:var(--t2);margin-top:5px;letter-spacing:.18em;text-transform:uppercase}
.btag{display:inline-flex;align-items:center;gap:5px;margin-top:10px;background:color-mix(in srgb,var(--acc) 12%,transparent);border:1px solid color-mix(in srgb,var(--acc) 28%,transparent);border-radius:30px;padding:4px 14px;font-size:11px;color:var(--acc2);font-weight:600;letter-spacing:.05em}
.lc{width:100%;max-width:360px;background:rgba(255,255,255,.06);border:1px solid var(--border2);backdrop-filter:blur(40px);border-radius:26px;box-shadow:0 24px 80px rgba(0,0,0,.45),inset 0 1.5px 0 rgba(255,255,255,.18);padding:26px 22px;display:flex;flex-direction:column;gap:16px;animation:slideUp .5s .18s cubic-bezier(.22,1,.36,1) both}
@keyframes slideUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
.lc-title{font-size:15px;font-weight:700;color:var(--t0);display:flex;align-items:center;gap:8px}
.lc-title::before{content:'';width:3px;height:18px;border-radius:2px;background:var(--acc);flex-shrink:0}
.field{display:flex;flex-direction:column;gap:5px}
.field label{font-size:10px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.1em}
.iw{position:relative}.ii{position:absolute;left:13px;top:50%;transform:translateY(-50%);font-size:15px;pointer-events:none;opacity:.35}
.field input,.field select,.field textarea{width:100%;padding:11px 13px 11px 40px;background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:13px;color:var(--t0);font-size:13px;font-family:inherit;outline:none;transition:border-color .2s,background .2s,box-shadow .2s;-webkit-appearance:none}
.field input.nb,.field select.nb,.field textarea.nb{padding-left:13px}
.field input:focus,.field select:focus,.field textarea:focus{border-color:color-mix(in srgb,var(--acc) 55%,transparent);background:rgba(255,255,255,.08);box-shadow:0 0 0 3.5px color-mix(in srgb,var(--acc) 14%,transparent)}
.field input::placeholder,.field textarea::placeholder{color:var(--t3)}.field select option{background:#111827;color:#fff}
.field textarea{resize:none;padding:11px 13px;line-height:1.6}.r2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.btn{border:none;border-radius:13px;padding:12.5px 18px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;transition:all .18s;display:flex;align-items:center;justify-content:center;gap:8px;width:100%}
.btn:active{transform:scale(.96)}
.btn-pri{background:var(--acc);color:#fff;box-shadow:0 4px 22px color-mix(in srgb,var(--acc) 42%,transparent)}
.btn-pri:hover{filter:brightness(1.12);transform:translateY(-1px)}
.btn-green{background:linear-gradient(135deg,#059669,#047857);color:#fff;box-shadow:0 4px 18px rgba(5,150,105,.3)}
.btn-green:hover{filter:brightness(1.1);transform:translateY(-1px)}
.btn-tg{background:linear-gradient(135deg,#0ea5e9,#0369a1);color:#fff;box-shadow:0 4px 18px rgba(14,165,233,.28)}
.btn-tg:hover{filter:brightness(1.1);transform:translateY(-1px)}
.btn-orange{background:linear-gradient(135deg,#f97316,#c2410c);color:#fff}
.btn-orange:hover{filter:brightness(1.1);transform:translateY(-1px)}
.btn-purple{background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff}
.btn-purple:hover{filter:brightness(1.1);transform:translateY(-1px)}
.btn-ghost{background:var(--glass);border:1px solid var(--border);color:var(--t1);padding:8px 14px;font-size:11px;border-radius:10px;width:auto}
.btn-ghost:hover{background:var(--glass2);border-color:var(--border2);color:var(--t0)}
.btn-del{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);color:#fca5a5;padding:7px 12px;font-size:11px;border-radius:9px;width:auto;flex-shrink:0}
.btn-sm{padding:7px 12px;font-size:11px;border-radius:9px;width:auto}
.hdr{padding:11px 16px;background:rgba(0,0,0,.32);border-bottom:1px solid var(--border);backdrop-filter:blur(40px);display:flex;align-items:center;gap:11px;flex-shrink:0}
.hav{width:40px;height:40px;border-radius:13px;flex-shrink:0;border:1.5px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:19px}
.htxt{flex:1;min-width:0}.hn{font-size:13px;font-weight:700;color:var(--t0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hrl{font-size:10px;color:var(--t2);margin-top:1px}
.hbadge{flex-shrink:0;font-size:10px;font-weight:700;padding:4px 10px;border-radius:20px;letter-spacing:.05em;background:color-mix(in srgb,var(--acc) 14%,transparent);color:var(--acc2);border:1px solid color-mix(in srgb,var(--acc) 28%,transparent)}
.gc{background:var(--glass);border:1px solid var(--border);border-radius:20px;backdrop-filter:blur(20px);box-shadow:0 6px 32px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.1)}
.gch{padding:13px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px}
.gci{width:38px;height:38px;border-radius:11px;flex-shrink:0;background:color-mix(in srgb,var(--acc) 14%,transparent);border:1px solid color-mix(in srgb,var(--acc) 25%,transparent);display:flex;align-items:center;justify-content:center;font-size:18px}
.gct{font-size:13px;font-weight:700;color:var(--t0);line-height:1.3}.gcs{font-size:10px;color:var(--t2);margin-top:2px}
.gcb{padding:15px 16px;display:flex;flex-direction:column;gap:13px}
.slbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--t2);display:flex;align-items:center;gap:7px;padding:2px 0 6px}
.slbl::before{content:'';width:3px;height:12px;border-radius:2px;background:var(--acc);flex-shrink:0;opacity:.7}
.sbox{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:13px;display:flex;flex-direction:column;gap:11px}
.tabs{display:flex;gap:3px;padding:4px;background:rgba(0,0,0,.3);border:1px solid var(--border);border-radius:15px;backdrop-filter:blur(16px)}
.tab{flex:1;padding:9px 5px;border:none;border-radius:11px;font-family:inherit;font-size:11px;font-weight:600;cursor:pointer;transition:all .2s;background:transparent;color:var(--t2);white-space:nowrap}
.tab.on{background:rgba(255,255,255,.1);color:var(--t0);box-shadow:0 2px 10px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.14)}
.sg{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.sc{background:var(--glass);border:1px solid var(--border);border-radius:18px;padding:16px 17px;backdrop-filter:blur(12px);display:flex;flex-direction:column;gap:4px}
.sn{font-size:28px;font-weight:800;line-height:1;letter-spacing:-.03em}.sl{font-size:9px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.08em;margin-top:3px}
.ri{background:rgba(255,255,255,.038);border:1px solid var(--border);border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:5px;transition:background .15s}
.ri:hover{background:rgba(255,255,255,.065)}.rirow{display:flex;align-items:center;justify-content:space-between;gap:8px}
.rtag{font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;background:color-mix(in srgb,var(--acc) 15%,transparent);color:var(--acc2);letter-spacing:.04em;flex-shrink:0}
.rtm{font-size:10px;color:var(--t3)}.rus{font-size:11px;color:var(--t2)}.rbd{font-size:11px;color:var(--t2);line-height:1.8;white-space:pre-wrap;margin-top:3px}
.ui{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.05);transition:background .15s}
.ui:last-child{border-bottom:none}.ui:hover{background:rgba(255,255,255,.028)}
.uav{width:40px;height:40px;border-radius:13px;flex-shrink:0;background:var(--glass);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:19px}
.uinf{flex:1;min-width:0}.un{font-size:13px;font-weight:600;color:var(--t0)}.uro{font-size:10px;color:var(--t2);margin-top:1px}
.ibox{background:color-mix(in srgb,var(--acc) 8%,transparent);border:1px solid color-mix(in srgb,var(--acc) 20%,transparent);border-radius:11px;padding:11px 14px;font-size:12px;color:var(--acc2)}
.ebox{background:rgba(239,68,68,.09);border:1px solid rgba(239,68,68,.22);border-radius:11px;padding:11px 14px;font-size:12px;color:#fca5a5}
.note{font-size:10px;color:var(--t3);text-align:center;line-height:1.6}.div{height:1px;background:var(--border);margin:2px 0}
.bgg{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.bsw{height:58px;border-radius:14px;cursor:pointer;border:2px solid transparent;transition:all .22s;display:flex;align-items:flex-end;justify-content:center;padding-bottom:6px;position:relative;overflow:hidden}
.bsw::after{content:'';position:absolute;inset:0;background:rgba(0,0,0,.32);border-radius:12px}
.bsw-lbl{position:relative;z-index:1;font-size:9px;font-weight:700;color:rgba(255,255,255,.7);letter-spacing:.04em;text-shadow:0 1px 6px rgba(0,0,0,.95)}
.bsw.sel{border-color:rgba(255,255,255,.8);box-shadow:0 0 0 1px rgba(255,255,255,.2),0 4px 20px rgba(0,0,0,.5)}
.bsw.sel::before{content:'✓';position:absolute;top:5px;right:7px;font-size:12px;color:#fff;font-weight:800;z-index:2}
.cprow{display:grid;grid-template-columns:1fr 1fr;gap:10px}.cpw{display:flex;flex-direction:column;gap:5px}
.cpw label{font-size:10px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.09em}
.cinp{width:100%;height:48px;border-radius:12px;border:1px solid var(--border2);background:var(--glass);cursor:pointer;padding:4px;outline:none}
.cprev{height:48px;border-radius:12px;border:1px solid var(--border)}
.act-card{background:rgba(255,255,255,.038);border:1px solid var(--border);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:8px}
.act-type{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;letter-spacing:.04em}
.act-type.booth{background:rgba(251,146,60,.15);color:#fb923c}.act-type.roadshow{background:rgba(139,92,246,.15);color:#a78bfa}
.act-title{font-size:14px;font-weight:700;color:var(--t0)}.act-meta{font-size:11px;color:var(--t2);display:flex;flex-direction:column;gap:3px}
.act-members{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.act-member.approved{font-size:10px;font-weight:600;padding:3px 9px;border-radius:20px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.25);color:#34d399}
.req-row{display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:10px}
.req-info{flex:1;min-width:0}.req-name{font-size:12px;font-weight:600;color:var(--t0)}.req-sub{font-size:10px;color:var(--t2)}
.btn-approve{background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.3);color:#34d399;padding:5px 12px;font-size:11px;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit;width:auto}
.btn-reject{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.22);color:#fca5a5;padding:5px 12px;font-size:11px;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit;width:auto}
.status-badge{font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px}
.status-pending{background:rgba(245,158,11,.12);color:#fbbf24;border:1px solid rgba(245,158,11,.25)}
.status-approved{background:rgba(16,185,129,.12);color:#34d399;border:1px solid rgba(16,185,129,.25)}
.status-rejected{background:rgba(239,68,68,.1);color:#fca5a5;border:1px solid rgba(239,68,68,.2)}
.planbox{background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:14px;padding:13px}
.planbox textarea{background:transparent;border:none;color:var(--t0);font-family:inherit;font-size:13px;resize:none;outline:none;width:100%;line-height:1.65}
.toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#059669,#047857);color:#fff;padding:11px 24px;border-radius:50px;font-size:12px;font-weight:700;z-index:999;box-shadow:0 8px 32px rgba(5,150,105,.45);white-space:nowrap;animation:toastPop .3s cubic-bezier(.34,1.56,.64,1) both}
@keyframes toastPop{from{opacity:0;transform:translateX(-50%) translateY(20px) scale(.88)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
.loading-screen{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px}
.spinner{width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--acc);border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function Toast({msg,onDone}){
  useEffect(()=>{const t=setTimeout(onDone,2600);return()=>clearTimeout(t)},[onDone]);
  return <div className="toast">✅ {msg}</div>;
}
function F({label,ph,val,set,type="text",icon="",nb=false}){
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
function GC({icon,title,sub,children,accent}){
  return(
    <div className="gc">
      <div className="gch">
        <div className="gci" style={accent?{background:`color-mix(in srgb,${accent} 14%,transparent)`,borderColor:`color-mix(in srgb,${accent} 25%,transparent)`}:{}}>{icon}</div>
        <div><div className="gct">{title}</div>{sub&&<div className="gcs">{sub}</div>}</div>
      </div>
      <div className="gcb">{children}</div>
    </div>
  );
}
function SBox({label,children}){
  return <div className="sbox"><div className="slbl">{label}</div>{children}</div>;
}

// ─── REPORT LIST ──────────────────────────────────────────────────────────────
function ReportList({reports}){
  const [filter,sf]=useState("all");
  const types=[...new Set(reports.map(r=>r.type))];
  const filtered=filter==="all"?reports:reports.filter(r=>r.type===filter);
  return(
    <>
      <div className="tabs" style={{flexWrap:"wrap"}}>
        <button className={`tab ${filter==="all"?"on":""}`} onClick={()=>sf("all")}>ទំាងអស់</button>
        {types.map(t=><button key={t} className={`tab ${filter===t?"on":""}`} onClick={()=>sf(t)}>{t}</button>)}
      </div>
      <div className="gc">
        <div className="gcb">
          {filtered.length===0&&<div className="ibox">មិនទាន់មាន Report</div>}
          {filtered.map(r=>(
            <div key={r.firestoreId||r.id} className="ri">
              <div className="rirow"><span className="rtag">{r.type}</span><span className="rtm">{new Date(r.ts).toLocaleString()}</span></div>
              <div className="rus">👤 {r.user}</div>
              <div className="rbd">{r.msg}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({onLogin}){
  const [u,su]=useState(""); const [p,sp]=useState(""); const [err,se]=useState(""); const [loading,sl]=useState(false);
  const go=async()=>{
    sl(true); se("");
    const users=await getUsers();
    const matched=users.find(x=>x.username===u);
    if(matched){
      const ok=await verifyPassword(p,matched.passwordHash);
      if(ok){sl(false);onLogin(matched);return;}
    }
    sl(false); se("ឈ្មោះអ្នកប្រើ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ");
  };
  return(
    <div className="lw">
      <div className="logo-shell">
        <div className="logo-ring">🏦</div>
        <div className="brand-text"><h1>Branch Report</h1><div className="sub">Telegram Mini App</div><div className="btag">📍 541-TRD</div></div>
      </div>
      <div className="lc">
        <div className="lc-title">ចូលប្រើប្រាស់</div>
        <F label="ឈ្មោះអ្នកប្រើ" ph="username" val={u} set={su} icon="👤"/>
        <F label="ពាក្យសម្ងាត់" ph="••••••••" val={p} set={sp} icon="🔒" type="password"/>
        {err&&<div className="ebox">{err}</div>}
        <button className="btn btn-pri" onClick={go} disabled={loading}>{loading?"កំពុងផ្ទៀងផ្ទាត់...":"ចូលប្រើ →"}</button>
      </div>
    </div>
  );
}

function Header({user,onLogout}){
  const cfg=roleConfig[user.role]||{};
  return(
    <div className="hdr">
      <div className="hav" style={{background:`color-mix(in srgb,${cfg.color||"#fff"} 14%,transparent)`,borderColor:`color-mix(in srgb,${cfg.color||"#fff"} 24%,transparent)`}}>{cfg.icon||"👤"}</div>
      <div className="htxt"><div className="hn">{user.display}</div><div className="hrl">{cfg.label||user.role}</div></div>
      <div className="hbadge">541-TRD</div>
      <button className="btn-ghost" onClick={onLogout}>ចេញ</button>
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
    if(p.length<8){se("ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច 8 តួអក្សរ!");return;}
    sl(true);
    const hash=await hashPassword(p);
    const admin={id:"admin_001",username:u,passwordHash:hash,role:"admin",display:name,team:""};
    await saveUser(admin);
    sl(false); onDone();
  };
  return(
    <div className="lw">
      <div className="logo-shell">
        <div className="logo-ring">⚙️</div>
        <div className="brand-text"><h1>Setup Admin</h1><div className="sub">ការដំឡើងដំបូង · First Time Setup</div><div className="btag">📍 541-TRD</div></div>
      </div>
      <div className="lc">
        <div className="lc-title">បង្កើត Admin Account</div>
        <div style={{background:"rgba(251,146,60,.08)",border:"1px solid rgba(251,146,60,.2)",borderRadius:10,padding:"10px 13px",fontSize:11,color:"#fb923c",lineHeight:1.7}}>
          🔐 Password នឹងត្រូវបាន <b>Hash SHA-256</b> — រក្សាទុកនៅ Firebase Cloud ។ គ្មាននរណាឃើញ plaintext ទេ។
        </div>
        <F label="ឈ្មោះបង្ហាញ" ph="ឧ. Heng Kimhong" val={name} set={sn} icon="👤"/>
        <F label="Username" ph="admin username" val={u} set={su} icon="🪪"/>
        <F label="ពាក្យសម្ងាត់" ph="យ៉ាងតិច 8 តួអក្សរ" val={p} set={sp} icon="🔒" type="password"/>
        <F label="បញ្ជាក់ពាក្យសម្ងាត់" ph="Type again..." val={p2} set={sp2} icon="🔒" type="password"/>
        {err&&<div className="ebox">{err}</div>}
        <button className="btn btn-pri" onClick={go} disabled={loading}>{loading?"កំពុងដំណើរការ...":"✅ បង្កើត Admin Account"}</button>
        <div className="note">Setup ១ ដងគ្រប់គ្រាន់ — data រក្សាទុកនៅ Firebase Cloud</div>
      </div>
    </div>
  );
}

// ─── TELLER ───────────────────────────────────────────────────────────────────
function Teller({user}){
  const e={w1:"",wc1:"",d1:"",dc1:"",w2:"",wc2:"",d2:"",dc2:""};
  const [f,sf]=useState(e); const [t,st]=useState(false);
  const s=(k,v)=>sf(p=>({...p,[k]:v}));
  const submit=async()=>{
    const msg=`🏦 <b>Supervisor Teller Report</b>\n📍 541-TRD\n📅 ${new Date().toLocaleString()}\n\n<b>▸ អតិថិជននៅសាខា 541-TRD:</b>\n• Withdrawal: <b>${f.w1||"—"}</b> | អតិថិជន: ${f.wc1||"—"}\n• Deposits: <b>${f.d1||"—"}</b> | អតិថិជន: ${f.dc1||"—"}\n\n<b>▸ អតិថិជនមិនមែននៅសាខា:</b>\n• Withdrawal: <b>${f.w2||"—"}</b> | អតិថិជន: ${f.wc2||"—"}\n• Deposits: <b>${f.d2||"—"}</b> | អតិថិជន: ${f.dc2||"—"}\n\n👤 ${user.display}`;
    await saveReport({type:"Teller",user:user.display,data:f,msg});
    await sendTelegram(msg); sf(e); st(true);
  };
  return(<>{t&&<Toast msg="Report បានផ្ញើ!" onDone={()=>st(false)}/>}
    <div className="sb">
      <GC icon="🏦" title="Supervisor Teller Report" sub="ប្រចាំថ្ងៃ · 541-TRD" accent="#60a5fa">
        <SBox label="អតិថិជននៅសាខា 541-TRD">
          <F label="Withdrawal Amount" ph="KHR / USD" val={f.w1} set={v=>s("w1",v)} nb/>
          <F label="ចំនួនអតិថិជន" ph="ចំនួន..." val={f.wc1} set={v=>s("wc1",v)} nb/>
          <div className="div"/>
          <F label="Deposits Amount" ph="KHR / USD" val={f.d1} set={v=>s("d1",v)} nb/>
          <F label="ចំនួនអតិថិជន" ph="ចំនួន..." val={f.dc1} set={v=>s("dc1",v)} nb/>
        </SBox>
        <SBox label="អតិថិជនមិនមែននៅសាខា">
          <F label="Withdrawal Amount" ph="KHR / USD" val={f.w2} set={v=>s("w2",v)} nb/>
          <F label="ចំនួនអតិថិជន" ph="ចំនួន..." val={f.wc2} set={v=>s("wc2",v)} nb/>
          <div className="div"/>
          <F label="Deposits Amount" ph="KHR / USD" val={f.d2} set={v=>s("d2",v)} nb/>
          <F label="ចំនួនអតិថិជន" ph="ចំនួន..." val={f.dc2} set={v=>s("dc2",v)} nb/>
        </SBox>
        <button className="btn btn-green" onClick={submit}>📤 Submit Report</button>
      </GC>
    </div></>);
}

// ─── CSA SUP ──────────────────────────────────────────────────────────────────
function CSASup({user}){
  const [tab,st]=useState("report");
  const e={staffName:"",newCif:"",newKhqr:"",deposit:"",ia:""};
  const [f,sf]=useState(e); const [toast,stt]=useState(""); const [rpts,sr]=useState([]);
  const s=(k,v)=>sf(p=>({...p,[k]:v}));
  useEffect(()=>{ if(tab==="view") getReports().then(r=>sr(r.filter(x=>x.type==="CSA"||x.type==="CSA_Officer"))); },[tab]);
  const submit=async()=>{
    const msg=`🧾 <b>Supervisor CSA Report</b>\n📅 ${new Date().toLocaleString()}\n\n• Staff Name: <b>${f.staffName||"—"}</b>\n• New CIF: <b>${f.newCif||"—"}</b>\n• New KHQR: <b>${f.newKhqr||"—"}</b>\n• Deposit: <b>${f.deposit||"—"}</b>\n• IA: <b>${f.ia||"—"}</b>\n\n👤 ${user.display}`;
    await saveReport({type:"CSA",user:user.display,data:f,msg});
    await sendTelegram(msg); sf(e); stt("Report បានផ្ញើ!");
  };
  return(<>{toast&&<Toast msg={toast} onDone={()=>stt("")}/>}
    <div className="sb">
      <div className="tabs">{[["report","📝 Report"],["view","📋 ទិន្នន័យ"]].map(([k,l])=><button key={k} className={`tab ${tab===k?"on":""}`} onClick={()=>st(k)}>{l}</button>)}</div>
      {tab==="report"&&<GC icon="🧾" title="Supervisor CSA Report" sub="ប្រចាំថ្ងៃ" accent="#34d399">
        <F label="Staff Name" ph="ឈ្មោះ Staff..." val={f.staffName} set={v=>s("staffName",v)} icon="👤"/>
        <div className="r2"><F label="New CIF" ph="ចំនួន..." val={f.newCif} set={v=>s("newCif",v)} nb/><F label="New KHQR" ph="ចំនួន..." val={f.newKhqr} set={v=>s("newKhqr",v)} nb/></div>
        <div className="r2"><F label="Deposit" ph="ចំនួន..." val={f.deposit} set={v=>s("deposit",v)} nb/><F label="IA" ph="ចំនួន..." val={f.ia} set={v=>s("ia",v)} nb/></div>
        <button className="btn btn-green" onClick={submit}>📤 Submit Report</button>
      </GC>}
      {tab==="view"&&<ReportList reports={rpts}/>}
    </div></>);
}

// ─── LOAN SUP ─────────────────────────────────────────────────────────────────
function LoanSup({user}){
  const [tab,st]=useState("report");
  const td=new Date().toISOString().split("T")[0];
  const e={supName:"",df:td,dt:td,mK:"",mU:"",tK:"",tU:"",wK:"",wU:"",thK:"",thU:"",fK:"",fU:""};
  const [f,sf]=useState(e); const [toast,stt]=useState(""); const [rpts,sr]=useState([]);
  const s=(k,v)=>sf(p=>({...p,[k]:v}));
  const days=[{lbl:"ថ្ងៃចន្ទ",khr:"mK",usd:"mU"},{lbl:"ថ្ងៃអង្គារ",khr:"tK",usd:"tU"},{lbl:"ថ្ងៃពុធ",khr:"wK",usd:"wU"},{lbl:"ថ្ងៃព្រហស្បតិ៍",khr:"thK",usd:"thU"},{lbl:"ថ្ងៃសុក្រ",khr:"fK",usd:"fU"}];
  useEffect(()=>{ if(tab==="view") getReports().then(r=>sr(r.filter(x=>x.type==="Loan"||x.type==="Loan_Officer"))); },[tab]);
  const submit=async()=>{
    const rows=days.map(d=>`• ${d.lbl}: KHR <b>${f[d.khr]||"—"}</b> | USD <b>${f[d.usd]||"—"}</b>`).join("\n");
    const msg=`💳 <b>Supervisor Loan Report</b>\n📅 ${f.df} → ${f.dt}\n👤 Supervisor: <b>${f.supName||"—"}</b>\n\n${rows}\n\n👤 ${user.display}`;
    await saveReport({type:"Loan",user:user.display,data:f,msg});
    await sendTelegram(msg); sf(e); stt("Report បានផ្ញើ!");
  };
  return(<>{toast&&<Toast msg={toast} onDone={()=>stt("")}/>}
    <div className="sb">
      <div className="tabs">{[["report","📝 Report"],["view","📋 ទិន្នន័យ"]].map(([k,l])=><button key={k} className={`tab ${tab===k?"on":""}`} onClick={()=>st(k)}>{l}</button>)}</div>
      {tab==="report"&&<>
        <GC icon="💳" title="Supervisor Loan Report" sub="ប្រចាំសប្ដាហ៍" accent="#a78bfa">
          <F label="Supervisor Name" ph="ឈ្មោះ Supervisor..." val={f.supName} set={v=>s("supName",v)} icon="👤"/>
          <div className="r2"><F label="ពីថ្ងៃទី" val={f.df} set={v=>s("df",v)} nb type="date" ph=""/><F label="ដល់ថ្ងៃទី" val={f.dt} set={v=>s("dt",v)} nb type="date" ph=""/></div>
        </GC>
        <GC icon="📅" title="ចំនួន Loan ប្រចាំថ្ងៃ" sub="KHR / USD" accent="#a78bfa">
          {days.map((d,i)=><div key={d.khr}>{i>0&&<div className="div"/>}<div style={{fontSize:11,fontWeight:700,color:"var(--acc2)",marginBottom:7}}>{d.lbl}</div><div className="r2"><F label="KHR" ph="0" val={f[d.khr]} set={v=>s(d.khr,v)} nb/><F label="USD" ph="0" val={f[d.usd]} set={v=>s(d.usd,v)} nb/></div></div>)}
        </GC>
        <button className="btn btn-green" onClick={submit} style={{marginBottom:8}}>📤 Submit Report</button>
      </>}
      {tab==="view"&&<ReportList reports={rpts}/>}
    </div></>);
}

// ─── LOAN OFFICER ─────────────────────────────────────────────────────────────
function LoanOfficer({user}){
  const td=new Date().toISOString().split("T")[0];
  const e={df:td,dt:td,mK:"",mU:"",tK:"",tU:"",wK:"",wU:"",thK:"",thU:"",fK:"",fU:""};
  const [f,sf]=useState(e); const [t,st]=useState(false); const [acts,sa]=useState([]);
  const s=(k,v)=>sf(p=>({...p,[k]:v}));
  const days=[{lbl:"ថ្ងៃចន្ទ",khr:"mK",usd:"mU"},{lbl:"ថ្ងៃអង្គារ",khr:"tK",usd:"tU"},{lbl:"ថ្ងៃពុធ",khr:"wK",usd:"wU"},{lbl:"ថ្ងៃព្រហស្បតិ៍",khr:"thK",usd:"thU"},{lbl:"ថ្ងៃសុក្រ",khr:"fK",usd:"fU"}];
  useEffect(()=>{ getActivities().then(sa); },[]);
  const submit=async()=>{
    const rows=days.map(d=>`• ${d.lbl}: KHR <b>${f[d.khr]||"—"}</b> | USD <b>${f[d.usd]||"—"}</b>`).join("\n");
    const msg=`📄 <b>Loan Officer Report</b>\n👤 <b>${user.display}</b>\n📅 ${f.df} → ${f.dt}\n\n${rows}\n\n👤 ${user.display}`;
    await saveReport({type:"Loan_Officer",user:user.display,data:f,msg});
    await sendTelegram(msg); sf(e); st(true);
  };
  const requestJoin=async(act)=>{
    const date=prompt("ថ្ងៃដែលចូលរួម (YYYY-MM-DD):");
    if(!date)return;
    const reqs=[...(act.requests||[]),{user:user.display,role:user.role,date,status:"pending"}];
    await updateActivity(act.firestoreId,{requests:reqs});
    getActivities().then(sa);
  };
  return(<>{t&&<Toast msg="Report បានផ្ញើ!" onDone={()=>st(false)}/>}
    <div className="sb">
      <GC icon="📄" title="Loan Officer Report" sub={user.display} accent="#c084fc">
        <div style={{background:"rgba(192,132,252,.08)",border:"1px solid rgba(192,132,252,.2)",borderRadius:10,padding:"9px 13px",fontSize:12,color:"#c084fc",fontWeight:600}}>👤 {user.display}</div>
        <div className="r2"><F label="ពីថ្ងៃទី" val={f.df} set={v=>s("df",v)} nb type="date" ph=""/><F label="ដល់ថ្ងៃទី" val={f.dt} set={v=>s("dt",v)} nb type="date" ph=""/></div>
      </GC>
      <GC icon="📅" title="ចំនួន Loan ប្រចាំថ្ងៃ" sub="KHR / USD" accent="#c084fc">
        {days.map((d,i)=><div key={d.khr}>{i>0&&<div className="div"/>}<div style={{fontSize:11,fontWeight:700,color:"var(--acc2)",marginBottom:7}}>{d.lbl}</div><div className="r2"><F label="KHR" ph="0" val={f[d.khr]} set={v=>s(d.khr,v)} nb/><F label="USD" ph="0" val={f[d.usd]} set={v=>s(d.usd,v)} nb/></div></div>)}
      </GC>
      <button className="btn btn-green" onClick={submit} style={{marginBottom:8}}>📤 Submit Report</button>
      {acts.length>0&&<GC icon="📣" title="ផែនការផ្សព្វផ្សាយ" sub="ចូលរួម Activity" accent="#8b5cf6">
        {acts.map(a=>{
          const myReq=(a.requests||[]).find(r=>r.user===user.display);
          return(
            <div key={a.firestoreId} className="act-card">
              <div style={{display:"flex",alignItems:"center",gap:8}}><span className={`act-type ${a.type}`}>{a.type==="booth"?"🏪 Booth":"🚗 Roadshow"}</span><span style={{fontSize:10,color:"var(--t3)"}}>{a.date}</span></div>
              <div className="act-title">{a.title}</div>
              <div style={{fontSize:11,color:"var(--t2)"}}>📍 {a.location} · {a.village} · {a.commune} · {a.district}</div>
              {myReq
                ? <span className={`status-badge ${myReq.status==="pending"?"status-pending":myReq.status==="approved"?"status-approved":"status-rejected"}`}>{myReq.status==="pending"?"⏳ រង់ចាំ":myReq.status==="approved"?"✅ អនុម័ត":"❌ បដិសេធ"}</span>
                : <button className="btn btn-purple btn-sm" onClick={()=>requestJoin(a)}>📋 Request Join</button>}
            </div>);
        })}
      </GC>}
    </div></>);
}

// ─── CSA OFFICER ──────────────────────────────────────────────────────────────
function CSAOfficer({user}){
  const e={newCif:"",newKhqr:"",deposit:"",ia:""};
  const [f,sf]=useState(e); const [t,st]=useState(false);
  const s=(k,v)=>sf(p=>({...p,[k]:v}));
  const submit=async()=>{
    const msg=`🪪 <b>CSA Officer Report</b>\n📅 ${new Date().toLocaleString()}\n\n• Staff Name: <b>${user.display}</b>\n• New CIF: <b>${f.newCif||"—"}</b>\n• New KHQR: <b>${f.newKhqr||"—"}</b>\n• Deposit: <b>${f.deposit||"—"}</b>\n• IA: <b>${f.ia||"—"}</b>\n\n👤 ${user.display}`;
    await saveReport({type:"CSA_Officer",user:user.display,data:f,msg});
    await sendTelegram(msg); sf(e); st(true);
  };
  return(<>{t&&<Toast msg="Report បានផ្ញើ!" onDone={()=>st(false)}/>}
    <div className="sb">
      <GC icon="🪪" title="CSA Officer Report" sub={user.display} accent="#6ee7b7">
        <div style={{background:"rgba(110,231,183,.08)",border:"1px solid rgba(110,231,183,.2)",borderRadius:10,padding:"9px 13px",fontSize:12,color:"#6ee7b7",fontWeight:600}}>👤 {user.display}</div>
        <div className="r2"><F label="New CIF" ph="ចំនួន..." val={f.newCif} set={v=>s("newCif",v)} nb/><F label="New KHQR" ph="ចំនួន..." val={f.newKhqr} set={v=>s("newKhqr",v)} nb/></div>
        <div className="r2"><F label="Deposit" ph="ចំនួន..." val={f.deposit} set={v=>s("deposit",v)} nb/><F label="IA" ph="ចំនួន..." val={f.ia} set={v=>s("ia",v)} nb/></div>
        <button className="btn btn-green" onClick={submit}>📤 Submit Report</button>
      </GC>
    </div></>);
}

// ─── MA KHQR ──────────────────────────────────────────────────────────────────
function MAKHQR({user}){
  const td=new Date().toISOString().split("T")[0];
  const e={name:"",date:td,nK:"",nU:"",rK:"",rU:"",sK:"",sU:""};
  const [f,sf]=useState(e); const [t,st]=useState(false);
  const s=(k,v)=>sf(p=>({...p,[k]:v}));
  const submit=async()=>{
    const msg=`📱 <b>MA KHQR Report</b>\n👤 <b>${f.name||"—"}</b>\n📅 ${f.date}\n\n▸ New KHQR: KHR ${f.nK||"—"} | USD ${f.nU||"—"}\n▸ Reprint: KHR ${f.rK||"—"} | USD ${f.rU||"—"}\n▸ Sound Box: KHR ${f.sK||"—"} | USD ${f.sU||"—"}\n\n👤 ${user.display}`;
    await saveReport({type:"MA_KHQR",user:user.display,data:f,msg});
    await sendTelegram(msg); sf(e); st(true);
  };
  return(<>{t&&<Toast msg="Report បានផ្ញើ!" onDone={()=>st(false)}/>}
    <div className="sb">
      <GC icon="📱" title="MA KHQR Report" sub="KHQR Onboard" accent="#22d3ee">
        <div className="r2"><F label="MA Name" ph="ឈ្មោះ MA..." val={f.name} set={v=>s("name",v)} nb/><F label="ថ្ងៃទី" val={f.date} set={v=>s("date",v)} nb type="date" ph=""/></div>
        <SBox label="New KHQR"><div className="r2"><F label="KHR" ph="0" val={f.nK} set={v=>s("nK",v)} nb/><F label="USD" ph="0" val={f.nU} set={v=>s("nU",v)} nb/></div></SBox>
        <SBox label="Reprint KHQR"><div className="r2"><F label="KHR" ph="0" val={f.rK} set={v=>s("rK",v)} nb/><F label="USD" ph="0" val={f.rU} set={v=>s("rU",v)} nb/></div></SBox>
        <SBox label="Sound Box"><div className="r2"><F label="KHR" ph="0" val={f.sK} set={v=>s("sK",v)} nb/><F label="USD" ph="0" val={f.sU} set={v=>s("sU",v)} nb/></div></SBox>
        <button className="btn btn-green" onClick={submit}>📤 Submit Report</button>
      </GC>
    </div></>);
}

// ─── MS KHQR ──────────────────────────────────────────────────────────────────
function MSKHQR({user}){
  const td=new Date().toISOString().split("T")[0];
  const e={name:"",date:td,nK:"",nU:"",rK:"",rU:""};
  const [f,sf]=useState(e); const [t,st]=useState(false);
  const s=(k,v)=>sf(p=>({...p,[k]:v}));
  const submit=async()=>{
    const msg=`🔖 <b>MS KHQR Report</b>\n👤 <b>${f.name||"—"}</b>\n📅 ${f.date}\n\n▸ New KHQR: KHR ${f.nK||"—"} | USD ${f.nU||"—"}\n▸ Reprint: KHR ${f.rK||"—"} | USD ${f.rU||"—"}\n\n👤 ${user.display}`;
    await saveReport({type:"MS_KHQR",user:user.display,data:f,msg});
    await sendTelegram(msg); sf(e); st(true);
  };
  return(<>{t&&<Toast msg="Report បានផ្ញើ!" onDone={()=>st(false)}/>}
    <div className="sb">
      <GC icon="🔖" title="MS KHQR Report" sub="KHQR Onboard" accent="#f472b6">
        <div className="r2"><F label="MS Name" ph="ឈ្មោះ MS..." val={f.name} set={v=>s("name",v)} nb/><F label="ថ្ងៃទី" val={f.date} set={v=>s("date",v)} nb type="date" ph=""/></div>
        <SBox label="New KHQR"><div className="r2"><F label="KHR" ph="0" val={f.nK} set={v=>s("nK",v)} nb/><F label="USD" ph="0" val={f.nU} set={v=>s("nU",v)} nb/></div></SBox>
        <SBox label="Reprint KHQR"><div className="r2"><F label="KHR" ph="0" val={f.rK} set={v=>s("rK",v)} nb/><F label="USD" ph="0" val={f.rU} set={v=>s("rU",v)} nb/></div></SBox>
        <button className="btn btn-green" onClick={submit}>📤 Submit Report</button>
      </GC>
    </div></>);
}

// ─── DBMC ─────────────────────────────────────────────────────────────────────
function DBMC({user}){
  const [tab,st]=useState("dash");
  const [rpts,sr]=useState([]); const [acts,sa]=useState([]); const [toast,stt]=useState("");
  const e2={deposit:"",cif:"",khqr:"",vU:"",vUL:"",vK:"",vKL:""};
  const [f,sf]=useState(e2); const s=(k,v)=>sf(p=>({...p,[k]:v}));
  const [aForm,saf]=useState({title:"",type:"booth",date:"",location:"",village:"",commune:"",district:"",staffName:"",staffRole:"loan_officer"});
  const af=(k,v)=>saf(p=>({...p,[k]:v}));

  useEffect(()=>{
    getReports().then(sr);
    getActivities().then(sa);
  },[tab]);

  const byType=t=>rpts.filter(r=>r.type===t).length;

  const submitReport=async()=>{
    const msg=`📊 <b>DBMC Report</b>\n📅 ${new Date().toLocaleString()}\n\n• Branch Deposit: <b>${f.deposit||"—"}</b>\n• Branch CIF: <b>${f.cif||"—"}</b>\n• Branch KHQR: <b>${f.khqr||"—"}</b>\n• B_Vault USD: <b>${f.vU||"—"}</b> | Over Limit: ${f.vUL||"—"}\n• B_Vault KHR: <b>${f.vK||"—"}</b> | Over Limit: ${f.vKL||"—"}\n\n👤 ${user.display}`;
    await saveReport({type:"DBMC",user:user.display,data:f,msg});
    await sendTelegram(msg); sf(e2); stt("Report ផ្ញើ!");
  };
  const sendSum=async()=>{
    const msg=`📊 <b>DBMC Summary</b>\n📅 ${new Date().toLocaleString()}\n\n• Teller: ${byType("Teller")}\n• CSA: ${byType("CSA")+byType("CSA_Officer")}\n• Loan: ${byType("Loan")+byType("Loan_Officer")}\n• Total: ${rpts.length}\n\n👤 ${user.display}`;
    await sendTelegram(msg); stt("Summary ផ្ញើ!");
  };
  const createActivity=async()=>{
    if(!aForm.title||!aForm.date||!aForm.location){stt("សូមបំពេញគ្រប់ field!");return;}
    await saveActivity({...aForm,id:Date.now(),requests:[],createdBy:user.display,createdAt:new Date().toISOString()});
    getActivities().then(sa);
    saf({title:"",type:"booth",date:"",location:"",village:"",commune:"",district:"",staffName:"",staffRole:"loan_officer"});
    stt("ផែនការបានបង្កើត!");
  };
  const approveReq=async(act,reqUser,approve)=>{
    const reqs=(act.requests||[]).map(r=>r.user===reqUser?{...r,status:approve?"approved":"rejected"}:r);
    await updateActivity(act.firestoreId,{requests:reqs});
    getActivities().then(sa); stt(approve?"អនុម័ត!":"បដិសេធ!");
  };

  return(<>{toast&&<Toast msg={toast} onDone={()=>stt("")}/>}
    <div className="sb">
      <div className="tabs">{[["dash","📊 Dashboard"],["report","📝 Report"],["plan","📣 ផ្សព្វផ្សាយ"]].map(([k,l])=><button key={k} className={`tab ${tab===k?"on":""}`} onClick={()=>st(k)}>{l}</button>)}</div>
      {tab==="dash"&&<>
        <div className="sg">
          {[{lbl:"Teller",val:byType("Teller"),color:"#60a5fa"},{lbl:"CSA",val:byType("CSA")+byType("CSA_Officer"),color:"#34d399"},{lbl:"Loan",val:byType("Loan")+byType("Loan_Officer"),color:"#a78bfa"},{lbl:"Total",val:rpts.length,color:"#fbbf24"}]
            .map(x=><div key={x.lbl} className="sc"><div className="sn" style={{color:x.color}}>{x.val}</div><div className="sl">{x.lbl}</div></div>)}
        </div>
        <ReportList reports={rpts}/>
        <button className="btn btn-tg" onClick={sendSum}>📤 ផ្ញើ Summary ទៅ Telegram</button>
      </>}
      {tab==="report"&&<GC icon="📊" title="DBMC Report" sub="Branch Summary" accent="#fb923c">
        <F label="Branch Deposit" ph="ចំនួន..." val={f.deposit} set={v=>s("deposit",v)} icon="💰"/>
        <div className="r2"><F label="Branch CIF" ph="ចំនួន..." val={f.cif} set={v=>s("cif",v)} nb/><F label="Branch KHQR" ph="ចំនួន..." val={f.khqr} set={v=>s("khqr",v)} nb/></div>
        <SBox label="B_Vault">
          <div className="r2"><F label="Vault USD" ph="0" val={f.vU} set={v=>s("vU",v)} nb/><F label="Over Limit USD" ph="0" val={f.vUL} set={v=>s("vUL",v)} nb/></div>
          <div className="r2"><F label="Vault KHR" ph="0" val={f.vK} set={v=>s("vK",v)} nb/><F label="Over Limit KHR" ph="0" val={f.vKL} set={v=>s("vKL",v)} nb/></div>
        </SBox>
        <button className="btn btn-green" onClick={submitReport}>📤 Submit Report</button>
      </GC>}
      {tab==="plan"&&<>
        <GC icon="➕" title="បង្កើតផែនការ" sub="Booth / Roadshow" accent="#fb923c">
          <F label="ឈ្មោះសកម្មភាព" ph="ឧ. ផ្សព្វផ្សាយ KHQR..." val={aForm.title} set={v=>af("title",v)} icon="📣"/>
          <div className="r2"><Sel label="ប្រភេទ" val={aForm.type} set={v=>af("type",v)} opts={[["booth","🏪 Booth"],["roadshow","🚗 Roadshow"]]}/><F label="ថ្ងៃ" val={aForm.date} set={v=>af("date",v)} nb type="date" ph=""/></div>
          <F label="ទីតាំង" ph="ឧ. ផ្សារថ្មី..." val={aForm.location} set={v=>af("location",v)} icon="📍"/>
          <div className="r2"><F label="ភូមិ" ph="ភូមិ..." val={aForm.village} set={v=>af("village",v)} nb/><F label="ឃុំ" ph="ឃុំ..." val={aForm.commune} set={v=>af("commune",v)} nb/></div>
          <F label="ស្រុក" ph="ស្រុក..." val={aForm.district} set={v=>af("district",v)} nb/>
          <div className="div"/>
          <F label="ឈ្មោះ Staff" ph="ឈ្មោះ..." val={aForm.staffName} set={v=>af("staffName",v)} icon="👤"/>
          <Sel label="តួនាទី" val={aForm.staffRole} set={v=>af("staffRole",v)} opts={Object.entries(roleConfig).filter(([k])=>k!=="admin").map(([k,v])=>[k,`${v.icon} ${v.label}`])}/>
          <button className="btn btn-orange" onClick={createActivity}>✅ បង្កើតផែនការ</button>
        </GC>
        {acts.map(a=>(
          <div key={a.firestoreId} className="act-card">
            <div style={{display:"flex",alignItems:"center",gap:8}}><span className={`act-type ${a.type}`}>{a.type==="booth"?"🏪 Booth":"🚗 Roadshow"}</span><span style={{fontSize:10,color:"var(--t3)"}}>{a.date}</span></div>
            <div className="act-title">{a.title}</div>
            <div style={{fontSize:11,color:"var(--t2)"}}>📍 {a.location} · {a.village} · {a.commune} · {a.district}</div>
            <div style={{fontSize:11,color:"var(--t2)"}}>👤 {a.staffName}</div>
            {(a.requests||[]).filter(r=>r.status==="approved").length>0&&(
              <div className="act-members">{(a.requests||[]).filter(r=>r.status==="approved").map(r=><span key={r.user} className="act-member approved">✅ {r.user} ({r.date})</span>)}</div>
            )}
            {(a.requests||[]).filter(r=>r.status==="pending").length>0&&(
              <SBox label="សំណើរចូលរួម">
                {(a.requests||[]).filter(r=>r.status==="pending").map(r=>(
                  <div key={r.user} className="req-row">
                    <div className="req-info"><div className="req-name">{r.user}</div><div className="req-sub">{roleConfig[r.role]?.label||r.role} · 📅 {r.date}</div></div>
                    <button className="btn-approve" onClick={()=>approveReq(a,r.user,true)}>✓</button>
                    <button className="btn-reject" onClick={()=>approveReq(a,r.user,false)}>✕</button>
                  </div>))}
              </SBox>)}
          </div>))}
      </>}
    </div></>);
}

// ─── BM ───────────────────────────────────────────────────────────────────────
function BM({user}){
  const [tab,st]=useState("dash");
  const [rpts,sr]=useState([]); const [acts,sa]=useState([]); const [toast,stt]=useState("");
  useEffect(()=>{ getReports().then(sr); getActivities().then(sa); },[tab]);
  const byType=t=>rpts.filter(r=>r.type===t).length;
  const sendSum=async()=>{
    const msg=`🏢 <b>BM Summary</b>\n📅 ${new Date().toLocaleString()}\n\n• Teller: ${byType("Teller")}\n• CSA: ${byType("CSA")+byType("CSA_Officer")}\n• Loan: ${byType("Loan")+byType("Loan_Officer")}\n• Total: ${rpts.length}\n\n👤 ${user.display}`;
    await sendTelegram(msg); stt("Summary ផ្ញើ!");
  };
  const approveReq=async(act,reqUser,approve)=>{
    const reqs=(act.requests||[]).map(r=>r.user===reqUser?{...r,status:approve?"approved":"rejected"}:r);
    await updateActivity(act.firestoreId,{requests:reqs});
    getActivities().then(sa); stt(approve?"អនុម័ត!":"បដិសេធ!");
  };
  return(<>{toast&&<Toast msg={toast} onDone={()=>stt("")}/>}
    <div className="sb">
      <div className="tabs">{[["dash","📊 Reports"],["plan","📣 ផ្សព្វផ្សាយ"]].map(([k,l])=><button key={k} className={`tab ${tab===k?"on":""}`} onClick={()=>st(k)}>{l}</button>)}</div>
      {tab==="dash"&&<>
        <div className="sg">{[{lbl:"Teller",val:byType("Teller"),color:"#60a5fa"},{lbl:"CSA",val:byType("CSA")+byType("CSA_Officer"),color:"#34d399"},{lbl:"Loan",val:byType("Loan")+byType("Loan_Officer"),color:"#a78bfa"},{lbl:"Total",val:rpts.length,color:"#fbbf24"}].map(x=><div key={x.lbl} className="sc"><div className="sn" style={{color:x.color}}>{x.val}</div><div className="sl">{x.lbl}</div></div>)}</div>
        <ReportList reports={rpts}/>
        <button className="btn btn-tg" onClick={sendSum}>📤 ផ្ញើ Summary</button>
      </>}
      {tab==="plan"&&acts.map(a=>(
        <div key={a.firestoreId} className="act-card">
          <div style={{display:"flex",alignItems:"center",gap:8}}><span className={`act-type ${a.type}`}>{a.type==="booth"?"🏪 Booth":"🚗 Roadshow"}</span><span style={{fontSize:10,color:"var(--t3)"}}>{a.date}</span></div>
          <div className="act-title">{a.title}</div>
          <div style={{fontSize:11,color:"var(--t2)"}}>📍 {a.location} · {a.village} · {a.commune} · {a.district}</div>
          {(a.requests||[]).filter(r=>r.status==="approved").length>0&&<div className="act-members">{(a.requests||[]).filter(r=>r.status==="approved").map(r=><span key={r.user} className="act-member approved">✅ {r.user}</span>)}</div>}
          {(a.requests||[]).filter(r=>r.status==="pending").length>0&&<SBox label="សំណើរ">{(a.requests||[]).filter(r=>r.status==="pending").map(r=><div key={r.user} className="req-row"><div className="req-info"><div className="req-name">{r.user}</div><div className="req-sub">📅 {r.date}</div></div><button className="btn-approve" onClick={()=>approveReq(a,r.user,true)}>✓</button><button className="btn-reject" onClick={()=>approveReq(a,r.user,false)}>✕</button></div>)}</SBox>}
        </div>))}
    </div></>);
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────
function ResetPassword({users,onUpdate}){
  const [selUser,setSU]=useState(""); const [np,snp]=useState(""); const [np2,snp2]=useState(""); const [err,se]=useState("");
  const go=async()=>{
    if(!selUser){se("សូមជ្រើស User!");return;}
    if(np.length<8){se("ពាក្យសម្ងាត់ត្រូវការ 8+ តួ!");return;}
    if(np!==np2){se("ពាក្យសម្ងាត់មិនដូចគ្នា!");return;}
    se("");
    const hash=await hashPassword(np);
    await updateUserPassword(selUser,hash);
    onUpdate(); setSU(""); snp(""); snp2("");
  };
  return(
    <GC icon="🔑" title="ប្ដូរ Password" sub="SHA-256 · Firebase" accent="#fbbf24">
      <div style={{background:"rgba(251,146,60,.08)",border:"1px solid rgba(251,146,60,.2)",borderRadius:10,padding:"10px 13px",fontSize:11,color:"#fb923c",lineHeight:1.7}}>🔐 Password hash ភ្លាមៗ — គ្មាននរណាឃើញ plaintext ទេ</div>
      <div className="field"><label>ជ្រើស User</label>
        <select className="nb" value={selUser} onChange={e=>setSU(e.target.value)}>
          <option value="">-- ជ្រើស User --</option>
          {users.map(x=><option key={x.id} value={x.id}>{x.display} (@{x.username})</option>)}
        </select>
      </div>
      <F label="Password ថ្មី" ph="8+ តួអក្សរ" val={np} set={snp} icon="🔒" type="password"/>
      <F label="បញ្ជាក់" ph="Type again..." val={np2} set={snp2} icon="🔒" type="password"/>
      {err&&<div className="ebox">{err}</div>}
      <button className="btn btn-green" onClick={go}>🔑 ប្ដូរ Password</button>
    </GC>
  );
}

function Admin({onBgChange}){
  const [tab,st]=useState("users");
  const [users,su]=useState([]); const [rpts,sr]=useState([]);
  const [nu,snu]=useState({username:"",password:"",role:"supervisor_teller",display:""});
  const [toast,stt]=useState("");
  const [selId,setSel]=useState("cosmos"); const [c1,sc1]=useState("#06080f"); const [c2,sc2]=useState("#0c1428");

  const load=useCallback(async()=>{ su(await getUsers()); sr(await getReports()); },[]);
  useEffect(()=>{ load(); },[tab]);

  const addU=async()=>{
    if(!nu.username||!nu.password||!nu.display)return;
    const hash=await hashPassword(nu.password);
    const newUser={id:`user_${Date.now()}`,username:nu.username,passwordHash:hash,role:nu.role,display:nu.display,team:""};
    await saveUser(newUser);
    snu({username:"",password:"",role:"supervisor_teller",display:""});
    stt("User បានបង្កើត ✅"); load();
  };
  const delU=async(id)=>{
    if(!window.confirm("លុប User នេះ?"))return;
    await deleteUser(id); stt("User បានលុប!"); load();
  };
  const applyPreset=(p)=>{ setSel(p.id); sc1(p.a); sc2(p.b); saveBg(p); onBgChange(p); stt(`Theme "${p.label}" ✅`); };
  const applyCustom=()=>{ const bg={id:"custom",label:"Custom",a:c1,b:c2,c:"#000",accent:c1}; setSel("custom"); saveBg(bg); onBgChange(bg); stt("Background ✅"); };

  return(<>{toast&&<Toast msg={toast} onDone={()=>stt("")}/>}
    <div className="sb">
      <div className="tabs">{[["users","👥 Users"],["reports","📋 Reports"],["new","➕ Add"],["theme","🎨 Theme"],["pw","🔑 PW"]].map(([k,l])=><button key={k} className={`tab ${tab===k?"on":""}`} onClick={()=>st(k)}>{l}</button>)}</div>
      {tab==="users"&&<div className="gc">
        <div className="gch"><div className="gci" style={{background:"color-mix(in srgb,#fbbf24 14%,transparent)"}}>👥</div><div><div className="gct">Users ទាំងអស់</div><div className="gcs">{users.length} accounts · Firebase</div></div></div>
        {users.map(u=><div key={u.id} className="ui">
          <div className="uav" style={{background:`color-mix(in srgb,${roleConfig[u.role]?.color||"#fff"} 12%,transparent)`}}>{roleConfig[u.role]?.icon||"👤"}</div>
          <div className="uinf"><div className="un">{u.display}</div><div className="uro">@{u.username} · {roleConfig[u.role]?.label||u.role}</div></div>
          {u.role!=="admin"&&<button className="btn-del" onClick={()=>delU(u.id)}>លុប</button>}
        </div>)}
      </div>}
      {tab==="reports"&&<ReportList reports={rpts}/>}
      {tab==="new"&&<GC icon="➕" title="បង្កើត User ថ្មី" accent="#34d399">
        <F label="ឈ្មោះបង្ហាញ" ph="Display Name..." val={nu.display} set={v=>snu(p=>({...p,display:v}))} icon="✏️"/>
        <div className="r2"><F label="Username" ph="username" val={nu.username} set={v=>snu(p=>({...p,username:v}))} nb/><F label="Password" ph="••••••" val={nu.password} set={v=>snu(p=>({...p,password:v}))} nb type="password"/></div>
        <Sel label="Role" val={nu.role} set={v=>snu(p=>({...p,role:v}))} opts={Object.entries(roleConfig).filter(([k])=>k!=="admin").map(([k,v])=>[k,`${v.icon} ${v.label}`])}/>
        <button className="btn btn-green" onClick={addU}>✅ បង្កើត User</button>
      </GC>}
      {tab==="theme"&&<GC icon="🎨" title="ប្ដូរ Background" sub="Admin Only" accent="#fbbf24">
        <div className="slbl">Preset Themes</div>
        <div className="bgg">{BG_PRESETS.map(p=><div key={p.id} className={`bsw ${selId===p.id?"sel":""}`} style={{background:`linear-gradient(145deg,${p.a},${p.b},${p.c})`}} onClick={()=>applyPreset(p)}><span className="bsw-lbl">{p.label}</span></div>)}</div>
        <div className="slbl">Custom</div>
        <div className="cprow"><div className="cpw"><label>ពណ៌ ១</label><input type="color" className="cinp" value={c1} onChange={e=>sc1(e.target.value)}/></div><div className="cpw"><label>ពណ៌ ២</label><input type="color" className="cinp" value={c2} onChange={e=>sc2(e.target.value)}/></div></div>
        <div className="cprev" style={{background:`linear-gradient(135deg,${c1},${c2})`}}/>
        <button className="btn btn-green" onClick={applyCustom}>✅ អនុវត្ត</button>
      </GC>}
      {tab==="pw"&&<ResetPassword users={users} onUpdate={()=>{load();stt("Password ✅");}}/>}
    </div></>);
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App(){
  const [user,su]=useState(null);
  const [bg,sbg]=useState(BG_PRESETS[0]);
  const [status,ss]=useState("loading"); // loading | setup | ready

  useEffect(()=>{
    // Load bg from Firebase
    getBg().then(b=>{ if(b) sbg(b); });
    // Check if admin exists in Firestore
    getUsers().then(users=>{
      const hasAdmin=users.some(u=>u.role==="admin");
      ss(hasAdmin?"ready":"setup");
    }).catch(()=>ss("setup"));
  },[]);

  const view=()=>{
    if(!user)return null;
    switch(user.role){
      case "supervisor_teller": return <Teller user={user}/>;
      case "supervisor_csa":    return <CSASup user={user}/>;
      case "supervisor_loan":   return <LoanSup user={user}/>;
      case "loan_officer":      return <LoanOfficer user={user}/>;
      case "csa_officer":       return <CSAOfficer user={user}/>;
      case "ma_khqr":           return <MAKHQR user={user}/>;
      case "ms_khqr":           return <MSKHQR user={user}/>;
      case "dbmc":              return <DBMC user={user}/>;
      case "bm":                return <BM user={user}/>;
      case "admin":             return <Admin onBgChange={v=>sbg(v)}/>;
      default: return <div className="sb"><div className="ibox">Role មិនស្គាល់</div></div>;
    }
  };

  return(<>
    <style>{mkCss(bg)}</style>
    <div className="app">
      {status==="loading" && (
        <div className="loading-screen">
          <div className="spinner"/>
          <div style={{fontSize:12,color:"var(--t2)"}}>កំពុងភ្ជាប់ Firebase...</div>
        </div>
      )}
      {status==="setup" && <SetupWizard onDone={()=>ss("ready")}/>}
      {status==="ready" && (
        !user ? <Login onLogin={su}/> : <><Header user={user} onLogout={()=>su(null)}/>{view()}</>
      )}
    </div>
  </>);
}
