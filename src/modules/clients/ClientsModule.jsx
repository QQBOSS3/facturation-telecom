import React, { useState, useMemo } from 'react';
import { Search, Plus, Edit2, Save, Building2, Mail, PhoneCall, MapPin, Calendar, Trash2, ExternalLink, ChevronRight, ChevronDown, X, ArrowLeft, Euro, TrendingUp, Clock, Activity, Users } from 'lucide-react';
import { T, PROVIDERS, MONTH_LABELS, MARGIN, CLIENT_STATUS, CONTRACT_TYPES, INVOICE_STATUS } from '../../constants';
import { f2, pct } from '../../utils/formatters';
import { PE } from '../../utils/parsers';
import { Badge, KPI, Pill, SectionTitle } from '../../components/ui';

const emptyClient = (name = '', providers = []) => ({
  name, providers, status: 'active',
  contact: '', email: '', phone: '', address: '', city: '',
  contractType: '', contractStart: '', contractEnd: '',
  notes: '', parentId: null, isGroup: false,
  fromCDR: !!name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
});

const FormSection = ({ title, children }) => (
  <div style={{ marginBottom:24 }}>
    <div style={{ fontSize:9, fontWeight:700, color:T.muted, textTransform:'uppercase', letterSpacing:'.12em', fontFamily:T.ui, marginBottom:12, paddingBottom:8, borderBottom:`1px solid ${T.border}` }}>{title}</div>
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>{children}</div>
  </div>
);
 
