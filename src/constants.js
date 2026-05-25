// ─── CONSTANTS ────────────────────────────────────────────────────────────────
export const TELEGRAM_BOT_TOKEN = "8885325172:AAHc5rbTHpv_6CulbSdF-VbreQJeV_7X_lE";
export const TELEGRAM_ADMIN_CHAT_ID = "8664644666";

export const sendTelegram = async (msg) => {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,{
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({chat_id:TELEGRAM_ADMIN_CHAT_ID,text:msg,parse_mode:"HTML"}),
    });
  } catch(e){ console.log("TG:",e); }
};

export const hashPassword = async (pw) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
};
export const verifyPassword = async (pw, hash) => (await hashPassword(pw)) === hash;

export const BG_PRESETS = [
  { id:"cosmos", label:"Cosmos", a:"#06080f", b:"#0c1428", c:"#030408", accent:"#3b82f6" },
  { id:"ocean",  label:"Ocean",  a:"#030d1c", b:"#07233e", c:"#010810", accent:"#0ea5e9" },
  { id:"forest", label:"Forest", a:"#030d07", b:"#061e0f", c:"#010803", accent:"#22c55e" },
  { id:"royal",  label:"Royal",  a:"#0a0416", b:"#160830", c:"#050209", accent:"#a855f7" },
  { id:"ember",  label:"Ember",  a:"#120300", b:"#230800", c:"#080100", accent:"#f97316" },
  { id:"rose",   label:"Rose",   a:"#130108", b:"#260316", c:"#0a0105", accent:"#ec4899" },
  { id:"slate",  label:"Slate",  a:"#070a12", b:"#101620", c:"#040609", accent:"#94a3b8" },
  { id:"pitch",  label:"Pitch",  a:"#000000", b:"#050505", c:"#000000", accent:"#ffffff" },
];

export const roleConfig = {
  admin:             { icon:"👑", color:"#fbbf24", label:"Admin",             nav:["dashboard","staff","analytics","activities","admin"] },
  supervisor_teller: { icon:"🏦", color:"#60a5fa", label:"Supervisor Teller", nav:["report"] },
  supervisor_csa:    { icon:"🧾", color:"#34d399", label:"Supervisor CSA",    nav:["report","team_view"] },
  supervisor_loan:   { icon:"💳", color:"#a78bfa", label:"Supervisor Loan",   nav:["report","team_view"] },
  loan_officer:      { icon:"📄", color:"#c084fc", label:"Loan Officer",      nav:["report","activities"] },
  csa_officer:       { icon:"🪪", color:"#6ee7b7", label:"CSA Officer",       nav:["report"] },
  ma_khqr:           { icon:"📱", color:"#22d3ee", label:"MA KHQR",           nav:["report"] },
  ms_khqr:           { icon:"🔖", color:"#f472b6", label:"MS KHQR",           nav:["report"] },
  dbmc:              { icon:"📊", color:"#fb923c", label:"DBMC",              nav:["dashboard","analytics","report","activities","staff"] },
  bm:                { icon:"🏢", color:"#86efac", label:"BM",               nav:["dashboard","analytics","activities","staff"] },
};

export const MONTHS_KH = ["មករា","កុម្ភៈ","មីនា","មេសា","ឧសភា","មិថុនា","កក្កដា","សីហា","កញ្ញា","តុលា","វិច្ឆិកា","ធ្នូ"];
export const DAYS_KH = ["ចន្ទ","អង្គារ","ពុធ","ព្រហស្បតិ៍","សុក្រ"];

