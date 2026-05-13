import { T } from '../../constants';

const KPI = ({ label, value, sub, icon:Icon, color, delta }) => (
  <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:14, padding:'22px 24px', boxShadow:'0 2px 8px rgba(0,0,0,.05)', borderTop:`3px solid ${color}`, display:'flex', flexDirection:'column', gap:10 }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <span style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:'uppercase', letterSpacing:'.12em', fontFamily:T.ui }}>{label}</span>
      <div style={{ background:color+'18', borderRadius:8, padding:7, color }}><Icon size={14}/></div>
    </div>
    <div style={{ fontSize:24, fontWeight:700, color:T.text, fontFamily:T.ui, letterSpacing:'-.03em', lineHeight:1 }}>{value}</div>
    {(sub || delta !== undefined) && (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        {sub && <span style={{ fontSize:11, color:T.muted, fontFamily:T.ui }}>{sub}</span>}
      </div>
    )}
  </div>
);

export default KPI;