const FormField = ({ label, k, type='text', full=false, options=null, value, onChange }) => (
  <div style={{ gridColumn: full ? '1/-1' : undefined }}>
    <div style={{ fontSize:11, fontWeight:600, color:T.sub, fontFamily:T.ui, marginBottom:5 }}>{label}</div>
    {options ? (
      <select value={value} onChange={e=>onChange(k, e.target.value)}
        style={{ width:'100%', padding:'8px 10px', border:`1px solid ${T.border}`, borderRadius:8, fontSize:12, fontFamily:T.ui, color:T.text, background:T.surface, outline:'none', cursor:'pointer' }}>
        <option value="">— Choisir —</option>
        {options.map(o => <option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={e=>onChange(k, e.target.value)}
        style={{ width:'100%', padding:'8px 10px', border:`1px solid ${T.border}`, borderRadius:8, fontSize:12, fontFamily:T.ui, color:T.text, background:T.surface, outline:'none', boxSizing:'border-box' }}
        onFocus={e=>e.target.style.borderColor=T.gold} onBlur={e=>e.target.style.borderColor=T.border}/>
    )}
  </div>
);
 
// ── Formulaire d'édition client ──
const ClientForm = ({ client, onSave, onCancel, allClients: clientForm_allClients=null }) => {
  const [form, setForm] = useState({ ...client });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
 
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:T.surface, borderRadius:16, width:'100%', maxWidth:620, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ height:3, background:`linear-gradient(90deg,${T.gold},#e8c97a,${T.gold})` }}/>
        <div style={{ padding:'22px 28px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:17, fontWeight:700, color:T.text, fontFamily:T.serif }}>{client.name || 'Nouveau client'}</div>
          <button onClick={onCancel} style={{ background:'none', border:'none', cursor:'pointer', color:T.muted, padding:4 }}><X size={18}/></button>
        </div>
        <div style={{ padding:'24px 28px' }}>
          <FormSection title="Statut & identification">
            <FormField label="Nom du client" full k="name" value={form["name"]} onChange={set}/>
            <FormField label="Statut" options={CLIENT_STATUS.map(s=>({value:s.id,label:s.label}))} k="status" value={form["status"]} onChange={set}/>
            <FormField label="Contact principal" k="contact" value={form["contact"]} onChange={set}/>
          </FormSection>
          <FormSection title="Coordonnées">
            <FormField label="Email" type="email" k="email" value={form["email"]} onChange={set}/>
            <FormField label="Téléphone" type="tel" k="phone" value={form["phone"]} onChange={set}/>
            <FormField label="Adresse" full k="address" value={form["address"]} onChange={set}/>
            <FormField label="Ville" k="city" value={form["city"]} onChange={set}/>
          </FormSection>
          <FormSection title="Contrat">
            <FormField label="Type de contrat" options={CONTRACT_TYPES} k="contractType" value={form["contractType"]} onChange={set}/>
            <FormField label="Date de début" type="date" k="contractStart" value={form["contractStart"]} onChange={set}/>
            <FormField label="Date de fin" type="date" k="contractEnd" value={form["contractEnd"]} onChange={set}/>
          </FormSection>
          {/* Section hiérarchie — injectée via prop allClients */}
          {clientForm_allClients && (
            <FormSection title="Hiérarchie">
              <div style={{ gridColumn:'1/-1' }}>
                <div style={{ fontSize:11, fontWeight:600, color:T.sub, fontFamily:T.ui, marginBottom:5 }}>Compte parent (groupe)</div>
                <select value={form.parentId||''} onChange={e=>set('parentId', e.target.value||null)}
                  style={{ width:'100%', padding:'8px 10px', border:`1px solid ${T.border}`, borderRadius:8, fontSize:12, fontFamily:T.ui, color:T.text, background:T.surface, outline:'none', cursor:'pointer' }}>
                  <option value="">— Aucun (compte racine) —</option>
                  {Object.values(clientForm_allClients)
                    .filter(c => c.name !== form.name)
                    .sort((a,b)=>a.name.localeCompare(b.name))
                    .map(c => <option key={c.name} value={c.name}>{c.isGroup ? '🏢 ' : '📍 '}{c.name}</option>)
                  }
                </select>
                <div style={{ marginTop:10, display:'flex', alignItems:'center', gap:8 }}>
                  <input type="checkbox" id="isGroup" checked={!!form.isGroup} onChange={e=>set('isGroup',e.target.checked)}
                    style={{ cursor:'pointer' }}/>
                  <label htmlFor="isGroup" style={{ fontSize:12, color:T.sub, fontFamily:T.ui, cursor:'pointer' }}>
                    Ce client est un <strong>groupe/compte parent</strong> (peut avoir des sites enfants)
                  </label>
                </div>
              </div>
            </FormSection>
          )}
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:9, fontWeight:700, color:T.muted, textTransform:'uppercase', letterSpacing:'.12em', fontFamily:T.ui, marginBottom:8 }}>Notes</div>
            <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={3}
              style={{ width:'100%', padding:'8px 10px', border:`1px solid ${T.border}`, borderRadius:8, fontSize:12, fontFamily:T.ui, color:T.text, background:T.surface, outline:'none', resize:'vertical', boxSizing:'border-box' }}
              onFocus={e=>e.target.style.borderColor=T.gold} onBlur={e=>e.target.style.borderColor=T.border}/>
          </div>
        </div>
        <div style={{ padding:'16px 28px', borderTop:`1px solid ${T.border}`, display:'flex', justifyContent:'flex-end', gap:10, background:T.panel }}>
          <button onClick={onCancel} style={{ padding:'9px 18px', background:'none', border:`1px solid ${T.border}`, borderRadius:8, cursor:'pointer', fontFamily:T.ui, fontSize:13, color:T.sub }}>Annuler</button>
          <button onClick={()=>onSave({...form, updatedAt:new Date().toISOString()})}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', background:T.text, color:'white', border:'none', borderRadius:8, cursor:'pointer', fontFamily:T.ui, fontWeight:600, fontSize:13 }}>
            <Save size={13}/> Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};
 
