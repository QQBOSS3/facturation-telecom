import { INVOICE_STATUS } from '../../constants';

const InvoiceBadge = ({ status }) => {
  const s = INVOICE_STATUS.find(x => x.id === status) || INVOICE_STATUS[0];
  return (
    <span style={{ fontSize:10, fontWeight:600, color:s.color, background:s.soft, border:`1px solid ${s.color}30`, borderRadius:999, padding:'2px 8px', fontFamily:"'DM Sans', system-ui, sans-serif" }}>
      {s.icon} {s.label}
    </span>
  );
};

export default InvoiceBadge;
