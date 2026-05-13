import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Upload, FileText, Users, BarChart3, Phone,
  CheckCircle2, Loader2, AlertTriangle, PieChart
} from 'lucide-react';

// ── Constants & utils ──────────────────────────────────────────
import { T } from './constants';
import { PE } from './utils/parsers';

// ── Composants UI ──────────────────────────────────────────────
import { Badge, KPI, Pill, SectionTitle } from './components/ui';

// ── Modules ───────────────────────────────────────────────────
import DashboardModule from './modules/dashboard/DashboardModule';
import ImportModule    from './modules/import/ImportModule';
import CDRModule       from './modules/cdr/CDRModule';
import BillingModule   from './modules/billing/BillingModule';
import ClientsModule   from './modules/clients/ClientsModule';
import ReportsModule   from './modules/reports/ReportsModule';

// ─────────────────────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────────────────────
export default function App() {
  // ── État global de l'application ──────────────────────────────
  // Tout le state est centralisé ici et descendu en props dans chaque module
  const [activeModule, setActive] = useState('dashboard');
  const [rows, setRows]           = useState([]);       // toutes les lignes CDR chargées
  const [filesMeta, setMeta]      = useState([]);       // métadonnées des fichiers importés
  const [isProcessing, setProc]   = useState(false);    // import en cours
  const [storageStatus, setStorageStatus] = useState('idle'); // état de la sauvegarde localStorage
  const [sessionInfo, setSessionInfo]     = useState(null);   // info de la dernière session sauvegardée
  const [showRestore, setShowRestore]     = useState(false);  // affichage de la bannière de restauration
  const [clientsDB, setClientsDB]         = useState({});     // base clients persistée (nom → objet client)
  const [invoicesDB, setInvoicesDB]       = useState({});     // base factures persistée (id → objet facture)

  // ── Chargement de la session au démarrage ──────────────────────
  // On tente de récupérer les données persistées du localStorage
  // Si une session existe, on propose à l'utilisateur de la restaurer
  useEffect(() => {
    try {
      const rawClients = localStorage.getItem('dm-clients-db');
      if (rawClients) setClientsDB(JSON.parse(rawClients));
      const rawInvoices = localStorage.getItem('dm-invoices-db');
      if (rawInvoices) setInvoicesDB(JSON.parse(rawInvoices));
      const raw = localStorage.getItem('dm-session-meta');
      if (raw) {
        const info = JSON.parse(raw);
        setSessionInfo(info);
        setShowRestore(true);
      }
    } catch (e) { /* pas de session */ }
  }, []);

  // ── Sauvegarde automatique après chaque import ─────────────────
  // Le localStorage est limité à ~5MB par navigateur
  // On découpe les lignes en chunks de 3000 pour ne pas dépasser la limite
  const saveToStorage = async (allRows, allMeta) => {
    setStorageStatus('saving');
    try {
      const CHUNK = 3000;
      const chunks = Math.ceil(allRows.length / CHUNK);
      const oldChunks = parseInt(localStorage.getItem('dm-session-chunks') || '0');
      for (let i = chunks; i < oldChunks; i++) localStorage.removeItem('dm-session-rows-' + i);
      localStorage.setItem('dm-session-chunks', String(chunks));
      for (let i = 0; i < chunks; i++) {
        localStorage.setItem('dm-session-rows-' + i, JSON.stringify(allRows.slice(i * CHUNK, (i + 1) * CHUNK)));
      }
      const currentClientsDB = JSON.parse(localStorage.getItem('dm-clients-db') || '{}');
      localStorage.setItem('dm-clients-db', JSON.stringify(currentClientsDB));
      localStorage.setItem('dm-session-meta', JSON.stringify({
        savedAt: new Date().toISOString(),
        rowCount: allRows.length,
        fileCount: allMeta.length,
        files: allMeta
      }));
      setStorageStatus('saved');
      setTimeout(() => setStorageStatus('idle'), 2000);
    } catch (e) {
      console.error('Storage error:', e);
      setStorageStatus('error');
      setTimeout(() => setStorageStatus('idle'), 3000);
    }
  };

  // ── Restauration de session ──
  const handleRestore = async () => {
    setProc(true);
    setShowRestore(false);
    try {
      const chunks = parseInt(localStorage.getItem('dm-session-chunks') || '1');
      let allRows = [];
      for (let i = 0; i < chunks; i++) {
        const chunk = localStorage.getItem('dm-session-rows-' + i);
        if (chunk) allRows = allRows.concat(JSON.parse(chunk));
      }
      const metaInfo = JSON.parse(localStorage.getItem('dm-session-meta'));
      setRows(allRows);
      setMeta(metaInfo.files || []);
      setActive('dashboard');
    } catch (e) {
      console.error('Restore error:', e);
    } finally {
      setProc(false);
    }
  };

  // ── Import de fichiers CSV ──────────────────────────────────────
  // Parcourt chaque fichier, délègue le parsing à PE.parseFile, puis cumule les lignes
  const handleImport = async (files) => {
    setProc(true);
    try {
      const newMeta = [];
      let allRows = [...rows];
      for (const f of files) {
        const parsed = await PE.parseFile(f);
        if (parsed.length > 0) {
          const provider = parsed[0]?.provider || 'unknown';
          newMeta.push({ name: f.name, provider, rows: parsed.length, importedAt: new Date().toISOString() });
          allRows = allRows.concat(parsed);
        }
      }
      const allMeta = [...filesMeta, ...newMeta];
      setRows(allRows);
      setMeta(allMeta);
      await saveToStorage(allRows, allMeta);
    } finally {
      setProc(false);
    }
  };

  // ── Effacement de session ──
  const handleClear = () => {
    setRows([]); setMeta([]);
    try {
      const chunks = parseInt(localStorage.getItem('dm-session-chunks') || '0');
      for (let i = 0; i < chunks; i++) localStorage.removeItem('dm-session-rows-' + i);
      localStorage.removeItem('dm-session-meta');
      localStorage.removeItem('dm-session-chunks');
    } catch(e) {}
    setSessionInfo(null);
    setShowRestore(false);
  };

  // ── Navigation ──
  const NAV = [
    { id: 'dashboard', label: 'Dashboard',    icon: LayoutDashboard, group: 'main' },
    { id: 'import',    label: 'Import',       icon: Upload,          group: 'main', badge: filesMeta.length > 0 ? filesMeta.length : null },
    { id: 'cdr',       label: 'CDR Analyzer', icon: BarChart3,       group: 'modules' },
    { id: 'billing',   label: 'Facturation',  icon: FileText,        group: 'modules' },
    { id: 'clients',   label: 'Clients',      icon: Users,           group: 'modules' },
    { id: 'reports',   label: 'Rapports',     icon: PieChart,        group: 'modules' },
  ];

  const groups = [
    { key: 'main',    label: 'Navigation' },
    { key: 'modules', label: 'Modules' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, fontFamily: T.ui, color: T.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:${T.bg}}
        ::-webkit-scrollbar-thumb{background:${T.dim};border-radius:4px}
        ::selection{background:${T.gold}30}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes pulse-border{0%,100%{box-shadow:0 0 0 0 rgba(184,147,58,.4)}50%{box-shadow:0 0 0 6px rgba(184,147,58,.0)}}
        @keyframes drop-ready{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}
        @keyframes float-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .dm-table tbody tr:nth-child(even){background:${T.panel};}
        .dm-table tbody tr:hover{background:${T.goldLight}!important;}
        .dm-table th{background:${T.panel};position:sticky;top:0;z-index:1;}
        .dm-drag-card{transition:transform .15s,box-shadow .15s,opacity .15s,border-color .15s!important}
        .dm-drag-card[data-dragging=true]{transform:rotate(1.5deg) scale(.96)!important;box-shadow:0 12px 32px rgba(0,0,0,.18)!important;opacity:.75!important;cursor:grabbing!important}
        .dm-drag-card[data-drop-target=true]{animation:pulse-border .9s ease-in-out infinite,drop-ready .9s ease-in-out infinite!important;border-color:#b8933a!important;background:#fdf6e8!important}
        .dm-drag-handle{cursor:grab;opacity:.35;transition:opacity .1s,color .1s}
        .dm-drag-handle:hover{opacity:.8}
        .dm-drag-card:active .dm-drag-handle{cursor:grabbing}
        @media print{.np{display:none!important}}
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside className="np" style={{ width: 232, background: T.surface, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ height: 3, background: `linear-gradient(90deg,${T.gold},#e8c97a,${T.gold})` }}/>

        {/* Logo */}
        <div style={{ padding: '22px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 34, height: 34, background: T.text, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Phone size={16} style={{ color: 'white' }}/>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: T.serif }}>Deleg Media</div>
            <div style={{ fontSize: 9, color: T.muted, letterSpacing: '.1em', textTransform: 'uppercase' }}>Plateforme Télécom</div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: '14px 10px', flex: 1, overflowY: 'auto' }}>
          {groups.map(g => (
            <div key={g.key} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '.12em', padding: '0 10px', marginBottom: 5 }}>{g.label}</div>
              {NAV.filter(n => n.group === g.key).map(({ id, label, icon: Icon, badge }) => {
                const active = activeModule === id;
                return (
                  <button key={id} onClick={() => setActive(id)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                    padding: '9px 10px', borderRadius: 8, border: 'none',
                    cursor: 'pointer',
                    background: active ? T.gold + '18' : 'transparent',
                    color: active ? T.gold : T.sub,
                    fontWeight: active ? 600 : 400, fontSize: 13,
                    transition: 'all .12s', marginBottom: 1, fontFamily: T.ui,
                    borderLeft: `2px solid ${active ? T.gold : 'transparent'}`,
                  }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = T.panel; e.currentTarget.style.color = T.text; }}}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.sub; }}}>
                    <Icon size={14}/>
                    <span style={{ flex: 1 }}>{label}</span>
                    {badge && <span style={{ fontSize: 10, fontWeight: 700, background: T.gold, color: 'white', borderRadius: 999, padding: '1px 6px', fontFamily: T.mono }}>{badge}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Session footer */}
        {rows.length > 0 && (
          <div style={{ padding: '14px 20px', borderTop: `1px solid ${T.border}`, background: T.panel }}>
            <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 5 }}>Session active</div>
            <div style={{ fontSize: 12, color: T.sub }}>
              <span style={{ fontWeight: 600, color: T.text }}>{[...new Set(rows.map(r => r.client))].length}</span> clients ·{' '}
              <span style={{ fontWeight: 600, color: T.text }}>{rows.length.toLocaleString()}</span> lignes
            </div>
          </div>
        )}
      </aside>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Bannière de restauration */}
        {showRestore && sessionInfo && (
          <div style={{ background: T.goldLight, borderBottom: `1px solid ${T.gold}40`, padding: '10px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>💾</span>
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.ui }}>Session précédente disponible</span>
                <span style={{ fontSize: 11, color: T.sub, fontFamily: T.ui, marginLeft: 8 }}>
                  {sessionInfo.rowCount?.toLocaleString()} lignes · {sessionInfo.fileCount} fichier{sessionInfo.fileCount > 1 ? 's' : ''} · importée le {new Date(sessionInfo.savedAt).toLocaleDateString('fr-FR')} à {new Date(sessionInfo.savedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleRestore} disabled={isProcessing} style={{ background: T.gold, color: 'white', border: 'none', borderRadius: 7, padding: '6px 14px', cursor: 'pointer', fontFamily: T.ui, fontWeight: 700, fontSize: 12 }}>
                {isProcessing ? 'Restauration…' : '↩ Restaurer'}
              </button>
              <button onClick={() => setShowRestore(false)} style={{ background: 'transparent', color: T.sub, border: `1px solid ${T.border}`, borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontFamily: T.ui, fontSize: 12 }}>
                Ignorer
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <header className="np" style={{ height: 52, background: T.surface, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', padding: '0 26px', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: T.sub, fontFamily: T.ui }}>
            {NAV.find(n => n.id === activeModule)?.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {storageStatus === 'saving' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.gold, fontFamily: T.ui }}>
                <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }}/> Sauvegarde…
              </div>
            )}
            {storageStatus === 'saved' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.green, fontFamily: T.ui }}>
                <CheckCircle2 size={12}/> Session sauvegardée
              </div>
            )}
            {storageStatus === 'error' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.red, fontFamily: T.ui }}>
                <AlertTriangle size={12}/> Erreur de sauvegarde
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: rows.length > 0 ? T.green : T.gold, background: rows.length > 0 ? T.greenSoft : T.goldLight, border: `1px solid ${rows.length > 0 ? T.green : T.gold}30`, borderRadius: 999, padding: '4px 12px', fontFamily: T.ui, fontWeight: 600 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }}/>
              {rows.length > 0 ? `${rows.length.toLocaleString()} lignes chargées` : 'Aucune donnée'}
            </div>
          </div>
        </header>

        {/* Contenu des modules */}
        <div style={{ flex: 1, overflow: 'auto', padding: 26 }}>
          {activeModule === 'dashboard' && <DashboardModule rows={rows} clientsDB={clientsDB} onNavigate={setActive}/>}
          {activeModule === 'import'    && <ImportModule rows={rows} onImport={handleImport} isProcessing={isProcessing} filesMeta={filesMeta} onClear={handleClear}/>}
          {activeModule === 'cdr'       && <CDRModule rows={rows}/>}
          {activeModule === 'billing'   && <BillingModule rows={rows} invoicesDB={invoicesDB} setInvoicesDB={setInvoicesDB} clientsDB={clientsDB}/>}
          {activeModule === 'clients'   && <ClientsModule rows={rows} clientsDB={clientsDB} setClientsDB={setClientsDB} invoicesDB={invoicesDB}/>}
          {activeModule === 'reports'   && <ReportsModule rows={rows}/>}
        </div>
      </main>
    </div>
  );
}