// ── Fiche client détaillée ──
const ClientDetail = ({ client, rows, allClients, invoicesDB, onEdit, onBack, onNavigate }) => {
  const clientInvoices = useMemo(() => Object.values(invoicesDB||{}).filter(inv=>inv.clientName===client.name).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)), [invoicesDB, client.name]);
  // Lignes CDR propres au client
  const clientRows = rows.filter(r => r.client === client.name);
  // Enfants directs
  const children = Object.values(allClients).filter(c => c.parentId === client.name);
  // Lignes CDR des enfants
  const childRows = rows.filter(r => children.some(c => c.name === r.client));
  // Consolidé = propre + enfants
  const allRows   = [...clientRows, ...childRows];
 
  const totalConso = clientRows.reduce((s,r)=>s+r.conso,0);
  const totalMarge = clientRows.reduce((s,r)=>s+r.marge,0);
  const totalDur   = clientRows.reduce((s,r)=>s+r.duration,0);
  const consoConsolidee = allRows.reduce((s,r)=>s+r.conso,0);
  const margeConsolidee = allRows.reduce((s,r)=>s+r.marge,0);
  const hasChildren = children.length > 0;
  const isChild = !!client.parentId;
  const parent = isChild ? allClients[client.parentId] : null;
 
  // Historique par mois (propre seulement)
  const byMonth = {};
  clientRows.forEach(r => {
    if (!byMonth[r.monthKey]) byMonth[r.monthKey] = { conso:0, marge:0 };
    byMonth[r.monthKey].conso += r.conso;
    byMonth[r.monthKey].marge += r.marge;
  });
  const months = Object.keys(byMonth).sort().slice(-6);
 
  const status = CLIENT_STATUS.find(s=>s.id===client.status) || CLIENT_STATUS[0];
 
  return (
    <div style={{ maxWidth:860, margin:'0 auto', display:'flex', flexDirection:'column', gap:18 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:`1px solid ${T.border}`, borderRadius:8, padding:'8px 14px', cursor:'pointer', color:T.sub, fontFamily:T.ui, fontSize:13 }}>
          <ArrowLeft size={14}/> Retour
        </button>
        <button onClick={onEdit} style={{ display:'flex', alignItems:'center', gap:7, background:T.text, color:'white', border:'none', borderRadius:8, padding:'9px 16px', cursor:'pointer', fontFamily:T.ui, fontWeight:600, fontSize:13 }}>
          <Edit2 size={13}/> Modifier
        </button>
      </div>
 
      {/* Identité */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden' }}>
        <div style={{ height:3, background:`linear-gradient(90deg,${T.gold},#e8c97a,${T.gold})` }}/>
        <div style={{ padding:'24px 28px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <div style={{ fontSize:24, fontWeight:700, color:T.text, fontFamily:T.serif }}>{client.name}</div>
              <span style={{ fontSize:11, fontWeight:600, color:status.color, background:status.soft, border:`1px solid ${status.color}30`, borderRadius:999, padding:'3px 10px', fontFamily:T.ui }}>{status.label}</span>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:14 }}>
              {client.contact && <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:T.sub, fontFamily:T.ui }}><Users size={12}/>{client.contact}</span>}
              {client.email   && <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:T.sub, fontFamily:T.ui }}><Mail size={12}/>{client.email}</span>}
              {client.phone   && <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:T.sub, fontFamily:T.ui }}><PhoneCall size={12}/>{client.phone}</span>}
              {client.city    && <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:T.sub, fontFamily:T.ui }}><MapPin size={12}/>{client.city}</span>}
            </div>
          </div>
          <div style={{ display:'flex', gap:6 }}>{(client.providers||[]).map(p=><Badge key={p} id={p}/>)}</div>
        </div>
        {(client.contractType || client.contractStart) && (
          <div style={{ padding:'14px 28px', borderTop:`1px solid ${T.border}`, background:T.panel, display:'flex', gap:24 }}>
            {client.contractType  && <span style={{ fontSize:12, color:T.sub, fontFamily:T.ui }}><span style={{ fontWeight:600, color:T.text }}>Contrat :</span> {client.contractType}</span>}
            {client.contractStart && <span style={{ fontSize:12, color:T.sub, fontFamily:T.ui }}><span style={{ fontWeight:600, color:T.text }}>Début :</span> {new Date(client.contractStart).toLocaleDateString('fr-FR')}</span>}
            {client.contractEnd   && <span style={{ fontSize:12, color:T.sub, fontFamily:T.ui }}><span style={{ fontWeight:600, color:T.text }}>Fin :</span> {new Date(client.contractEnd).toLocaleDateString('fr-FR')}</span>}
          </div>
        )}
      </div>
 
      {/* Fil d'Ariane parent */}
      {isChild && parent && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', background:T.goldLight, borderRadius:10, border:`1px solid ${T.gold}30` }}>
          <Building2 size={13} style={{ color:T.gold }}/>
          <span style={{ fontSize:12, color:T.sub, fontFamily:T.ui }}>Fait partie du groupe</span>
          <button onClick={()=>onNavigate(parent)} style={{ fontSize:12, fontWeight:700, color:T.gold, background:'none', border:'none', cursor:'pointer', fontFamily:T.ui, textDecoration:'underline' }}>
            {parent.name}
          </button>
        </div>
      )}
 
      {/* KPIs CDR — propres */}
      {clientRows.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          <KPI label="Consommation HT" value={f2(totalConso)} icon={Euro} color={T.sub} sub="Propre"/>
          <KPI label="CA Facturé HT" value={f2(totalMarge)} icon={TrendingUp} color={T.green} sub="Propre"/>
          <KPI label="Durée totale" value={PE.dur(totalDur)} icon={Clock} color={T.gold}/>
          <KPI label="Lignes CDR" value={clientRows.length.toLocaleString()} icon={Activity} color={T.blue}/>
        </div>
      )}
 
      {/* KPIs consolidés groupe */}
      {hasChildren && (
        <div style={{ background:T.surface, border:`2px solid ${T.gold}40`, borderRadius:12, padding:'18px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <Building2 size={14} style={{ color:T.gold }}/>
            <span style={{ fontSize:10, fontWeight:700, color:T.gold, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:T.ui }}>Vue consolidée groupe · {children.length} site{children.length>1?'s':''}</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12, marginBottom:16 }}>
            <KPI label="Conso totale groupe HT" value={f2(consoConsolidee)} icon={Euro} color={T.gold}/>
            <KPI label="CA total groupe HT" value={f2(margeConsolidee)} icon={TrendingUp} color={T.green}/>
          </div>
          <SectionTitle>Sites rattachés</SectionTitle>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {children.map(child => {
              const cRows = rows.filter(r=>r.name===child.name||r.client===child.name);
              const cConso = cRows.reduce((s,r)=>s+r.conso,0);
              const cMarge = cRows.reduce((s,r)=>s+r.marge,0);
              const cStatus = CLIENT_STATUS.find(s=>s.id===child.status)||CLIENT_STATUS[0];
              return (
                <div key={child.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:T.panel, borderRadius:8, border:`1px solid ${T.border}`, cursor:'pointer' }}
                  onClick={()=>onNavigate(child)}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=T.gold+'60';e.currentTarget.style.background=T.goldLight;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.background=T.panel;}}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <MapPin size={13} style={{ color:T.muted }}/>
                    <span style={{ fontSize:13, fontWeight:600, color:T.text, fontFamily:T.ui }}>{child.name}</span>
                    <span style={{ fontSize:10, fontWeight:600, color:cStatus.color, background:cStatus.soft, borderRadius:999, padding:'2px 7px', fontFamily:T.ui }}>{cStatus.label}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:20 }}>
                    <span style={{ fontSize:12, fontFamily:T.mono, color:T.sub }}>{f2(cConso)}</span>
                    <span style={{ fontSize:12, fontFamily:T.mono, fontWeight:700, color:T.green }}>{f2(cMarge)}</span>
                    <ChevronRight size={13} style={{ color:T.muted }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
 
      {/* Historique par mois */}
      {months.length > 0 && (
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:'20px 24px' }}>
          <SectionTitle>Historique des 6 derniers mois</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:`repeat(${months.length},1fr)`, gap:10 }}>
            {months.map(mk => {
              const [y,m] = mk.split('-');
              const label = `${MONTH_LABELS[parseInt(m,10)-1]} ${y.slice(2)}`;
              const d = byMonth[mk];
              const margeNet = d.conso - (d.conso / MARGIN);
              const margePct = d.conso > 0 ? margeNet/d.conso : 0;
              return (
                <div key={mk} style={{ background:T.panel, borderRadius:10, padding:'14px', textAlign:'center', border:`1px solid ${T.border}` }}>
                  <div style={{ fontSize:10, fontWeight:600, color:T.muted, fontFamily:T.ui, marginBottom:8, textTransform:'uppercase', letterSpacing:'.07em' }}>{label}</div>
                  <div style={{ fontSize:14, fontWeight:700, color:T.text, fontFamily:T.mono, marginBottom:2 }}>{f2(d.marge)}</div>
                  <div style={{ fontSize:10, color:T.sub, fontFamily:T.mono, marginBottom:6 }}>{f2(d.conso)} coût</div>
                  <span style={{ fontSize:9, fontWeight:700, color:T.green, background:T.greenSoft, borderRadius:3, padding:'2px 6px' }}>{pct(margePct)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
 
      {/* Historique factures */}
      {clientInvoices && clientInvoices.length > 0 && (
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden' }}>
          <div style={{ padding:'16px 22px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <SectionTitle>Historique des factures</SectionTitle>
            <span style={{ fontSize:11, color:T.muted, fontFamily:T.mono }}>{clientInvoices.length} facture{clientInvoices.length>1?'s':''}</span>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:T.panel, borderBottom:`1px solid ${T.border}` }}>
                {['N°','Période','HT','TTC','Statut'].map((h,i)=>(
                  <th key={h} style={{ padding:'9px 18px', textAlign:['HT','TTC'].includes(h)?'right':'left', color:T.muted, fontWeight:600, fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', fontFamily:T.ui }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientInvoices.map(inv=>(
                <tr key={inv.id} style={{ borderBottom:`1px solid ${T.border}` }}
                  onMouseEnter={e=>e.currentTarget.style.background=T.panel}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'10px 18px', fontFamily:T.mono, fontWeight:700, fontSize:12, color:T.text }}>{inv.number}</td>
                  <td style={{ padding:'10px 18px', fontSize:12, color:T.sub, fontFamily:T.ui }}>{inv.period}</td>
                  <td style={{ padding:'10px 18px', textAlign:'right', fontFamily:T.mono, fontSize:12, color:T.sub }}>{f2(inv.totalHT)}</td>
                  <td style={{ padding:'10px 18px', textAlign:'right', fontFamily:T.mono, fontSize:12, fontWeight:700, color:T.text }}>{f2(inv.totalHT*1.2)}</td>
                  <td style={{ padding:'10px 18px' }}>
                    {(() => { const s=INVOICE_STATUS?.find(x=>x.id===inv.status)||{label:inv.status,color:T.muted,soft:T.panel,icon:''}; return <span style={{ fontSize:10, fontWeight:600, color:s.color, background:s.soft, borderRadius:999, padding:'2px 8px', fontFamily:T.ui }}>{s.icon} {s.label}</span>; })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
 
      {/* Notes */}
      {client.notes && (
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:'20px 24px' }}>
          <SectionTitle>Notes</SectionTitle>
          <p style={{ fontSize:13, color:T.sub, fontFamily:T.ui, lineHeight:1.6 }}>{client.notes}</p>
        </div>
      )}
    </div>
  );
};
 
// Module de gestion de la base clients
// Les clients sont auto-détectés depuis les CDR importés, puis enrichissables manuellement
// Supporte une hiérarchie groupe/site avec drag & drop
const ClientsModule = ({ rows, clientsDB, setClientsDB, invoicesDB={} }) => {
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingClient, setEditing]     = useState(null);
  const [detailClient, setDetail]       = useState(null);
  const [dragging, setDragging]         = useState(null);   // nom du client en cours de drag
  const [dragOver, setDragOver]         = useState(null);   // nom du groupe survolé
 
  // Fusion CDR + base clients manuelle :
  // - les nouveaux clients CDR sont créés avec une fiche vide à compléter
  // - les clients existants voient leurs fournisseurs mis à jour si besoin
  const allClients = useMemo(() => {
    const cdrClients = {};
    rows.forEach(r => {
      if (!cdrClients[r.client]) cdrClients[r.client] = { providers: new Set() };
      cdrClients[r.client].providers.add(r.provider);
    });
 
    const merged = { ...clientsDB };
    Object.entries(cdrClients).forEach(([name, data]) => {
      if (!merged[name]) {
        merged[name] = emptyClient(name, [...data.providers]);
      } else {
        // Mettre à jour les fournisseurs si nouveau
        const existingProviders = new Set(merged[name].providers || []);
        [...data.providers].forEach(p => existingProviders.add(p));
        merged[name] = { ...merged[name], providers: [...existingProviders] };
      }
    });
    return merged;
  }, [rows, clientsDB]);
 
  const clientList = useMemo(() =>
    Object.values(allClients)
      .filter(c =>
        (filterStatus === 'all' || c.status === filterStatus) &&
        c.name.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a,b) => a.name.localeCompare(b.name)),
    [allClients, filterStatus, search]
  );
 
  const saveClient = (client) => {
    const updated = { ...allClients, [client.name]: client };
    setClientsDB(updated);
    localStorage.setItem('dm-clients-db', JSON.stringify(updated));
    setEditing(null);
    if (detailClient?.name === client.name) setDetail(client);
  };
 
  const deleteClient = (name) => {
    if (!confirm(`Supprimer le client "${name}" ?`)) return;
    const updated = { ...clientsDB };
    delete updated[name];
    setClientsDB(updated);
    localStorage.setItem('dm-clients-db', JSON.stringify(updated));
    setDetail(null);
  };
 
  const getClientStats = (name) => {
    const r = rows.filter(x => x.client === name);
    return { conso: r.reduce((s,x)=>s+x.conso,0), marge: r.reduce((s,x)=>s+x.marge,0), lines: r.length };
  };
 
  if (detailClient) return (
    <>
      <ClientDetail
        client={allClients[detailClient.name]||detailClient}
        rows={rows}
        allClients={allClients}
        invoicesDB={invoicesDB}
        onBack={()=>setDetail(null)}
        onEdit={()=>setEditing(allClients[detailClient.name]||detailClient)}
        onNavigate={(c)=>setDetail(c)}
      />
      {editingClient && <ClientForm client={editingClient} onSave={saveClient} onCancel={()=>setEditing(null)} allClients={allClients}/>}
    </>
  );
 
  const totalClients = clientList.length;
  const cdrCount     = clientList.filter(c=>c.fromCDR).length;
 
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      {editingClient && <ClientForm client={editingClient} onSave={saveClient} onCancel={()=>setEditing(null)} allClients={allClients}/>}
 
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700, color:T.text, fontFamily:T.serif, marginBottom:2 }}>Base clients</div>
          <div style={{ fontSize:13, color:T.sub, fontFamily:T.ui }}>
            {totalClients} clients · {cdrCount} détectés depuis les CDR
          </div>
        </div>
        <button onClick={()=>setEditing(emptyClient())}
          style={{ display:'flex', alignItems:'center', gap:7, background:T.text, color:'white', border:'none', borderRadius:8, padding:'9px 16px', cursor:'pointer', fontFamily:T.ui, fontWeight:600, fontSize:13 }}>
          <Plus size={13}/> Nouveau client
        </button>
      </div>
 
      {/* Filtres */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 18px', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:180 }}>
          <Search size={12} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:T.muted }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un client..."
            style={{ width:'100%', paddingLeft:28, paddingRight:10, paddingTop:8, paddingBottom:8, border:`1px solid ${T.border}`, borderRadius:8, fontSize:12, fontFamily:T.ui, color:T.text, background:T.panel, outline:'none', boxSizing:'border-box' }}
            onFocus={e=>e.target.style.borderColor=T.gold} onBlur={e=>e.target.style.borderColor=T.border}/>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {[{id:'all',label:'Tous'},...CLIENT_STATUS].map(s => (
            <button key={s.id} onClick={()=>setFilterStatus(s.id)}
              style={{ padding:'7px 12px', borderRadius:7, border:`1px solid ${filterStatus===s.id?(s.color||T.gold):T.border}`, background:filterStatus===s.id?(s.soft||T.goldLight):'transparent', color:filterStatus===s.id?(s.color||T.gold):T.sub, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:T.ui, transition:'all .12s' }}>
              {s.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize:11, color:T.muted, fontFamily:T.ui, marginLeft:'auto' }}>{clientList.length} résultat{clientList.length>1?'s':''}</span>
      </div>
 
      {/* Hint drag & drop */}
      {clientList.some(c=>c.isGroup) && !dragging && (
        <div style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 14px', background:T.goldLight, border:`1px solid ${T.gold}30`, borderRadius:8, fontSize:11, color:T.sub, fontFamily:T.ui }}>
          <span style={{ fontSize:14 }}>💡</span> Glissez une carte site sur un groupe <Building2 size={11} style={{ color:T.gold }}/> pour le rattacher
        </div>
      )}
 
      {/* Grille clients */}
      {clientList.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:T.muted }}>
          <Users size={32} style={{ margin:'0 auto 12px', opacity:.2 }}/>
          <div style={{ fontWeight:600, color:T.sub, fontFamily:T.ui, marginBottom:4 }}>Aucun client trouvé</div>
          <div style={{ fontSize:12, fontFamily:T.ui }}>Importez des CDR ou créez un client manuellement</div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:14 }}>
          {clientList.map(c => {
            const stats    = getClientStats(c.name);
            const status   = CLIENT_STATUS.find(s=>s.id===c.status)||CLIENT_STATUS[0];
            const hasData  = stats.lines > 0;
            const isTarget = c.isGroup && dragOver === c.name && dragging !== c.name;
            const isDragged = dragging === c.name;
 
            return (
              <div key={c.name}
                className="dm-drag-card"
                data-dragging={String(isDragged)}
                data-drop-target={String(isTarget)}
                draggable={!c.isGroup}
                onDragStart={e => {
                  const ghost = document.createElement('div');
                  ghost.style.cssText = 'position:fixed;top:-999px;left:-999px;';
                  document.body.appendChild(ghost);
                  e.dataTransfer.setDragImage(ghost, 0, 0);
                  setTimeout(() => document.body.removeChild(ghost), 0);
                  e.dataTransfer.effectAllowed = 'move';
                  setDragging(c.name);
                }}
                onDragEnd={() => { setDragging(null); setDragOver(null); }}
                onDragOver={e => {
                  if (c.isGroup && dragging && dragging !== c.name) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOver !== c.name) setDragOver(c.name);
                  }
                }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null); }}
                onDrop={e => {
                  e.preventDefault();
                  if (!c.isGroup || !dragging || dragging === c.name) return;
                  const updated = { ...allClients, [dragging]: { ...allClients[dragging], parentId: c.name, updatedAt: new Date().toISOString() }};
                  setClientsDB(updated);
                  localStorage.setItem('dm-clients-db', JSON.stringify(updated));
                  setDragging(null); setDragOver(null);
                }}
                style={{
                  background: isTarget ? T.goldLight : T.surface,
                  border: `${isTarget ? 2 : 1}px solid ${isTarget ? T.gold : T.border}`,
                  borderRadius:12, overflow:'hidden',
                  cursor: c.isGroup ? 'default' : isDragged ? 'grabbing' : 'grab',
                  willChange: 'transform, box-shadow',
                }}
                onMouseEnter={e=>{ if(!isDragged&&!isTarget){e.currentTarget.style.boxShadow=`0 4px 16px rgba(0,0,0,.08)`;e.currentTarget.style.borderColor=T.gold+'60';}}}
                onMouseLeave={e=>{ if(!isDragged&&!isTarget){e.currentTarget.style.boxShadow='none';e.currentTarget.style.borderColor=isTarget?T.gold:T.border;}}}>
 
                {/* Zone de dépôt visuelle pour les groupes survolés */}
                {isTarget && (
                  <div style={{ padding:'10px 16px', background:`linear-gradient(90deg,${T.gold},#e8c97a)`, display:'flex', alignItems:'center', justifyContent:'center', gap:8, animation:'float-in .15s ease-out' }}>
                    <span style={{ fontSize:15 }}>🎯</span>
                    <span style={{ fontSize:12, fontWeight:700, color:'white', fontFamily:T.ui, letterSpacing:'.01em' }}>Lâcher pour rattacher à {c.name}</span>
                  </div>
                )}
                {/* Indicateur subtil sur les groupes non survolés quand drag actif */}
                {c.isGroup && dragging && !isTarget && dragging !== c.name && (
                  <div style={{ padding:'5px 14px', background:T.gold+'15', display:'flex', alignItems:'center', justifyContent:'center', gap:6, borderBottom:`1px dashed ${T.gold}40` }}>
                    <Building2 size={10} style={{ color:T.gold }}/>
                    <span style={{ fontSize:10, color:T.gold, fontFamily:T.ui, fontWeight:600 }}>Groupe disponible</span>
                  </div>
                )}
 
                <div style={{ padding:'16px 18px', borderBottom:`1px solid ${T.border}` }} onClick={()=>!dragging&&setDetail(c)}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flex:1, marginRight:8 }}>
                      {c.isGroup
                        ? <Building2 size={13} style={{ color:T.gold, flexShrink:0 }}/>
                        : c.parentId ? <MapPin size={13} style={{ color:T.muted, flexShrink:0 }}/>
                        : <span className="dm-drag-handle" style={{ fontSize:14, color:T.muted, userSelect:'none', lineHeight:1 }} title="Glisser sur un groupe 🏢 pour rattacher">⠿</span>}
                      <div style={{ fontSize:14, fontWeight:700, color:T.text, fontFamily:T.ui }}>{c.name}</div>
                    </div>
                    <span style={{ fontSize:10, fontWeight:600, color:status.color, background:status.soft, borderRadius:999, padding:'2px 8px', flexShrink:0, fontFamily:T.ui }}>{status.label}</span>
                  </div>
                  {c.parentId && allClients[c.parentId] && (
                    <div style={{ fontSize:10, color:T.gold, fontFamily:T.ui, marginBottom:6, display:'flex', alignItems:'center', gap:4 }}>
                      <Building2 size={9}/> {allClients[c.parentId].name}
                      <button onClick={e=>{e.stopPropagation();const u={...allClients,[c.name]:{...allClients[c.name],parentId:null}};setClientsDB(u);localStorage.setItem('dm-clients-db',JSON.stringify(u));}}
                        style={{ background:'none', border:'none', cursor:'pointer', color:T.dim, padding:'0 2px', fontSize:10 }} title="Détacher du groupe">✕</button>
                    </div>
                  )}
                  <div style={{ display:'flex', gap:5, marginBottom:8 }}>{(c.providers||[]).map(p=><Badge key={p} id={p}/>)}</div>
                  {(c.email||c.phone||c.city) && (
                    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                      {c.contact && <span style={{ fontSize:11, color:T.muted, fontFamily:T.ui, display:'flex', alignItems:'center', gap:5 }}><Users size={10}/>{c.contact}</span>}
                      {c.email   && <span style={{ fontSize:11, color:T.muted, fontFamily:T.ui, display:'flex', alignItems:'center', gap:5 }}><Mail size={10}/>{c.email}</span>}
                      {c.phone   && <span style={{ fontSize:11, color:T.muted, fontFamily:T.ui, display:'flex', alignItems:'center', gap:5 }}><PhoneCall size={10}/>{c.phone}</span>}
                      {c.city    && <span style={{ fontSize:11, color:T.muted, fontFamily:T.ui, display:'flex', alignItems:'center', gap:5 }}><MapPin size={10}/>{c.city}</span>}
                    </div>
                  )}
                  {!c.email && !c.phone && !c.city && c.fromCDR && (
                    <div style={{ fontSize:11, color:T.muted, fontFamily:T.ui, fontStyle:'italic', display:'flex', alignItems:'center', gap:5 }}>
                      <Edit2 size={10}/> Fiche à compléter
                    </div>
                  )}
                </div>
                {/* Stats CDR mini */}
                <div style={{ padding:'10px 18px', background:isTarget?T.goldLight:T.panel, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  {hasData ? (
                    <>
                      <div style={{ textAlign:'center' }}>
                        <div style={{ fontSize:12, fontWeight:700, color:T.text, fontFamily:T.mono }}>{f2(stats.conso)}</div>
                        <div style={{ fontSize:9, color:T.muted, fontFamily:T.ui }}>Conso HT</div>
                      </div>
                      <div style={{ textAlign:'center' }}>
                        <div style={{ fontSize:12, fontWeight:700, color:T.green, fontFamily:T.mono }}>{f2(stats.marge)}</div>
                        <div style={{ fontSize:9, color:T.muted, fontFamily:T.ui }}>Facturé HT</div>
                      </div>
                      <div style={{ textAlign:'center' }}>
                        <div style={{ fontSize:12, fontWeight:700, color:T.blue, fontFamily:T.mono }}>{stats.lines.toLocaleString()}</div>
                        <div style={{ fontSize:9, color:T.muted, fontFamily:T.ui }}>Lignes CDR</div>
                      </div>
                    </>
                  ) : (
                    <span style={{ fontSize:11, color:T.dim, fontFamily:T.ui, fontStyle:'italic' }}>Pas de données CDR</span>
                  )}
                  <button onClick={e=>{e.stopPropagation();setEditing(c);}}
                    style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:7, padding:'5px 8px', cursor:'pointer', color:T.muted, display:'flex', alignItems:'center', gap:4, fontSize:11, fontFamily:T.ui }}
                    onMouseEnter={e=>{e.currentTarget.style.background=T.text;e.currentTarget.style.color='white';e.currentTarget.style.borderColor=T.text;}}
                    onMouseLeave={e=>{e.currentTarget.style.background='none';e.currentTarget.style.color=T.muted;e.currentTarget.style.borderColor=T.border;}}>
                    <Edit2 size={11}/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
 

export default ClientsModule;