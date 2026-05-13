import React, { useState, useMemo } from 'react';
import { Euro, Clock, CheckCircle2, ArrowLeft, Printer, FileText, Plus, Trash2, TrendingUp, Users, Search, ChevronRight } from 'lucide-react';
import { T, PROVIDERS, MONTH_LABELS, MARGIN, INVOICE_STATUS } from '../../constants';
import { f2, f4 } from '../../utils/formatters';
import { Badge, InvoiceBadge, KPI, SectionTitle } from '../../components/ui';

const nextInvoiceNum = (db) => {
  const nums = Object.values(db).map(i => parseInt(i.number?.replace(/\D/g, '')) || 0);
  return `FAC-${String(Math.max(0, ...nums) + 1).padStart(4, '0')}`;
};

const InvoiceDetail = ({ invoice, clientData, onBack, onSave }) => {
  const [status, setStatus] = useState(invoice.status || 'draft');
  const totalHT = invoice.totalHT;
  const tva     = totalHT * 0.20;
  const ttc     = totalHT * 1.20;
  const s       = INVOICE_STATUS.find(x=>x.id===status) || INVOICE_STATUS[0];
 
  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    onSave({ ...invoice, status: newStatus, updatedAt: new Date().toISOString() });
  };
 
  return (
    <div style={{ maxWidth:900, margin:'0 auto' }}>
      <style>{`@media print { @page{margin:1.8cm;size:A4} body{background:white!important} .np{display:none!important} }`}</style>
 
      {/* Barre d'actions */}
      <div className="np" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, gap:12, flexWrap:'wrap' }}>
        <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:`1px solid ${T.border}`, borderRadius:8, padding:'8px 14px', cursor:'pointer', color:T.sub, fontFamily:T.ui, fontSize:13 }}>
          <ArrowLeft size={14}/> Retour
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, justifyContent:'center', flexWrap:'wrap' }}>
          <span style={{ fontSize:12, color:T.muted, fontFamily:T.ui }}>Statut :</span>
          {INVOICE_STATUS.map(st => (
            <button key={st.id} onClick={()=>handleStatusChange(st.id)}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:7, border:`1.5px solid ${status===st.id ? st.color : T.border}`, background:status===st.id ? st.soft : 'transparent', color:status===st.id ? st.color : T.muted, fontSize:11, fontWeight:status===st.id?700:400, cursor:'pointer', fontFamily:T.ui, transition:'all .12s' }}>
              {st.icon} {st.label}
            </button>
          ))}
        </div>
        <button onClick={()=>window.print()} style={{ display:'flex', alignItems:'center', gap:8, background:T.text, color:'white', border:'none', borderRadius:8, padding:'9px 18px', cursor:'pointer', fontFamily:T.ui, fontWeight:600, fontSize:13 }}>
          <Printer size={13}/> PDF
        </button>
      </div>
 
      {/* Document facture */}
      <div style={{ background:'white', borderRadius:16, border:`1px solid ${T.border}`, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,.07)' }}>
        <div style={{ height:3, background:`linear-gradient(90deg,${T.gold},#e8c97a,${T.gold})` }}/>
        <div style={{ padding:'40px 48px 32px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', borderBottom:`1px solid ${T.border}` }}>
          <div>
            <div style={{ fontSize:10, fontWeight:600, color:T.muted, letterSpacing:'.12em', textTransform:'uppercase', fontFamily:T.ui, marginBottom:8 }}>Facture de consommation télécom</div>
            <div style={{ fontSize:28, fontWeight:700, color:T.text, fontFamily:T.serif, marginBottom:8 }}>{invoice.clientName}</div>
            <div style={{ display:'flex', gap:6, marginBottom:10 }}>{(invoice.providers||[]).map(p=><Badge key={p} id={p}/>)}</div>
            <InvoiceBadge status={status}/>
            {clientData?.address && <div style={{ fontSize:11, color:T.muted, fontFamily:T.ui, marginTop:8 }}>{clientData.address}{clientData.city ? ` · ${clientData.city}` : ''}</div>}
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:20, fontWeight:700, color:T.text, fontFamily:T.serif, marginBottom:4 }}>Deleg Media</div>
            <div style={{ fontSize:11, color:T.muted, fontFamily:T.ui, marginBottom:1 }}>N° <span style={{ fontWeight:700, color:T.text, fontFamily:T.mono }}>{invoice.number}</span></div>
            <div style={{ fontSize:11, color:T.muted, fontFamily:T.ui, marginBottom:1 }}>Émise le {new Date(invoice.createdAt).toLocaleDateString('fr-FR')}</div>
            <div style={{ fontSize:11, color:T.muted, fontFamily:T.ui, marginBottom:20 }}>Période : {invoice.period}</div>
            <div style={{ fontSize:34, fontWeight:700, color:T.text, fontFamily:T.mono }}>{f2(ttc)}</div>
            <div style={{ fontSize:11, color:T.muted, fontFamily:T.ui }}>TTC · dont {f2(tva)} TVA</div>
          </div>
        </div>
 
        <div style={{ padding:'28px 48px' }}>
          <SectionTitle>Détail des consommations</SectionTitle>
          <div style={{ border:`1px solid ${T.border}`, borderRadius:10, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:T.panel, borderBottom:`1px solid ${T.border}` }}>
                  {['Date','Description','Durée','Consommation HT','Facturé HT ×2'].map((h,i)=>(
                    <th key={h} style={{ padding:'10px 14px', textAlign:i>2?'right':'left', color:T.sub, fontWeight:600, fontSize:10, textTransform:'uppercase', letterSpacing:'.07em', fontFamily:T.ui }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(invoice.items||[]).map((item,i)=>(
                  <tr key={i} style={{ borderBottom:`1px solid ${T.border}` }}>
                    <td style={{ padding:'9px 14px', color:T.muted, fontFamily:T.mono, fontSize:11 }}>{item.date}</td>
                    <td style={{ padding:'9px 14px', color:T.sub, fontFamily:T.ui }}>{item.desc}</td>
                    <td style={{ padding:'9px 14px', color:T.muted, fontFamily:T.mono }}>{item.duree}</td>
                    <td style={{ padding:'9px 14px', textAlign:'right', color:T.sub, fontFamily:T.mono }}>{f4(item.conso)}</td>
                    <td style={{ padding:'9px 14px', textAlign:'right', fontWeight:600, color:T.text, fontFamily:T.mono }}>{f4(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background:T.panel, borderTop:`2px solid ${T.border}` }}>
                  <td colSpan={3} style={{ padding:'12px 14px', textAlign:'right', fontWeight:600, color:T.sub, fontFamily:T.ui }}>Sous-total HT</td>
                  <td style={{ padding:'12px 14px', textAlign:'right', fontFamily:T.mono, color:T.sub }}>{f2(invoice.totalConso)}</td>
                  <td style={{ padding:'12px 14px', textAlign:'right', fontFamily:T.mono, fontWeight:700, color:T.text }}>{f2(totalHT)}</td>
                </tr>
                <tr style={{ background:T.panel }}>
                  <td colSpan={4} style={{ padding:'8px 14px', textAlign:'right', color:T.muted, fontSize:11, fontFamily:T.ui }}>TVA 20 %</td>
                  <td style={{ padding:'8px 14px', textAlign:'right', color:T.muted, fontSize:11, fontFamily:T.mono }}>{f2(tva)}</td>
                </tr>
                <tr style={{ background:T.text }}>
                  <td colSpan={4} style={{ padding:'15px 14px', textAlign:'right', fontWeight:700, fontSize:14, color:'white', fontFamily:T.ui }}>NET À PAYER TTC</td>
                  <td style={{ padding:'15px 14px', textAlign:'right', fontWeight:700, fontSize:17, color:'#e8c97a', fontFamily:T.mono }}>{f2(ttc)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <div style={{ padding:'18px 48px', borderTop:`1px solid ${T.border}`, background:T.panel, display:'flex', justifyContent:'space-between', fontSize:11, color:T.muted, fontFamily:T.ui }}>
          <span>Paiement à réception · Virement bancaire</span>
          <span>Deleg Media · SIRET 123 456 789 00012 · Art. 289 CGI</span>
        </div>
      </div>
    </div>
  );
};
 
// ── Module Facturation principal ──
const BillingModule = ({ rows, invoicesDB, setInvoicesDB, clientsDB }) => {
  const [search, setSearch]   = useState('');
  const [provider, setProv]   = useState('all');
  const [tab, setTab]         = useState('clients');   // 'clients' | 'history'
  const [openInvoice, setOpen] = useState(null);       // objet invoice sauvegardé
 
  // Données CDR par client
  const clientMap = useMemo(() => {
    const map = {};
    rows.forEach(r => {
      if (!map[r.client]) map[r.client] = { name:r.client, providers:new Set(), totalConso:0, totalMarge:0, totalDuration:0, lineCount:0, items:[] };
      map[r.client].totalConso    += r.conso;
      map[r.client].totalMarge    += r.marge;
      map[r.client].totalDuration += r.duration;
      map[r.client].lineCount     += 1;
      map[r.client].items.push(r.detail);
      map[r.client].providers.add(r.provider);
    });
    return Object.values(map).map(c => ({ ...c, providers:[...c.providers] }));
  }, [rows]);
 
  const filtered = useMemo(() =>
    clientMap.filter(c =>
      (provider==='all'||c.providers.includes(provider)) &&
      c.name.toLowerCase().includes(search.toLowerCase()) &&
      c.totalMarge > 0
    ).sort((a,b)=>b.totalMarge-a.totalMarge),
    [clientMap, provider, search]
  );
 
  // Historique trié par date desc
  const history = useMemo(() =>
    Object.values(invoicesDB).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [invoicesDB]
  );
 
  // Créer et sauvegarder une facture
  const createInvoice = (client) => {
    const now = new Date();
    const inv = {
      id:         `inv-${Date.now()}`,
      number:     nextInvoiceNum(invoicesDB),
      clientName: client.name,
      providers:  client.providers,
      totalConso: client.totalConso,
      totalHT:    client.totalMarge,
      items:      client.items,
      status:     'draft',
      period:     now.toLocaleString('fr-FR', { month:'long', year:'numeric' }),
      createdAt:  now.toISOString(),
      updatedAt:  now.toISOString(),
    };
    const updated = { ...invoicesDB, [inv.id]: inv };
    setInvoicesDB(updated);
    localStorage.setItem('dm-invoices-db', JSON.stringify(updated));
    setOpen(inv);
  };
 
  const saveInvoice = (inv) => {
    const updated = { ...invoicesDB, [inv.id]: inv };
    setInvoicesDB(updated);
    localStorage.setItem('dm-invoices-db', JSON.stringify(updated));
    setOpen(inv);
  };
 
  const deleteInvoice = (id) => {
    if (!confirm('Supprimer cette facture ?')) return;
    const updated = { ...invoicesDB };
    delete updated[id];
    setInvoicesDB(updated);
    localStorage.setItem('dm-invoices-db', JSON.stringify(updated));
    setOpen(null);
  };
 
  // Vue facture ouverte
  if (openInvoice) return (
    <InvoiceDetail
      invoice={openInvoice}
      clientData={clientsDB?.[openInvoice.clientName]}
      onBack={()=>setOpen(null)}
      onSave={saveInvoice}
    />
  );
 
  if (rows.length === 0 && history.length === 0) return (
    <div style={{ textAlign:'center', padding:'80px 0', color:T.muted }}>
      <FileText size={36} style={{ margin:'0 auto 12px', opacity:.2 }}/>
      <div style={{ fontWeight:600, color:T.sub, fontFamily:T.ui, marginBottom:4 }}>Aucune donnée disponible</div>
      <div style={{ fontSize:12, fontFamily:T.ui }}>Importez des fichiers CDR depuis le module Import</div>
    </div>
  );
 
  const totalCA    = filtered.reduce((s,c)=>s+c.totalMarge, 0);
  const totalConso = filtered.reduce((s,c)=>s+c.totalConso, 0);
  const paidTotal  = history.filter(i=>i.status==='paid').reduce((s,i)=>s+i.totalHT*1.2, 0);
  const pendingCount = history.filter(i=>['sent','late'].includes(i.status)).length;
 
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontSize:26, fontWeight:700, color:T.text, fontFamily:T.serif, marginBottom:4 }}>Facturation</div>
          <div style={{ fontSize:13, color:T.sub, fontFamily:T.ui }}>{filtered.length} clients · {history.length} factures émises</div>
        </div>
      </div>
 
      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        <KPI label="Consommation HT"   value={f2(totalConso)}     icon={Euro}       color={T.sub}   sub="Coût fournisseurs"/>
        <KPI label="CA Facturable HT"  value={f2(totalCA)}        icon={TrendingUp}  color={T.green} sub="Marge ×2"/>
        <KPI label="Encaissé TTC"      value={f2(paidTotal)}      icon={CheckCircle2}color={T.blue}  sub="Factures payées"/>
        <KPI label="En attente"        value={pendingCount}        icon={Clock}       color={T.gold}  sub="Envoyées / En retard"/>
      </div>
 
      {/* Onglets */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden' }}>
        <div style={{ display:'flex', borderBottom:`1px solid ${T.border}`, background:T.panel }}>
          {[{id:'clients',label:'Clients facturables',icon:Users},{id:'history',label:`Historique (${history.length})`,icon:FileText}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ display:'flex', alignItems:'center', gap:7, padding:'13px 20px', border:'none', cursor:'pointer', fontFamily:T.ui, fontSize:13, fontWeight:tab===t.id?700:400, color:tab===t.id?T.gold:T.muted, background:'transparent', borderBottom:`2px solid ${tab===t.id?T.gold:'transparent'}`, transition:'all .15s' }}>
              <t.icon size={13}/>{t.label}
            </button>
          ))}
        </div>
 
        {tab === 'clients' && (
          <>
            <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
              <div style={{ position:'relative', flex:1, minWidth:160 }}>
                <Search size={12} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:T.muted }}/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..."
                  style={{ width:'100%', paddingLeft:28, paddingRight:10, paddingTop:8, paddingBottom:8, background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, fontSize:12, color:T.text, fontFamily:T.ui, outline:'none', boxSizing:'border-box' }}
                  onFocus={e=>e.target.style.borderColor=T.gold} onBlur={e=>e.target.style.borderColor=T.border}/>
              </div>
              <select value={provider} onChange={e=>setProv(e.target.value)}
                style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, padding:'8px 12px', fontSize:12, color:T.text, fontFamily:T.ui, outline:'none', cursor:'pointer' }}>
                <option value="all">Tous les fournisseurs</option>
                {PROVIDERS.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${T.border}`, background:T.panel }}>
                    {['Client','Source','Lignes','Conso HT','CA HT ×2','Factures',''].map((h,i)=>(
                      <th key={i} style={{ padding:'10px 18px', textAlign:['Conso HT','CA HT ×2','Lignes'].includes(h)?'right':'left', color:T.muted, fontWeight:600, fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', fontFamily:T.ui, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c,i)=>{
                    const clientInvoices = history.filter(inv=>inv.clientName===c.name);
                    const lastInv = clientInvoices[0];
                    return (
                      <tr key={i} style={{ borderBottom:`1px solid ${T.border}`, transition:'background .1s' }}
                        onMouseEnter={e=>e.currentTarget.style.background=T.panel}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{ padding:'12px 18px', fontWeight:600, color:T.text, fontFamily:T.ui }}>{c.name}</td>
                        <td style={{ padding:'12px 18px' }}><div style={{ display:'flex', gap:4 }}>{c.providers.map(p=><Badge key={p} id={p}/>)}</div></td>
                        <td style={{ padding:'12px 18px', textAlign:'right', color:T.muted, fontFamily:T.mono, fontSize:12 }}>{c.lineCount.toLocaleString()}</td>
                        <td style={{ padding:'12px 18px', textAlign:'right', fontFamily:T.mono, fontSize:12, color:T.sub }}>{f2(c.totalConso)}</td>
                        <td style={{ padding:'12px 18px', textAlign:'right', fontFamily:T.mono, fontSize:13, fontWeight:700, color:T.green }}>{f2(c.totalMarge)}</td>
                        <td style={{ padding:'12px 18px' }}>
                          {lastInv ? <InvoiceBadge status={lastInv.status}/> : <span style={{ fontSize:11, color:T.dim, fontFamily:T.ui }}>—</span>}
                        </td>
                        <td style={{ padding:'12px 18px' }}>
                          <button onClick={()=>createInvoice(c)}
                            style={{ display:'flex', alignItems:'center', gap:5, background:'transparent', border:`1px solid ${T.border}`, borderRadius:7, padding:'6px 12px', cursor:'pointer', fontSize:11, fontWeight:600, color:T.sub, fontFamily:T.ui, transition:'all .12s', whiteSpace:'nowrap' }}
                            onMouseEnter={e=>{e.currentTarget.style.background=T.text;e.currentTarget.style.color='white';e.currentTarget.style.borderColor=T.text;}}
                            onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color=T.sub;e.currentTarget.style.borderColor=T.border;}}>
                            + Émettre <ChevronRight size={11}/>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
 
        {tab === 'history' && (
          history.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 0', color:T.muted }}>
              <FileText size={28} style={{ margin:'0 auto 10px', opacity:.2 }}/>
              <div style={{ fontFamily:T.ui, fontSize:13 }}>Aucune facture émise pour l'instant</div>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${T.border}`, background:T.panel }}>
                    {['N°','Client','Période','Montant HT','TTC','Statut',''].map((h,i)=>(
                      <th key={i} style={{ padding:'10px 18px', textAlign:['Montant HT','TTC'].includes(h)?'right':'left', color:T.muted, fontWeight:600, fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', fontFamily:T.ui, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map(inv=>(
                    <tr key={inv.id} style={{ borderBottom:`1px solid ${T.border}`, transition:'background .1s', cursor:'pointer' }}
                      onClick={()=>setOpen(inv)}
                      onMouseEnter={e=>e.currentTarget.style.background=T.panel}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'12px 18px', fontFamily:T.mono, fontWeight:700, color:T.text, fontSize:12 }}>{inv.number}</td>
                      <td style={{ padding:'12px 18px', fontWeight:600, color:T.text, fontFamily:T.ui }}>{inv.clientName}</td>
                      <td style={{ padding:'12px 18px', color:T.muted, fontFamily:T.ui, fontSize:12 }}>{inv.period}</td>
                      <td style={{ padding:'12px 18px', textAlign:'right', fontFamily:T.mono, fontSize:12, color:T.sub }}>{f2(inv.totalHT)}</td>
                      <td style={{ padding:'12px 18px', textAlign:'right', fontFamily:T.mono, fontSize:13, fontWeight:700, color:T.text }}>{f2(inv.totalHT*1.2)}</td>
                      <td style={{ padding:'12px 18px' }}><InvoiceBadge status={inv.status}/></td>
                      <td style={{ padding:'12px 18px' }}>
                        <button onClick={e=>{e.stopPropagation();deleteInvoice(inv.id);}}
                          style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:6, padding:'4px 8px', cursor:'pointer', color:T.muted, fontFamily:T.ui, fontSize:11 }}
                          onMouseEnter={e=>{e.currentTarget.style.background=T.redSoft;e.currentTarget.style.color=T.red;e.currentTarget.style.borderColor=T.red;}}
                          onMouseLeave={e=>{e.currentTarget.style.background='none';e.currentTarget.style.color=T.muted;e.currentTarget.style.borderColor=T.border;}}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
};
 

export default BillingModule;