import { useState, useEffect, useCallback } from "react";
import { mkCss, BG_PRESETS, roleConfig, MONTHS_KH, DAYS_KH, sendTelegram, hashPassword, verifyPassword } from "./constants";
import { Toast, F, Sel, GC, SBox, ProgressBar, KPIRing, TrendBadge, ReportList, BarChartComp, LineChartComp, DonutChart } from "./components";
import { getUsers, saveUser, deleteUser, updateUserPassword, getReports, saveReport, getTargets, saveTarget, deleteTarget, getKPIs, saveKPI, getAttendance, saveAttendance, getActivities, saveActivity, updateActivity, deleteActivity, getBg, saveBg } from "./firebase";

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
    await saveUser({id:"admin_001",username:u,passwordHash:hash,role:"admin",display:name,team:""});
    sl(false); onDone();
  };
  return(
    <div className="lw">
      <div className="logo-shell">
        <div className="logo-ring">⚙️</div>
        <div className="brand-text">
          <h1>Setup Admin</h1>
          <div className="sub">ការដំឡើងដំបូង · First Time Setup</div>
          <div className="btag">📍 541-TRD</div>
        </div>
      </div>
      <div className="lc">
        <div className="lc-title">បង្កើត Admin Account</div>
        <div className="sbox-info">🔐 Password នឹងត្រូវបាន <b>Hash SHA-256</b> រក្សាទុក Firebase — គ្មាននរណាឃើញ plaintext ទេ</div>
        <F label="ឈ្មោះបង្ហាញ" ph="ឧ. Heng Kimhong" val={name} set={sn} icon="👤"/>
        <F label="Username" ph="admin username" val={u} set={su} icon="🪪"/>
        <F label="ពាក្យសម្ងាត់" ph="8+ តួអក្សរ" val={p} set={sp} icon="🔒" type="password"/>
        <F label="បញ្ជាក់" ph="Type again..." val={p2} set={sp2} icon="🔒" type="password"/>
        {err&&<div className="ebox">{err}</div>}
        <button className="btn btn-pri" onClick={go} disabled={loading}>{loading?"កំពុងដំណើរការ...":"✅ បង្កើត Admin Account"}</button>
        <div className="note">Setup ១ ដងគ្រប់គ្រាន់ · Data cloud Firebase</div>
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({onLogin}){
  const [u,su]=useState(""); const [p,sp]=useState(""); const [err,se]=useState(""); const [loading,sl]=useState(false);
  const go=async()=>{
    sl(true); se("");
    const users=await getUsers();
    const matched=users.find(x=>x.username===u);
    if(matched&&await verifyPassword(p,matched.passwordHash)){sl(false);onLogin(matched);return;}
    sl(false); se("ឈ្មោះ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ");
  };
  return(
    <div className="lw">
      <div className="logo-shell">
        <div className="logo-ring">🏦</div>
        <div className="brand-text">
          <h1>Branch Pro</h1>
          <div className="sub">Staff Management System</div>
          <div className="btag">📍 541-TRD</div>
        </div>
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

// ─── HEADER ───────────────────────────────────────────────────────────────────
function Header({user,onLogout}){
  const cfg=roleConfig[user.role]||{};
  return(
    <div className="hdr">
      <div className="hav" style={{background:`color-mix(in srgb,${cfg.color||"#fff"} 15%,transparent)`,borderColor:`color-mix(in srgb,${cfg.color||"#fff"} 25%,transparent)`}}>{cfg.icon||"👤"}</div>
      <div className="htxt"><div className="hn">{user.display}</div><div className="hrl">{cfg.label||user.role} · 541-TRD</div></div>
      <div className="hbadge">PRO</div>
      <button className="btn-ghost" onClick={onLogout}>ចេញ</button>
    </div>
  );
}

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
const NAV_ITEMS = {
  report:     {icon:"📝",label:"Report"},
  team_view:  {icon:"👥",label:"ក្រុម"},
  dashboard:  {icon:"🏠",label:"Home"},
  analytics:  {icon:"📊",label:"Analytics"},
  activities: {icon:"📣",label:"Activity"},
  staff:      {icon:"👤",label:"Staff"},
  admin:      {icon:"⚙️",label:"Admin"},
};

function BottomNav({pages,active,setActive}){
  return(
    <div className="bnav">
      {pages.map(p=>(
        <button key={p} className={`bni ${active===p?"on":""}`} onClick={()=>setActive(p)}>
          <span className="ni">{NAV_ITEMS[p]?.icon||"?"}</span>
          <span className="nl">{NAV_ITEMS[p]?.label||p}</span>
        </button>
      ))}
    </div>
  );
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────
function DashboardPage({user}){
  const [rpts,sr]=useState([]); const [targets,st]=useState([]); const [loading,sl]=useState(true);
  const today=new Date(); const mon=today.getMonth();

  useEffect(()=>{
    Promise.all([getReports(),getTargets()]).then(([r,t])=>{sr(r);st(t);sl(false);});
  },[]);

  const monthRpts=rpts.filter(r=>new Date(r.ts).getMonth()===mon);
  const byType=t=>monthRpts.filter(r=>r.type===t).length;

  // Compute actual vs target
  const teller=targets.find(t=>t.category==="teller");
  const loan=targets.find(t=>t.category==="loan");
  const deposit=targets.find(t=>t.category==="deposit");
  const khqr=targets.find(t=>t.category==="khqr");

  // weekly trend data from reports
  const weekData=DAYS_KH.map((d,i)=>{
    const dayRpts=rpts.filter(r=>{
      const dt=new Date(r.ts); return dt.getDay()===(i+1)&&dt.getMonth()===mon;
    });
    const loanRpt=dayRpts.find(r=>r.type==="Loan"||r.type==="Loan_Officer");
    return {name:d, Loan: loanRpt?(parseFloat(loanRpt.data?.mK||0)+parseFloat(loanRpt.data?.tK||0)):0};
  });

  const donutData=[
    {name:"Teller",value:byType("Teller"),color:"#60a5fa"},
    {name:"CSA",value:byType("CSA")+byType("CSA_Officer"),color:"#34d399"},
    {name:"Loan",value:byType("Loan")+byType("Loan_Officer"),color:"#a78bfa"},
    {name:"KHQR",value:byType("MA_KHQR")+byType("MS_KHQR"),color:"#22d3ee"},
  ].filter(d=>d.value>0);

  if(loading) return <div className="sb"><div className="loading-screen"><div className="spinner"/><div style={{fontSize:11,color:"var(--t2)"}}>កំពុងផ្ទុក...</div></div></div>;

  return(
    <div className="sb">
      {/* Welcome */}
      <div className="gc">
        <div className="gcb">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:11,color:"var(--t2)",marginBottom:3}}>📅 {today.toLocaleDateString("km-KH",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</div>
              <div style={{fontSize:17,fontWeight:800,color:"var(--t0)"}}>សួស្ដី, {user.display.split(" ")[0]}! 👋</div>
              <div style={{fontSize:11,color:"var(--t2)",marginTop:3}}>MONTHS_KH[mon] — {monthRpts.length} Reports បានទទួល</div>
            </div>
            <div style={{fontSize:42}}>🏦</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="sg">
        {[
          {lbl:"Reports ថ្ងៃនេះ",val:rpts.filter(r=>new Date(r.ts).toDateString()===today.toDateString()).length,color:"#60a5fa",icon:"📋"},
          {lbl:"Reports ខែនេះ",val:monthRpts.length,color:"#34d399",icon:"📊"},
          {lbl:"Staff Active",val:rpts.filter(r=>new Date(r.ts).toDateString()===today.toDateString()).reduce((acc,r)=>{acc.add(r.user);return acc;},new Set()).size,color:"#a78bfa",icon:"👤"},
          {lbl:"Activities",val:0,color:"#fb923c",icon:"📣"},
        ].map(x=>(
          <div key={x.lbl} className="sc">
            <div style={{fontSize:22,marginBottom:4}}>{x.icon}</div>
            <div className="sn" style={{color:x.color,fontSize:24}}>{x.val}</div>
            <div className="sl">{x.lbl}</div>
          </div>
        ))}
      </div>

      {/* Target vs Actual */}
      {(teller||loan||deposit||khqr)&&(
        <GC icon="🎯" title="គោលដៅ vs អ្វីដែលបាន" sub={`ខែ ${MONTHS_KH[mon]}`} accent="#f59e0b">
          {deposit&&<ProgressBar label="🏦 Deposit" value={parseFloat(deposit.actual||0)} max={parseFloat(deposit.target||1)} unit=" M"/>}
          {loan&&<ProgressBar label="💳 Loan" value={parseFloat(loan.actual||0)} max={parseFloat(loan.target||1)} unit=" M"/>}
          {khqr&&<ProgressBar label="📱 KHQR" value={parseFloat(khqr.actual||0)} max={parseFloat(khqr.target||1)}/>}
          {teller&&<ProgressBar label="🏦 Teller Txn" value={parseFloat(teller.actual||0)} max={parseFloat(teller.target||1)}/>}
        </GC>
      )}

      {/* Donut */}
      {donutData.length>0&&<DonutChart data={donutData} title="ការបែងចែក Reports ខែនេះ"/>}

      {/* Quick insights */}
      <GC icon="💡" title="Insights" sub="ការវិភាគរហ័ស" accent="#f59e0b">
        <div className="insight">
          <div className="insight-icon">📈</div>
          <div className="insight-text">
            <div className="insight-title">Reports ថ្ងៃនេះ</div>
            <div className="insight-body">មាន {rpts.filter(r=>new Date(r.ts).toDateString()===today.toDateString()).length} reports ត្រូវបានបំពេញ។ {monthRpts.length} reports ក្នុងខែ {MONTHS_KH[mon]}។</div>
          </div>
        </div>
        {loan&&parseFloat(loan.actual)>0&&(
          <div className="insight">
            <div className="insight-icon">{parseFloat(loan.actual)/parseFloat(loan.target||1)>=1?"🏆":"⚠️"}</div>
            <div className="insight-text">
              <div className="insight-title">Loan Target</div>
              <div className="insight-body">
                {(parseFloat(loan.actual)/parseFloat(loan.target||1)*100).toFixed(1)}% នៃគោលដៅ។{" "}
                {parseFloat(loan.actual)>=parseFloat(loan.target||0)?"🎉 សម្រេចបានគោលដៅ!":"ត្រូវការ "+((parseFloat(loan.target||0)-parseFloat(loan.actual)).toFixed(2))+" M បន្ថែម"}
              </div>
            </div>
          </div>
        )}
      </GC>
    </div>
  );
}

// ─── ANALYTICS PAGE ───────────────────────────────────────────────────────────
function AnalyticsPage({user}){
  const [rpts,sr]=useState([]); const [targets,st]=useState([]); const [tab,stab]=useState("overview");
  const [loading,sl]=useState(true);
  const today=new Date(); const mon=today.getMonth();

  useEffect(()=>{
    Promise.all([getReports(),getTargets()]).then(([r,t])=>{sr(r);st(t);sl(false);});
  },[]);

  // Monthly trend — last 6 months
  const monthlyTrend=Array.from({length:6},(_,i)=>{
    const m=(mon-5+i+12)%12;
    const yr=today.getFullYear()-(mon-5+i<0?1:0);
    const mr=rpts.filter(r=>{const d=new Date(r.ts);return d.getMonth()===m&&d.getFullYear()===yr;});
    return {
      name: MONTHS_KH[m].slice(0,3),
      Teller: mr.filter(r=>r.type==="Teller").length,
      CSA: mr.filter(r=>r.type==="CSA"||r.type==="CSA_Officer").length,
      Loan: mr.filter(r=>r.type==="Loan"||r.type==="Loan_Officer").length,
    };
  });

  // Daily this month
  const daysInMonth=new Date(today.getFullYear(),mon+1,0).getDate();
  const dailyData=Array.from({length:Math.min(daysInMonth,today.getDate())},(_,i)=>{
    const d=i+1;
    const dr=rpts.filter(r=>{const dt=new Date(r.ts);return dt.getMonth()===mon&&dt.getDate()===d;});
    return {name:`${d}`, Total:dr.length};
  });

  // Staff performance
  const staffPerf={};
  rpts.filter(r=>new Date(r.ts).getMonth()===mon).forEach(r=>{
    if(!staffPerf[r.user])staffPerf[r.user]={name:r.user,count:0,types:new Set()};
    staffPerf[r.user].count++;
    staffPerf[r.user].types.add(r.type);
  });
  const staffArr=Object.values(staffPerf).sort((a,b)=>b.count-a.count).slice(0,8);
  const maxCount=staffArr[0]?.count||1;

  // Target analysis
  const tgtAnalysis=targets.map(t=>({
    name: t.category==="loan"?"💳 Loan":t.category==="deposit"?"🏦 Deposit":t.category==="khqr"?"📱 KHQR":"📋 "+t.category,
    target: parseFloat(t.target||0),
    actual: parseFloat(t.actual||0),
    pct: parseFloat(t.target)>0?(parseFloat(t.actual)/parseFloat(t.target)*100):0,
  }));

  if(loading) return <div className="sb"><div className="loading-screen"><div className="spinner"/></div></div>;

  return(
    <div className="sb">
      <div className="tabs">
        {[["overview","📊 Overview"],["trend","📈 Trend"],["staff","🏆 Staff"],["target","🎯 Target"]].map(([k,l])=>(
          <button key={k} className={`tab ${tab===k?"on":""}`} onClick={()=>stab(k)}>{l}</button>
        ))}
      </div>

      {tab==="overview"&&<>
        {/* KPI Rings */}
        {tgtAnalysis.length>0&&(
          <GC icon="📊" title="KPI Overview" sub="គោលដៅខែនេះ" accent="#3b82f6">
            <div style={{display:"flex",flexWrap:"wrap",gap:12,justifyContent:"center",padding:"4px 0"}}>
              {tgtAnalysis.map(t=><KPIRing key={t.name} pct={Math.round(t.pct)} name={t.name} size={88}/>)}
            </div>
          </GC>
        )}

        {/* Donut by report type */}
        <DonutChart
        title={`ចំហែក Reports ខែ ${MONTHS_KH[mon]}`}
        data={[
          { name: "Teller",
      value: rpts.filter(r => r.type === "Teller" && new Date(r.ts).getMonth() === mon).length },
    // ...other items..
            {name: "CSA",
             value: rpts.filter(r => (r.type === "CSA" || r.type === "CSA_Officer") && new Date(r.ts).getMonth() === mon).length,
             color: "#34d399"},
             {name: "Loan",
              value: rpts.filter(r => (r.type === "Loan" || r.type === "Loan_Officer") && new Date(r.ts).getMonth() === mon).length,
              color: "#f97316"},
          ].filter(d=>d.value>0)}
        {/* Daily activity */}
        {dailyData.length > 0 && (
  <BarChartComp
    title={`📅 Reports ប្រចាំថ្ងៃ — ${MONTHS_KH[mon]}`}
    data={dailyData}
    keys={["Total", "Approved", "Rejected"]} // replace with actual keys
  />
)}

      {tab==="trend"&&<>
        <BarChartComp
          title="📈 Reports ប្រចាំខែ (6 ខែចុងក្រោយ)"
          data={monthlyTrend} keys={["Teller","CSA","Loan"]}
          colors={["#60a5fa","#34d399","#a78bfa"]}/>
        <LineChartComp
          title="📉 Trend សរុប"
          data={monthlyTrend.map(d=>({...d,Total:d.Teller+d.CSA+d.Loan}))}
          keys={["Total"]} colors={["#fb923c"]}/>
        <GC icon="📊" title="ការប្រៀបធៀប" sub="6 ខែចុងក្រោយ" accent="#fb923c">
          {["Teller","CSA","Loan"].map(type=>{
            const vals=monthlyTrend.map(m=>m[type]);
            const avg=vals.reduce((a,b)=>a+b,0)/vals.length;
            const last=vals[vals.length-1]; const prev=vals[vals.length-2]||0;
            return(
              <div key={type} className="tva-row">
                <div className="tva-top">
                  <div className="tva-name">{type==="Teller"?"🏦":type==="CSA"?"🧾":"💳"} {type} Reports</div>
                  <TrendBadge current={last} previous={prev}/>
                </div>
                <div style={{fontSize:10,color:"var(--t2)"}}>មធ្យម: {avg.toFixed(1)} · ខែនេះ: <b style={{color:"var(--t0)"}}>{last}</b></div>
              </div>
            );
          })}
        </GC>
      </>}

      {tab==="staff"&&<>
        <GC icon="🏆" title="Staff Performance" sub={`ខែ ${MONTHS_KH[mon]}`} accent="#fbbf24">
          {staffArr.length===0&&<div className="ibox">មិនទាន់មាន data</div>}
          {staffArr.map((s,i)=>(
            <div key={s.name} style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:22,height:22,borderRadius:7,background:`rgba(251,191,36,${i===0?".25":".1"})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:i===0?"#fbbf24":"var(--t2)",flexShrink:0}}>{i+1}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:"var(--t0)",marginBottom:3}}>{s.name}</div>
                <div style={{height:5,background:"rgba(255,255,255,.07)",borderRadius:20,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${(s.count/maxCount)*100}%`,background:i===0?"linear-gradient(90deg,#f59e0b,#fbbf24)":"linear-gradient(90deg,#3b82f6,#60a5fa)",borderRadius:20,transition:"width .6s"}}/>
                </div>
              </div>
              <div style={{fontSize:13,fontWeight:800,color:i===0?"#fbbf24":"var(--t0)",flexShrink:0}}>{s.count}</div>
            </div>
          ))}
        </GC>
      </>}

      {tab==="target"&&<>
        <GC icon="🎯" title="Target vs Actual" sub="ការប្រៀបធៀបគោលដៅ" accent="#f59e0b">
          {tgtAnalysis.length===0&&<div className="ibox">មិនទាន់មានគោលដៅ — Admin ត្រូវកំណត់ Target ជាមុន</div>}
          {tgtAnalysis.map(t=>(
            <div key={t.name} className="tva-row">
              <div className="tva-top">
                <div className="tva-name">{t.name}</div>
                <div className={`tva-pct ${t.pct>=100?"trend-up":t.pct>=50?"":"trend-down"}`}>{t.pct.toFixed(1)}%</div>
              </div>
              <ProgressBar label="" value={t.actual} max={t.target}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--t2)"}}>
                <span>Actual: <b style={{color:"var(--t0)"}}>{t.actual.toLocaleString()}</b></span>
                <span>Target: <b style={{color:"var(--t0)"}}>{t.target.toLocaleString()}</b></span>
                <span>Gap: <b style={{color:t.actual>=t.target?"#34d399":"#fca5a5"}}>{(t.actual-t.target).toLocaleString()}</b></span>
              </div>
            </div>
          ))}
        </GC>
        {user.role==="dbmc"&&<SetTargetForm onSave={async(t)=>{await saveTarget(t);const tg=await getTargets();st(tg);}}/>}
      </>}
    </div>
  );
}

function SetTargetForm({onSave}){
  const [cat,sc]=useState("loan"); const [target,st]=useState(""); const [actual,sa]=useState(""); const [month,sm]=useState(new Date().toISOString().slice(0,7)); const [toast,stt]=useState("");
  const save=async()=>{
    if(!target){stt("error|សូមបំពេញ Target!");return;}
    await onSave({id:`${cat}_${month}`,category:cat,target,actual,month});
    stt("ok|Target បានរក្សាទុក!"); st(""); sa("");
  };
  return(
    <GC icon="🎯" title="កំណត់ Target" sub="DBMC Only" accent="#f59e0b">
      {toast&&<Toast msg={toast.split("|")[1]} type={toast.split("|")[0]} onDone={()=>stt("")}/>}
      <div className="r2">
        <Sel label="ប្រភេទ" val={cat} set={sc} opts={[["loan","💳 Loan"],["deposit","🏦 Deposit"],["khqr","📱 KHQR"],["teller","🏦 Teller"]]}/>
        <F label="ខែ" val={month} set={sm} nb type="month" ph=""/>
      </div>
      <div className="r2">
        <F label="Target (Plan)" ph="គោលដៅ..." val={target} set={st} nb/>
        <F label="Actual (Current)" ph="អ្វីដែលបាន..." val={actual} set={sa} nb/>
      </div>
      <button className="btn btn-orange" onClick={save}>💾 រក្សាទុក Target</button>
    </GC>
  );
}

// ─── STAFF MANAGEMENT PAGE ────────────────────────────────────────────────────
function StaffPage({user}){
  const [tab,stab]=useState("kpi");
  const [users,su]=useState([]); const [kpis,sk]=useState([]); const [att,sat]=useState([]);
  const [toast,stt]=useState(""); const [loading,sl]=useState(true);
  const today=new Date(); const mon=today.getMonth(); const yr=today.getFullYear();

  useEffect(()=>{
    Promise.all([getUsers(),getKPIs(),getAttendance()]).then(([u,k,a])=>{su(u);sk(k);sat(a);sl(false);});
  },[]);

  const staff=users.filter(u=>u.role!=="admin"&&u.role!=="bm"&&u.role!=="dbmc");

  // KPI helpers
  const getKPI=(uid)=>kpis.find(k=>k.userId===uid&&k.month===`${yr}-${String(mon+1).padStart(2,"0")}`)||{score:0,notes:""};
  const saveKPIScore=async(uid,uname,score,notes)=>{
    const id=`${uid}_${yr}_${mon+1}`;
    await saveKPI({id,userId:uid,userName:uname,score,notes,month:`${yr}-${String(mon+1).padStart(2,"0")}`});
    const k=await getKPIs(); sk(k); stt("ok|KPI បានរក្សាទុក!");
  };

  // Attendance helpers
  const getAtt=(uid,day)=>att.find(a=>a.userId===uid&&a.date===`${yr}-${String(mon+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`);
  const toggleAtt=async(uid,uname,day,cur)=>{
    const next=cur==="present"?"absent":cur==="absent"?"leave":cur==="leave"?null:"present";
    const id=`${uid}_${yr}_${mon+1}_${day}`;
    const date=`${yr}-${String(mon+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    if(!next){ const existing=att.find(a=>a.userId===uid&&a.date===date); if(existing){} return; }
    await saveAttendance({id,userId:uid,userName:uname,date,status:next});
    const a=await getAttendance(); sat(a);
  };

  const daysInMonth=new Date(yr,mon+1,0).getDate();
  const attSummary=(uid)=>{
    const myAtt=att.filter(a=>a.userId===uid&&a.date.startsWith(`${yr}-${String(mon+1).padStart(2,"0")}`));
    return {present:myAtt.filter(a=>a.status==="present").length, absent:myAtt.filter(a=>a.status==="absent").length, leave:myAtt.filter(a=>a.status==="leave").length};
  };

  if(loading) return <div className="sb"><div className="loading-screen"><div className="spinner"/></div></div>;

  return(
    <div className="sb">
      {toast&&<Toast msg={toast.split("|")[1]} type={toast.split("|")[0]} onDone={()=>stt("")}/>}
      <div className="tabs">
        {[["kpi","🏆 KPI"],["attendance","📅 Attendance"],["overview","👥 Overview"]].map(([k,l])=>(
          <button key={k} className={`tab ${tab===k?"on":""}`} onClick={()=>stab(k)}>{l}</button>
        ))}
      </div>

      {tab==="kpi"&&<>
        <GC icon="🏆" title="KPI Score" sub={`ខែ ${MONTHS_KH[mon]} ${yr}`} accent="#fbbf24">
          <div style={{display:"flex",flexWrap:"wrap",gap:12,justifyContent:"center",padding:"4px 0 8px"}}>
            {staff.map(s=>{
              const k=getKPI(s.id);
              return <KPIRing key={s.id} pct={parseInt(k.score)||0} name={s.display.split(" ").slice(0,2).join(" ")} size={84}/>;
            })}
          </div>
        </GC>
        {staff.map(s=>{
          const k=getKPI(s.id);
          return <KPIEditor key={s.id} staff={s} kpi={k} onSave={saveKPIScore}/>;
        })}
      </>}

      {tab==="attendance"&&<>
        <div className="sbox-info">ចុចលើ cell ដើម្បីប្ដូរ: 🟢 Present → 🔴 Absent → 🟡 Leave</div>
        {staff.map(s=>{
          const sum=attSummary(s.id);
          return(
            <GC key={s.id} icon={roleConfig[s.role]?.icon||"👤"} title={s.display} sub={`✅ ${sum.present} | ❌ ${sum.absent} | 🟡 ${sum.leave}`} accent={roleConfig[s.role]?.color}>
              <div className="att-grid">
                {Array.from({length:daysInMonth},(_,i)=>{
                  const d=i+1; const a=getAtt(s.id,d);
                  const st=a?.status;
                  return(
                    <div key={d} className={`att-cell ${st||"empty"}`}
                      onClick={()=>toggleAtt(s.id,s.display,d,st||null)}
                      title={`ថ្ងៃទី ${d}`}>
                      {d}
                    </div>
                  );
                })}
              </div>
            </GC>
          );
        })}
      </>}

      {tab==="overview"&&<>
        {staff.map(s=>{
          const k=getKPI(s.id); const sum=attSummary(s.id);
          return(
            <div key={s.id} className="staff-card">
              <div className="staff-av" style={{background:`color-mix(in srgb,${roleConfig[s.role]?.color||"#fff"} 14%,transparent)`,borderColor:`color-mix(in srgb,${roleConfig[s.role]?.color||"#fff"} 25%,transparent)`}}>
                {roleConfig[s.role]?.icon||"👤"}
              </div>
              <div className="staff-info">
                <div className="staff-name">{s.display}</div>
                <div className="staff-role">{roleConfig[s.role]?.label||s.role}</div>
                <div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}>
                  <span className="badge badge-green">✅ {sum.present}</span>
                  <span className="badge badge-red">❌ {sum.absent}</span>
                  <span className="badge badge-gold">🟡 {sum.leave}</span>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                <KPIRing pct={parseInt(k.score)||0} name="" size={62}/>
              </div>
            </div>
          );
        })}
      </>}
    </div>
  );
}

function KPIEditor({staff,kpi,onSave}){
  const [score,ss]=useState(String(kpi.score||""));
  const [notes,sn]=useState(kpi.notes||"");
  const [open,so]=useState(false);
  return(
    <div className="gc">
      <div className="gch" onClick={()=>so(!open)} style={{cursor:"pointer"}}>
        <div className="gci" style={{background:`color-mix(in srgb,${roleConfig[staff.role]?.color||"#fff"} 14%,transparent)`}}>
          {roleConfig[staff.role]?.icon||"👤"}
        </div>
        <div style={{flex:1}}>
          <div className="gct">{staff.display}</div>
          <div className="gcs">{roleConfig[staff.role]?.label||staff.role}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{fontSize:18,fontWeight:800,color:parseInt(score)>=90?"#34d399":parseInt(score)>=70?"#60a5fa":parseInt(score)>=50?"#f59e0b":"#fca5a5"}}>
            {score||"—"}%
          </div>
          <div style={{fontSize:12,color:"var(--t2)"}}>{open?"▲":"▼"}</div>
        </div>
      </div>
      {open&&<div className="gcb">
        <div className="r2">
          <F label="KPI Score (%)" ph="0-100" val={score} set={ss} nb/>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            <label style={{fontSize:10,fontWeight:700,color:"var(--t2)",textTransform:"uppercase",letterSpacing:".1em"}}>Level</label>
            <div style={{padding:"10px 12px",background:"rgba(255,255,255,.05)",borderRadius:13,border:"1px solid var(--border)",fontSize:13,fontWeight:700,
              color:parseInt(score)>=90?"#34d399":parseInt(score)>=70?"#60a5fa":parseInt(score)>=50?"#f59e0b":"#fca5a5"}}>
              {parseInt(score)>=90?"🏆 ល្អប្រសើរ":parseInt(score)>=70?"✅ ល្អ":parseInt(score)>=50?"⚠️ មធ្យម":"❌ ត្រូវកែ"}
            </div>
          </div>
        </div>
        <div className="field">
          <label>Notes / ការវាយតម្លៃ</label>
          <textarea className="nb" rows={2} placeholder="កំណត់ចំណាំ..." value={notes} onChange={e=>sn(e.target.value)}/>
        </div>
        <button className="btn btn-green btn-sm" style={{width:"auto",alignSelf:"flex-end"}} onClick={()=>onSave(staff.id,staff.display,score,notes)}>💾 រក្សាទុក</button>
      </div>}
    </div>
  );
}

// ─── ACTIVITIES PAGE ──────────────────────────────────────────────────────────
function ActivitiesPage({user}){
  const [tab,stab]=useState("list");
  const [acts,sa]=useState([]); const [targets,st]=useState([]); const [loading,sl]=useState(true); const [toast,stt]=useState("");
  const canEdit=user.role==="dbmc"||user.role==="admin";
  const canApprove=user.role==="dbmc"||user.role==="bm"||user.role==="admin";
  const canJoin=user.role==="loan_officer";

  useEffect(()=>{ Promise.all([getActivities(),getTargets()]).then(([a,t])=>{sa(a);st(t);sl(false);}); },[]);

  const [form,sf]=useState({title:"",type:"booth",date:"",location:"",village:"",commune:"",district:"",staffName:"",staffRole:"loan_officer",targetNew:0,targetReprint:0});
  const ff=(k,v)=>sf(p=>({...p,[k]:v}));

  const create=async()=>{
    if(!form.title||!form.date||!form.location){stt("err|សូមបំពេញ field ចាំបាច់!");return;}
    await saveActivity({...form,id:Date.now(),requests:[],createdBy:user.display,createdAt:new Date().toISOString(),actualNew:0,actualReprint:0});
    const a=await getActivities(); sa(a);
    sf({title:"",type:"booth",date:"",location:"",village:"",commune:"",district:"",staffName:"",staffRole:"loan_officer",targetNew:0,targetReprint:0});
    stt("ok|ផែនការបានបង្កើត!");
  };

  const approveReq=async(act,reqUser,approve)=>{
    const reqs=(act.requests||[]).map(r=>r.user===reqUser?{...r,status:approve?"approved":"rejected"}:r);
    await updateActivity(act.firestoreId,{requests:reqs});
    const a=await getActivities(); sa(a); stt(`ok|${approve?"អនុម័ត":"បដិសេធ"}!`);
  };

  const requestJoin=async(act)=>{
    const date=prompt("ថ្ងៃដែលចូលរួម (YYYY-MM-DD):");
    if(!date)return;
    const already=(act.requests||[]).find(r=>r.user===user.display);
    if(already){stt("err|អ្នកបានស្នើរហើយ!");return;}
    const reqs=[...(act.requests||[]),{user:user.display,role:user.role,date,status:"pending"}];
    await updateActivity(act.firestoreId,{requests:reqs});
    const a=await getActivities(); sa(a); stt("ok|ស្នើរបានផ្ញើ!");
  };

  const updateActual=async(act,field,val)=>{
    await updateActivity(act.firestoreId,{[field]:parseFloat(val)||0});
    const a=await getActivities(); sa(a);
  };

  const delAct=async(firestoreId)=>{
    if(!window.confirm("លុបផែនការនេះ?"))return;
    await deleteActivity(firestoreId); const a=await getActivities(); sa(a); stt("ok|បានលុប!");
  };

  // Activity analytics
  const actAnalytics={
    total: acts.length,
    booth: acts.filter(a=>a.type==="booth").length,
    roadshow: acts.filter(a=>a.type==="roadshow").length,
    totalNew: acts.reduce((s,a)=>s+(parseFloat(a.actualNew)||0),0),
    totalTarget: acts.reduce((s,a)=>s+(parseFloat(a.targetNew)||0),0),
    approved: acts.reduce((s,a)=>s+(a.requests||[]).filter(r=>r.status==="approved").length,0),
  };

  if(loading) return <div className="sb"><div className="loading-screen"><div className="spinner"/></div></div>;

  return(
    <div className="sb">
      {toast&&<Toast msg={toast.split("|")[1]} type={toast.split("|")[0]} onDone={()=>stt("")}/>}
      <div className="tabs">
        {[
          ["list","📋 ផែនការ"],
          ...(canEdit?[["create","➕ បង្កើត"]]:canJoin?[]:  []),
          ["analytics","📊 Analysis"],
        ].map(([k,l])=>(
          <button key={k} className={`tab ${tab===k?"on":""}`} onClick={()=>stab(k)}>{l}</button>
        ))}
      </div>

      {tab==="analytics"&&<>
        <div className="sg">
          {[
            {lbl:"ផែនការទំាងអស់",val:actAnalytics.total,color:"#fb923c",icon:"📋"},
            {lbl:"Booth",val:actAnalytics.booth,color:"#f97316",icon:"🏪"},
            {lbl:"Roadshow",val:actAnalytics.roadshow,color:"#a78bfa",icon:"🚗"},
            {lbl:"Staff ចូលរួម",val:actAnalytics.approved,color:"#34d399",icon:"👥"},
          ].map(x=><div key={x.lbl} className="sc"><div style={{fontSize:18}}>{x.icon}</div><div className="sn" style={{color:x.color,fontSize:22}}>{x.val}</div><div className="sl">{x.lbl}</div></div>)}
        </div>
        {actAnalytics.totalTarget>0&&<GC icon="📊" title="Target vs Actual" sub="Activity Performance" accent="#fb923c">
          <ProgressBar label="KHQR New Onboard" value={actAnalytics.totalNew} max={actAnalytics.totalTarget}/>
        </GC>}
        <BarChartComp title="📅 Activities ប្រភេទ" data={[{name:"Booth",Count:actAnalytics.booth},{name:"Roadshow",Count:actAnalytics.roadshow}]} keys={["Count"]} colors={["#f97316"]}/>
      </>}

      {tab==="create"&&canEdit&&<>
        <GC icon="📣" title="បង្កើតផែនការ" sub="Booth / Roadshow" accent="#fb923c">
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
          <div className="slbl">Target KHQR</div>
          <div className="r2">
            <F label="New KHQR Target" ph="0" val={String(form.targetNew)} set={v=>ff("targetNew",parseFloat(v)||0)} nb/>
            <F label="Reprint Target" ph="0" val={String(form.targetReprint)} set={v=>ff("targetReprint",parseFloat(v)||0)} nb/>
          </div>
          <div className="div"/>
          <div className="slbl">Staff ទទួលខុសត្រូវ</div>
          <F label="ឈ្មោះ Staff" ph="ឈ្មោះ..." val={form.staffName} set={v=>ff("staffName",v)} icon="👤"/>
          <Sel label="តួនាទី" val={form.staffRole} set={v=>ff("staffRole",v)} opts={Object.entries(roleConfig).filter(([k])=>k!=="admin").map(([k,v])=>[k,`${v.icon} ${v.label}`])}/>
          <button className="btn btn-orange" onClick={create}>✅ បង្កើតផែនការ</button>
        </GC>
      </>}

      {tab==="list"&&<>
        {acts.length===0&&<div className="ibox">មិនទាន់មានផែនការផ្សព្វផ្សាយ</div>}
        {acts.map(a=>(
          <div key={a.firestoreId} className="act-card">
            <div className="act-head">
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5,flexWrap:"wrap"}}>
                  <span className={`act-badge ${a.type}`}>{a.type==="booth"?"🏪 Booth":"🚗 Roadshow"}</span>
                  <span style={{fontSize:10,color:"var(--t3)"}}>📅 {a.date}</span>
                  {canEdit&&<button className="btn-xs btn-del" style={{marginLeft:"auto"}} onClick={()=>delAct(a.firestoreId)}>🗑</button>}
                </div>
                <div className="act-title">{a.title}</div>
              </div>
            </div>
            <div className="act-body">
              <div className="act-meta">
                <span>📍 {[a.location,a.village,a.commune,a.district].filter(Boolean).join(" · ")}</span>
                {a.staffName&&<span>👤 {a.staffName} · {roleConfig[a.staffRole]?.label||a.staffRole}</span>}
                <span>🏗️ By: {a.createdBy}</span>
              </div>

              {/* Target vs Actual */}
              {(a.targetNew>0||a.targetReprint>0)&&(
                <SBox label="Target vs Actual">
                  <ProgressBar label="New KHQR" value={parseFloat(a.actualNew)||0} max={parseFloat(a.targetNew)||1}/>
                  {a.targetReprint>0&&<ProgressBar label="Reprint" value={parseFloat(a.actualReprint)||0} max={parseFloat(a.targetReprint)||1}/>}
                  {canEdit&&(
                    <div className="r2">
                      <F label="Actual New" ph="0" val={String(a.actualNew||0)} set={v=>updateActual(a,"actualNew",v)} nb/>
                      <F label="Actual Reprint" ph="0" val={String(a.actualReprint||0)} set={v=>updateActual(a,"actualReprint",v)} nb/>
                    </div>
                  )}
                </SBox>
              )}

              {/* Members */}
              {(a.requests||[]).filter(r=>r.status==="approved").length>0&&(
                <div>
                  <div style={{fontSize:10,color:"var(--t2)",marginBottom:5,fontWeight:700}}>👥 ក្រុមចូលរួម</div>
                  <div className="act-members">
                    {(a.requests||[]).filter(r=>r.status==="approved").map(r=>(
                      <span key={r.user} className="act-member approved">✅ {r.user} ({r.date})</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending requests */}
              {canApprove&&(a.requests||[]).filter(r=>r.status==="pending").length>0&&(
                <SBox label="🔔 សំណើរចូលរួម">
                  {(a.requests||[]).filter(r=>r.status==="pending").map(r=>(
                    <div key={r.user} className="req-row">
                      <div className="req-info">
                        <div className="req-name">{r.user}</div>
                        <div className="req-sub">{roleConfig[r.role]?.label||r.role} · 📅 {r.date}</div>
                      </div>
                      <button className="btn-xs btn-approve" onClick={()=>approveReq(a,r.user,true)}>✓</button>
                      <button className="btn-xs btn-reject" onClick={()=>approveReq(a,r.user,false)}>✕</button>
                    </div>
                  ))}
                </SBox>
              )}

              {/* Join button */}
              {canJoin&&(()=>{
                const myReq=(a.requests||[]).find(r=>r.user===user.display);
                if(myReq) return <span className={`status-${myReq.status}`}>{myReq.status==="pending"?"⏳ រង់ចាំ":myReq.status==="approved"?"✅ អនុម័ត":"❌ បដិសេធ"}</span>;
                return <button className="btn btn-purple btn-sm" onClick={()=>requestJoin(a)}>📋 Request Join Activity</button>;
              })()}
            </div>
          </div>
        ))}
      </>}
    </div>
  );
}

// ─── REPORT FORMS ─────────────────────────────────────────────────────────────
function TellerReport({user}){
  const e={w1:"",wc1:"",d1:"",dc1:"",w2:"",wc2:"",d2:"",dc2:""};
  const [f,sf]=useState(e); const [t,st]=useState(false);
  const s=(k,v)=>sf(p=>({...p,[k]:v}));
  const submit=async()=>{
    const msg=`🏦 <b>Supervisor Teller Report</b>\n📍 541-TRD\n📅 ${new Date().toLocaleString()}\n\n<b>▸ អតិថិជននៅសាខា:</b>\n• Withdrawal: <b>${f.w1||"—"}</b> | ${f.wc1||"—"} នាក់\n• Deposits: <b>${f.d1||"—"}</b> | ${f.dc1||"—"} នាក់\n\n<b>▸ អតិថិជនក្រៅសាខា:</b>\n• Withdrawal: <b>${f.w2||"—"}</b> | ${f.wc2||"—"} នាក់\n• Deposits: <b>${f.d2||"—"}</b> | ${f.dc2||"—"} នាក់\n\n👤 ${user.display}`;
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

function CSAReport({user,isOfficer=false}){
  const [tab,stab]=useState("report");
  const e={staffName:isOfficer?user.display:"",newCif:"",newKhqr:"",deposit:"",ia:""};
  const [f,sf]=useState(e); const [toast,stt]=useState(""); const [rpts,sr]=useState([]);
  const s=(k,v)=>sf(p=>({...p,[k]:v}));
  const type=isOfficer?"CSA_Officer":"CSA";
  useEffect(()=>{ if(tab==="view") getReports().then(r=>sr(r.filter(x=>x.type==="CSA"||x.type==="CSA_Officer"))); },[tab]);
  const submit=async()=>{
    const msg=`🧾 <b>${isOfficer?"CSA Officer":"Supervisor CSA"} Report</b>\n📅 ${new Date().toLocaleString()}\n\n• Staff: <b>${f.staffName||"—"}</b>\n• New CIF: <b>${f.newCif||"—"}</b>\n• New KHQR: <b>${f.newKhqr||"—"}</b>\n• Deposit: <b>${f.deposit||"—"}</b>\n• IA: <b>${f.ia||"—"}</b>\n\n👤 ${user.display}`;
    await saveReport({type,user:user.display,data:f,msg});
    await sendTelegram(msg); sf(e); stt("ok|Report បានផ្ញើ!");
  };
  const pages=isOfficer?[["report","📝 Report"]]:[["report","📝 Report"],["view","📋 ទិន្នន័យ"]];
  return(<>{toast&&<Toast msg={toast.split("|")[1]} type={toast.split("|")[0]} onDone={()=>stt("")}/>}
    <div className="sb">
      {!isOfficer&&<div className="tabs">{pages.map(([k,l])=><button key={k} className={`tab ${tab===k?"on":""}`} onClick={()=>stab(k)}>{l}</button>)}</div>}
      {tab==="report"&&<GC icon="🧾" title={`${isOfficer?"CSA Officer":"Supervisor CSA"} Report`} sub={isOfficer?user.display:"ប្រចាំថ្ងៃ"} accent="#34d399">
        {isOfficer&&<div className="sbox-info">👤 Staff Name: <b>{user.display}</b></div>}
        {!isOfficer&&<F label="Staff Name" ph="ឈ្មោះ Staff..." val={f.staffName} set={v=>s("staffName",v)} icon="👤"/>}
        <div className="r2"><F label="New CIF" ph="ចំនួន..." val={f.newCif} set={v=>s("newCif",v)} nb/><F label="New KHQR" ph="ចំនួន..." val={f.newKhqr} set={v=>s("newKhqr",v)} nb/></div>
        <div className="r2"><F label="Deposit" ph="ចំនួន..." val={f.deposit} set={v=>s("deposit",v)} nb/><F label="IA" ph="ចំនួន..." val={f.ia} set={v=>s("ia",v)} nb/></div>
        <button className="btn btn-green" onClick={submit}>📤 Submit Report</button>
      </GC>}
      {tab==="view"&&<ReportList reports={rpts}/>}
    </div></>);
}

function LoanReport({user,isOfficer=false}){
  const [tab,stab]=useState("report");
  const td=new Date().toISOString().split("T")[0];
  const e={supName:isOfficer?user.display:"",df:td,dt:td,mK:"",mU:"",tK:"",tU:"",wK:"",wU:"",thK:"",thU:"",fK:"",fU:""};
  const [f,sf]=useState(e); const [toast,stt]=useState(""); const [rpts,sr]=useState([]);
  const s=(k,v)=>sf(p=>({...p,[k]:v}));
  const days=[{lbl:"ថ្ងៃចន្ទ",khr:"mK",usd:"mU"},{lbl:"ថ្ងៃអង្គារ",khr:"tK",usd:"tU"},{lbl:"ថ្ងៃពុធ",khr:"wK",usd:"wU"},{lbl:"ថ្ងៃព្រហស្បតិ៍",khr:"thK",usd:"thU"},{lbl:"ថ្ងៃសុក្រ",khr:"fK",usd:"fU"}];
  const type=isOfficer?"Loan_Officer":"Loan";
  useEffect(()=>{ if(tab==="view") getReports().then(r=>sr(r.filter(x=>x.type==="Loan"||x.type==="Loan_Officer"))); },[tab]);
  const submit=async()=>{
    const rows=days.map(d=>`• ${d.lbl}: KHR ${f[d.khr]||"—"} | USD ${f[d.usd]||"—"}`).join("\n");
    const msg=`💳 <b>${isOfficer?"Loan Officer":"Supervisor Loan"} Report</b>\n👤 <b>${f.supName||user.display}</b>\n📅 ${f.df} → ${f.dt}\n\n${rows}\n\n👤 ${user.display}`;
    await saveReport({type,user:user.display,data:f,msg});
    await sendTelegram(msg); sf(e); stt("ok|Report បានផ្ញើ!");
  };
  const pages=isOfficer?[["report","📝 Report"],["activities","📣 Activity"]]:[["report","📝 Report"],["view","📋 ទិន្នន័យ"]];
  return(<>{toast&&<Toast msg={toast.split("|")[1]} type={toast.split("|")[0]} onDone={()=>stt("")}/>}
    <div className="sb">
      <div className="tabs">{pages.map(([k,l])=><button key={k} className={`tab ${tab===k?"on":""}`} onClick={()=>stab(k)}>{l}</button>)}</div>
      {tab==="report"&&<>
        {isOfficer&&<div className="sbox-info">👤 Loan Name: <b>{user.display}</b></div>}
        {!isOfficer&&<GC icon="💳" title="Supervisor Loan Report" sub="ប្រចាំសប្ដាហ៍" accent="#a78bfa">
          <F label="Supervisor Name" ph="ឈ្មោះ..." val={f.supName} set={v=>s("supName",v)} icon="👤"/>
          <div className="r2"><F label="ពីថ្ងៃទី" val={f.df} set={v=>s("df",v)} nb type="date" ph=""/><F label="ដល់ថ្ងៃទី" val={f.dt} set={v=>s("dt",v)} nb type="date" ph=""/></div>
        </GC>}
        {isOfficer&&<GC icon="📄" title="Loan Officer Report" sub={user.display} accent="#c084fc">
          <div className="r2"><F label="ពីថ្ងៃទី" val={f.df} set={v=>s("df",v)} nb type="date" ph=""/><F label="ដល់ថ្ងៃទី" val={f.dt} set={v=>s("dt",v)} nb type="date" ph=""/></div>
        </GC>}
        <GC icon="📅" title="ចំនួន Loan ប្រចាំថ្ងៃ" sub="KHR / USD" accent={isOfficer?"#c084fc":"#a78bfa"}>
          {days.map((d,i)=><div key={d.khr}>{i>0&&<div className="div"/>}<div style={{fontSize:11,fontWeight:700,color:"var(--acc2)",marginBottom:6}}>{d.lbl}</div><div className="r2"><F label="KHR" ph="0" val={f[d.khr]} set={v=>s(d.khr,v)} nb/><F label="USD" ph="0" val={f[d.usd]} set={v=>s(d.usd,v)} nb/></div></div>)}
        </GC>
        <button className="btn btn-green" onClick={submit} style={{marginBottom:8}}>📤 Submit Report</button>
      </>}
      {tab==="view"&&<ReportList reports={rpts}/>}
      {tab==="activities"&&<ActivitiesPage user={user}/>}
    </div></>);
}

function KHQRReport({user,isMS=false}){
  const td=new Date().toISOString().split("T")[0];
  const e={name:"",date:td,nK:"",nU:"",rK:"",rU:"",sK:"",sU:""};
  const [f,sf]=useState(e); const [t,st]=useState(false);
  const s=(k,v)=>sf(p=>({...p,[k]:v}));
  const submit=async()=>{
    const msg=`${isMS?"🔖":"📱"} <b>${isMS?"MS":"MA"} KHQR Report</b>\n👤 <b>${f.name||"—"}</b>\n📅 ${f.date}\n\n▸ New KHQR: KHR ${f.nK||"—"} | USD ${f.nU||"—"}\n▸ Reprint: KHR ${f.rK||"—"} | USD ${f.rU||"—"}${!isMS?`\n▸ Sound Box: KHR ${f.sK||"—"} | USD ${f.sU||"—"}`:""}`;
    await saveReport({type:isMS?"MS_KHQR":"MA_KHQR",user:user.display,data:f,msg});
    await sendTelegram(msg); sf(e); st(true);
  };
  return(<>{t&&<Toast msg="Report បានផ្ញើ!" onDone={()=>st(false)}/>}
    <div className="sb">
      <GC icon={isMS?"🔖":"📱"} title={`${isMS?"MS":"MA"} KHQR Report`} sub="KHQR Onboard" accent={isMS?"#f472b6":"#22d3ee"}>
        <div className="r2"><F label={`${isMS?"MS":"MA"} Name`} ph="ឈ្មោះ..." val={f.name} set={v=>s("name",v)} nb/><F label="ថ្ងៃទី" val={f.date} set={v=>s("date",v)} nb type="date" ph=""/></div>
        <SBox label="New KHQR"><div className="r2"><F label="KHR" ph="0" val={f.nK} set={v=>s("nK",v)} nb/><F label="USD" ph="0" val={f.nU} set={v=>s("nU",v)} nb/></div></SBox>
        <SBox label="Reprint KHQR"><div className="r2"><F label="KHR" ph="0" val={f.rK} set={v=>s("rK",v)} nb/><F label="USD" ph="0" val={f.rU} set={v=>s("rU",v)} nb/></div></SBox>
        {!isMS&&<SBox label="Sound Box"><div className="r2"><F label="KHR" ph="0" val={f.sK} set={v=>s("sK",v)} nb/><F label="USD" ph="0" val={f.sU} set={v=>s("sU",v)} nb/></div></SBox>}
        <button className="btn btn-green" onClick={submit}>📤 Submit Report</button>
      </GC>
    </div></>);
}

function DBMCReport({user}){
  const e={deposit:"",cif:"",khqr:"",vU:"",vUL:"",vK:"",vKL:""};
  const [f,sf]=useState(e); const [t,st]=useState(false);
  const s=(k,v)=>sf(p=>({...p,[k]:v}));
  const submit=async()=>{
    const msg=`📊 <b>DBMC Report</b>\n📅 ${new Date().toLocaleString()}\n\n• Branch Deposit: <b>${f.deposit||"—"}</b>\n• Branch CIF: <b>${f.cif||"—"}</b>\n• Branch KHQR: <b>${f.khqr||"—"}</b>\n• B_Vault USD: <b>${f.vU||"—"}</b> | Over: ${f.vUL||"—"}\n• B_Vault KHR: <b>${f.vK||"—"}</b> | Over: ${f.vKL||"—"}\n\n👤 ${user.display}`;
    await saveReport({type:"DBMC",user:user.display,data:f,msg});
    await sendTelegram(msg); sf(e); st(true);
  };
  return(<>{t&&<Toast msg="Report បានផ្ញើ!" onDone={()=>st(false)}/>}
    <div className="sb">
      <GC icon="📊" title="DBMC Report" sub="Branch Summary" accent="#fb923c">
        <F label="Branch Deposit" ph="ចំនួន..." val={f.deposit} set={v=>s("deposit",v)} icon="💰"/>
        <div className="r2"><F label="Branch CIF" ph="ចំនួន..." val={f.cif} set={v=>s("cif",v)} nb/><F label="Branch KHQR" ph="ចំនួន..." val={f.khqr} set={v=>s("khqr",v)} nb/></div>
        <SBox label="B_Vault">
          <div className="r2"><F label="Vault USD" ph="0" val={f.vU} set={v=>s("vU",v)} nb/><F label="Over Limit USD" ph="0" val={f.vUL} set={v=>s("vUL",v)} nb/></div>
          <div className="r2"><F label="Vault KHR" ph="0" val={f.vK} set={v=>s("vK",v)} nb/><F label="Over Limit KHR" ph="0" val={f.vKL} set={v=>s("vKL",v)} nb/></div>
        </SBox>
        <button className="btn btn-green" onClick={submit}>📤 Submit Report</button>
      </GC>
    </div></>);
}

// ─── ADMIN PAGE ───────────────────────────────────────────────────────────────
function AdminPage({onBgChange}){
  const [tab,stab]=useState("users");
  const [users,su]=useState([]); const [rpts,sr]=useState([]);
  const [nu,snu]=useState({username:"",password:"",role:"supervisor_teller",display:""});
  const [toast,stt]=useState(""); const [loading,sl]=useState(true);
  const [selId,setSel]=useState("cosmos"); const [c1,sc1]=useState("#06080f"); const [c2,sc2]=useState("#0c1428");

  const load=useCallback(async()=>{ sl(true); const [u,r]=await Promise.all([getUsers(),getReports()]); su(u); sr(r); sl(false); },[]);
  useEffect(()=>{ load(); },[]);

  const addU=async()=>{
    if(!nu.username||!nu.password||!nu.display)return;
    const hash=await hashPassword(nu.password);
    await saveUser({id:`user_${Date.now()}`,username:nu.username,passwordHash:hash,role:nu.role,display:nu.display,team:""});
    snu({username:"",password:"",role:"supervisor_teller",display:""});
    stt("ok|User បានបង្កើត ✅"); load();
  };
  const delU=async(id)=>{
    if(!window.confirm("លុប User?"))return;
    await deleteUser(id); stt("ok|User បានលុប!"); load();
  };
  const applyPreset=(p)=>{ setSel(p.id); sc1(p.a); sc2(p.b); saveBg(p); onBgChange(p); stt(`ok|Theme "${p.label}" ✅`); };
  const applyCustom=()=>{ const bg={id:"custom",label:"Custom",a:c1,b:c2,c:"#000",accent:c1}; setSel("custom"); saveBg(bg); onBgChange(bg); stt("ok|Background ✅"); };

  return(
    <div className="sb">
      {toast&&<Toast msg={toast.split("|")[1]} type={toast.split("|")[0]} onDone={()=>stt("")}/>}
      <div className="scroll-tabs">
        {[["users","👥 Users"],["reports","📋 Reports"],["new","➕ Add User"],["pw","🔑 Password"],["theme","🎨 Theme"]].map(([k,l])=>(
          <button key={k} className={`stab ${tab===k?"on":""}`} onClick={()=>stab(k)}>{l}</button>
        ))}
      </div>

      {tab==="users"&&(
        <div className="gc">
          <div className="gch">
            <div className="gci" style={{background:"color-mix(in srgb,#fbbf24 14%,transparent)"}}>👥</div>
            <div><div className="gct">Users ទាំងអស់</div><div className="gcs">{users.length} accounts · Firebase Cloud</div></div>
          </div>
          {loading?<div style={{padding:20,textAlign:"center"}}><div className="spinner" style={{margin:"0 auto"}}/></div>:
          users.map(u=>(
            <div key={u.id} className="ui">
              <div className="uav" style={{background:`color-mix(in srgb,${roleConfig[u.role]?.color||"#fff"} 12%,transparent)`,borderColor:`color-mix(in srgb,${roleConfig[u.role]?.color||"#fff"} 22%,transparent)`}}>
                {roleConfig[u.role]?.icon||"👤"}
              </div>
              <div className="uinf"><div className="un">{u.display}</div><div className="uro">@{u.username} · {roleConfig[u.role]?.label||u.role}</div></div>
              {u.role!=="admin"&&<button className="btn-del" onClick={()=>delU(u.id)}>លុប</button>}
            </div>
          ))}
        </div>
      )}

      {tab==="reports"&&<ReportList reports={rpts}/>}

      {tab==="new"&&(
        <GC icon="➕" title="បង្កើត User ថ្មី" accent="#34d399">
          <F label="ឈ្មោះបង្ហាញ" ph="Display Name..." val={nu.display} set={v=>snu(p=>({...p,display:v}))} icon="✏️"/>
          <div className="r2">
            <F label="Username" ph="username" val={nu.username} set={v=>snu(p=>({...p,username:v}))} nb/>
            <F label="Password" ph="8+ chars" val={nu.password} set={v=>snu(p=>({...p,password:v}))} nb type="password"/>
          </div>
          <Sel label="Role" val={nu.role} set={v=>snu(p=>({...p,role:v}))} opts={Object.entries(roleConfig).filter(([k])=>k!=="admin").map(([k,v])=>[k,`${v.icon} ${v.label}`])}/>
          <button className="btn btn-green" onClick={addU}>✅ បង្កើត User</button>
        </GC>
      )}

      {tab==="pw"&&<ResetPWForm users={users} onDone={()=>stt("ok|Password ✅")}/>}

      {tab==="theme"&&(
        <GC icon="🎨" title="ប្ដូរ Background" sub="Admin Only · Live Preview" accent="#fbbf24">
          <div className="slbl">Preset Themes</div>
          <div className="bgg">
            {BG_PRESETS.map(p=>(
              <div key={p.id} className={`bsw ${selId===p.id?"sel":""}`}
                style={{background:`linear-gradient(145deg,${p.a},${p.b},${p.c})`}}
                onClick={()=>applyPreset(p)}>
                <span className="bsw-lbl">{p.label}</span>
              </div>
            ))}
          </div>
          <div className="slbl">Custom Gradient</div>
          <div className="r2">
            <div style={{display:"flex",flexDirection:"column",gap:5}}><label style={{fontSize:10,fontWeight:700,color:"var(--t2)",textTransform:"uppercase",letterSpacing:".09em"}}>ពណ៌ ១</label><input type="color" className="cinp" value={c1} onChange={e=>sc1(e.target.value)}/></div>
            <div style={{display:"flex",flexDirection:"column",gap:5}}><label style={{fontSize:10,fontWeight:700,color:"var(--t2)",textTransform:"uppercase",letterSpacing:".09em"}}>ពណ៌ ២</label><input type="color" className="cinp" value={c2} onChange={e=>sc2(e.target.value)}/></div>
          </div>
          <div className="cprev" style={{background:`linear-gradient(135deg,${c1},${c2})`}}/>
          <button className="btn btn-green" onClick={applyCustom}>✅ អនុវត្ត</button>
          <div className="note">ការប្ដូរ Background នឹងមានឥទ្ធិពលភ្លាមៗ</div>
        </GC>
      )}
    </div>
  );
}

function ResetPWForm({users,onDone}){
  const [sel,ss]=useState(""); const [p,sp]=useState(""); const [p2,sp2]=useState(""); const [err,se]=useState("");
  const go=async()=>{
    if(!sel){se("ជ្រើស User!");return;} if(p.length<8){se("8+ chars!");return;} if(p!==p2){se("មិនដូចគ្នា!");return;}
    se(""); const h=await hashPassword(p); await updateUserPassword(sel,h); sp(""); sp2(""); ss(""); onDone();
  };
  return(
    <GC icon="🔑" title="Reset Password" sub="SHA-256 · Firebase" accent="#fbbf24">
      <div className="sbox-info">🔐 Hash SHA-256 ភ្លាមៗ — គ្មាន plaintext ទេ</div>
      <div className="field"><label>ជ្រើស User</label>
        <select className="nb" value={sel} onChange={e=>ss(e.target.value)}>
          <option value="">-- ជ្រើស --</option>
          {users.map(x=><option key={x.id} value={x.id}>{x.display} (@{x.username})</option>)}
        </select>
      </div>
      <F label="Password ថ្មី" ph="8+ chars" val={p} set={sp} icon="🔒" type="password"/>
      <F label="បញ្ជាក់" ph="Type again..." val={p2} set={sp2} icon="🔒" type="password"/>
      {err&&<div className="ebox">{err}</div>}
      <button className="btn btn-green" onClick={go}>🔑 ប្ដូរ Password</button>
    </GC>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App(){
  const [user,su]=useState(null);
  const [bg,sbg]=useState(BG_PRESETS[0]);
  const [status,ss]=useState("loading");
  const [activePage,sp]=useState("dashboard");

  useEffect(()=>{
    getBg().then(b=>{ if(b) sbg(b); });
    getUsers().then(users=>{
      ss(users.some(u=>u.role==="admin")?"ready":"setup");
    }).catch(()=>ss("setup"));
  },[]);

  // Set default page per role
  const handleLogin=(u)=>{
    su(u);
    const pages=roleConfig[u.role]?.nav||["report"];
    sp(pages[0]);
  };

  const pages=user?roleConfig[user.role]?.nav||["report"]:[];

  const renderPage=()=>{
    if(!user) return null;
    const r=user.role;
    switch(activePage){
      case "dashboard":   return <DashboardPage user={user}/>;
      case "analytics":   return <AnalyticsPage user={user}/>;
      case "staff":       return <StaffPage user={user}/>;
      case "activities":  return <ActivitiesPage user={user}/>;
      case "admin":       return <AdminPage onBgChange={v=>sbg(v)}/>;
      case "team_view":
        if(r==="supervisor_csa") return <div className="sb"><ReportList reports={[]}/></div>;
        if(r==="supervisor_loan") return <div className="sb"><ReportList reports={[]}/></div>;
        return null;
      case "report":
        if(r==="supervisor_teller") return <TellerReport user={user}/>;
        if(r==="supervisor_csa")    return <CSAReport user={user}/>;
        if(r==="supervisor_loan")   return <LoanReport user={user}/>;
        if(r==="loan_officer")      return <LoanReport user={user} isOfficer/>;
        if(r==="csa_officer")       return <CSAReport user={user} isOfficer/>;
        if(r==="ma_khqr")           return <KHQRReport user={user}/>;
        if(r==="ms_khqr")           return <KHQRReport user={user} isMS/>;
        if(r==="dbmc")              return <DBMCReport user={user}/>;
        return null;
      default: return <div className="sb"><div className="ibox">Page មិនស្គាល់</div></div>;
    }
  };

  // Team view: load reports for supervisor
  const [teamRpts,str]=useState([]);
  useEffect(()=>{
    if(user&&activePage==="team_view"){
      const typeMap={supervisor_csa:["CSA","CSA_Officer"],supervisor_loan:["Loan","Loan_Officer"]};
      const types=typeMap[user.role]||[];
      getReports().then(r=>str(r.filter(x=>types.includes(x.type))));
    }
  },[activePage,user]);

  return(
    <>
      <style>{mkCss(bg)}</style>
      <div className="app">
        {status==="loading"&&(
          <div className="loading-screen">
            <div className="logo-ring" style={{width:72,height:72,fontSize:36,animation:"none"}}>🏦</div>
            <div className="spinner"/>
            <div style={{fontSize:11,color:"var(--t2)"}}>Branch Pro · 541-TRD</div>
          </div>
        )}
        {status==="setup"&&<SetupWizard onDone={()=>ss("ready")}/>}
        {status==="ready"&&!user&&<Login onLogin={handleLogin}/>}
        {status==="ready"&&user&&<>
          <Header user={user} onLogout={()=>{su(null);}}/>
          {activePage==="team_view"
            ? <div className="sb"><ReportList reports={teamRpts}/></div>
            : renderPage()
          }
          <BottomNav pages={pages} active={activePage} setActive={sp}/>
        </>}
      </div>
    </>
  );
}
