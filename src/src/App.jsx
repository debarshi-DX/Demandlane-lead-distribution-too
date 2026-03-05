import { useState, useRef } from "react";

const ALL_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const LEVINE_STATES = ["CT","MA","ME","NH","NY","RI","VT","PA","NJ","MD","VA","WV","NC","SC","GA","FL","OH","MI","IN","KY","TN","AL","MS"];
const MIDWEST_STATES = ["MN","WI","MI","MO","OH","IN","IL","IA","KS","NE","ND","SD","KY","TN","AL","MS","GA","FL","NC","SC"];
const NON_LEVINE = ALL_STATES.filter(s => !LEVINE_STATES.includes(s));
const ALL_DISEASES = ["Back Problems","Depression","Arthritis","Diabetes","Heart Issues","COPD","Blood Pressure","PTSD","Fibromyalgia","Bipolar","Other"];
const SEND_MODES = [
  { value:"both",  label:"Calls + Leads", icon:"📞+📋", color:"#6366f1", bg:"#ede9fe" },
  { value:"calls", label:"Calls only",    icon:"📞",     color:"#0891b2", bg:"#e0f2fe" },
  { value:"leads", label:"Leads only",    icon:"📋",     color:"#15803d", bg:"#dcfce7" },
];
const G = { A:{bg:"#dcfce7",text:"#15803d"}, B:{bg:"#dbeafe",text:"#1d4ed8"}, C:{bg:"#fef9c3",text:"#a16207"}, D:{bg:"#fee2e2",text:"#b91c1c"} };
const STATE_PRESETS = [
  {label:"All 50",states:ALL_STATES},{label:"Levine (23)",states:LEVINE_STATES},
  {label:"Non-Levine (27)",states:NON_LEVINE},{label:"Midwest+SE",states:MIDWEST_STATES},{label:"PA & NJ",states:["PA","NJ"]},
];
const MAX_LOG = 50;

function parseStates(s) {
  if (!s || s === "All 50 states") return [...ALL_STATES];
  if (s === "Levine states (23)") return [...LEVINE_STATES];
  if (s === "19 states (Midwest + SE)") return [...MIDWEST_STATES];
  if (s === "Non-Levine (27)") return [...NON_LEVINE];
  if (s === "PA and NJ only") return ["PA","NJ"];
  if (s === "AZ, NV, NM, CO") return ["AZ","NV","NM","CO"];
  if (s === "MN, WI, MI, MO") return ["MN","WI","MI","MO"];
  return s.split(",").map(x => x.trim()).filter(x => ALL_STATES.includes(x));
}

function statesLabel(arr) {
  if (!arr || !arr.length) return "⚠ None";
  if (arr.length === 50) return "All 50";
  if (arr.length === LEVINE_STATES.length && LEVINE_STATES.every(s => arr.includes(s))) return "Levine (23)";
  if (arr.length === NON_LEVINE.length && NON_LEVINE.every(s => arr.includes(s))) return "Non-Levine (27)";
  if (arr.length === MIDWEST_STATES.length && MIDWEST_STATES.every(s => arr.includes(s))) return "Midwest+SE";
  if (arr.length <= 3) return arr.join(", ");
  return arr.length + " states";
}

function diseasesLabel(arr) {
  if (!arr || !arr.length) return "⚠ None";
  if (arr.length === ALL_DISEASES.length) return "All diseases";
  if (arr.length <= 2) return arr.join(", ");
  return arr.length + " diseases";
}

function today() { return new Date().toISOString().slice(0,10); }
function nowFull() { return new Date().toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}); }

function fillHealthColor(pct, on) {
  if (!on) return "#e2e8f0";
  if (pct === null) return "#bbf7d0";
  if (pct >= 100) return "#fca5a5";
  if (pct >= 80) return "#fde68a";
  if (pct >= 1) return "#bbf7d0";
  return "#fed7aa";
}

function generateDemoData(clients, dateStr) {
  const rnd = (id, max) => {
    let h = 0;
    for (let c of id + dateStr) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
    return Math.floor(h % max);
  };
  const result = {};
  clients.forEach(c => {
    const cap = c.dailyCap || (c.gradeACap < 999 ? c.gradeACap + c.gradeBCap + c.gradeCCap : null);
    result[c.id] = { sent: c.on ? rnd(c.id, (cap || 30) + 1) : 0, cap };
  });
  return result;
}

function describeChange(oldC, newC) {
  const changes = [];
  if (oldC.on !== newC.on) changes.push("turned " + (newC.on ? "ON" : "OFF"));
  if (oldC.throttle !== newC.throttle) changes.push("flow rate → " + newC.throttle + "%");
  if (oldC.gradeACap !== newC.gradeACap) changes.push("Grade A cap → " + (newC.gradeACap >= 999 ? "∞" : newC.gradeACap));
  if (oldC.gradeBCap !== newC.gradeBCap) changes.push("Grade B cap → " + (newC.gradeBCap >= 999 ? "∞" : newC.gradeBCap));
  if (oldC.gradeCCap !== newC.gradeCCap) changes.push("Grade C cap → " + (newC.gradeCCap >= 999 ? "∞" : newC.gradeCCap));
  if (oldC.gradeDCap !== newC.gradeDCap) changes.push("Grade D cap → " + (newC.gradeDCap >= 999 ? "∞" : newC.gradeDCap));
  if (oldC.dailyCap !== newC.dailyCap) changes.push("daily cap → " + (newC.dailyCap ?? "∞"));
  if (oldC.startTime !== newC.startTime) changes.push("start → " + newC.startTime);
  if (oldC.endTime !== newC.endTime) changes.push("end → " + newC.endTime);
  if (oldC.sendMode !== newC.sendMode) changes.push("send mode → " + newC.sendMode);
  if (oldC.notes !== newC.notes) changes.push("notes updated");
  if (oldC.contactName !== newC.contactName || oldC.contactPhone !== newC.contactPhone) changes.push("contact updated");
  if (JSON.stringify(oldC.selectedStates) !== JSON.stringify(newC.selectedStates)) changes.push("states → " + statesLabel(newC.selectedStates));
  if (JSON.stringify(oldC.selectedDiseases) !== JSON.stringify(newC.selectedDiseases)) changes.push("diseases → " + diseasesLabel(newC.selectedDiseases));
  return changes.join(", ");
}

