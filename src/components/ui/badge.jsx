import { PROVIDERS } from '../../constants';
import { T } from '../../constants';

const Badge = ({ id }) => {
  const p = PROVIDERS.find(x => x.id === id);
  if (!p) return null;
  return <span style={{ fontSize:10, fontWeight:600, color:p.color, background:p.soft, border:`1px solid ${p.color}25`, borderRadius:4, padding:'2px 7px', letterSpacing:'.05em', fontFamily:T.ui, textTransform:'uppercase' }}>{p.name}</span>;
};

export default Badge;