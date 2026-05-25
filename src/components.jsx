import { useState, useEffect } from "react";
import { roleConfig } from "./constants";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, RadialBarChart, RadialBar } from "recharts";

export function Toast({msg,type="ok",onDone}){
  useEffect(()=>{const t=setTimeout(onDone,2800);return()=>clearTimeout(t)},[onDone]);
  return <div className={`toast ${type==="err"?"toast-err":""}`}>{type==="ok"?"✅":"❌"} {msg}</div>;
}

export function F({label,ph="",val,set,type="text",icon="",nb=false,disabled=false}){
  return(
    <div className="field">
      {label&&<label>{label}</label>}
      <div className="iw">
        {icon&&<span className="ii">{icon}</span>}
        <input className={nb||!icon?"nb":""} type={type} placeholder={ph} value={val}
          onChange={e=>set(e.target.value)} disabled={disabled}/>
      </div>
    </div>
  );
}

export function Sel({label,val,set,opts,nb=true}){
  return(
    <div className="field">
      {label&&<label>{label}</label>}
      <select className={nb?"nb":""} value={val} onChange={e=>set(e.target.value)}>
        {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

export function GC({icon,title,sub,children,accent,action}){
  return(
    <div className="gc">
      <div className="gch">
        <div className="gci" style={accent?{background:`color-mix(in srgb,${accent} 14%,transparent)`,borderColor:`color-mix(in srgb,${accent} 25%,transparent)`}:{}}>{icon}</div>
        <div style={{flex:1,minWidth:0}}><div className="gct">{title}</div>{sub&&<div className="gcs">{sub}</div>}</div>
        {action&&<div className="gca">{action}</div>}
      </div>
      <div className="gcb">{children}</div>
    </div>
  );
}

export function SBox({label,children}){
  return <div className="sbox"><div className="slbl">{label}</div>{children}</div>;
}

export function ProgressBar({label,value,max,color,unit=""}){
  const pct = max>0 ? Math.min((value/max)*100,100) : 0;
  const cls = pct>=100?"over":pct>=75?"good":pct>=40?"":"warn";
  return(
    <div className="prog-wrap">
      <div className="prog-label">
        <span className="prog-name">{label}</span>
        <span className="prog-val">{value.toLocaleString()}{unit} <span style={{color:"var(--t3)",fontWeight:400}}>/ {max.toLocaleString()}{unit}</span></span>
      </div>
      <div className="prog-bar"><div className={`prog-fill ${cls}`} style={{width:`${pct}%`}}/></div>
      <div style={{fontSize:10,color:"var(--t2)",textAlign:"right"}}>{pct.toFixed(1)}%</div>
    </div>
  );
}

export function KPIRing({pct,name,size=90,color="#3b82f6"}){
  const r=34; const circ=2*Math.PI*r; const fill=circ*(1-Math.min(pct,100)/100);
  const col = pct>=90?"#34d399":pct>=70?"#3b82f6":pct>=50?"#f59e0b":"#ef4444";
  return(
    <div className="kpi-ring-wrap">
      <div className="kpi-ring-svg" style={{width:size,height:size}}>
        <svg width={size} height={size} viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="7"/>
          <circle cx="40" cy="40" r={r} fill="none" stroke={col} strokeWidth="7"
            strokeDasharray={circ} strokeDashoffset={fill}
            strokeLinecap="round" transform="rotate(-90 40 40)"
            style={{transition:"stroke-dashoffset .7s cubic-bezier(.34,1.56,.64,1)"}}/>
        </svg>
        <div className="kpi-ring-label">
          <div className="kpi-pct" style={{color:col,fontSize:size<80?14:18}}>{pct}%</div>
        </div>
      </div>
      <div className="kpi-name">{name}</div>
    </div>
  );
}

export function TrendBadge({current,previous}){
  if(previous===0) return null;
  const diff = ((current-previous)/previous*100).toFixed(1);
  if(diff>0) return <span className="trend-up">↑ {diff}%</span>;
  if(diff<0) return <span className="trend-down">↓ {Math.abs(diff)}%</span>;
  return <span className="trend-same">→ 0%</span>;
}

export function ReportList({reports}){
  const [filter,sf]=useState("all");
  const types=[...new Set(reports.map(r=>r.type))];
  const filtered=filter==="all"?reports:reports.filter(r=>r.type===filter);
  return(
    <>
      <div className="scroll-tabs">
        <button className={`stab ${filter==="all"?"on":""}`} onClick={()=>sf("all")}>ទំាងអស់ ({reports.length})</button>
        {types.map(t=><button key={t} className={`stab ${filter===t?"on":""}`} onClick={()=>sf(t)}>{t}</button>)}
      </div>
      <div className="gc">
        <div className="gcb">
          {filtered.length===0&&<div className="ibox">មិនទាន់មាន Report</div>}
          {filtered.map(r=>(
            <div key={r.firestoreId||r.id} className="ri">
              <div className="rirow">
                <span className="rtag">{r.type}</span>
                <span className="rtm">{new Date(r.ts).toLocaleString()}</span>
              </div>
              <div className="rus">👤 {r.user}</div>
              <div className="rbd">{r.msg}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── CHARTS ───────────────────────────────────────────────────────────────────
const TOOLTIP_STYLE={background:"rgba(10,14,30,.95)",border:"1px solid rgba(255,255,255,.12)",borderRadius:10,fontSize:11,color:"#e2e8f0",padding:"8px 12px"};

export function BarChartComp({data,keys,colors,xKey="name",title}){
  return(
    <div className="chart-wrap">
      {title&&<div className="chart-title">{title}</div>}
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{top:0,right:4,left:-20,bottom:0}}>
          <XAxis dataKey={xKey} tick={{fill:"rgba(160,195,255,.45)",fontSize:10}} axisLine={false} tickLine={false}/>
          <YAxis tick={{fill:"rgba(160,195,255,.45)",fontSize:10}} axisLine={false} tickLine={false}/>
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{fill:"rgba(255,255,255,.05)"}}/>
          {keys.map((k,i)=><Bar key={k} dataKey={k} fill={colors[i]||"#3b82f6"} radius={[4,4,0,0]} maxBarSize={32}/>)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LineChartComp({data,keys,colors,xKey="name",title}){
  return(
    <div className="chart-wrap">
      {title&&<div className="chart-title">{title}</div>}
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data} margin={{top:4,right:4,left:-20,bottom:0}}>
          <XAxis dataKey={xKey} tick={{fill:"rgba(160,195,255,.45)",fontSize:10}} axisLine={false} tickLine={false}/>
          <YAxis tick={{fill:"rgba(160,195,255,.45)",fontSize:10}} axisLine={false} tickLine={false}/>
          <Tooltip contentStyle={TOOLTIP_STYLE}/>
          {keys.map((k,i)=>(
            <Line key={k} type="monotone" dataKey={k} stroke={colors[i]||"#3b82f6"}
              strokeWidth={2.5} dot={{r:3,fill:colors[i]||"#3b82f6"}} activeDot={{r:5}}/>
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({data,title}){
  return(
    <div className="chart-wrap">
      {title&&<div className="chart-title">{title}</div>}
      <ResponsiveContainer width="100%" height={150}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
            paddingAngle={3} dataKey="value">
            {data.map((e,i)=><Cell key={i} fill={e.color||"#3b82f6"}/>)}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v,n)=>[v,n]}/>
        </PieChart>
      </ResponsiveContainer>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",padding:"0 8px 4px"}}>
        {data.map((d,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"var(--t2)"}}>
            <div style={{width:8,height:8,borderRadius:2,background:d.color,flexShrink:0}}/>
            {d.name}: <b style={{color:"var(--t0)"}}>{d.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