const CLIENTS_RAW = [
  { id:"roeschke",          name:"Roeschke",           type:"Paying",  hours:"Business hrs", gradeACap:6,   gradeBCap:3,   gradeCCap:0,  gradeDCap:0,  dailyCap:null, startTime:"09:00", endTime:"15:45", throttle:100, on:true,  statesStr:"AZ, NV, NM, CO",           sendMode:"both",  contactName:"", contactPhone:"", notes:"", peers:null, warning:null },
  { id:"hoglund",           name:"Hoglund",            type:"Paying",  hours:"Business hrs", gradeACap:8,   gradeBCap:4,   gradeCCap:0,  gradeDCap:0,  dailyCap:null, startTime:"05:00", endTime:"18:00", throttle:100, on:true,  statesStr:"MN, WI, MI, MO",           sendMode:"calls", contactName:"", contactPhone:"", notes:"", peers:null, warning:null },
  { id:"fieldslawo49seg",   name:"Fields O49 Seg",     type:"Paying",  hours:"Business hrs", gradeACap:45,  gradeBCap:15,  gradeCCap:0,  gradeDCap:0,  dailyCap:50,   startTime:"06:00", endTime:"15:00", throttle:100, on:true,  statesStr:"All 50 states",            sendMode:"both",  contactName:"", contactPhone:"", notes:"", peers:null, warning:"Contract cap: 50/day" },
  { id:"premierleadsctclo", name:"Premier Leads CTC",  type:"Paying",  hours:"Business hrs", gradeACap:6,   gradeBCap:2,   gradeCCap:0,  gradeDCap:0,  dailyCap:null, startTime:"06:00", endTime:"17:00", throttle:100, on:true,  statesStr:"All 50 states",            sendMode:"leads", contactName:"", contactPhone:"", notes:"", peers:null, warning:null },
  { id:"fieldslawo49",      name:"Fields O49",         type:"Paying",  hours:"Business hrs", gradeACap:45,  gradeBCap:15,  gradeCCap:0,  gradeDCap:0,  dailyCap:50,   startTime:"06:00", endTime:"15:00", throttle:100, on:true,  statesStr:"All 50 states",            sendMode:"both",  contactName:"", contactPhone:"", notes:"", peers:null, warning:"Contract cap: 50/day" },
  { id:"midwest",           name:"Midwest",            type:"Paying",  hours:"Business hrs", gradeACap:40,  gradeBCap:15,  gradeCCap:0,  gradeDCap:0,  dailyCap:33,   startTime:"06:00", endTime:"15:00", throttle:100, on:true,  statesStr:"19 states (Midwest + SE)", sendMode:"calls", contactName:"", contactPhone:"", notes:"", peers:"Shares 70/30 with Rob Levine NTW", warning:"Contract cap: 33/day" },
  { id:"roblevinentw",      name:"Rob Levine NTW",     type:"Paying",  hours:"Business hrs", gradeACap:121, gradeBCap:40,  gradeCCap:0,  gradeDCap:0,  dailyCap:null, startTime:"06:00", endTime:"16:00", throttle:100, on:true,  statesStr:"Levine states (23)",        sendMode:"calls", contactName:"", contactPhone:"", notes:"", peers:"Shares 30/70 with Midwest", warning:null },
  { id:"roblevine",         name:"Rob Levine",         type:"Paying",  hours:"Business hrs", gradeACap:75,  gradeBCap:75,  gradeCCap:75, gradeDCap:0,  dailyCap:75,   startTime:"06:00", endTime:"16:00", throttle:100, on:true,  statesStr:"Levine states (23)",        sendMode:"both",  contactName:"", contactPhone:"", notes:"", peers:null, warning:"Part-time only. Cap: 75/day" },
  { id:"tabak",             name:"Tabak",              type:"Paying",  hours:"Business hrs", gradeACap:30,  gradeBCap:0,   gradeCCap:0,  gradeDCap:0,  dailyCap:19,   startTime:"06:00", endTime:"15:55", throttle:100, on:true,  statesStr:"All 50 states",            sendMode:"calls", contactName:"", contactPhone:"", notes:"", peers:null, warning:"NEVER exceed 19/day" },
  { id:"roblevinec",        name:"Rob Levine C",       type:"Paying",  hours:"Business hrs", gradeACap:0,   gradeBCap:0,   gradeCCap:80, gradeDCap:0,  dailyCap:null, startTime:"06:00", endTime:"16:00", throttle:100, on:true,  statesStr:"Levine states (23)",        sendMode:"leads", contactName:"", contactPhone:"", notes:"", peers:null, warning:"Grade C ONLY. Max 10/hour." },
  { id:"fieldslawu49",      name:"Fields U49",         type:"Paying",  hours:"Business hrs", gradeACap:100, gradeBCap:10,  gradeCCap:0,  gradeDCap:0,  dailyCap:50,   startTime:"06:00", endTime:"15:00", throttle:100, on:true,  statesStr:"All 50 states",            sendMode:"both",  contactName:"", contactPhone:"", notes:"", peers:"Shares 80/20 with Fields U49 Seg", warning:"Under-49 only. Cap: 50/day" },
  { id:"fieldslawu49seg",   name:"Fields U49 Seg",     type:"Paying",  hours:"Business hrs", gradeACap:100, gradeBCap:10,  gradeCCap:0,  gradeDCap:0,  dailyCap:50,   startTime:"06:00", endTime:"15:00", throttle:100, on:true,  statesStr:"All 50 states",            sendMode:"both",  contactName:"", contactPhone:"", notes:"", peers:"Shares 20/80 with Fields U49", warning:"Under-49 only" },
  { id:"tabakAH",           name:"Tabak AH",           type:"Paying",  hours:"After hrs",    gradeACap:12,  gradeBCap:0,   gradeCCap:0,  gradeDCap:0,  dailyCap:null, startTime:"16:30", endTime:"05:30", throttle:100, on:true,  statesStr:"All 50 states",            sendMode:"calls", contactName:"", contactPhone:"", notes:"", peers:null, warning:"Grade A only" },
  { id:"roblevineAH",       name:"Rob Levine AH",      type:"Paying",  hours:"After hrs",    gradeACap:50,  gradeBCap:20,  gradeCCap:0,  gradeDCap:0,  dailyCap:null, startTime:"16:30", endTime:"05:30", throttle:100, on:true,  statesStr:"Levine states (23)",        sendMode:"calls", contactName:"", contactPhone:"", notes:"", peers:null, warning:"Part-time only" },
  { id:"midwestAH",         name:"Midwest AH",         type:"Paying",  hours:"After hrs",    gradeACap:30,  gradeBCap:10,  gradeCCap:0,  gradeDCap:0,  dailyCap:null, startTime:"16:30", endTime:"05:30", throttle:100, on:true,  statesStr:"19 states (Midwest + SE)", sendMode:"both",  contactName:"", contactPhone:"", notes:"", peers:"Shares 50/50 with NTW AH", warning:null },
  { id:"fortis",            name:"Fortis",             type:"Inhouse", hours:"Business hrs", gradeACap:999, gradeBCap:999, gradeCCap:0,  gradeDCap:0,  dailyCap:null, startTime:"06:00", endTime:"15:55", throttle:100, on:true,  statesStr:"All 50 states",            sendMode:"both",  contactName:"", contactPhone:"", notes:"", peers:null, warning:"Requires pending app + no attorney" },
  { id:"disabilitypathPA",  name:"DP PA",              type:"Inhouse", hours:"Business hrs", gradeACap:75,  gradeBCap:25,  gradeCCap:50, gradeDCap:0,  dailyCap:null, startTime:"06:00", endTime:"15:45", throttle:100, on:true,  statesStr:"All 50 states",            sendMode:"both",  contactName:"", contactPhone:"", notes:"", peers:null, warning:null },
  { id:"disabilitypath",    name:"DisabilityPath ⚡",  type:"Inhouse", hours:"24/7",         gradeACap:999, gradeBCap:999, gradeCCap:999,gradeDCap:999,dailyCap:null, startTime:"00:00", endTime:"23:59", throttle:100, on:true,  statesStr:"All 50 states",            sendMode:"both",  contactName:"", contactPhone:"", notes:"", peers:null, warning:"LAST RESORT" },
];

