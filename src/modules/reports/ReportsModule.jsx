import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  BarChart3, Calendar, RefreshCw, PieChart, Download, Printer, Search, Euro, TrendingUp
} from 'lucide-react';
import { T, PROVIDERS, MONTH_LABELS, MARGIN } from '../../constants';
import { f2, pct } from '../../utils/formatters';
import { Badge, KPI, SectionTitle } from '../../components/ui';

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

// Module Rapports — trois vues : mensuel, par fournisseur, comparatif entre deux mois
// L'export Excel génère 4 feuilles : récap mensuel, détail clients, par fournisseur, récap annuel
const ReportsModule = ({ rows }) => {
  const [reportType, setReportType] = useState('monthly');
  const [selMonth,   setSelMonth]   = useState(null);
  const [cmpA,       setCmpA]       = useState(null);
  const [cmpB,       setCmpB]       = useState(null);
  const [clientFilter, setClientFilter] = useState('');

  const monthLabel = (mk) => {
    if (!mk) return '—';
    const [y,m] = mk.split('-');
    return `${MONTH_LABELS[parseInt(m,10)-1]} ${y}`;
  };

  const allMonths = useMemo(() =>
    [...new Set(rows.map(r=>r.monthKey))].filter(m=>m!=='unknown').sort(),
    [rows]
  );

  const byMonth = useMemo(() => {
    const map = {};
    rows.forEach(r => {
      if (r.monthKey==='unknown') return;
      if (!map[r.monthKey]) map[r.monthKey] = { conso:0, marge:0, clients:new Set(), lines:0 };
      map[r.monthKey].conso += r.conso;
      map[r.monthKey].marge += r.marge;
      map[r.monthKey].clients.add(r.client);
      map[r.monthKey].lines++;
    });
    return map;
  }, [rows]);

  const byProvider = useMemo(() => {
    const map = {};
    PROVIDERS.forEach(p => { map[p.id] = { ...p, conso:0, marge:0, clients:new Set(), lines:0, byMonth:{} }; });
    rows.forEach(r => {
      if (!map[r.provider]) return;
      map[r.provider].conso += r.conso;
      map[r.provider].marge += r.marge;
      map[r.provider].clients.add(r.client);
      map[r.provider].lines++;
      if (!map[r.provider].byMonth[r.monthKey]) map[r.provider].byMonth[r.monthKey] = { conso:0, marge:0 };
      map[r.provider].byMonth[r.monthKey].conso += r.conso;
      map[r.provider].byMonth[r.monthKey].marge += r.marge;
    });
    return Object.values(map).filter(p=>p.lines>0);
  }, [rows]);

  const clientsForMonth = useMemo(() => {
    if (!selMonth) return [];
    const map = {};
    rows.filter(r=>r.monthKey===selMonth).forEach(r => {
      if (!map[r.client]) map[r.client] = { name:r.client, provider:r.provider, conso:0, marge:0, lines:0 };
      map[r.client].conso += r.conso;
      map[r.client].marge += r.marge;
      map[r.client].lines++;
    });
    return Object.values(map).sort((a,b)=>b.marge-a.marge);
  }, [rows, selMonth]);

  const compareData = useMemo(() => allMonths.map(mk => {
    const d = byMonth[mk] || { conso:0, marge:0 };
    const mn = d.marge - d.conso;
    return { label:monthLabel(mk), key:mk, conso:+d.conso.toFixed(2), ca:+d.marge.toFixed(2), margeNet:+mn.toFixed(2) };
  }), [allMonths, byMonth]);

  const getClientsForMk = (mk) => {
    if (!mk) return [];
    const map = {};
    rows.filter(r=>r.monthKey===mk).forEach(r => {
      if (!map[r.client]) map[r.client] = { name:r.client, conso:0, marge:0 };
      map[r.client].conso += r.conso;
      map[r.client].marge += r.marge;
    });
    return Object.values(map).sort((a,b)=>b.marge-a.marge);
  };
  const cmpDataA = useMemo(() => getClientsForMk(cmpA), [cmpA, rows]);
  const cmpDataB = useMemo(() => getClientsForMk(cmpB), [cmpB, rows]);

  const totalConso = rows.reduce((s,r)=>s+r.conso, 0);
  const totalMarge = rows.reduce((s,r)=>s+r.marge, 0);
  const totalMargeNet = totalMarge - totalConso;
  const avgMargePct = totalMarge > 0 ? totalMargeNet/totalMarge : 0;
  const bestMonth = allMonths.reduce((best,mk) => (!best || byMonth[mk].marge > byMonth[best].marge) ? mk : best, null);

  // Génère un fichier Excel avec 4 feuilles de synthèse via la lib SheetJS
  const exportMonthlyXLSX = () => {
    const wb = XLSX.utils.book_new();

    const recap = [['Mois','Consommation HT','CA Facturé HT','Marge Nette','% Marge','Clients','Lignes']];
    allMonths.forEach(mk => {
      const d = byMonth[mk];
      const mn = d.marge - d.conso;
      recap.push([monthLabel(mk), d.conso, d.marge, mn, d.marge>0?mn/d.marge:0, d.clients.size, d.lines]);
    });
    const totMn = totalMarge - totalConso;
    recap.push(['TOTAL', totalConso, totalMarge, totMn, totalMarge>0?totMn/totalMarge:0, [...new Set(rows.map(r=>r.client))].length, rows.length]);
    const ws1 = XLSX.utils.aoa_to_sheet(recap);
    ws1['!cols'] = [{wch:16},{wch:18},{wch:16},{wch:14},{wch:10},{wch:10},{wch:10}];
    XLSX.utils.book_append_sheet(wb, ws1, 'Récap mensuel');

    const detail = [['Mois','Client','Fournisseur','Conso HT','CA HT','Marge Nette','% Marge','Lignes']];
    allMonths.forEach(mk => {
      const map = {};
      rows.filter(r=>r.monthKey===mk).forEach(r => {
        if (!map[r.client]) map[r.client] = { provider:r.provider, conso:0, marge:0, lines:0 };
        map[r.client].conso += r.conso; map[r.client].marge += r.marge; map[r.client].lines++;
      });
      Object.entries(map).sort((a,b)=>b[1].marge-a[1].marge).forEach(([name,d]) => {
        const mn = d.marge - d.conso;
        detail.push([monthLabel(mk), name, d.provider.toUpperCase(), d.conso, d.marge, mn, d.marge>0?mn/d.marge:0, d.lines]);
      });
    });
    const ws2 = XLSX.utils.aoa_to_sheet(detail);
    ws2['!cols'] = [{wch:16},{wch:36},{wch:12},{wch:14},{wch:14},{wch:14},{wch:10},{wch:8}];
    XLSX.utils.book_append_sheet(wb, ws2, 'Détail clients');

    const provSheet = [['Fournisseur','Conso HT','CA HT','Marge Nette','% Marge','Clients','Lignes']];
    byProvider.forEach(p => {
      const mn = p.marge - p.conso;
      provSheet.push([p.name, p.conso, p.marge, mn, p.marge>0?mn/p.marge:0, p.clients.size, p.lines]);
    });
    const ws3 = XLSX.utils.aoa_to_sheet(provSheet);
    ws3['!cols'] = [{wch:14},{wch:16},{wch:14},{wch:14},{wch:10},{wch:10},{wch:8}];
    XLSX.utils.book_append_sheet(wb, ws3, 'Par fournisseur');

    const years = [...new Set(allMonths.map(mk=>mk.split('-')[0]))].sort();
    const annuel = [['Année','Consommation HT','CA Facturé HT','Marge Nette','% Marge','Clients','Lignes']];
    years.forEach(y => {
      const mks = allMonths.filter(mk=>mk.startsWith(y));
      const d = mks.reduce((acc,mk)=>{
        const m = byMonth[mk];
        acc.conso += m.conso; acc.marge += m.marge; acc.lines += m.lines;
        m.clients.forEach(c=>acc.clients.add(c));
        return acc;
      }, { conso:0, marge:0, lines:0, clients:new Set() });
      const mn = d.marge - d.conso;
      annuel.push([y, d.conso, d.marge, mn, d.marge>0?mn/d.marge:0, d.clients.size, d.lines]);
    });
    const ws4 = XLSX.utils.aoa_to_sheet(annuel);
    ws4['!cols'] = [{wch:10},{wch:18},{wch:16},{wch:14},{wch:10},{wch:10},{wch:10}];
    XLSX.utils.book_append_sheet(wb, ws4, 'Récap annuel');

    XLSX.writeFile(wb, `Rapport_Telecom_${new Date().toISOString().slice(0,7)}.xlsx`);
  };

  const REPORT_TABS = [
    { id:'monthly',  label:'Mensuel',        icon:Calendar  },
    { id:'provider', label:'Par fournisseur', icon:BarChart3 },
    { id:'compare',  label:'Comparatif',      icon:RefreshCw },
  ];

  if (rows.length === 0) return (
    <div style={{ textAlign:'center', padding:'80px 0', color:T.muted }}>
      <PieChart size={36} style={{ margin:'0 auto 12px', opacity:.2 }}/>
      <div style={{ fontWeight:600, color:T.sub, fontFamily:T.ui, marginBottom:4 }}>Aucune donnée disponible</div>
      <div style={{ fontSize:12, fontFamily:T.ui }}>Importez des fichiers CDR depuis le module Import</div>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <style>{`@media print { .np{display:none!important} @page{margin:1.5cm;size:A4} }`}</style>

      {/* Header */}
      <div className="np" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:26, fontWeight:700, color:T.text, fontFamily:T.serif, marginBottom:4 }}>Rapports</div>
          <div style={{ fontSize:13, color:T.sub, fontFamily:T.ui }}>
            {allMonths.length} mois · {[...new Set(rows.map(r=>r.client))].length} clients · {rows.length.toLocaleString()} lignes
          </div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={exportMonthlyXLSX} style={{ display:'flex', alignItems:'center', gap:7, background:T.surface, color:T.text, border:`1px solid ${T.border}`, borderRadius:8, padding:'9px 16px', cursor:'pointer', fontFamily:T.ui, fontWeight:600, fontSize:12 }}>
            <Download size={13}/> Excel (4 feuilles)
          </button>
          <button onClick={()=>window.print()} style={{ display:'flex', alignItems:'center', gap:7, background:T.text, color:'white', border:'none', borderRadius:8, padding:'9px 16px', cursor:'pointer', fontFamily:T.ui, fontWeight:600, fontSize:12 }}>
            <Printer size={13}/> PDF
          </button>
        </div>
      </div>

      {/* KPIs globaux */}
      <div className="np" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        <KPI label="Consommation HT"  value={f2(totalConso)}    icon={Euro}       color={T.sub}    sub="Total fournisseurs"/>
        <KPI label="CA Facturé HT"    value={f2(totalMarge)}    icon={TrendingUp}  color={T.green}  sub="Marge ×2"/>
        <KPI label="Marge nette HT"   value={f2(totalMargeNet)} icon={BarChart3}  color={T.blue}   sub={`Taux : ${pct(avgMargePct)}`}/>
        <KPI label="Meilleur mois"    value={monthLabel(bestMonth)} icon={Calendar} color={T.gold} sub={bestMonth ? f2(byMonth[bestMonth]?.marge||0) : '—'}/>
      </div>

      {/* Onglets */}
      <div className="np" style={{ display:'flex', gap:4, background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:4 }}>
        {REPORT_TABS.map(t => (
          <button key={t.id} onClick={()=>setReportType(t.id)} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'9px 14px', borderRadius:7, border:'none', cursor:'pointer', fontFamily:T.ui, fontSize:13, fontWeight:reportType===t.id?700:400, color:reportType===t.id?T.gold:T.muted, background:reportType===t.id?T.goldLight:'transparent', transition:'all .15s' }}>
            <t.icon size={13}/>{t.label}
          </button>
        ))}
      </div>

      {/* ── RAPPORT MENSUEL ── */}
      {reportType === 'monthly' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:'20px 24px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <SectionTitle>CA Facturé & Marge — évolution mensuelle</SectionTitle>
              <div style={{ display:'flex', gap:14, fontSize:11, fontFamily:T.ui, color:T.muted }}>
                <span style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:10, height:10, background:T.green, borderRadius:2, display:'inline-block' }}/> CA Facturé</span>
                <span style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:10, height:10, background:T.gold, borderRadius:2, display:'inline-block' }}/> Conso</span>
                <span style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:10, height:3, background:T.blue, borderRadius:2, display:'inline-block', marginTop:3 }}/> Marge nette</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={compareData} margin={{ top:5, right:10, bottom:0, left:10 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false}/>
                <XAxis dataKey="label" tick={{ fontSize:11, fontFamily:T.ui, fill:T.muted }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:10, fontFamily:T.mono, fill:T.muted }} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(1)}k`:v}/>
                <Tooltip content={<ChartTooltip/>}/>
                <Bar dataKey="ca"       name="CA Facturé"  fill={T.green}       radius={[4,4,0,0]}/>
                <Bar dataKey="conso"    name="Conso HT"    fill={T.gold+'80'}   radius={[4,4,0,0]}/>
                <Bar dataKey="margeNet" name="Marge nette" fill={T.blue+'70'}   radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:16 }}>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, background:T.panel }}>
                <SectionTitle>Sélectionner un mois</SectionTitle>
              </div>
              {allMonths.map(mk => {
                const d = byMonth[mk];
                const active = selMonth === mk;
                return (
                  <div key={mk} onClick={()=>setSelMonth(mk===selMonth?null:mk)}
                    style={{ padding:'11px 16px', borderBottom:`1px solid ${T.border}`, cursor:'pointer', background:active?T.goldLight:'transparent', borderLeft:`3px solid ${active?T.gold:'transparent'}`, transition:'all .12s' }}
                    onMouseEnter={e=>{ if(!active) e.currentTarget.style.background=T.panel; }}
                    onMouseLeave={e=>{ if(!active) e.currentTarget.style.background='transparent'; }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:13, fontWeight:active?700:500, color:active?T.gold:T.text, fontFamily:T.ui }}>{monthLabel(mk)}</span>
                      <span style={{ fontSize:11, fontWeight:600, color:active?T.gold:T.sub, fontFamily:T.mono }}>{f2(d.marge)}</span>
                    </div>
                    <div style={{ fontSize:10, color:T.muted, fontFamily:T.ui, marginTop:2 }}>{d.clients.size} clients · {d.lines.toLocaleString()} lignes</div>
                  </div>
                );
              })}
            </div>

            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden' }}>
              {!selMonth ? (
                <div style={{ textAlign:'center', padding:'60px 20px', color:T.muted }}>
                  <Calendar size={28} style={{ margin:'0 auto 10px', opacity:.2 }}/>
                  <div style={{ fontFamily:T.ui, fontSize:13 }}>Sélectionnez un mois pour voir le détail client</div>
                </div>
              ) : (
                <>
                  <div style={{ padding:'12px 18px', borderBottom:`1px solid ${T.border}`, background:T.panel, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                    <span style={{ fontSize:14, fontWeight:700, color:T.text, fontFamily:T.serif }}>{monthLabel(selMonth)}</span>
                    <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                      <div style={{ position:'relative' }}>
                        <Search size={11} style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:T.muted }}/>
                        <input value={clientFilter} onChange={e=>setClientFilter(e.target.value)} placeholder="Filtrer..."
                          style={{ paddingLeft:24, paddingRight:8, paddingTop:6, paddingBottom:6, border:`1px solid ${T.border}`, borderRadius:7, fontSize:12, fontFamily:T.ui, color:T.text, background:T.surface, outline:'none', width:140 }}
                          onFocus={e=>e.target.style.borderColor=T.gold} onBlur={e=>e.target.style.borderColor=T.border}/>
                      </div>
                      <span style={{ fontSize:12, color:T.sub, fontFamily:T.mono }}>Conso {f2(byMonth[selMonth].conso)}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:T.green, fontFamily:T.mono }}>CA {f2(byMonth[selMonth].marge)}</span>
                    </div>
                  </div>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                      <thead>
                        <tr style={{ background:T.panel, borderBottom:`1px solid ${T.border}` }}>
                          {['Client','Fourn.','Lignes','Conso HT','CA HT','Marge Nette','% Marge'].map((h,i)=>(
                            <th key={h} style={{ padding:'9px 14px', textAlign:i>2?'right':'left', color:T.sub, fontWeight:700, fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', fontFamily:T.ui, whiteSpace:'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {clientsForMonth
                          .filter(c => !clientFilter || c.name.toLowerCase().includes(clientFilter.toLowerCase()))
                          .map((c,i) => {
                            const mn  = c.marge - c.conso;
                            const mp  = c.marge > 0 ? mn/c.marge : 0;
                            const col = mp>=0.3?T.green:mp>=0.1?T.gold:T.red;
                            return (
                              <tr key={i} style={{ borderBottom:`1px solid ${T.border}` }}
                                onMouseEnter={e=>e.currentTarget.style.background=T.panel}
                                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                                <td style={{ padding:'9px 14px', fontWeight:600, color:T.text, fontFamily:T.ui }}>{c.name}</td>
                                <td style={{ padding:'9px 14px' }}><Badge id={c.provider}/></td>
                                <td style={{ padding:'9px 14px', textAlign:'right', color:T.muted, fontFamily:T.mono }}>{c.lines.toLocaleString()}</td>
                                <td style={{ padding:'9px 14px', textAlign:'right', fontFamily:T.mono, color:T.sub }}>{f2(c.conso)}</td>
                                <td style={{ padding:'9px 14px', textAlign:'right', fontFamily:T.mono, fontWeight:700, color:T.green }}>{f2(c.marge)}</td>
                                <td style={{ padding:'9px 14px', textAlign:'right', fontFamily:T.mono, color:T.text }}>{f2(mn)}</td>
                                <td style={{ padding:'9px 14px', textAlign:'right' }}>
                                  <span style={{ fontSize:10, fontWeight:700, color:col, background:col+'15', borderRadius:4, padding:'2px 6px', fontFamily:T.mono }}>{pct(mp)}</span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background:T.panel, borderTop:`2px solid ${T.border}` }}>
                          <td colSpan={3} style={{ padding:'10px 14px', fontWeight:700, color:T.sub, fontFamily:T.ui }}>TOTAL {monthLabel(selMonth)}</td>
                          <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:T.mono, fontWeight:600, color:T.sub }}>{f2(clientsForMonth.reduce((s,c)=>s+c.conso,0))}</td>
                          <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:T.mono, fontWeight:700, color:T.green }}>{f2(clientsForMonth.reduce((s,c)=>s+c.marge,0))}</td>
                          <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:T.mono, fontWeight:700, color:T.text }}>{f2(clientsForMonth.reduce((s,c)=>s+c.marge - c.conso,0))}</td>
                          <td/>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── RAPPORT PAR FOURNISSEUR ── */}
      {reportType === 'provider' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:'20px 24px' }}>
            <SectionTitle>Évolution CA par fournisseur</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={allMonths.map(mk => {
                const pt = { label:monthLabel(mk) };
                byProvider.forEach(p => { pt[p.id] = +(p.byMonth[mk]?.marge||0).toFixed(2); });
                return pt;
              })} margin={{ top:5, right:10, bottom:0, left:10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false}/>
                <XAxis dataKey="label" tick={{ fontSize:11, fontFamily:T.ui, fill:T.muted }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:10, fontFamily:T.mono, fill:T.muted }} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(1)}k`:v}/>
                <Tooltip content={<ChartTooltip/>}/>
                {byProvider.map(p=>(
                  <Line key={p.id} type="monotone" dataKey={p.id} name={p.name} stroke={p.color} strokeWidth={2} dot={false} activeDot={{ r:4 }}/>
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {byProvider.map(p => {
            const mn  = p.marge - p.conso;
            const mp  = p.marge > 0 ? mn/p.marge : 0;
            const chartData = allMonths.map(mk => ({
              label: monthLabel(mk),
              ca:    +(p.byMonth[mk]?.marge||0).toFixed(2),
              conso: +(p.byMonth[mk]?.conso||0).toFixed(2),
            }));
            return (
              <div key={p.id} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden' }}>
                <div style={{ height:3, background:p.color }}/>
                <div style={{ padding:'18px 22px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:20 }}>
                    <Badge id={p.id}/>
                    <div><div style={{ fontSize:20, fontWeight:700, color:T.text, fontFamily:T.mono }}>{f2(p.marge)}</div><div style={{ fontSize:10, color:T.muted, fontFamily:T.ui }}>CA Facturé HT</div></div>
                    <div><div style={{ fontSize:20, fontWeight:700, color:T.sub, fontFamily:T.mono }}>{f2(p.conso)}</div><div style={{ fontSize:10, color:T.muted, fontFamily:T.ui }}>Consommation</div></div>
                    <div><div style={{ fontSize:20, fontWeight:700, color:T.green, fontFamily:T.mono }}>{f2(mn)}</div><div style={{ fontSize:10, color:T.muted, fontFamily:T.ui }}>Marge nette</div></div>
                  </div>
                  <div style={{ display:'flex', gap:20 }}>
                    <div style={{ textAlign:'center' }}><div style={{ fontSize:15, fontWeight:700, color:T.blue, fontFamily:T.mono }}>{p.clients.size}</div><div style={{ fontSize:10, color:T.muted, fontFamily:T.ui }}>Clients</div></div>
                    <div style={{ textAlign:'center' }}><div style={{ fontSize:15, fontWeight:700, color:mp>=0.3?T.green:mp>=0.1?T.gold:T.red, fontFamily:T.mono }}>{pct(mp)}</div><div style={{ fontSize:10, color:T.muted, fontFamily:T.ui }}>% Marge</div></div>
                    <div style={{ textAlign:'center' }}><div style={{ fontSize:15, fontWeight:700, color:T.sub, fontFamily:T.mono }}>{p.lines.toLocaleString()}</div><div style={{ fontSize:10, color:T.muted, fontFamily:T.ui }}>Lignes</div></div>
                  </div>
                </div>
                <div style={{ padding:'12px 22px' }}>
                  <ResponsiveContainer width="100%" height={100}>
                    <AreaChart data={chartData} margin={{ top:5, right:0, bottom:0, left:0 }}>
                      <defs>
                        <linearGradient id={`grad-${p.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={p.color} stopOpacity={0.18}/>
                          <stop offset="95%" stopColor={p.color} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false}/>
                      <XAxis dataKey="label" tick={{ fontSize:10, fontFamily:T.ui, fill:T.muted }} axisLine={false} tickLine={false}/>
                      <Tooltip content={<ChartTooltip/>}/>
                      <Area type="monotone" dataKey="ca" name="CA HT" stroke={p.color} strokeWidth={2} fill={`url(#grad-${p.id})`} dot={false} activeDot={{ r:4 }}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── COMPARATIF DEUX MOIS ── */}
      {reportType === 'compare' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            {[{val:cmpA, set:setCmpA, label:'Mois A', color:T.blue},{val:cmpB, set:setCmpB, label:'Mois B', color:T.green}].map(({val,set:setVal,label,color})=>(
              <div key={label} style={{ background:T.surface, border:`2px solid ${val?color:T.border}`, borderRadius:12, padding:'16px 18px' }}>
                <div style={{ fontSize:10, fontWeight:700, color:val?color:T.muted, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:T.ui, marginBottom:10 }}>{label}</div>
                <select value={val||''} onChange={e=>setVal(e.target.value||null)}
                  style={{ width:'100%', padding:'8px 12px', border:`1px solid ${T.border}`, borderRadius:8, fontSize:13, fontFamily:T.ui, color:T.text, background:T.panel, outline:'none', cursor:'pointer' }}>
                  <option value="">— Choisir un mois —</option>
                  {allMonths.map(mk=><option key={mk} value={mk}>{monthLabel(mk)}</option>)}
                </select>
                {val && (
                  <div style={{ marginTop:12, display:'flex', gap:16 }}>
                    <div><div style={{ fontSize:16, fontWeight:700, color, fontFamily:T.mono }}>{f2(byMonth[val]?.marge||0)}</div><div style={{ fontSize:10, color:T.muted, fontFamily:T.ui }}>CA HT</div></div>
                    <div><div style={{ fontSize:16, fontWeight:700, color:T.sub, fontFamily:T.mono }}>{f2(byMonth[val]?.conso||0)}</div><div style={{ fontSize:10, color:T.muted, fontFamily:T.ui }}>Conso</div></div>
                    <div><div style={{ fontSize:16, fontWeight:700, color:T.gold, fontFamily:T.mono }}>{byMonth[val]?.clients.size||0}</div><div style={{ fontSize:10, color:T.muted, fontFamily:T.ui }}>Clients</div></div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {cmpA && cmpB && (() => {
            const allC = [...new Set([...cmpDataA.map(c=>c.name),...cmpDataB.map(c=>c.name)])].sort();
            const mapA = Object.fromEntries(cmpDataA.map(c=>[c.name,c]));
            const mapB = Object.fromEntries(cmpDataB.map(c=>[c.name,c]));
            const totA = cmpDataA.reduce((s,c)=>s+c.marge,0);
            const totB = cmpDataB.reduce((s,c)=>s+c.marge,0);
            const totDelta = totA>0?(totB-totA)/totA:null;
            return (
              <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden' }}>
                <div style={{ padding:'16px 20px', borderBottom:`1px solid ${T.border}`, background:T.panel, display:'flex', gap:24, flexWrap:'wrap', alignItems:'center' }}>
                  <span style={{ fontSize:13, fontWeight:700, color:T.text, fontFamily:T.serif }}>Comparatif global</span>
                  <div style={{ display:'flex', gap:20 }}>
                    <span style={{ fontSize:13, color:T.blue, fontFamily:T.mono, fontWeight:600 }}>{monthLabel(cmpA)} : {f2(totA)}</span>
                    <span style={{ fontSize:13, color:T.green, fontFamily:T.mono, fontWeight:600 }}>{monthLabel(cmpB)} : {f2(totB)}</span>
                    {totDelta !== null && (
                      <span style={{ fontSize:12, fontWeight:700, color:totDelta>=0?T.green:T.red, background:(totDelta>=0?T.green:T.red)+'15', borderRadius:6, padding:'2px 10px', fontFamily:T.mono }}>
                        {totDelta>0?'+':''}{(totDelta*100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead>
                      <tr style={{ background:T.panel, borderBottom:`1px solid ${T.border}` }}>
                        <th style={{ padding:'9px 16px', textAlign:'left', color:T.muted, fontWeight:600, fontSize:10, textTransform:'uppercase', fontFamily:T.ui }}>Client</th>
                        <th style={{ padding:'9px 16px', textAlign:'right', color:T.blue, fontWeight:700, fontSize:10, fontFamily:T.ui }}>{monthLabel(cmpA)}</th>
                        <th style={{ padding:'9px 16px', textAlign:'right', color:T.green, fontWeight:700, fontSize:10, fontFamily:T.ui }}>{monthLabel(cmpB)}</th>
                        <th style={{ padding:'9px 16px', textAlign:'right', color:T.muted, fontWeight:600, fontSize:10, fontFamily:T.ui }}>Évolution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allC.map(name => {
                        const a = mapA[name]?.marge||0;
                        const b = mapB[name]?.marge||0;
                        const delta = a>0?(b-a)/a:null;
                        const col = delta===null?T.muted:delta>0?T.green:delta<0?T.red:T.muted;
                        return (
                          <tr key={name} style={{ borderBottom:`1px solid ${T.border}` }}
                            onMouseEnter={e=>e.currentTarget.style.background=T.panel}
                            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                            <td style={{ padding:'9px 16px', fontWeight:600, color:T.text, fontFamily:T.ui }}>{name}</td>
                            <td style={{ padding:'9px 16px', textAlign:'right', fontFamily:T.mono, color:a>0?T.blue:T.dim }}>{a>0?f2(a):'—'}</td>
                            <td style={{ padding:'9px 16px', textAlign:'right', fontFamily:T.mono, color:b>0?T.green:T.dim }}>{b>0?f2(b):'—'}</td>
                            <td style={{ padding:'9px 16px', textAlign:'right' }}>
                              {delta!==null
                                ? <span style={{ fontSize:11, fontWeight:700, color:col, background:col+'15', borderRadius:4, padding:'2px 7px', fontFamily:T.mono }}>{delta>0?'+':''}{(delta*100).toFixed(1)}%</span>
                                : b>0 ? <span style={{ fontSize:10, color:T.green, fontFamily:T.ui }}>Nouveau</span>
                                      : <span style={{ fontSize:10, color:T.red,   fontFamily:T.ui }}>Disparu</span>
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {(!cmpA || !cmpB) && (
            <div style={{ textAlign:'center', padding:'48px', color:T.muted, background:T.surface, border:`1px solid ${T.border}`, borderRadius:12 }}>
              <RefreshCw size={28} style={{ margin:'0 auto 10px', opacity:.2 }}/>
              <div style={{ fontFamily:T.ui, fontSize:13 }}>Sélectionnez deux mois pour lancer la comparaison</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportsModule;
