import { MARGIN } from '../constants';
export const PE = {
  detect: (h) => {
    if (!h) return null;
    const l = h.replace(/"/g, '').toLowerCase();
    if (l.includes("date d'appel") && l.includes('cout client')) return 'unyc';
    if (l.includes('uuid') && l.includes('conso.')) return 'networth';
    if (l.includes('call id')) return 'sewan';
    return null;
  },
  clean: (s) => (s || '').replace(/"/g, '').trim(),
  float: (s) => parseFloat((s || '0').replace(',', '.')) || 0,
  dur:   (s) => {
    if (!s) return '—';
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  },
  monthKey: (dateStr) => {
    // formats: "31/08/2025 07:15" ou "2026-01-02 10:19"
    const d = PE.clean(dateStr);
    const slashMatch = d.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (slashMatch) return `${slashMatch[3]}-${slashMatch[2]}`;
    const dashMatch = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dashMatch) return `${dashMatch[1]}-${dashMatch[2]}`;
    return 'unknown';
  },

  unyc: (c) => {
    const nom = PE.clean(c[10]); const conso = PE.float(c[12]);
    if (!nom || nom.toLowerCase() === 'nom client') return null;
    const duree = parseInt(PE.clean(c[4])) || 0;
    const mk = PE.monthKey(c[0]);
    const coutRevU = PE.float(c[9]);
    return { client: nom, provider: 'unyc', conso, revendeur: coutRevU, marge: conso * MARGIN, duration: duree, monthKey: mk,
      detail: { date: PE.clean(c[0]).split(' ')[0], desc: `${PE.clean(c[5])}${c[3] ? ' · '+PE.clean(c[3]) : ''}`, duree: PE.dur(duree), conso, total: conso*MARGIN } };
  },

  sewan: (c) => {
    // Hiérarchie client : prendre le dernier niveau non vide parmi niv1/niv2/niv3
    const n1 = PE.clean(c[14]); const n2 = PE.clean(c[17]); const n3 = PE.clean(c[20]);
    const nom = n3 || n2 || n1;
    // Ignorer les lignes sans client identifiable ou dont le "client" est Deleg Media lui-même
    if (!nom || PE.skip(nom)) return null;
    // conso = prix de revente niv1 (col16), revendeur = prix d'achat (col13)
    const conso    = PE.float(c[16]);
    const revendeur = PE.float(c[13]);
    const duree    = parseInt(PE.clean(c[5])) || parseInt(PE.clean(c[4])) || 0;
    const mk       = PE.monthKey(PE.clean(c[1]));
    const margeNet = conso - revendeur;
    return {
      client: nom, provider: 'sewan', conso, revendeur, marge: conso * MARGIN,
      duration: duree, monthKey: mk,
      detail: { date: PE.clean(c[1]).split(' ')[0], desc: `${PE.clean(c[6])}${c[3] ? ' · '+PE.clean(c[3]) : ''}`, duree: PE.dur(duree), conso, total: conso*MARGIN }
    };
  },

  networth: (c) => {
    let nom = (c[1]||'').replace(/^\(?SIP:/i,'').replace(/^\(/,'').split('(')[0].trim()||'Inconnu';
    const conso = PE.float(c[5]);
    const mk = PE.monthKey(new Date().toISOString());
    const coutRevN = PE.float(c[4]);
    return { client: nom, provider: 'networth', conso, revendeur: coutRevN, marge: conso*MARGIN, duration: 0, monthKey: mk,
      detail: { date: new Date().toLocaleDateString('fr-FR'), desc: `${PE.clean(c[3])||'Conso'} · ${PE.clean(c[2])||'—'}`, duree: '—', conso, total: conso*MARGIN } };
  },

  skip: (n) => ['DELEGMEDIA','DELEG MEDIA'].includes(n.toUpperCase().replace(/\s/g,'')),

  readFile: (f) => new Promise((res, rej) => {
    const tryRead = (enc) => new Promise((ok,ko) => {
      const r = new FileReader();
      r.onload = e => ok(e.target.result);
      r.onerror = ko;
      r.readAsText(f, enc);
    });
    Promise.all([tryRead('UTF-8'), tryRead('ISO-8859-1')]).then(([u, l]) => {
      res({ name: f.name, content: u.includes('\uFFFD') ? l : u });
    }).catch(rej);
  }),

  parseFile: async (file) => {
    const { name, content } = await PE.readFile(file);
    const lines = content.split(/\r?\n/);
    if (lines.length < 2) return [];
    const type = PE.detect(lines[0]);
    if (!type) return [];
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim(); if (!line) continue;
      const cols = line.split(';'); if (cols.length < 5) continue;
      let row = null;
      if (type === 'unyc')     row = PE.unyc(cols);
      if (type === 'sewan')    row = PE.sewan(cols);
      if (type === 'networth') row = PE.networth(cols);
      if (row && !PE.skip(row.client)) rows.push(row);
    }
    return rows;
  },
};