const CLIENTS = CLIENTS_RAW.map((c, i) => ({
  ...c,
  selectedStates: parseStates(c.statesStr),
  selectedDiseases: [...ALL_DISEASES],
  priority: i,
}));

function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)}
      style={{ width:44, height:24, borderRadius:12, border:"none", cursor:"pointer",
        background: on ? "#16a34a" : "#d1d5db", position:"relative", flexShrink:0, transition:"background .18s" }}>
      <span style={{ position:"absolute", top:3, left: on ? 22 : 3, width:18, height:18,
        borderRadius:"50%", background:"white", boxShadow:"0 1px 3px rgba(0,0,0,.3)",
        transition:"left .18s", display:"block" }} />
    </button>
  );
}

function CapInput({ value, onChange, highlight, gradeColor }) {
  return (
    <input type="number" min={0} max={999}
      value={value >= 999 ? "" : value} placeholder="∞"
      onChange={e => onChange(e.target.value === "" ? 999 : Math.max(0, Math.min(999, parseInt(e.target.value) || 0)))}
      style={{ width:52, height:30, border:`2px solid ${highlight ? gradeColor || "#6366f1" : "#e5e7eb"}`,
        borderRadius:7, textAlign:"center", fontSize:13, fontWeight:700,
        color: value >= 999 ? "#94a3b8" : "#111827", fontFamily:"inherit", outline:"none", background:"white" }}
      onFocus={e => { e.target.style.borderColor = gradeColor || "#6366f1"; }}
      onBlur={e => { e.target.style.borderColor = highlight ? gradeColor || "#6366f1" : "#e5e7eb"; }} />
  );
}

function TimeInput({ value, onChange }) {
  return (
    <input type="time" value={value} onChange={e => onChange(e.target.value)}
      style={{ height:30, padding:"0 5px", border:"2px solid #e5e7eb", borderRadius:7,
        fontSize:11, fontWeight:600, color:"#111827", fontFamily:"inherit",
        outline:"none", background:"white", cursor:"pointer", width:86 }}
      onFocus={e => { e.target.style.borderColor = "#6366f1"; }}
      onBlur={e => { e.target.style.borderColor = "#e5e7eb"; }} />
  );
}

function ThrottleSelect({ value, onChange }) {
  return (
    <select value={value} onChange={e => onChange(Number(e.target.value))}
      style={{ height:30, padding:"0 5px", border:"2px solid", borderRadius:7, fontSize:11,
        fontWeight:700, fontFamily:"inherit", outline:"none", background:"white", cursor:"pointer", width:88,
        color: value === 100 ? "#16a34a" : value === 0 ? "#dc2626" : "#d97706",
        borderColor: value === 100 ? "#86efac" : value === 0 ? "#fca5a5" : "#fde047" }}>
      <option value={100}>100% Full</option>
      <option value={75}>75%</option>
      <option value={50}>50%</option>
      <option value={25}>25%</option>
      <option value={0}>0% Off</option>
    </select>
  );
}

function FillBar({ pct }) {
  return (
    <div style={{ width:"100%", height:7, borderRadius:3, background:"#f1f5f9", overflow:"hidden" }}>
      <div style={{ width:`${Math.min(pct, 100)}%`, height:"100%", borderRadius:3,
        background: pct >= 100 ? "#dc2626" : pct >= 80 ? "#f59e0b" : pct >= 1 ? "#16a34a" : "#93c5fd",
        transition:"width .4s" }} />
    </div>
  );
}

function CheckGrid({ items, selected, onChange, columns = 3 }) {
  const toggle = s => onChange(selected.includes(s) ? selected.filter(x => x !== s) : [...selected, s]);
  return (
    <div style={{ display:"grid", gridTemplateColumns:`repeat(${columns}, 1fr)`, gap:4 }}>
      {items.map(s => (
        <label key={s} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 8px",
          borderRadius:7, cursor:"pointer", border:"1.5px solid",
          borderColor: selected.includes(s) ? "#6366f1" : "#e5e7eb",
          background: selected.includes(s) ? "#ede9fe" : "white",
          fontSize:12, fontWeight: selected.includes(s) ? 700 : 400,
          color: selected.includes(s) ? "#6366f1" : "#374151", transition:"all .12s" }}>
          <input type="checkbox" checked={selected.includes(s)} onChange={() => toggle(s)}
            style={{ width:13, height:13, accentColor:"#6366f1", cursor:"pointer", flexShrink:0 }} />
          {s}
        </label>
      ))}
    </div>
  );
}

