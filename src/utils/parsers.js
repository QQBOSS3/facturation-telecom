// Tout ce qui touche à la lecture et l'interprétation des fichiers CSV fournisseurs
// Chaque opérateur a son propre format de colonnes, d'où les parsers séparés

import { MARGIN } from '../constants';

export const PE = {

  // Détecte l'opérateur en lisant la première ligne (en-têtes) du CSV
  // On cherche des mots-clés propres à chaque format
  detect: (h) => {
    if (!h) return null;
    const l = h.replace(/"/g, '').toLowerCase();
    if (l.includes("date d'appel") && l.includes('cout client')) return 'unyc';
    if (l.includes('uuid') && l.includes('conso.')) return 'networth';
    if (l.includes('call id')) return 'sewan';
    return null;
  },

  clean:  (s) => (s || '').replace(/"/g, '').trim(),        // supprime les guillemets et espaces parasites
  float:  (s) => parseFloat((s || '0').replace(',', '.')) || 0, // virgule → point pour parseFloat

  // Convertit une durée en secondes en format lisible (ex: 1h 23m 45s)
  dur: (s) => {
    if (!s) return '—';
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  },

  // Extrait la clé mois au format "YYYY-MM" depuis une date
  // Gère deux formats : "31/08/2025 07:15" (UNYC/Sewan) et "2026-01-02 10:19" (Networth)
  monthKey: (dateStr) => {
    const d = PE.clean(dateStr);
    const slashMatch = d.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (slashMatch) return `${slashMatch[3]}-${slashMatch[2]}`;
    const dashMatch = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dashMatch) return `${dashMatch[1]}-${dashMatch[2]}`;
    return 'unknown';
  },

  // Parser UNYC — colonnes clés : [0] date, [4] durée, [9] coût revendeur, [10] nom client, [12] coût client
  unyc: (c) => {
    const nom = PE.clean(c[10]); const conso = PE.float(c[12]);
    if (!nom || nom.toLowerCase() === 'nom client') return null; // filtre la ligne d'en-tête si elle se retrouve dans les données
    const duree = parseInt(PE.clean(c[4])) || 0;
    const mk = PE.monthKey(c[0]);
    const coutRevU = PE.float(c[9]);
    return { client: nom, provider: 'unyc', conso, revendeur: coutRevU, marge: conso * MARGIN, duration: duree, monthKey: mk,
      detail: { date: PE.clean(c[0]).split(' ')[0], desc: `${PE.clean(c[5])}${c[3] ? ' · '+PE.clean(c[3]) : ''}`, duree: PE.dur(duree), conso, total: conso*MARGIN } };
  },

  // Parser Sewan — la hiérarchie client se trouve sur 3 niveaux (niv1/niv2/niv3)
  // On prend le niveau le plus profond non vide pour identifier le vrai client final
  sewan: (c) => {
    const n1 = PE.clean(c[14]); const n2 = PE.clean(c[17]); const n3 = PE.clean(c[20]);
    const nom = n3 || n2 || n1;
    if (!nom || PE.skip(nom)) return null;
    const conso    = PE.float(c[16]); // prix de revente niveau 1 (ce qu'on facture au client)
    const revendeur = PE.float(c[13]); // prix d'achat Sewan
    const duree    = parseInt(PE.clean(c[5])) || parseInt(PE.clean(c[4])) || 0;
    const mk       = PE.monthKey(PE.clean(c[1]));
    return {
      client: nom, provider: 'sewan', conso, revendeur, marge: conso * MARGIN,
      duration: duree, monthKey: mk,
      detail: { date: PE.clean(c[1]).split(' ')[0], desc: `${PE.clean(c[6])}${c[3] ? ' · '+PE.clean(c[3]) : ''}`, duree: PE.dur(duree), conso, total: conso*MARGIN }
    };
  },

  // Parser Networth — format différent, pas de date précise dans le fichier
  // Le nom client peut contenir un préfixe "SIP:" qu'on nettoie
  networth: (c) => {
    let nom = (c[1]||'').replace(/^\(?SIP:/i,'').replace(/^\(/,'').split('(')[0].trim()||'Inconnu';
    const conso = PE.float(c[5]);
    const mk = PE.monthKey(new Date().toISOString()); // pas de date dans le CSV, on utilise la date d'import
    const coutRevN = PE.float(c[4]);
    return { client: nom, provider: 'networth', conso, revendeur: coutRevN, marge: conso*MARGIN, duration: 0, monthKey: mk,
      detail: { date: new Date().toLocaleDateString('fr-FR'), desc: `${PE.clean(c[3])||'Conso'} · ${PE.clean(c[2])||'—'}`, duree: '—', conso, total: conso*MARGIN } };
  },

  // Ignore les lignes qui correspondent à Deleg Media elle-même (lignes internes)
  skip: (n) => ['DELEGMEDIA','DELEG MEDIA'].includes(n.toUpperCase().replace(/\s/g,'')),

  // Lit le fichier en UTF-8 et en ISO-8859-1 en parallèle
  // Certains exports fournisseurs sont en latin-1 — on détecte l'encodage via le caractère de remplacement
  readFile: (f) => new Promise((res, rej) => {
    const tryRead = (enc) => new Promise((ok,ko) => {
      const r = new FileReader();
      r.onload = e => ok(e.target.result);
      r.onerror = ko;
      r.readAsText(f, enc);
    });
    Promise.all([tryRead('UTF-8'), tryRead('ISO-8859-1')]).then(([u, l]) => {
      res({ name: f.name, content: u.includes('�') ? l : u }); // � = caractère invalide → fichier latin-1
    }).catch(rej);
  }),

  // Point d'entrée principal : détecte le format, parse chaque ligne, filtre les invalides
  parseFile: async (file) => {
    const { name, content } = await PE.readFile(file);
    const lines = content.split(/\r?\n/);
    if (lines.length < 2) return [];
    const type = PE.detect(lines[0]);
    if (!type) return []; // format non reconnu
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
