import React from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  Activity, Euro, TrendingUp, Users, Clock,
  ArrowUpRight, ArrowDownRight, Minus,
  Bell, ChevronRight, BarChart3, FileText
} from 'lucide-react';

import { T, PROVIDERS, MARGIN, MONTH_LABELS } from '../../constants';
import { f2, pct } from '../../utils/formatters';
import { PE } from '../../utils/parsers';
import { Badge, SectionTitle } from '../../components/ui';

// ── Tooltip personnalisé pour les graphiques ──
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:'10px 14px', boxShadow:'0 4px 16px rgba(0,0,0,.1)', fontFamily:T.ui }}>
      <div style={{ fontSize:11, fontWeight:600, color:T.muted, marginBottom:6 }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:p.color }}/>
          <span style={{ fontSize:12, color:T.sub }}>{p.name}</span>
          <span style={{ fontSize:12, fontWeight:700, color:T.text, fontFamily:T.mono, marginLeft:'auto', paddingLeft:12 }}>
            {typeof p.value === 'number' ? p.value.toLocaleString('fr-FR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' €' : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Composant delta inline ──
const Delta = ({ val, invert=false }) => {
  if (val === null) return <span style={{ fontSize:10, color:T.muted, fontFamily:T.ui }}>—</span>;
  const up = invert ? val < 0 : val > 0;
  const Icon = val === 0 ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const color = up ? T.green : val === 0 ? T.muted : T.red;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:2, fontSize:10, fontWeight:700, color, background:color+'15', borderRadius:4, padding:'2px 6px', fontFamily:T.ui }}>
      <Icon size={10}/>{Math.abs(val*100).toFixed(1)}%
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// DASHBOARD MODULE
// ─────────────────────────────────────────────────────────────
// Dashboard principal — vue d'ensemble avec KPIs, graphique d'évolution et top 5 clients
// Toutes les données sont calculées à la volée depuis les lignes CDR passées en props
export default function DashboardModule({ rows, clientsDB, onNavigate }) {

  if (rows.length === 0) return (
    <div style={{ textAlign:'center', padding:'100px 0', color:T.muted }}>
      <Activity size={40} style={{ margin:'0 auto 14px', opacity:.2 }}/>
      <div style={{ fontSize:16, fontWeight:600, color:T.sub, fontFamily:T.ui, marginBottom:6 }}>Aucune donnée chargée</div>
      <div style={{ fontSize:13, fontFamily:T.ui, marginBottom:20 }}>Importez des fichiers CDR pour commencer</div>
      <button onClick={() => onNavigate('import')} style={{ background:T.text, color:'white', border:'none', borderRadius:8, padding:'10px 20px', cursor:'pointer', fontFamily:T.ui, fontWeight:600, fontSize:13 }}>
        Aller à l'import →
      </button>
    </div>
  );

  // ── Agrégats mensuels ─────────────────────────────────────────
  // On groupe les lignes par mois (clé "YYYY-MM") pour alimenter le graphique
  const allMonths = [...new Set(rows.map(r=>r.monthKey))].filter(m=>m!=='unknown').sort();
  const clients   = [...new Set(rows.map(r=>r.client))];

  const byMonth = {};
  rows.forEach(r => {
    if (r.monthKey==='unknown') return;
    if (!byMonth[r.monthKey]) byMonth[r.monthKey] = { conso:0, marge:0, clients:new Set() };
    byMonth[r.monthKey].conso += r.conso;
    byMonth[r.monthKey].marge += r.marge;
    byMonth[r.monthKey].clients.add(r.client);
  });

  const chartData = allMonths.map(mk => {
    const [y, m] = mk.split('-');
    const label = `${MONTH_LABELS[parseInt(m,10)-1]} ${y.slice(2)}`;
    const d = byMonth[mk] || { conso:0, marge:0, clients:new Set() };
    const margeNet = d.marge - d.conso;
    return { key:mk, label, conso:+d.conso.toFixed(2), ca:+d.marge.toFixed(2), margeNet:+margeNet.toFixed(2), clients:d.clients.size };
  });

  const lastIdx    = chartData.length - 1;
  const curr       = chartData[lastIdx]   || { ca:0, conso:0, margeNet:0, clients:0 };
  const prev       = chartData[lastIdx-1] || { ca:0, conso:0, margeNet:0, clients:0 };
  const deltaCa    = prev.ca    > 0 ? (curr.ca    - prev.ca)    / prev.ca    : null;
  const deltaConso = prev.conso > 0 ? (curr.conso - prev.conso) / prev.conso : null;

  const totalConso = rows.reduce((s,r)=>s+r.conso,0);
  const totalMarge = rows.reduce((s,r)=>s+r.marge,0);
  const totalDur   = rows.reduce((s,r)=>s+r.duration,0);

  // ── Top 5 clients ─────────────────────────────────────────────
  // Calcul du delta entre le mois courant et le précédent pour afficher la tendance
  const clientMap = {};
  rows.forEach(r => {
    if (!clientMap[r.client]) clientMap[r.client] = { name:r.client, byMonth:{}, providers:new Set() };
    if (!clientMap[r.client].byMonth[r.monthKey]) clientMap[r.client].byMonth[r.monthKey] = 0;
    clientMap[r.client].byMonth[r.monthKey] += r.marge;
    clientMap[r.client].providers.add(r.provider);
  });
  const top5 = Object.values(clientMap).map(c => {
    const currM = c.byMonth[allMonths[lastIdx]]   || 0;
    const prevM = c.byMonth[allMonths[lastIdx-1]] || 0;
    const total = Object.values(c.byMonth).reduce((s,v)=>s+v, 0);
    const delta = prevM > 0 ? (currM - prevM) / prevM : null;
    return { ...c, total, currM, prevM, delta };
  }).sort((a,b)=>b.total-a.total).slice(0,5);
  const maxMarge = top5[0]?.total || 1;

  // ── Répartition fournisseurs ──
  const byProvider = PROVIDERS.map(p => ({
    ...p, marge: rows.filter(r=>r.provider===p.id).reduce((s,r)=>s+r.marge,0)
  })).filter(p=>p.marge>0);
  const totalByP = byProvider.reduce((s,p)=>s+p.marge,0);

  // ── Alertes contrats ──────────────────────────────────────────
  // Remonte les contrats qui expirent dans les 30 jours et les fortes baisses de conso
  const alerts = [];
  const now  = new Date();
  const in30 = new Date(now.getTime() + 30*24*60*60*1000);
  const in7  = new Date(now.getTime() +  7*24*60*60*1000);
  Object.values(clientsDB||{}).forEach(c => {
    if (c.contractEnd) {
      const end = new Date(c.contractEnd);
      if      (end < now)  alerts.push({ type:'error', icon:'🔴', msg:`Contrat expiré : ${c.name}`,                       date: end.toLocaleDateString('fr-FR') });
      else if (end < in7)  alerts.push({ type:'warn',  icon:'🟠', msg:`Contrat expire dans moins de 7j : ${c.name}`,      date: end.toLocaleDateString('fr-FR') });
      else if (end < in30) alerts.push({ type:'info',  icon:'🟡', msg:`Contrat expire bientôt : ${c.name}`,               date: end.toLocaleDateString('fr-FR') });
    }
  });
  top5.forEach(c => {
    if (c.delta !== null && c.delta < -0.3)
      alerts.push({ type:'warn', icon:'📉', msg:`Baisse conso -${Math.abs(c.delta*100).toFixed(0)}% : ${c.name}` });
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:28 }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <div style={{ fontSize:26, fontWeight:700, color:T.text, fontFamily:T.serif, marginBottom:4 }}>Vue d'ensemble</div>
          <div style={{ fontSize:13, color:T.sub, fontFamily:T.ui }}>
            {allMonths.length} mois · {allMonths[0]} → {allMonths[allMonths.length-1]} · {clients.length} clients
          </div>
        </div>
        {alerts.length > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:6, background:T.redSoft, border:`1px solid ${T.red}30`, borderRadius:8, padding:'7px 12px' }}>
            <Bell size={13} style={{ color:T.red }}/>
            <span style={{ fontSize:12, fontWeight:600, color:T.red, fontFamily:T.ui }}>{alerts.length} alerte{alerts.length>1?'s':''}</span>
          </div>
        )}
      </div>

      {/* Alertes */}
      {alerts.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {alerts.map((a,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:a.type==='error'?T.redSoft:T.orangeSoft, border:`1px solid ${a.type==='error'?T.red:T.orange}25`, borderRadius:9, fontSize:12, fontFamily:T.ui }}>
              <span>{a.icon}</span>
              <span style={{ color:T.text, fontWeight:500 }}>{a.msg}</span>
              {a.date && <span style={{ color:T.muted, marginLeft:'auto', fontFamily:T.mono, fontSize:11 }}>{a.date}</span>}
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {[
          { label:'Consommation HT', value:f2(totalConso), icon:Euro,       color:T.sub,   sub:'Coût fournisseurs', delta:deltaConso },
          { label:'CA Facturé HT',   value:f2(totalMarge), icon:TrendingUp,  color:T.green, sub:'Marge ×2',          delta:deltaCa },
          { label:'Clients actifs',  value:clients.length, icon:Users,       color:T.blue,  sub:`${rows.length.toLocaleString()} lignes`, delta:null },
          { label:'Durée totale',    value:PE.dur(totalDur), icon:Clock,     color:T.gold,  sub:null, delta:null },
        ].map(k => (
          <div key={k.label} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:'18px 20px', borderTop:`3px solid ${k.color}`, boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <span style={{ fontSize:10, fontWeight:600, color:T.muted, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:T.ui }}>{k.label}</span>
              <div style={{ background:k.color+'15', borderRadius:7, padding:6, color:k.color }}><k.icon size={13}/></div>
            </div>
            <div style={{ fontSize:20, fontWeight:700, color:T.text, fontFamily:T.ui, letterSpacing:'-.02em', marginBottom:6 }}>{k.value}</div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              {k.sub && <span style={{ fontSize:11, color:T.muted, fontFamily:T.ui }}>{k.sub}</span>}
              {k.delta !== null && <Delta val={k.delta}/>}
            </div>
          </div>
        ))}
      </div>

      {/* Graphique évolution CA */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:'20px 24px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <SectionTitle>Évolution mensuelle</SectionTitle>
          <div style={{ display:'flex', gap:16, fontSize:11, fontFamily:T.ui, color:T.muted }}>
            <span style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:10, height:3, background:T.green, borderRadius:2, display:'inline-block' }}/> CA Facturé</span>
            <span style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:10, height:3, background:T.gold,  borderRadius:2, display:'inline-block' }}/> Conso</span>
            <span style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:10, height:3, background:T.blue,  borderRadius:2, display:'inline-block' }}/> Marge nette</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top:5, right:10, bottom:0, left:10 }}>
            <defs>
              <linearGradient id="gradCA"    x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor={T.green} stopOpacity={0.15}/><stop offset="95%" stopColor={T.green} stopOpacity={0}/></linearGradient>
              <linearGradient id="gradConso" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor={T.gold}  stopOpacity={0.12}/><stop offset="95%" stopColor={T.gold}  stopOpacity={0}/></linearGradient>
              <linearGradient id="gradMarge" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor={T.blue}  stopOpacity={0.12}/><stop offset="95%" stopColor={T.blue}  stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false}/>
            <XAxis dataKey="label" tick={{ fontSize:11, fontFamily:T.ui, fill:T.muted }} axisLine={false} tickLine={false}/>
            <YAxis tick={{ fontSize:10, fontFamily:T.mono, fill:T.muted }} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(1)}k`:v}/>
            <Tooltip content={<ChartTooltip/>}/>
            <Area type="monotone" dataKey="ca"       name="CA Facturé"  stroke={T.green} strokeWidth={2}   fill="url(#gradCA)"    dot={false} activeDot={{ r:4, fill:T.green }}/>
            <Area type="monotone" dataKey="conso"    name="Conso HT"    stroke={T.gold}  strokeWidth={2}   fill="url(#gradConso)" dot={false} activeDot={{ r:4, fill:T.gold }}/>
            <Area type="monotone" dataKey="margeNet" name="Marge nette" stroke={T.blue}  strokeWidth={1.5} strokeDasharray="4 2" fill="url(#gradMarge)" dot={false} activeDot={{ r:4, fill:T.blue }}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:18 }}>

        {/* Top 5 clients */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:'20px 22px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <SectionTitle>Top 5 clients</SectionTitle>
            {allMonths.length >= 2 && <span style={{ fontSize:10, color:T.muted, fontFamily:T.ui }}>vs mois précédent</span>}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
            {top5.map((c,i) => (
              <div key={c.name}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flex:1, minWidth:0 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:T.muted, fontFamily:T.mono, width:16, flexShrink:0 }}>{i+1}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:T.text, fontFamily:T.ui, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                    {c.delta !== null && <Delta val={c.delta}/>}
                    <span style={{ fontSize:12, fontWeight:700, color:T.text, fontFamily:T.mono }}>{f2(c.total)}</span>
                  </div>
                </div>
                <div style={{ height:4, background:T.border, borderRadius:2, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${(c.total/maxMarge)*100}%`, background: i===0?T.gold:T.blue+'80', borderRadius:2, transition:'width .6s ease' }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Répartition fournisseurs */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:'20px 22px' }}>
          <SectionTitle>Répartition fournisseurs</SectionTitle>
          <div style={{ marginBottom:16 }}>
            <ResponsiveContainer width="100%" height={90}>
              <BarChart data={byProvider.map(p=>({name:p.name, ca:+p.marge.toFixed(2)}))} barSize={28} margin={{ top:0, right:0, bottom:0, left:0 }}>
                <XAxis dataKey="name" tick={{ fontSize:10, fontFamily:T.ui, fill:T.muted }} axisLine={false} tickLine={false}/>
                <Tooltip content={<ChartTooltip/>}/>
                {byProvider.map(p => (
                  <Bar key={p.id} dataKey="ca" name="CA HT" fill={p.color} radius={[4,4,0,0]}/>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {byProvider.map(p => (
              <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:p.color }}/>
                  <Badge id={p.id}/>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:12, fontFamily:T.mono, color:T.text, fontWeight:600 }}>{f2(p.marge)}</span>
                  <span style={{ fontSize:10, fontFamily:T.ui, color:T.muted, minWidth:36, textAlign:'right' }}>{pct(p.marge/totalByP)}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:14, paddingTop:12, borderTop:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:12, fontWeight:600, color:T.sub, fontFamily:T.ui }}>Total CA HT</span>
            <span style={{ fontSize:14, fontWeight:700, color:T.text, fontFamily:T.mono }}>{f2(totalMarge)}</span>
          </div>
        </div>
      </div>

      {/* Raccourcis modules */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {[
          { id:'cdr',     label:'CDR Analyzer', desc:'Coûts & marges',      icon:BarChart3, color:T.blue },
          { id:'billing', label:'Facturation',  desc:'Générer les factures', icon:FileText,  color:T.green },
          { id:'clients', label:'Clients',      desc:'Base clients',         icon:Users,     color:T.purple },
        ].map(m => (
          <button key={m.id} onClick={() => onNavigate(m.id)} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:'14px 16px', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', justifyContent:'space-between', transition:'all .15s', fontFamily:T.ui }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor=m.color; e.currentTarget.style.boxShadow=`0 0 0 3px ${m.color}10`; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border; e.currentTarget.style.boxShadow='none'; }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:9, background:m.color+'15', display:'flex', alignItems:'center', justifyContent:'center', color:m.color }}><m.icon size={16}/></div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{m.label}</div>
                <div style={{ fontSize:11, color:T.muted }}>{m.desc}</div>
              </div>
            </div>
            <ChevronRight size={14} style={{ color:T.muted }}/>
          </button>
        ))}
      </div>

    </div>
  );
}