function SidePanel({ client, onClose, onChange }) {
  if (!client) return null;
  const upd = (f, v) => onChange({ ...client, [f]: v });
  const isInhouse = client.type === "Inhouse";

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.35)", zIndex:100, backdropFilter:"blur(2px)" }} />
      <div style={{ position:"fixed", top:0, right:0, height:"100vh", width:440, background:"white",
        zIndex:101, boxShadow:"-8px 0 40px rgba(0,0,0,.18)", overflowY:"auto", display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"20px 24px 16px", borderBottom:"1.5px solid #f1f5f9",
          background: isInhouse ? "#fff5f5" : "#f8fafc", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:20, fontWeight:900, color: isInhouse ? "#dc2626" : "#0f172a" }}>{client.name}</div>
              <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>
                {client.type} · {client.hours}
                {client.peers && <span style={{ color:"#a78bfa" }}> · ↔ {client.peers}</span>}
              </div>
            </div>
            <button onClick={onClose} style={{ width:34, height:34, borderRadius:8, border:"1.5px solid #e5e7eb",
              background:"white", cursor:"pointer", fontSize:18, color:"#64748b",
              display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
          </div>
          {client.warning && (
            <div style={{ marginTop:10, padding:"8px 12px", background:"#fffbeb",
              border:"1.5px solid #fde68a", borderRadius:8, fontSize:12, color:"#92400e", fontWeight:600 }}>
              ⚠ {client.warning}
            </div>
          )}
        </div>

        <div style={{ padding:"20px 24px", flex:1, display:"flex", flexDirection:"column", gap:20 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:"#0f172a", marginBottom:10 }}>📤 Send Mode</div>
            <div style={{ display:"flex", gap:8 }}>
              {SEND_MODES.map(m => (
                <button key={m.value} onClick={() => upd("sendMode", m.value)}
                  style={{ flex:1, padding:"10px 8px", borderRadius:10,
                    border:`2px solid ${client.sendMode === m.value ? m.color : "#e5e7eb"}`,
                    background: client.sendMode === m.value ? m.bg : "white",
                    cursor:"pointer", fontFamily:"inherit", transition:"all .15s" }}>
                  <div style={{ fontSize:18, marginBottom:4 }}>{m.icon}</div>
                  <div style={{ fontSize:11, fontWeight:700, color: client.sendMode === m.value ? m.color : "#475569" }}>{m.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize:13, fontWeight:800, color:"#0f172a", marginBottom:10 }}>👤 Contact</div>
            <div style={{ display:"flex", gap:8 }}>
              <input placeholder="Contact name" value={client.contactName || ""} onChange={e => upd("contactName", e.target.value)}
                style={{ flex:1, height:34, padding:"0 10px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:12, fontFamily:"inherit", outline:"none" }}
                onFocus={e => { e.target.style.borderColor = "#6366f1"; }} onBlur={e => { e.target.style.borderColor = "#e5e7eb"; }} />
              <input placeholder="Phone number" value={client.contactPhone || ""} onChange={e => upd("contactPhone", e.target.value)}
                style={{ flex:1, height:34, padding:"0 10px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:12, fontFamily:"inherit", outline:"none" }}
                onFocus={e => { e.target.style.borderColor = "#6366f1"; }} onBlur={e => { e.target.style.borderColor = "#e5e7eb"; }} />
            </div>
          </div>

          <div>
            <div style={{ fontSize:13, fontWeight:800, color:"#0f172a", marginBottom:10 }}>📝 Notes</div>
            <textarea placeholder="e.g. Contract renewed Jan 2026..." value={client.notes || ""}
              onChange={e => upd("notes", e.target.value)}
              style={{ width:"100%", minHeight:80, padding:"10px", border:"1.5px solid #e5e7eb",
                borderRadius:8, fontSize:12, fontFamily:"inherit", outline:"none", resize:"vertical", lineHeight:1.6 }}
              onFocus={e => { e.target.style.borderColor = "#6366f1"; }} onBlur={e => { e.target.style.borderColor = "#e5e7eb"; }} />
          </div>

          <div>
            <div style={{ fontSize:13, fontWeight:800, color:"#0f172a", marginBottom:10 }}>
              📍 States <span style={{ marginLeft:8, fontSize:11, fontWeight:500, color:"#64748b" }}>{client.selectedStates.length}/50</span>
            </div>
            <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10 }}>
              {STATE_PRESETS.map(p => {
                const active = JSON.stringify([...client.selectedStates].sort()) === JSON.stringify([...p.states].sort());
                return (
                  <button key={p.label} onClick={() => upd("selectedStates", [...p.states])}
                    style={{ padding:"4px 10px", borderRadius:999, border:"1.5px solid",
                      borderColor: active ? "#6366f1" : "#e5e7eb", fontSize:11, fontWeight:600,
                      cursor:"pointer", fontFamily:"inherit", background: active ? "#6366f1" : "#f8fafc", color: active ? "white" : "#475569" }}>
                    {p.label}
                  </button>
                );
              })}
              <button onClick={() => upd("selectedStates", [])}
                style={{ padding:"4px 10px", borderRadius:999, border:"1.5px solid #fca5a5",
                  fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", background:"#fff5f5", color:"#dc2626" }}>Clear</button>
            </div>
            <CheckGrid items={ALL_STATES} selected={client.selectedStates} onChange={v => upd("selectedStates", v)} columns={5} />
          </div>

          <div>
            <div style={{ fontSize:13, fontWeight:800, color:"#0f172a", marginBottom:10 }}>
              🩺 Diseases <span style={{ marginLeft:8, fontSize:11, fontWeight:500, color:"#64748b" }}>{client.selectedDiseases.length}/{ALL_DISEASES.length}</span>
            </div>
            <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10 }}>
              <button onClick={() => upd("selectedDiseases", [...ALL_DISEASES])}
                style={{ padding:"4px 10px", borderRadius:999, border:"1.5px solid #0891b2",
                  fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
                  background: client.selectedDiseases.length === ALL_DISEASES.length ? "#0891b2" : "#f0f9ff",
                  color: client.selectedDiseases.length === ALL_DISEASES.length ? "white" : "#0891b2" }}>All</button>
              <button onClick={() => upd("selectedDiseases", [])}
                style={{ padding:"4px 10px", borderRadius:999, border:"1.5px solid #fca5a5",
                  fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", background:"#fff5f5", color:"#dc2626" }}>Clear</button>
            </div>
            <CheckGrid items={ALL_DISEASES} selected={client.selectedDiseases} onChange={v => upd("selectedDiseases", v)} columns={2} />
          </div>
        </div>

        <div style={{ padding:"16px 24px", borderTop:"1.5px solid #f1f5f9", flexShrink:0 }}>
          <button onClick={onClose} style={{ width:"100%", height:42, background:"#111827", color:"white", border:"none",
            borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Done ✓</button>
        </div>
      </div>
    </>
  );
}

function ClientRow({ client, onChange, onOpen, rank, total, isDragging, fillPct }) {
  const isInhouse = client.type === "Inhouse";
  const isPaused = !client.on;
  const upd = (f, v) => onChange({ ...client, [f]: v });
  const pct = rank / total;
  const barColor = pct <= 0.25 ? "#16a34a" : pct <= 0.5 ? "#0891b2" : pct <= 0.75 ? "#f59e0b" : "#94a3b8";
  const healthColor = fillHealthColor(fillPct, client.on);
  const mode = SEND_MODES.find(m => m.value === client.sendMode) || SEND_MODES[0];

  return (
    <div style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 12px",
      background: isDragging ? "#eef2ff" : isPaused ? "#fafafa" : "white",
      borderRadius:10, marginBottom:4, borderLeft:`4px solid ${healthColor}`,
      outline: isPaused ? "1px solid #f1f5f9" : isInhouse ? "1px solid #fee2e2" : "1px solid #e5e7eb",
      opacity: isPaused ? 0.65 : 1,
      boxShadow: isDragging ? "0 8px 24px rgba(99,102,241,.15)" : "none", transition:"all .15s" }}>

      <div style={{ width:34, flexShrink:0, display:"flex", flexDirection:"column",
        alignItems:"center", gap:2, cursor:"grab", userSelect:"none" }}>
        <div style={{ fontSize:13, color:"#cbd5e1" }}>⠿</div>
        <div style={{ width:22, height:3, borderRadius:2, background:"#f1f5f9", overflow:"hidden" }}>
          <div style={{ width:`${(rank/total)*100}%`, height:"100%", background:barColor, borderRadius:2 }} />
        </div>
        <div style={{ fontSize:8, fontWeight:700, color:barColor }}>{rank}/{total}</div>
      </div>

      <button onClick={onOpen} style={{ width:148, flexShrink:0, textAlign:"left",
        background:"none", border:"none", cursor:"pointer", padding:0, fontFamily:"inherit" }}>
        <div style={{ fontSize:13, fontWeight:700, color: isInhouse ? "#dc2626" : "#111827",
          textDecoration: isPaused ? "line-through" : "none", display:"flex", alignItems:"center", gap:4 }}>
          {client.name} <span style={{ fontSize:9, color:"#a5b4fc" }}>✎</span>
        </div>
        <div style={{ display:"flex", gap:3, marginTop:2, flexWrap:"wrap", alignItems:"center" }}>
          <span style={{ fontSize:9, padding:"1px 5px", borderRadius:4, fontWeight:700, background:mode.bg, color:mode.color }}>{mode.icon} {mode.label}</span>
        </div>
        <div style={{ display:"flex", gap:3, marginTop:2, flexWrap:"wrap" }}>
          <span style={{ fontSize:8, padding:"1px 5px", borderRadius:3, fontWeight:600, background:"#ede9fe", color:"#6366f1" }}>{statesLabel(client.selectedStates)}</span>
          <span style={{ fontSize:8, padding:"1px 5px", borderRadius:3, fontWeight:600, background:"#e0f2fe", color:"#0891b2" }}>{diseasesLabel(client.selectedDiseases)}</span>
        </div>
        {client.contactName && <div style={{ fontSize:8, color:"#64748b", marginTop:2 }}>👤 {client.contactName}{client.contactPhone ? " · " + client.contactPhone : ""}</div>}
        {client.notes && <div style={{ fontSize:8, color:"#94a3b8", marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:140 }}>📝 {client.notes}</div>}
        {client.peers && <div style={{ fontSize:8, color:"#a78bfa", marginTop:1 }}>↔ {client.peers}</div>}
        {client.warning && <div style={{ fontSize:8, color:"#d97706", marginTop:1 }}>⚠ {client.warning}</div>}
      </button>

      <div style={{ width:56, display:"flex", flexDirection:"column", alignItems:"center", gap:2, flexShrink:0 }}>
        <Toggle on={client.on} onChange={v => upd("on", v)} />
        <span style={{ fontSize:8, fontWeight:700, color: client.on ? "#16a34a" : "#94a3b8" }}>{client.on ? "ON" : "OFF"}</span>
      </div>

      {[["gradeACap","A","#15803d"],["gradeBCap","B","#1d4ed8"],["gradeCCap","C","#a16207"],["gradeDCap","D","#b91c1c"]].map(([field, grade, col]) => (
        <div key={grade} style={{ width:62, display:"flex", flexDirection:"column", alignItems:"center", gap:2, flexShrink:0 }}>
          <CapInput value={client[field]} onChange={v => upd(field, v)} highlight={client[field] > 0 && client[field] < 999} gradeColor={col} />
          <div style={{ fontSize:8, padding:"1px 4px", borderRadius:3, fontWeight:600, background:G[grade].bg, color:G[grade].text }}>Gr {grade}</div>
        </div>
      ))}

      <div style={{ width:60, display:"flex", flexDirection:"column", alignItems:"center", gap:2, flexShrink:0 }}>
        <CapInput value={client.dailyCap ?? 999} onChange={v => upd("dailyCap", v >= 999 ? null : v)} highlight={client.dailyCap !== null} />
        <div style={{ fontSize:8, color:"#94a3b8", fontWeight:600 }}>Total/day</div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:2, flexShrink:0 }}>
        <TimeInput value={client.startTime} onChange={v => upd("startTime", v)} />
        <TimeInput value={client.endTime} onChange={v => upd("endTime", v)} />
      </div>

      <ThrottleSelect value={client.throttle} onChange={v => upd("throttle", v)} />
    </div>
  );
}

function DraggableList({ clients, onReorder, onUpdate, onOpen, fillDataMap }) {
  const dragIndex = useRef(null);
  const [draggingId, setDraggingId] = useState(null);

  const onDragStart = (e, i) => { dragIndex.current = i; setDraggingId(clients[i].id); e.dataTransfer.effectAllowed = "move"; };
  const onDragOver = (e, i) => {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === i) return;
    const u = [...clients]; const [m] = u.splice(dragIndex.current, 1); u.splice(i, 0, m);
    dragIndex.current = i; onReorder(u);
  };
  const onDragEnd = () => { dragIndex.current = null; setDraggingId(null); };

  return (
    <div>
      {clients.map((c, i) => {
        const fd = fillDataMap[c.id] || {}; const cap = fd.cap, sent = fd.sent ?? 0;
        const fillPct = cap ? Math.round((sent / cap) * 100) : null;
        return (
          <div key={c.id} draggable onDragStart={e => onDragStart(e, i)} onDragOver={e => onDragOver(e, i)} onDragEnd={onDragEnd}>
            <ClientRow client={c} rank={i+1} total={clients.length} isDragging={draggingId === c.id}
              fillPct={fillPct} onChange={upd => onUpdate(c.id, upd)} onOpen={() => onOpen(c.id)} />
          </div>
        );
      })}
    </div>
  );
}

function SectionHeader({ label, color, count, isCustomOrder, onReset }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 0 8px", marginTop:6, borderBottom:`3px solid ${color}` }}>
      <span style={{ fontSize:14, fontWeight:800, color:"#0f172a" }}>{label}</span>
      <span style={{ fontSize:11, fontWeight:700, color:"white", background:color, padding:"2px 9px", borderRadius:999 }}>{count}</span>
      {isCustomOrder ? (
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", background:"#fef9c3", border:"1.5px solid #fde047", borderRadius:7 }}>
            <span>✏️</span><span style={{ fontSize:11, fontWeight:700, color:"#a16207" }}>Custom priority active</span>
          </div>
          <button onClick={onReset} style={{ padding:"4px 10px", borderRadius:7, border:"1.5px solid #e2e8f0", background:"white", fontSize:11, fontWeight:700, color:"#475569", cursor:"pointer", fontFamily:"inherit" }}>↺ Reset</button>
        </div>
      ) : (
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:5, padding:"4px 10px", background:"#f0fdf4", border:"1.5px solid #bbf7d0", borderRadius:7 }}>
          <span style={{ fontSize:11, fontWeight:600, color:"#15803d" }}>✅ Default order</span>
        </div>
      )}
    </div>
  );
}

