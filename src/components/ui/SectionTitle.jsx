import { T } from '../../constants';

const SectionTitle = ({ children }) => (
  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
    <div style={{ width:3, height:14, background:T.gold, borderRadius:2, flexShrink:0 }}/>
    <span style={{ fontSize:11, fontWeight:700, color:T.sub, textTransform:'uppercase', letterSpacing:'.1em', fontFamily:T.ui }}>{children}</span>
  </div>
);

export default SectionTitle;