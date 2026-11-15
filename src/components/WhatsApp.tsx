/** A button that opens WhatsApp with a message ready to send. Not automatic: the leader presses send. */
export function WhatsApp({ href, label = "WhatsApp", primary }: { href: string; label?: string; primary?: boolean }) {
  return <a className={`btn sm${primary ? " primary" : ""}`} href={href} target="_blank" rel="noopener noreferrer">{label}</a>;
}
