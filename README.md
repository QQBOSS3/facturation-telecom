# Plateforme Facturation Télécom — Deleg Media

Application web de gestion et facturation des consommations télécom (CDR).  
Développée dans le cadre d'un BTS SIO.

## Fonctionnalités

- **Import CDR** : glisser-déposer ou synchronisation FTP automatique (UNYC, Sewan, Networth)
- **CDR Analyzer** : tableau croisé des coûts par client et par mois
- **Facturation** : génération et suivi des factures (brouillon, envoyée, payée, en retard)
- **Base clients** : fiche client, hiérarchie groupe/site, suivi contractuel
- **Rapports** : rapports mensuels, par fournisseur, comparatifs — export Excel & PDF

## Stack technique

- React 18 + Vite
- Recharts (graphiques)
- SheetJS / xlsx (export Excel)
- Lucide React (icônes)
- localStorage (persistance session)

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
