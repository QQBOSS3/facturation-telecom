# Plateforme Facturation Télécom — Deleg Media

Application web de gestion et facturation des consommations télécom (CDR).  
Développée dans le cadre d'un BTS SIO — option SLAM.

## Présentation

L'application permet à Deleg Media de traiter les fichiers de consommation télécom (CDR) reçus de trois opérateurs (UNYC, Sewan, Networth), d'analyser les coûts, de générer des factures clients et de produire des rapports d'activité — le tout sans backend, directement dans le navigateur.

## Fonctionnalités

- **Import CDR** : glisser-déposer ou synchronisation FTP automatique — détection automatique du format opérateur
- **CDR Analyzer** : tableau croisé des coûts par client et par mois (coût client, coût revendeur, marge)
- **Facturation** : génération et suivi des factures (brouillon → envoyée → payée / en retard)
- **Base clients** : fiche client enrichissable, hiérarchie groupe/site par drag & drop, suivi contractuel avec alertes
- **Rapports** : rapports mensuels, par fournisseur, comparatifs entre deux mois — export Excel (4 feuilles) & PDF

## Stack technique

| Lib | Usage |
|-----|-------|
| React 18 + Vite | UI et bundling |
| Recharts | Graphiques (aires, barres, lignes) |
| SheetJS / xlsx | Export Excel multi-feuilles |
| Lucide React | Icônes |
| localStorage | Persistance de session côté navigateur |

## Architecture du projet

```
src/
├── App.jsx                  # Racine : état global, routing entre modules
├── constants/
│   └── index.js             # Palette, config opérateurs, statuts partagés
├── utils/
│   ├── parsers.js           # Lecture et interprétation des CSV (PE)
│   └── formatters.js        # Formatage monétaire et pourcentages
├── components/ui/           # Composants réutilisables (Badge, KPI, Pill…)
└── modules/
    ├── dashboard/           # Vue d'ensemble et KPIs
    ├── import/              # Import fichiers + sync FTP
    ├── cdr/                 # Tableau croisé CDR
    ├── billing/             # Génération et suivi des factures
    ├── clients/             # Base clients
    └── reports/             # Rapports et exports
```

## Persistance des données

L'application ne nécessite **aucun backend**. Toutes les données sont stockées dans le `localStorage` du navigateur :

| Clé | Contenu |
|-----|---------|
| `dm-session-rows-*` | Lignes CDR (découpées en chunks de 3 000 pour rester sous la limite ~5 MB) |
| `dm-session-meta` | Métadonnées de la session (nombre de lignes, fichiers importés, date) |
| `dm-clients-db` | Base clients (fiches, contrats, hiérarchie) |
| `dm-invoices-db` | Historique des factures générées |

## Format des fichiers CSV attendus

L'application détecte automatiquement l'opérateur en lisant les en-têtes de la première ligne :

| Opérateur | Séparateur | Encodage | Indicateur de détection |
|-----------|-----------|----------|------------------------|
| UNYC | `;` | UTF-8 ou ISO-8859-1 | colonne `date d'appel` + `cout client` |
| Sewan | `;` | UTF-8 | colonne `call id` |
| Networth | `;` | UTF-8 | colonnes `uuid` + `conso.` |

## Installation

```bash
npm install
```

Copier `.env.example` en `.env.local` et renseigner l'adresse du serveur FTP :

```bash
cp .env.example .env.local
```

## Développement

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Configuration FTP

Le panneau "Synchronisation FTP" nécessite un serveur Node.js intermédiaire exposant les routes :

| Route | Description |
|-------|-------------|
| `GET /status` | État du serveur + liste des CSV disponibles |
| `POST /sync` | Déclenche la récupération FTP |
| `GET /csv/:filename` | Téléchargement d'un fichier CSV |

Sans ce serveur, l'import manuel par glisser-déposer fonctionne normalement.
