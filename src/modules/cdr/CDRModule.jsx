import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Search, Filter, Download, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { T, PROVIDERS, MONTH_LABELS, MARGIN } from '../../constants';
import { f4, pct } from '../../utils/formatters';
import { Badge, SectionTitle } from '../../components/ui';

// Module d'analyse CDR — tableau croisé des coûts par client et par mois
// Trois vues : coût client, coût revendeur, marge (avec calcul du % de marge par cellule)
const CDRModule = ({ rows }) => {
  const [tab, setTab]     = useState('client');
  const [search, setSearch] = useState('');
  const [hidden, setHidden] = useState(new Set());
 
  const MONTHS = useMemo(() => {
    const keys = [...new Set(rows.map(r=>r.monthKey))].filter(m=>m!=='unknown').sort();
    return keys.map(key => {
      const [y, m] = key.split('-');
      return { key, label:`${MONTH_LABELS[parseInt(m,10)-1]} ${y.slice(2)}` };
    });
  }, [rows]);
 
  // Construction du pivot : pour chaque client, on cumule coût client et coût revendeur mois par mois
  const pivot = useMemo(() => {
    const map = {};
    rows.forEach(r => {
      const k = r.client;
      if (!map[k]) map[k] = { nom:r.client, client:{}, revendeur:{}, providers:new Set() };
      map[k].client[r.monthKey]    = (map[k].client[r.monthKey]||0)    + r.conso;
      map[k].revendeur[r.monthKey] = (map[k].revendeur[r.monthKey]||0) + (r.revendeur||0);
      map[k].providers.add(r.provider);
    });
    return map;
  }, [rows]);
 
  const allClients = useMemo(() => Object.keys(pivot).sort(), [pivot]);
  const shown      = useMemo(() => allClients.filter(c => pivot[c].nom.toLowerCase().includes(search.toLowerCase())), [allClients, search, pivot]);
  const visible    = useMemo(() => shown.filter(c => !hidden.has(c)), [shown, hidden]);
 
  const getVal = (c, mk) => {
    if (tab==='client')    return pivot[c].client[mk]||0;
    if (tab==='revendeur') return pivot[c].revendeur[mk]||0;
    return (pivot[c].client[mk]||0) - (pivot[c].revendeur[mk]||0);
  };
  const rowTot = (c)  => MONTHS.reduce((s,m)=>s+getVal(c,m.key),0);
  const colTot = (mk) => visible.reduce((s,c)=>s+getVal(c,mk),0);
  const grand  = ()   => visible.reduce((s,c)=>s+rowTot(c),0);
 
  const toggle = (c) => setHidden(p => { const n=new Set(p); n.has(c)?n.delete(c):n.add(c); return n; });
 
  // Export Excel : génère deux feuilles (coût client + coût revendeur) avec totaux
  const exportXLSX = () => {
    const wb = XLSX.utils.book_new();
    for (const t of ['client','revendeur']) {
      const data = [[t==='client'?'Coût Client':'Coût Revendeur', ...MONTHS.map(m=>m.label), 'TOTAL']];
      visible.forEach(c => {
        const vals = MONTHS.map(m => pivot[c][t][m.key]||0);
        data.push([pivot[c].nom, ...vals, vals.reduce((a,b)=>a+b,0)]);
      });
      data.push(['TOTAL', ...MONTHS.map(m=>visible.reduce((s,c)=>s+(pivot[c][t][m.key]||0),0)), visible.reduce((s,c)=>s+MONTHS.reduce((ss,m)=>ss+(pivot[c][t][m.key]||0),0),0)]);
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [{wch:40},...MONTHS.map(()=>({wch:13})),{wch:14}];
      XLSX.utils.book_append_sheet(wb, ws, t==='client'?'Coût Client':'Coût Revendeur');
    }
    XLSX.writeFile(wb, 'CDR_Analyse.xlsx');
  };
 
  if (rows.length === 0) return (
    <div style={{ textAlign:'center', padding:'80px 0', color:T.muted }}>
      <BarChart3 size={36} style={{ margin:'0 auto 12px', opacity:.2 }}/>
      <div style={{ fontWeight:600, color:T.sub, fontFamily:T.ui, marginBottom:4 }}>Aucune donnée disponible</div>
      <div style={{ fontSize:12, fontFamily:T.ui }}>Importez des fichiers CDR depuis le module Import</div>
    </div>
  );
 
  const TABS = [
    { id:'client',    label:'Coût Client',    color:T.blue },
    { id:'revendeur', label:'Coût Revendeur', color:T.purple },
    { id:'marge',     label:'Marge',          color:T.green },
  ];
  const accent = TABS.find(t=>t.id===tab)?.color || T.blue;
 
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
 
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontSize:26, fontWeight:700, color:T.text, fontFamily:T.serif, marginBottom:4 }}>CDR Analyzer</div>
          <div style={{ fontSize:13, color:T.sub, fontFamily:T.ui }}>{MONTHS.length} mois · {allClients.length} clients · {rows.length.toLocaleString()} lignes</div>
        </div>
        <button onClick={exportXLSX} style={{ display:'flex', alignItems:'center', gap:7, background:T.text, color:'white', border:'none', borderRadius:8, padding:'9px 16px', cursor:'pointer', fontFamily:T.ui, fontWeight:600, fontSize:12 }}>
          ↓ Exporter Excel
        </button>
      </div>
 
      {/* Filtres clients */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 18px' }}>
        <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:10, flexWrap:'wrap' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filtrer les clients..."
            style={{ flex:1, minWidth:180, padding:'7px 12px', border:`1px solid ${T.border}`, borderRadius:8, fontSize:12, fontFamily:T.ui, color:T.text, background:T.panel, outline:'none' }}
            onFocus={e=>e.target.style.borderColor=T.gold} onBlur={e=>e.target.style.borderColor=T.border}/>
          <button onClick={()=>setHidden(new Set())} style={{ padding:'7px 12px', background:'none', border:`1px solid ${T.border}`, borderRadius:8, fontSize:11, fontFamily:T.ui, cursor:'pointer', color:T.sub }}>Tout afficher</button>
          <button onClick={()=>setHidden(new Set(allClients))} style={{ padding:'7px 12px', background:'none', border:`1px solid ${T.border}`, borderRadius:8, fontSize:11, fontFamily:T.ui, cursor:'pointer', color:T.sub }}>Tout masquer</button>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, minHeight:80, maxHeight:320, height:160, overflowY:'auto', paddingRight:4, resize:'vertical' }}>
          {shown.map(c => {
            const on = !hidden.has(c);
            const p  = PROVIDERS.find(x => pivot[c].providers.has(x.id));
            const col = p?.color || T.muted;
            return (
              <button key={c} onClick={()=>toggle(c)} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:999, border:`1.5px solid ${on?col+'50':T.border}`, background:on?col+'10':T.panel, color:on?col:T.muted, fontSize:11, fontWeight:500, cursor:'pointer', fontFamily:T.ui, transition:'all .12s', opacity:on?1:.6 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:on?col:T.dim, flexShrink:0 }}/>
                {c}
              </button>
            );
          })}
        </div>
      </div>
 
      {/* Tableau */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden' }}>
        <div style={{ display:'flex', borderBottom:`1px solid ${T.border}` }}>
          {TABS.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, padding:'13px', border:'none', cursor:'pointer', fontFamily:T.ui, fontSize:13, fontWeight:tab===t.id?700:400, color:tab===t.id?t.color:T.muted, background:'transparent', borderBottom:`2px solid ${tab===t.id?t.color:'transparent'}`, transition:'all .15s' }}>
              {t.label}
            </button>
          ))}
          <div style={{ display:'flex', alignItems:'center', padding:'0 16px', borderLeft:`1px solid ${T.border}` }}>
            <span style={{ fontSize:11, color:T.muted, fontFamily:T.mono, whiteSpace:'nowrap' }}>{visible.length} · {MONTHS.length} mois</span>
          </div>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr>
                <th style={{ padding:'10px 16px', textAlign:'left', color:T.sub, fontWeight:700, fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', fontFamily:T.ui, borderBottom:`2px solid ${T.border}`, position:'sticky', left:0, background:T.panel, minWidth:200 }}>Client</th>
                {MONTHS.map(m=>(
                  <th key={m.key} style={{ padding:'10px 14px', textAlign:'right', color:T.sub, fontWeight:700, fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', fontFamily:T.ui, borderBottom:`2px solid ${T.border}`, whiteSpace:'nowrap' }}>{m.label}</th>
                ))}
                <th style={{ padding:'10px 14px', textAlign:'right', color:accent, fontWeight:700, fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', fontFamily:T.ui, borderBottom:`1px solid ${T.border}`, whiteSpace:'nowrap' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(c=>(
                <tr key={c} style={{ borderBottom:`1px solid ${T.border}` }}
                  onMouseEnter={e=>e.currentTarget.style.background=T.panel}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'10px 16px', fontWeight:600, color:T.text, fontFamily:T.ui, position:'sticky', left:0, background:'inherit' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      {[...pivot[c].providers].map(p=><Badge key={p} id={p}/>)}
                      <span style={{ fontSize:12 }}>{c}</span>
                    </div>
                  </td>
                  {MONTHS.map(m=>{
                    const v=getVal(c,m.key);
                    const cl=pivot[c].client[m.key]||0;
                    const p=tab==='marge'&&cl>0?v/cl:null;
                    const mc=p!==null?(p>=0.3?T.green:p>=0.1?T.gold:T.red):null;
                    return (
                      <td key={m.key} style={{ padding:'10px 14px', textAlign:'right', fontFamily:T.mono, color:v===0?T.dim:T.sub, fontSize:11 }}>
                        {tab==='marge' ? (
                          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:2}}>
                            <span style={{color:v===0?T.dim:T.text,fontWeight:v===0?400:600}}>{f4(v)}</span>
                            {p!==null&&cl>0&&<span style={{fontSize:9,fontWeight:700,color:mc,background:mc+'18',borderRadius:3,padding:'1px 5px'}}>{pct(p)}</span>}
                          </div>
                        ) : f4(v)}
                      </td>
                    );
                  })}
                  <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:T.mono, fontWeight:700, color:accent }}>
                    {tab==='marge' ? (
                      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:2}}>
                        <span>{f4(rowTot(c))}</span>
                        {rowTot(c,'client')>0&&<span style={{fontSize:9,fontWeight:700,color:T.green,background:T.greenSoft,borderRadius:3,padding:'1px 5px'}}>{pct(rowTot(c)/MONTHS.reduce((s,m)=>s+(pivot[c].client[m.key]||0),0))}</span>}
                      </div>
                    ) : f4(rowTot(c))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background:T.panel, borderTop:`2px solid ${T.border}` }}>
                <td style={{ padding:'11px 16px', fontWeight:700, color:accent, fontFamily:T.ui, position:'sticky', left:0, background:T.panel }}>TOTAL</td>
                {MONTHS.map(m=>{
                  const cv=colTot(m.key);
                  const cc=tab==='marge'?visible.reduce((s,c)=>s+(pivot[c].client[m.key]||0),0):0;
                  const cp=tab==='marge'&&cc>0?cv/cc:null;
                  return (
                    <td key={m.key} style={{ padding:'11px 14px', textAlign:'right', fontFamily:T.mono, fontWeight:600, color:T.sub }}>
                      {tab==='marge'?(
                        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:1}}>
                          <span>{f4(cv)}</span>
                          {cp!==null&&<span style={{fontSize:9,fontWeight:700,color:T.green,background:T.greenSoft,borderRadius:3,padding:'1px 5px'}}>{pct(cp)}</span>}
                        </div>
                      ):f4(cv)}
                    </td>
                  );
                })}
                <td style={{ padding:'11px 14px', textAlign:'right', fontFamily:T.mono, fontWeight:800, color:accent, fontSize:13 }}>{f2(grand())}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
 

export default CDRModule;