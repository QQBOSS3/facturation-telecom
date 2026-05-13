import { T } from '../../constants';

const Pill = ({ children, color, soft }) => (
  <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, color, background:soft, border:`1px solid ${color}25`, borderRadius:999, padding:'3px 9px', fontFamily:T.ui }}>{children}</span>
);

export default Pill;