// ─── CSS FACTORY ──────────────────────────────────────────────────────────────
export const mkCss = ({a,b,c,accent="#3b82f6"}) => `
@import url('https://fonts.googleapis.com/css2?family=Moul&family=Noto+Sans+Khmer:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;overflow:hidden}
:root{
  --acc:${accent};
  --acc2:color-mix(in srgb,${accent} 72%,white);
  --acc3:color-mix(in srgb,${accent} 35%,white);
  --bg0:${a};--bg1:${b};--bg2:${c};
  --glass:rgba(255,255,255,.055);
  --glass2:rgba(255,255,255,.09);
  --glass3:rgba(255,255,255,.12);
  --border:rgba(255,255,255,.08);
  --border2:rgba(255,255,255,.14);
  --t0:#f0f6ff;--t1:rgba(210,228,255,.75);
  --t2:rgba(160,195,255,.45);--t3:rgba(130,175,255,.22);
  --green:#10b981;--red:#ef4444;--gold:#f59e0b;--purple:#8b5cf6;--cyan:#06b6d4;
  --r:14px;
}
body{font-family:'Plus Jakarta Sans','Noto Sans Khmer',sans-serif;font-size:13px;line-height:1.55;color:var(--t0);background:var(--bg0)}

/* APP */
.app{max-width:430px;margin:0 auto;height:100vh;display:flex;flex-direction:column;position:relative;overflow:hidden;
  background:
    radial-gradient(ellipse 200% 80% at 15% -5%,color-mix(in srgb,var(--acc) 14%,transparent) 0%,transparent 50%),
    radial-gradient(ellipse 120% 70% at 90% 105%,color-mix(in srgb,var(--acc) 8%,transparent) 0%,transparent 55%),
    linear-gradient(168deg,var(--bg1) 0%,var(--bg0) 45%,var(--bg2) 100%);}
.app::before{content:'';position:absolute;inset:0;
  background:url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.03'/%3E%3C/svg%3E");
  pointer-events:none;z-index:0;}
.app>*{position:relative;z-index:1}

/* LAYOUT */
.sb{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px 15px 90px;display:flex;flex-direction:column;gap:12px}
.sb::-webkit-scrollbar{width:2px}.sb::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}

/* HEADER */
.hdr{padding:12px 16px;background:rgba(0,0,0,.38);border-bottom:1px solid var(--border);
  backdrop-filter:blur(48px);display:flex;align-items:center;gap:11px;flex-shrink:0;
  box-shadow:0 1px 0 rgba(255,255,255,.04);}
.hav{width:38px;height:38px;border-radius:12px;flex-shrink:0;
  border:1.5px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:18px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 4px 12px rgba(0,0,0,.3);}
.htxt{flex:1;min-width:0}
.hn{font-size:13px;font-weight:700;color:var(--t0);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hrl{font-size:10px;color:var(--t2);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hbadge{flex-shrink:0;font-size:9px;font-weight:800;padding:3px 9px;border-radius:20px;letter-spacing:.06em;
  background:color-mix(in srgb,var(--acc) 16%,transparent);color:var(--acc2);
  border:1px solid color-mix(in srgb,var(--acc) 30%,transparent);}

/* BOTTOM NAV */
.bnav{
  position:absolute;bottom:0;left:0;right:0;
  background:rgba(0,0,0,.55);border-top:1px solid var(--border);
  backdrop-filter:blur(48px);
  display:flex;padding:8px 8px 20px;gap:2px;z-index:50;
  box-shadow:0 -1px 0 rgba(255,255,255,.04);}
.bni{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;
  padding:7px 4px;border:none;border-radius:12px;cursor:pointer;
  background:transparent;color:var(--t3);font-family:inherit;transition:all .18s;}
.bni:hover{color:var(--t2);background:var(--glass)}
.bni.on{color:var(--acc2);background:color-mix(in srgb,var(--acc) 14%,transparent);}
.bni .ni{font-size:18px;transition:transform .18s}
.bni.on .ni{transform:scale(1.12)}
.bni .nl{font-size:9px;font-weight:700;letter-spacing:.04em}

/* CARDS */
.gc{background:var(--glass);border:1px solid var(--border);border-radius:20px;
  backdrop-filter:blur(24px);box-shadow:0 8px 32px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.09);}
.gch{padding:13px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:11px}
.gci{width:36px;height:36px;border-radius:11px;flex-shrink:0;
  background:color-mix(in srgb,var(--acc) 14%,transparent);
  border:1px solid color-mix(in srgb,var(--acc) 25%,transparent);
  display:flex;align-items:center;justify-content:center;font-size:17px;}
.gct{font-size:13px;font-weight:700;color:var(--t0);line-height:1.3}
.gcs{font-size:10px;color:var(--t2);margin-top:2px}
.gca{margin-left:auto;flex-shrink:0}
.gcb{padding:14px 15px;display:flex;flex-direction:column;gap:12px}

/* SECTION BOX */
.sbox{background:rgba(255,255,255,.033);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:10px}
.slbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--t2);
  display:flex;align-items:center;gap:6px;padding:1px 0 5px}
.slbl::before{content:'';width:3px;height:12px;border-radius:2px;background:var(--acc);flex-shrink:0;opacity:.75}

/* STATS GRID */
.sg{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.sg3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.sc{background:var(--glass);border:1px solid var(--border);border-radius:18px;padding:14px 15px;
  backdrop-filter:blur(12px);box-shadow:inset 0 1px 0 rgba(255,255,255,.07);
  display:flex;flex-direction:column;gap:3px;position:relative;overflow:hidden;}
.sc::after{content:'';position:absolute;top:-20px;right:-20px;width:70px;height:70px;border-radius:50%;
  background:color-mix(in srgb,var(--acc) 6%,transparent);pointer-events:none;}
.sn{font-size:26px;font-weight:800;line-height:1;letter-spacing:-.02em}
.sl{font-size:9px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.08em;margin-top:2px}
.ss{font-size:11px;color:var(--t2);margin-top:1px}

/* PROGRESS BAR */
.prog-wrap{display:flex;flex-direction:column;gap:5px}
.prog-label{display:flex;justify-content:space-between;align-items:center}
.prog-name{font-size:11px;font-weight:600;color:var(--t1)}
.prog-val{font-size:11px;font-weight:700;color:var(--acc2)}
.prog-bar{height:7px;background:rgba(255,255,255,.08);border-radius:20px;overflow:hidden}
.prog-fill{height:100%;border-radius:20px;transition:width .6s cubic-bezier(.34,1.56,.64,1);
  background:linear-gradient(90deg,var(--acc),var(--acc2));}
.prog-fill.warn{background:linear-gradient(90deg,#f59e0b,#fbbf24)}
.prog-fill.good{background:linear-gradient(90deg,#10b981,#34d399)}
.prog-fill.over{background:linear-gradient(90deg,#3b82f6,#60a5fa)}

/* KPI RING */
.kpi-ring-wrap{display:flex;flex-direction:column;align-items:center;gap:6px}
.kpi-ring-svg{position:relative}
.kpi-ring-label{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.kpi-pct{font-size:18px;font-weight:800;color:var(--t0)}
.kpi-sub{font-size:9px;color:var(--t2);text-transform:uppercase;letter-spacing:.06em}
.kpi-name{font-size:11px;font-weight:600;color:var(--t1);text-align:center}

/* TABS */
.tabs{display:flex;gap:3px;padding:4px;background:rgba(0,0,0,.32);border:1px solid var(--border);border-radius:15px;backdrop-filter:blur(16px)}
.tab{flex:1;padding:8px 5px;border:none;border-radius:11px;font-family:inherit;font-size:11px;font-weight:600;cursor:pointer;transition:all .18s;background:transparent;color:var(--t2);white-space:nowrap}
.tab.on{background:rgba(255,255,255,.1);color:var(--t0);box-shadow:0 2px 8px rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.12)}

/* FORM */
.field{display:flex;flex-direction:column;gap:5px}
.field label{font-size:10px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.1em}
.iw{position:relative}.ii{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:14px;pointer-events:none;opacity:.32}
.field input,.field select,.field textarea{width:100%;padding:10px 12px 10px 38px;background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:13px;color:var(--t0);font-size:13px;font-family:inherit;outline:none;transition:border-color .18s,background .18s,box-shadow .18s;-webkit-appearance:none}
.field input.nb,.field select.nb,.field textarea.nb{padding-left:12px}
.field input:focus,.field select:focus,.field textarea:focus{border-color:color-mix(in srgb,var(--acc) 60%,transparent);background:rgba(255,255,255,.08);box-shadow:0 0 0 3px color-mix(in srgb,var(--acc) 12%,transparent)}
.field input::placeholder,.field textarea::placeholder{color:var(--t3)}
.field select option{background:#0d1525;color:#fff}
.field textarea{resize:none;padding:10px 12px;line-height:1.6}
.r2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.r3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}

/* BUTTONS */
.btn{border:none;border-radius:13px;padding:12px 18px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;transition:all .18s;display:flex;align-items:center;justify-content:center;gap:7px;width:100%}
.btn:active{transform:scale(.96)}
.btn-pri{background:var(--acc);color:#fff;box-shadow:0 4px 20px color-mix(in srgb,var(--acc) 40%,transparent)}
.btn-pri:hover{filter:brightness(1.1);transform:translateY(-1px);box-shadow:0 8px 28px color-mix(in srgb,var(--acc) 50%,transparent)}
.btn-green{background:linear-gradient(135deg,#059669,#047857);color:#fff;box-shadow:0 4px 16px rgba(5,150,105,.28)}
.btn-green:hover{filter:brightness(1.1);transform:translateY(-1px)}
.btn-tg{background:linear-gradient(135deg,#0ea5e9,#0369a1);color:#fff;box-shadow:0 4px 16px rgba(14,165,233,.25)}
.btn-tg:hover{filter:brightness(1.1);transform:translateY(-1px)}
.btn-orange{background:linear-gradient(135deg,#f97316,#c2410c);color:#fff}
.btn-orange:hover{filter:brightness(1.1);transform:translateY(-1px)}
.btn-purple{background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff}
.btn-purple:hover{filter:brightness(1.1);transform:translateY(-1px)}
.btn-red{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff}
.btn-red:hover{filter:brightness(1.1);transform:translateY(-1px)}
.btn-ghost{background:var(--glass);border:1px solid var(--border);color:var(--t1);padding:8px 13px;font-size:11px;border-radius:10px;width:auto}
.btn-ghost:hover{background:var(--glass2);color:var(--t0)}
.btn-del{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);color:#fca5a5;padding:6px 11px;font-size:11px;border-radius:9px;width:auto;flex-shrink:0}
.btn-sm{padding:6px 12px;font-size:11px;border-radius:9px;width:auto}
.btn-xs{padding:4px 10px;font-size:10px;border-radius:8px;width:auto;font-weight:700;border:none;cursor:pointer;font-family:inherit}
.btn-approve{background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.3);color:#34d399}
.btn-reject{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.22);color:#fca5a5}

/* REPORT ITEM */
.ri{background:rgba(255,255,255,.038);border:1px solid var(--border);border-radius:14px;padding:11px 13px;display:flex;flex-direction:column;gap:4px;transition:background .15s}
.ri:hover{background:rgba(255,255,255,.06)}
.rirow{display:flex;align-items:center;justify-content:space-between;gap:8px}
.rtag{font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;background:color-mix(in srgb,var(--acc) 14%,transparent);color:var(--acc2);letter-spacing:.04em;flex-shrink:0}
.rtm{font-size:10px;color:var(--t3)}.rus{font-size:11px;color:var(--t2)}
.rbd{font-size:11px;color:var(--t2);line-height:1.75;white-space:pre-wrap;margin-top:2px}

/* STAFF CARD */
.staff-card{background:var(--glass);border:1px solid var(--border);border-radius:16px;padding:13px 14px;display:flex;align-items:center;gap:12px;transition:background .15s}
.staff-card:hover{background:var(--glass2)}
.staff-av{width:42px;height:42px;border-radius:13px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px;border:1.5px solid var(--border2)}
.staff-info{flex:1;min-width:0}
.staff-name{font-size:13px;font-weight:700;color:var(--t0)}
.staff-role{font-size:10px;color:var(--t2);margin-top:1px}
.staff-kpi{font-size:18px;font-weight:800;flex-shrink:0}

/* ACTIVITY CARD */
.act-card{background:var(--glass);border:1px solid var(--border);border-radius:18px;overflow:hidden;transition:background .15s}
.act-card:hover{background:var(--glass2)}
.act-head{padding:12px 14px;display:flex;align-items:flex-start;gap:10px;border-bottom:1px solid var(--border)}
.act-badge{font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;letter-spacing:.04em;flex-shrink:0}
.act-badge.booth{background:rgba(251,146,60,.15);color:#fb923c}
.act-badge.roadshow{background:rgba(139,92,246,.15);color:#a78bfa}
.act-title{font-size:14px;font-weight:700;color:var(--t0);flex:1}
.act-body{padding:12px 14px;display:flex;flex-direction:column;gap:8px}
.act-meta{font-size:11px;color:var(--t2);display:flex;flex-direction:column;gap:3px}
.act-members{display:flex;flex-wrap:wrap;gap:5px}
.act-member{font-size:10px;font-weight:600;padding:2px 9px;border-radius:20px}
.act-member.approved{background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.25);color:#34d399}
.act-member.pending{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.22);color:#fbbf24}
.req-row{display:flex;align-items:center;gap:8px;padding:7px 10px;background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:10px}
.req-info{flex:1;min-width:0}.req-name{font-size:12px;font-weight:600;color:var(--t0)}.req-sub{font-size:10px;color:var(--t2)}

/* TARGET vs ACTUAL ROW */
.tva-row{display:flex;flex-direction:column;gap:5px;padding:10px 12px;background:rgba(255,255,255,.025);border:1px solid var(--border);border-radius:12px}
.tva-top{display:flex;justify-content:space-between;align-items:center}
.tva-name{font-size:12px;font-weight:700;color:var(--t0)}
.tva-pct{font-size:13px;font-weight:800}

/* INFO/ERROR */
.ibox{background:color-mix(in srgb,var(--acc) 7%,transparent);border:1px solid color-mix(in srgb,var(--acc) 18%,transparent);border-radius:11px;padding:10px 13px;font-size:12px;color:var(--acc2)}
.ebox{background:rgba(239,68,68,.09);border:1px solid rgba(239,68,68,.2);border-radius:11px;padding:10px 13px;font-size:12px;color:#fca5a5}
.sbox-info{background:rgba(251,146,60,.07);border:1px solid rgba(251,146,60,.18);border-radius:11px;padding:10px 13px;font-size:11px;color:#fb923c;line-height:1.7}
.note{font-size:10px;color:var(--t3);text-align:center;line-height:1.6}
.div{height:1px;background:var(--border);margin:2px 0}
.row-between{display:flex;align-items:center;justify-content:space-between;gap:8px}

/* BADGE */
.badge{display:inline-flex;align-items:center;font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px}
.badge-blue{background:rgba(59,130,246,.14);color:#60a5fa;border:1px solid rgba(59,130,246,.25)}
.badge-green{background:rgba(16,185,129,.12);color:#34d399;border:1px solid rgba(16,185,129,.22)}
.badge-gold{background:rgba(245,158,11,.12);color:#fbbf24;border:1px solid rgba(245,158,11,.22)}
.badge-red{background:rgba(239,68,68,.1);color:#fca5a5;border:1px solid rgba(239,68,68,.2)}
.badge-purple{background:rgba(139,92,246,.12);color:#a78bfa;border:1px solid rgba(139,92,246,.22)}

/* STATUS */
.status-pending{background:rgba(245,158,11,.12);color:#fbbf24;border:1px solid rgba(245,158,11,.25);font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px}
.status-approved{background:rgba(16,185,129,.12);color:#34d399;border:1px solid rgba(16,185,129,.25);font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px}
.status-rejected{background:rgba(239,68,68,.1);color:#fca5a5;border:1px solid rgba(239,68,68,.2);font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px}

/* BG PICKER */
.bgg{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.bsw{height:56px;border-radius:14px;cursor:pointer;border:2px solid transparent;transition:all .22s;display:flex;align-items:flex-end;justify-content:center;padding-bottom:6px;position:relative;overflow:hidden}
.bsw::after{content:'';position:absolute;inset:0;background:rgba(0,0,0,.3);border-radius:12px}
.bsw-lbl{position:relative;z-index:1;font-size:9px;font-weight:700;color:rgba(255,255,255,.75);text-shadow:0 1px 4px rgba(0,0,0,.9)}
.bsw.sel{border-color:rgba(255,255,255,.85);box-shadow:0 0 0 1px rgba(255,255,255,.18),0 4px 18px rgba(0,0,0,.5)}
.bsw.sel::before{content:'✓';position:absolute;top:5px;right:7px;font-size:11px;color:#fff;font-weight:800;z-index:2}
.cinp{width:100%;height:46px;border-radius:12px;border:1px solid var(--border2);background:var(--glass);cursor:pointer;padding:4px;outline:none}
.cprev{height:46px;border-radius:12px;border:1px solid var(--border)}

/* TOAST */
.toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);
  background:linear-gradient(135deg,#059669,#047857);color:#fff;
  padding:10px 22px;border-radius:50px;font-size:12px;font-weight:700;z-index:999;
  box-shadow:0 8px 28px rgba(5,150,105,.42);white-space:nowrap;
  animation:toastPop .3s cubic-bezier(.34,1.56,.64,1) both}
@keyframes toastPop{from{opacity:0;transform:translateX(-50%) translateY(18px) scale(.9)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
.toast-err{background:linear-gradient(135deg,#dc2626,#b91c1c)}

/* LOADING */
.loading-screen{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px}
.spinner{width:38px;height:38px;border:3px solid var(--border);border-top-color:var(--acc);border-radius:50%;animation:spin .75s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* LOGIN */
.lw{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px 20px;gap:24px;overflow-y:auto}
.logo-ring{width:92px;height:92px;border-radius:26px;background:linear-gradient(145deg,var(--glass2),rgba(255,255,255,.025));
  border:1.5px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:46px;
  box-shadow:0 0 0 1px rgba(255,255,255,.05),0 20px 55px rgba(0,0,0,.55),0 0 40px color-mix(in srgb,var(--acc) 16%,transparent);
  animation:popIn .65s cubic-bezier(.34,1.56,.64,1) both}
@keyframes popIn{from{opacity:0;transform:scale(.5) translateY(28px)}to{opacity:1;transform:scale(1) translateY(0)}}
.logo-shell{display:flex;flex-direction:column;align-items:center;gap:13px}
.brand-text{text-align:center}
.brand-text h1{font-family:'Moul',serif;font-size:20px;color:#fff;letter-spacing:.04em;text-shadow:0 2px 20px rgba(0,0,0,.5)}
.brand-text .sub{font-size:10px;color:var(--t2);margin-top:4px;letter-spacing:.2em;text-transform:uppercase}
.btag{display:inline-flex;align-items:center;gap:5px;margin-top:9px;
  background:color-mix(in srgb,var(--acc) 12%,transparent);
  border:1px solid color-mix(in srgb,var(--acc) 28%,transparent);
  border-radius:30px;padding:4px 13px;font-size:11px;color:var(--acc2);font-weight:600;letter-spacing:.05em}
.lc{width:100%;max-width:360px;background:rgba(255,255,255,.065);border:1px solid var(--border2);
  backdrop-filter:blur(48px);border-radius:26px;
  box-shadow:0 24px 72px rgba(0,0,0,.45),inset 0 1.5px 0 rgba(255,255,255,.18);
  padding:24px 20px;display:flex;flex-direction:column;gap:14px;
  animation:slideUp .48s .15s cubic-bezier(.22,1,.36,1) both}
@keyframes slideUp{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:translateY(0)}}
.lc-title{font-size:15px;font-weight:700;color:var(--t0);display:flex;align-items:center;gap:8px}
.lc-title::before{content:'';width:3px;height:17px;border-radius:2px;background:var(--acc);flex-shrink:0}

/* CHART CONTAINER */
.chart-wrap{background:rgba(255,255,255,.025);border:1px solid var(--border);border-radius:14px;padding:12px 8px 6px;overflow:hidden}
.chart-title{font-size:11px;font-weight:700;color:var(--t1);padding:0 6px 10px;display:flex;align-items:center;justify-content:space-between}

/* USER ITEM */
.ui{display:flex;align-items:center;gap:11px;padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.045);transition:background .14s}
.ui:last-child{border-bottom:none}.ui:hover{background:rgba(255,255,255,.025)}
.uav{width:38px;height:38px;border-radius:12px;flex-shrink:0;background:var(--glass);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:18px}
.uinf{flex:1;min-width:0}.un{font-size:13px;font-weight:600;color:var(--t0)}.uro{font-size:10px;color:var(--t2);margin-top:1px}

/* ATTENDANCE */
.att-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
.att-cell{aspect-ratio:1;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;cursor:pointer;transition:all .15s}
.att-cell.present{background:rgba(16,185,129,.25);color:#34d399;border:1px solid rgba(16,185,129,.3)}
.att-cell.absent{background:rgba(239,68,68,.18);color:#fca5a5;border:1px solid rgba(239,68,68,.25)}
.att-cell.leave{background:rgba(245,158,11,.18);color:#fbbf24;border:1px solid rgba(245,158,11,.25)}
.att-cell.empty{background:rgba(255,255,255,.03);color:var(--t3);border:1px solid transparent}

/* SCROLLABLE TABS */
.scroll-tabs{display:flex;gap:6px;overflow-x:auto;padding:4px 0;scrollbar-width:none}
.scroll-tabs::-webkit-scrollbar{display:none}
.stab{flex-shrink:0;padding:7px 14px;border:none;border-radius:20px;font-family:inherit;font-size:11px;font-weight:600;cursor:pointer;transition:all .18s;background:var(--glass);border:1px solid var(--border);color:var(--t2);white-space:nowrap}
.stab.on{background:color-mix(in srgb,var(--acc) 18%,transparent);border-color:color-mix(in srgb,var(--acc) 35%,transparent);color:var(--acc2)}

/* INSIGHT BOX */
.insight{background:linear-gradient(135deg,color-mix(in srgb,var(--acc) 10%,transparent),rgba(255,255,255,.03));
  border:1px solid color-mix(in srgb,var(--acc) 20%,transparent);border-radius:14px;padding:12px 14px;display:flex;gap:10px;align-items:flex-start}
.insight-icon{font-size:22px;flex-shrink:0;margin-top:1px}
.insight-text{flex:1}.insight-title{font-size:12px;font-weight:700;color:var(--t0);margin-bottom:3px}
.insight-body{font-size:11px;color:var(--t2);line-height:1.6}

/* TREND ARROW */
.trend-up{color:#34d399;font-size:11px;font-weight:700}
.trend-down{color:#fca5a5;font-size:11px;font-weight:700}
.trend-same{color:var(--t2);font-size:11px;font-weight:700}
`;
