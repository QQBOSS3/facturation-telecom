export const f2  = n => n.toLocaleString('fr-FR', { minimumFractionDigits:2, maximumFractionDigits:2 }) + ' €';
export const f4  = n => n === 0 ? '—' : n.toLocaleString('fr-FR', { minimumFractionDigits:4, maximumFractionDigits:4 }) + ' €';
export const pct = n => (n*100).toFixed(1) + ' %';