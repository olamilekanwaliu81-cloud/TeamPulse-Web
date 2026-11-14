import { initials } from "@/lib/rules";

const hue = (id: string) => [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 6, 0);

export function Avatar({ user, size }: { user: { id: string; name: string; photo: string | null }; size?: "lg" }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (user.photo) return <img className={`av ${size ?? ""}`} src={user.photo} alt="" />;
  return <span className={`av a${hue(user.id)} ${size ?? ""}`} aria-hidden="true">{initials(user.name)}</span>;
}