function ColHeaders() {
  const th = (l, w, c = false) => (
    <div style={{ width:w, fontSize:8, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".07em", textAlign: c ? "center" : "left", flexShrink:0 }}>{l}</div>
  );
  return (
    <div style={{ display:"flex", alignItems:"center", gap:7, padding:"4px 12px", background:"#f8fafc", borderRadius:7, marginBottom:3, border:"1px solid #f1f5f9" }}>
      {th("",34)}{th("Client (click ✎)",148)}{th("On/Off",56,true)}
      {th("Gr A",62,true)}{th("Gr B",62,true)}{th("Gr C",62,true)}{th("Gr D",62,true)}
      {th("Total/d",60,true)}{th("Start/End",86)}{th("",6)}{th("Flow",88)}
    </div>
  );
}

function SummaryTab({ clients }) {
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const [sortBy, setSortBy] = useState("fillRate");
  const [filterType, setFilterType] = useState("all");

  const getDays = (f, t) => {
    const d = []; let c = new Date(f); const e = new Date(t);
    while (c <= e) { d.push(c.toISOString().slice(0,10)); c.setDate(c.getDate()+1); }
    return d;
  };
  const days = getDays(fromDate, toDate);
  const fillData = {};
  clients.forEach(c => { fillData[c.id] = { sent:0, cap: c.dailyCap || (c.gradeACap < 999 ? c.gradeACap + c.gradeBCap + c.gradeCCap : null) }; });
  days.forEach(d => {
    const dd = generateDemoData(clients, d);
    clients.forEach(c => { fillData[c.id].sent += dd[c.id].sent; });
  });

  const rows = clients
    .filter(c => filterType === "all" || (filterType === "paying" && c.type === "Paying") ||
      (filterType === "inhouse" && c.type === "Inhouse") || (filterType === "active" && c.on) || (filterType === "paused" && !c.on))
    .map(c => {
      const d = fillData[c.id]; const cap = d.cap ? d.cap * days.length : null;
      const pct = cap ? Math.round((d.sent / cap) * 100) : null;
      return { ...c, sent: d.sent, cap, remaining: cap ? Math.max(0, cap - d.sent) : null, pct };
    })
    .sort((a, b) => {
      if (sortBy === "fillRate") return (b.pct ?? -1) - (a.pct ?? -1);
      if (sortBy === "sent") return b.sent - a.sent;
      if (sortBy === "remaining") return (b.remaining ?? 999) - (a.remaining ?? 999);
      return a.name.localeCompare(b.name);
    });

  const totalSent = rows.reduce((s, r) => s + r.sent, 0);
  const atCap = rows.filter(r => r.pct >= 100).length;
  const nearCap = rows.filter(r => r.pct >= 80 && r.pct < 100).length;
  const zeroLeads = rows.filter(r => r.sent === 0 && r.on).length;

  const badge = r => {
    if (!r.on) return { l:"Paused", bg:"#f1f5f9", c:"#94a3b8" };
    if (r.pct === null) return { l:"No cap", bg:"#f0fdf4", c:"#15803d" };
    if (r.pct >= 100) return { l:"Cap hit!", bg:"#fee2e2", c:"#dc2626" };
    if (r.pct >= 80) return { l:"Near cap", bg:"#fef9c3", c:"#a16207" };
    if (r.sent === 0) return { l:"0 leads", bg:"#fef3c7", c:"#d97706" };
    return { l:"Active", bg:"#f0fdf4", c:"#15803d" };
  };

  return (
    <div>
      <div style={{ padding:"10px 14px", background:"#eff6ff", border:"1.5px solid #bfdbfe", borderRadius:10, marginBottom:14, fontSize:11, color:"#1e40af" }}>
        <strong>🔧 For your engineer:</strong> Replace <code>generateDemoData()</code> with a real API fetch. Shape: <code>{"{ [clientId]: { sent: number, cap: number|null } }"}</code>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 12px", background:"white", border:"1.5px solid #e2e8f0", borderRadius:9 }}>
          <span style={{ fontSize:11, fontWeight:600, color:"#64748b" }}>From</span>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} max={toDate}
            style={{ border:"none", fontSize:12, fontWeight:600, color:"#0f172a", fontFamily:"inherit", outline:"none", cursor:"pointer" }} />
          <span style={{ fontSize:11, fontWeight:600, color:"#64748b" }}>To</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} min={fromDate} max={today()}
            style={{ border:"none", fontSize:12, fontWeight:600, color:"#0f172a", fontFamily:"inherit", outline:"none", cursor:"pointer" }} />
          <span style={{ fontSize:10, color:"#94a3b8" }}>({days.length}d)</span>
        </div>
        <div style={{ display:"flex", gap:4 }}>
          {[["all","All"],["paying","Paying"],["inhouse","Inhouse"],["active","Active"],["paused","Paused"]].map(([k,v]) => (
            <button key={k} onClick={() => setFilterType(k)}
              style={{ padding:"4px 10px", borderRadius:999, border:"1.5px solid", fontSize:11,
                fontWeight: filterType === k ? 700 : 500, cursor:"pointer", fontFamily:"inherit",
                background: filterType === k ? "#111827" : "white", borderColor: filterType === k ? "#111827" : "#e2e8f0",
                color: filterType === k ? "white" : "#475569" }}>{v}</button>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:5, marginLeft:"auto" }}>
          <span style={{ fontSize:10, color:"#94a3b8", fontWeight:600 }}>Sort:</span>
          {[["fillRate","Fill %"],["sent","Sent"],["remaining","Left"],["name","Name"]].map(([k,v]) => (
            <button key={k} onClick={() => setSortBy(k)}
              style={{ padding:"3px 9px", borderRadius:6, border:"1.5px solid", fontSize:11,
                fontWeight: sortBy === k ? 700 : 500, cursor:"pointer", fontFamily:"inherit",
                background: sortBy === k ? "#6366f1" : "white", borderColor: sortBy === k ? "#6366f1" : "#e2e8f0",
                color: sortBy === k ? "white" : "#475569" }}>{v}</button>
          ))}
        </div>
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        {[
          {n:totalSent, l:"Total leads sent", c:"#4f46e5", bg:"#eef2ff", b:"#c7d2fe"},
          {n:atCap, l:"At cap", c:"#dc2626", bg:"#fee2e2", b:"#fca5a5"},
          {n:nearCap, l:"Near cap (≥80%)", c:"#d97706", bg:"#fffbeb", b:"#fde68a"},
          {n:zeroLeads, l:"Active, 0 leads", c:"#64748b", bg:"#f8fafc", b:"#e2e8f0"},
        ].map(s => (
          <div key={s.l} style={{ background:s.bg, border:`1.5px solid ${s.b}`, borderRadius:10, padding:"10px 16px", display:"flex", alignItems:"center", gap:10, flex:1, minWidth:130 }}>
            <span style={{ fontSize:24, fontWeight:900, color:s.c, lineHeight:1 }}>{s.n}</span>
            <span style={{ fontSize:11, color:"#475569", fontWeight:500 }}>{s.l}</span>
          </div>
        ))}
      </div>

      <div style={{ background:"white", borderRadius:12, border:"1.5px solid #e2e8f0", overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 3fr 1fr", padding:"9px 16px", background:"#f8fafc", borderBottom:"1.5px solid #f1f5f9" }}>
          {["Client","Sent","Cap","Remaining","Fill Rate","Status"].map(h => (
            <div key={h} style={{ fontSize:9, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".07em" }}>{h}</div>
          ))}
        </div>
        {rows.map((row, i) => {
          const b = badge(row); const mode = SEND_MODES.find(m => m.value === row.sendMode) || SEND_MODES[0];
          return (
            <div key={row.id} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 3fr 1fr", padding:"11px 16px",
              borderBottom: i < rows.length-1 ? "1px solid #f8fafc" : "none",
              background: row.pct >= 100 ? "#fff5f5" : row.sent === 0 && row.on ? "#fffbeb" : "white" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color: row.type === "Inhouse" ? "#dc2626" : "#0f172a", display:"flex", alignItems:"center", gap:6 }}>
                  {row.name}
                  {!row.on && <span style={{ fontSize:9, padding:"1px 5px", background:"#f1f5f9", color:"#94a3b8", borderRadius:4, fontWeight:600 }}>PAUSED</span>}
                </div>
                <div style={{ fontSize:10, color:"#94a3b8", marginTop:1 }}>{row.type} · <span style={{ fontWeight:600, color:mode.color }}>{mode.icon} {mode.label}</span></div>
              </div>
              <div style={{ display:"flex", alignItems:"center" }}><span style={{ fontSize:20, fontWeight:900, color: row.sent === 0 && row.on ? "#d97706" : "#0f172a" }}>{row.sent}</span></div>
              <div style={{ display:"flex", alignItems:"center" }}><span style={{ fontSize:14, fontWeight:600, color:"#64748b" }}>{row.cap ?? "∞"}</span></div>
              <div style={{ display:"flex", alignItems:"center" }}><span style={{ fontSize:14, fontWeight:700, color: row.remaining === 0 ? "#dc2626" : row.remaining != null && row.remaining <= 5 ? "#d97706" : "#15803d" }}>{row.remaining ?? "∞"}</span></div>
              <div style={{ display:"flex", flexDirection:"column", justifyContent:"center", gap:3, paddingRight:12 }}>
                {row.pct != null ? (<><span style={{ fontSize:11, fontWeight:700, color: row.pct >= 100 ? "#dc2626" : row.pct >= 80 ? "#d97706" : "#0f172a" }}>{row.pct}%</span><FillBar pct={row.pct} /></>) : (<span style={{ fontSize:10, color:"#94a3b8" }}>No cap</span>)}
              </div>
              <div style={{ display:"flex", alignItems:"center" }}><span style={{ fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:999, background:b.bg, color:b.c }}>{b.l}</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChangeLogTab({ log }) {
  if (log.length === 0) return (
    <div style={{ textAlign:"center", padding:"60px 0", color:"#94a3b8", fontSize:14 }}>No changes recorded yet.</div>
  );
  return (
    <div style={{ background:"white", borderRadius:12, border:"1.5px solid #e2e8f0", overflow:"hidden" }}>
      <div style={{ padding:"10px 18px", background:"#f8fafc", borderBottom:"1.5px solid #f1f5f9", display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:12, fontWeight:700, color:"#0f172a" }}>📋 Change History</span>
        <span style={{ fontSize:11, color:"#94a3b8" }}>{log.length} change{log.length !== 1 ? "s" : ""}</span>
      </div>
      {log.map((entry, i) => (
        <div key={i} style={{ padding:"12px 18px", borderBottom: i < log.length-1 ? "1px solid #f8fafc" : "none", display:"flex", alignItems:"flex-start", gap:12 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"#6366f1", marginTop:5, flexShrink:0 }} />
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <span style={{ fontSize:13, fontWeight:700, color:"#0f172a" }}>{entry.clientName}</span>
              <span style={{ fontSize:12, color:"#475569" }}>{entry.change}</span>
            </div>
            <div style={{ fontSize:10, color:"#94a3b8", marginTop:2 }}>{entry.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [clients, setClients] = useState(CLIENTS);
  const [saved, setSaved] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [panelId, setPanelId] = useState(null);
  const [activeTab, setActiveTab] = useState("distribution");
  const [changeLog, setChangeLog] = useState([]);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);

  const fillDataToday = generateDemoData(clients, today());

  const updateClient = (id, updated) => {
    setClients(prev => {
      const old = prev.find(c => c.id === id);
      const change = describeChange(old, updated);
      if (change) {
        setChangeLog(log => [{ clientName: updated.name, change, time: nowFull() }, ...log].slice(0, MAX_LOG));
        setSaved(false);
      }
      return prev.map(c => c.id === id ? updated : c);
    });
  };

  const pauseAll = () => {
    setClients(p => p.map(c => ({ ...c, on: false })));
    setChangeLog(l => [{ clientName:"ALL CLIENTS", change:"Emergency pause — all turned OFF", time: nowFull() }, ...l].slice(0, MAX_LOG));
    setSaved(false); setShowPauseConfirm(false);
  };

  const groupDefs = [
    { key:"paying-bh", label:"💼 Paying — Business Hours", color:"#16a34a", fn: c => c.type === "Paying" && c.hours === "Business hrs" },
    { key:"paying-ah", label:"🌙 Paying — After Hours",    color:"#f59e0b", fn: c => c.type === "Paying" && c.hours === "After hrs" },
    { key:"inhouse",   label:"🔴 Inhouse Fallbacks",       color:"#dc2626", fn: c => c.type === "Inhouse" },
  ];

  const defaultOrderFor = gk => {
    const g = groupDefs.find(x => x.key === gk);
    const def = CLIENTS_RAW.filter(g.fn).map(c => c.id);
    const cur = clients.filter(g.fn).map(c => c.id);
    return JSON.stringify(def) === JSON.stringify(cur);
  };

  const resetGroupOrder = gk => {
    const gfn = groupDefs.find(x => x.key === gk).fn;
    const defIds = CLIENTS_RAW.filter(gfn).map(c => c.id);
    setClients(prev => {
      const inGroup = prev.filter(gfn); const outGroup = prev.filter(c => !gfn(c));
      return [...outGroup, ...defIds.map(id => inGroup.find(c => c.id === id)).filter(Boolean)];
    });
    setSaved(false);
  };

  const reorderGroup = (gk, reordered) => {
    const gfn = groupDefs.find(x => x.key === gk).fn;
    setClients(prev => [...prev.filter(c => !gfn(c)), ...reordered]);
    setSaved(false);
  };

  const filterBtns = [["all","All"],["paying-bh","Business hrs"],["paying-ah","After hrs"],["inhouse","Inhouse"],["active","Active"],["paused","Paused"]];
  const panelClient = clients.find(c => c.id === panelId) || null;
  const tabs = [["distribution","⚡ Distribution"],["summary","📊 Fill Rate"],["log","📋 Log" + (changeLog.length > 0 ? " (" + changeLog.length + ")" : "")]];

  return (
    <div style={{ minHeight:"100vh", background:"#f1f5f9", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}input::-webkit-inner-spin-button{-webkit-appearance:none}input[type=number]{-moz-appearance:textfield}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}`}</style>

      {showPauseConfirm && (
        <>
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:200, backdropFilter:"blur(3px)" }} />
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", zIndex:201, background:"white", borderRadius:16, padding:"32px", width:380, boxShadow:"0 20px 60px rgba(0,0,0,.3)" }}>
            <div style={{ fontSize:40, textAlign:"center", marginBottom:12 }}>🚨</div>
            <div style={{ fontSize:18, fontWeight:900, color:"#0f172a", textAlign:"center", marginBottom:8 }}>Pause ALL clients?</div>
            <div style={{ fontSize:13, color:"#64748b", textAlign:"center", marginBottom:24, lineHeight:1.6 }}>
              This will instantly turn OFF every single client. No leads or calls will be sent until you turn them back on manually.
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setShowPauseConfirm(false)} style={{ flex:1, height:42, background:"#f1f5f9", color:"#475569", border:"none", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
              <button onClick={pauseAll} style={{ flex:1, height:42, background:"#dc2626", color:"white", border:"none", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Yes, Pause All</button>
            </div>
          </div>
        </>
      )}

      <div style={{ background:"white", borderBottom:"1.5px solid #e2e8f0", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ maxWidth:1140, margin:"0 auto", padding:"0 16px", display:"flex", alignItems:"center", gap:10, height:52 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            <div style={{ width:30, height:30, borderRadius:7, background:"#111827", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>⚡</div>
            <div>
              <div style={{ fontSize:14, fontWeight:900, color:"#0f172a", lineHeight:1 }}>LeadFlow</div>
              <div style={{ fontSize:9, color:"#94a3b8" }}>Lead Distribution Manager</div>
            </div>
          </div>

          <div style={{ display:"flex", gap:1, background:"#f1f5f9", borderRadius:8, padding:3, flexShrink:0 }}>
            {tabs.map(([k, v]) => (
              <button key={k} onClick={() => setActiveTab(k)}
                style={{ padding:"4px 12px", borderRadius:6, border:"none", fontSize:11, fontWeight: activeTab === k ? 700 : 500,
                  cursor:"pointer", fontFamily:"inherit", background: activeTab === k ? "white" : "transparent",
                  color: activeTab === k ? "#0f172a" : "#64748b", boxShadow: activeTab === k ? "0 1px 4px rgba(0,0,0,.08)" : "none",
                  transition:"all .15s", whiteSpace:"nowrap" }}>{v}</button>
            ))}
          </div>

          {activeTab === "distribution" && (
            <>
              <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                {filterBtns.map(([k, v]) => (
                  <button key={k} onClick={() => setFilter(k)}
                    style={{ padding:"3px 9px", borderRadius:999, border:"1.5px solid", fontSize:10,
                      fontWeight: filter === k ? 700 : 500, cursor:"pointer", fontFamily:"inherit",
                      background: filter === k ? "#111827" : "white", borderColor: filter === k ? "#111827" : "#e2e8f0",
                      color: filter === k ? "white" : "#475569" }}>{v}</button>
                ))}
              </div>
              <input placeholder="🔍 Search…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ height:30, padding:"0 9px", border:"1.5px solid #e2e8f0", borderRadius:7, fontSize:11, fontFamily:"inherit", outline:"none", width:120, background:"#f8fafc" }}
                onFocus={e => { e.target.style.borderColor = "#6366f1"; }} onBlur={e => { e.target.style.borderColor = "#e2e8f0"; }} />
            </>
          )}

          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={() => setShowPauseConfirm(true)}
              style={{ padding:"5px 12px", borderRadius:8, border:"1.5px solid #fca5a5", background:"#fff5f5", color:"#dc2626", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:4 }}>
              🚨 Pause All
            </button>
            {!saved && (
              <>
                <span style={{ fontSize:11, color:"#f59e0b", fontWeight:600 }}>● Unsaved</span>
                <button onClick={() => setSaved(true)} style={{ background:"#111827", color:"white", border:"none", borderRadius:7, padding:"6px 14px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Save</button>
              </>
            )}
            {saved && <span style={{ fontSize:10, color:"#94a3b8" }}>✓ Saved</span>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1140, margin:"0 auto", padding:"18px 16px", overflowX:"auto" }}>
        {activeTab === "summary" && <SummaryTab clients={clients} />}
        {activeTab === "log" && <ChangeLogTab log={changeLog} />}
        {activeTab === "distribution" && groupDefs.map(group => {
          const allInGroup = clients.filter(group.fn);
          const display = allInGroup.filter(c => {
            const mf = filter === "all" || filter === group.key || (filter === "active" && c.on) || (filter === "paused" && !c.on);
            const ms = !search || c.name.toLowerCase().includes(search.toLowerCase());
            return mf && ms;
          });
          if (!display.length) return null;
          const isDefault = defaultOrderFor(group.key);
          return (
            <div key={group.key} style={{ marginBottom:24 }}>
              <SectionHeader label={group.label} color={group.color} count={display.length} isCustomOrder={!isDefault} onReset={() => resetGroupOrder(group.key)} />
              <ColHeaders />
              <DraggableList clients={display} fillDataMap={fillDataToday} onReorder={r => reorderGroup(group.key, r)} onUpdate={updateClient} onOpen={setPanelId} />
            </div>
          );
        })}
      </div>

      <SidePanel client={panelClient} onClose={() => setPanelId(null)} onChange={upd => updateClient(upd.id, upd)} />
    </div>
  );
}
