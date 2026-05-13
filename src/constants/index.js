// Palette et typographie centralisées — un seul endroit à modifier pour changer le thème
export const T = {
  bg:        '#f5f4f0',
  surface:   '#ffffff',
  panel:     '#fafaf8',
  border:    '#e6e5e0',
  text:      '#181816',
  sub:       '#64635a',
  muted:     '#a09e94',
  dim:       '#cccbc4',
  gold:      '#b8933a',
  goldLight: '#f5e9cb',
  green:     '#1a7a4a',
  greenSoft: '#e8f5ee',
  blue:      '#1d4ed8',
  blueSoft:  '#eff6ff',
  orange:    '#b45309',
  orangeSoft:'#fff7ed',
  purple:    '#6d28d9',
  purpleSoft:'#f5f3ff',
  red:       '#b91c1c',
  redSoft:   '#fef2f2',
  ui:        "'DM Sans', system-ui, sans-serif",
  mono:      "'DM Mono', monospace",
  serif:     "'Cormorant Garamond', Georgia, serif",
};

// Les 3 opérateurs supportés, avec leur couleur associée pour les badges et graphiques
export const PROVIDERS = [
  { id: 'unyc',     name: 'UNYC',     color: T.blue,   soft: T.blueSoft },
  { id: 'sewan',    name: 'Sewan',    color: T.orange,  soft: T.orangeSoft },
  { id: 'networth', name: 'Networth', color: T.purple,  soft: T.purpleSoft },
];

// Adresse du serveur intermédiaire Node.js qui récupère les CSV depuis le FTP fournisseurs
// La valeur réelle est dans .env.local pour ne pas exposer l'IP sur GitHub
export const FTP_SERVER = import.meta.env.VITE_FTP_SERVER || 'http://localhost:3001';

export const MONTH_LABELS = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc']; // utilisé pour afficher les clés "YYYY-MM" en label lisible

export const MARGIN = 2.0; // coefficient de marge appliqué sur le coût fournisseur pour obtenir le prix client

// Statuts possibles d'une facture, avec couleur et icône pour les badges
export const INVOICE_STATUS = [
  { id: 'draft', label: 'Brouillon', color: '#64635a', soft: '#fafaf8', icon: '📝' },
  { id: 'sent',  label: 'Envoyée',   color: '#1d4ed8', soft: '#eff6ff', icon: '📤' },
  { id: 'paid',  label: 'Payée',     color: '#1a7a4a', soft: '#e8f5ee', icon: '✅' },
  { id: 'late',  label: 'En retard', color: '#b91c1c', soft: '#fef2f2', icon: '⚠️' },
];

// Statuts clients pour le filtre et les badges dans le module Clients
export const CLIENT_STATUS = [
  { id: 'active',   label: 'Actif',    color: '#1a7a4a', soft: '#e8f5ee' },
  { id: 'prospect', label: 'Prospect', color: '#b8933a', soft: '#f5e9cb' },
  { id: 'inactive', label: 'Inactif',  color: '#a09e94', soft: '#fafaf8' },
];

export const CONTRACT_TYPES = [
  'CDR Voix', 'CDR Data', 'CDR Mixte', 'Forfait mensuel', 'À la consommation',
];