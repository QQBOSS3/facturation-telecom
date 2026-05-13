// Fonctions de formatage réutilisées dans toute l'app

export const f2  = n => n.toLocaleString('fr-FR', { minimumFractionDigits:2, maximumFractionDigits:2 }) + ' €'; // montant arrondi à 2 décimales
export const f4  = n => n === 0 ? '—' : n.toLocaleString('fr-FR', { minimumFractionDigits:4, maximumFractionDigits:4 }) + ' €'; // coût fournisseur à 4 décimales (évite les pertes de précision)
export const pct = n => (n*100).toFixed(1) + ' %'; // pourcentage avec 1 décimale
