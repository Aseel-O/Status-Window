export default function StatusPanel({ children, className = '', ...props }) {
  return (
    <div className={`status-panel ${className}`} {...props}>
      {children}
    </div>
  )
}
