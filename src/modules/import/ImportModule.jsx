import React, { useState, useRef } from 'react';
import { Download, Upload, Wifi, WifiOff, RotateCw, CheckCircle2, Loader2, FileSpreadsheet, X } from 'lucide-react';
import { T, PROVIDERS, FTP_SERVER } from '../../constants';
import { Badge } from '../../components/ui';


// Module d'import des fichiers CDR
// Deux sources possibles : glisser-déposer/sélection manuelle, ou récupération via le serveur FTP intermédiaire
const ImportModule = ({ rows, onImport, isProcessing, filesMeta, onClear }) => {
  const [ftpStatus,  setFtpStatus]  = useState(null);
  const [ftpFiles,   setFtpFiles]   = useState([]);
  const [ftpSyncing, setFtpSyncing] = useState(false);
  const [ftpMsg,     setFtpMsg]     = useState('');
 
  // Vérifie si le serveur FTP Node.js est joignable et récupère la liste des CSV disponibles
  const checkFTP = async () => {
    setFtpStatus('checking');
    try {
      const r = await fetch(`${FTP_SERVER}/status`, { signal: AbortSignal.timeout(3000) });
      const data = await r.json();
      setFtpStatus('ok');
      setFtpFiles(data.csvFiles || []);
      setFtpMsg(data.lastSync?.lastSync
        ? `Dernière sync : ${new Date(data.lastSync.lastSync).toLocaleString('fr-FR')}`
        : 'Aucune sync effectuée');
    } catch {
      setFtpStatus('error');
      setFtpMsg('Serveur FTP non disponible (port 3001)');
    }
  };
 
  const triggerSync = async () => {
    setFtpSyncing(true);
    setFtpMsg('Synchronisation en cours...');
    try {
      const r = await fetch(`${FTP_SERVER}/sync`, { method: 'POST', signal: AbortSignal.timeout(60000) });
      const data = await r.json();
      setFtpFiles(data.csvFiles || []);
      const ok  = data.results?.success?.length || 0;
      const err = data.results?.errors?.length  || 0;
      setFtpMsg(`Sync terminée — ${ok} fournisseur(s) OK${err > 0 ? `, ${err} erreur(s)` : ''}`);
      setFtpStatus('ok');
    } catch (e) {
      setFtpMsg(`Erreur : ${e.message}`);
    } finally {
      setFtpSyncing(false);
    }
  };
 
  // Télécharge chaque CSV depuis le serveur et les passe à onImport comme si c'était des fichiers locaux
  const importFromFTP = async () => {
    if (!ftpFiles.length) return;
    const fakeFiles = [];
    for (const f of ftpFiles) {
      try {
        const r    = await fetch(`${FTP_SERVER}/csv/${f.filename}`);
        const text = await r.text();
        const blob = new Blob([text], { type: 'text/csv' });
        fakeFiles.push(new File([blob], f.filename, { type: 'text/csv' }));
      } catch {}
    }
    if (fakeFiles.length) onImport(fakeFiles);
  };
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();
 
  const handleFiles = async (files) => {
    const csvFiles = Array.from(files).filter(f => f.name.endsWith('.csv'));
    if (!csvFiles.length) return;
    await onImport(csvFiles);
  };
 
  const totalRows = rows.length;
  const clients   = [...new Set(rows.map(r => r.client))].length;
  const months    = [...new Set(rows.map(r => r.monthKey))].filter(m => m !== 'unknown').sort();
 
  return (
    <div style={{ maxWidth:720, margin:'0 auto', display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <div style={{ fontSize:22, fontWeight:700, color:T.text, fontFamily:T.serif, marginBottom:4 }}>Import des données</div>
        <div style={{ fontSize:13, color:T.sub, fontFamily:T.ui }}>Source unique pour tous les modules — UNYC, Sewan, Networth</div>
      </div>
 
      {/* ── Panneau FTP ── */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', background:T.panel, borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {ftpStatus === 'ok'       && <Wifi size={15} style={{ color:T.green }}/>}
            {ftpStatus === 'error'    && <WifiOff size={15} style={{ color:T.red }}/>}
            {ftpStatus === 'checking' && <RotateCw size={15} style={{ color:T.gold, animation:'spin 1s linear infinite' }}/>}
            {!ftpStatus               && <Wifi size={15} style={{ color:T.muted }}/>}
            <span style={{ fontSize:13, fontWeight:600, color:T.text, fontFamily:T.ui }}>Synchronisation FTP automatique</span>
            {ftpMsg && <span style={{ fontSize:11, color:ftpStatus==='error'?T.red:T.muted, fontFamily:T.ui }}>{ftpMsg}</span>}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={checkFTP} disabled={ftpStatus==='checking'}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', background:'none', border:`1px solid ${T.border}`, borderRadius:7, cursor:'pointer', fontSize:11, fontWeight:600, color:T.sub, fontFamily:T.ui }}>
              <RotateCw size={11}/> Vérifier
            </button>
            {ftpStatus === 'ok' && <>
              <button onClick={triggerSync} disabled={ftpSyncing}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', background:T.goldLight, border:`1px solid ${T.gold}40`, borderRadius:7, cursor:'pointer', fontSize:11, fontWeight:600, color:T.gold, fontFamily:T.ui }}>
                {ftpSyncing ? <RotateCw size={11} style={{ animation:'spin 1s linear infinite' }}/> : <Download size={11}/>}
                {ftpSyncing ? 'Sync...' : 'Sync FTP'}
              </button>
              {ftpFiles.length > 0 && (
                <button onClick={importFromFTP}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', background:T.text, border:'none', borderRadius:7, cursor:'pointer', fontSize:11, fontWeight:600, color:'white', fontFamily:T.ui }}>
                  <Download size={11}/> Importer ({ftpFiles.length})
                </button>
              )}
            </>}
          </div>
        </div>
        {ftpStatus === 'ok' && ftpFiles.length > 0 && (
          <div style={{ padding:'10px 20px', display:'flex', flexWrap:'wrap', gap:8 }}>
            {ftpFiles.map(f => (
              <div key={f.filename} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', background:T.panel, border:`1px solid ${T.border}`, borderRadius:6, fontSize:11, fontFamily:T.ui }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:f.provider==='unyc'?T.blue:f.provider==='sewan'?T.orange:T.purple, flexShrink:0 }}/>
                <span style={{ color:T.text, fontWeight:500 }}>{f.provider.toUpperCase()}</span>
                <span style={{ color:T.muted }}>{f.filename.replace(/^[^_]+_/,'')}</span>
                <span style={{ color:T.dim, fontFamily:T.mono }}>{(f.size/1024).toFixed(1)}ko</span>
              </div>
            ))}
          </div>
        )}
        {!ftpStatus && (
          <div style={{ padding:'12px 20px', fontSize:12, color:T.muted, fontFamily:T.ui }}>
            Cliquez sur "Vérifier" pour tester la connexion au serveur FTP (port 3001)
          </div>
        )}
      </div>
 
      {/* Zone de dépôt */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current.click()}
        style={{
          border:`2px dashed ${dragging ? T.gold : T.border}`,
          borderRadius:16, padding:'48px 32px', textAlign:'center',
          cursor:'pointer', background: dragging ? T.goldLight : T.panel,
          transition:'all .2s'
        }}>
        <input ref={fileRef} type="file" accept=".csv" multiple style={{ display:'none' }} onChange={e => handleFiles(e.target.files)} />
        <div style={{ width:52, height:52, borderRadius:13, background:T.surface, border:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          {isProcessing ? <Loader2 size={22} style={{ color:T.gold, animation:'spin 1s linear infinite' }}/> : <Upload size={22} style={{ color:T.sub }}/>}
        </div>
        <div style={{ fontSize:15, fontWeight:600, color:T.text, fontFamily:T.ui, marginBottom:6 }}>
          {isProcessing ? 'Analyse en cours…' : 'Glissez vos fichiers CSV ici'}
        </div>
        <div style={{ fontSize:12, color:T.muted, fontFamily:T.ui, marginBottom:16 }}>ou cliquez pour sélectionner · multi-fichiers supporté</div>
        <div style={{ display:'flex', justifyContent:'center', gap:6 }}>
          {PROVIDERS.map(p => <Badge key={p.id} id={p.id}/>)}
        </div>
      </div>
 
      {/* Fichiers chargés */}
      {filesMeta.length > 0 && (
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', background:T.panel }}>
            <span style={{ fontSize:12, fontWeight:600, color:T.sub, fontFamily:T.ui }}>Fichiers chargés</span>
            <button onClick={onClear} style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:`1px solid ${T.border}`, borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:11, color:T.muted, fontFamily:T.ui }}>
              <X size={11}/> Vider
            </button>
          </div>
          {filesMeta.map((f, i) => (
            <div key={i} style={{ padding:'12px 18px', borderBottom: i < filesMeta.length-1 ? `1px solid ${T.border}` : 'none', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <CheckCircle2 size={14} style={{ color:T.green }}/>
                <span style={{ fontSize:13, fontFamily:T.ui, color:T.text, fontWeight:500 }}>{f.name}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Badge id={f.provider}/>
                <span style={{ fontSize:11, color:T.muted, fontFamily:T.mono }}>{f.rows.toLocaleString()} lignes</span>
              </div>
            </div>
          ))}
        </div>
      )}
 
      {/* Stats session */}
      {totalRows > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {[
            { label:'Lignes importées', value:totalRows.toLocaleString(), color:T.blue },
            { label:'Clients détectés', value:clients, color:T.green },
            { label:'Mois couverts', value:`${months.length} mois`, color:T.gold },
          ].map(s => (
            <div key={s.label} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:'14px 16px', textAlign:'center' }}>
              <div style={{ fontSize:22, fontWeight:700, color:s.color, fontFamily:T.mono }}>{s.value}</div>
              <div style={{ fontSize:11, color:T.muted, fontFamily:T.ui, marginTop:3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
 

export default ImportModule;