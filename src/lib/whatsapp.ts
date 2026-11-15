// Tap-to-send WhatsApp links. Pure: no network. Tested in whatsapp.test.ts.
// The leader taps a button, WhatsApp opens with the message already written, and the leader presses send.

/** Digits for wa.me with the country code, or null if it does not look like a phone number. Nigerian numbers may start with 0. */
export function waNumber(phone: string | null | undefined, country = "234"): string | null {
  const raw = String(phone ?? "").trim();
  if (!raw) return null;
  let d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = country + d.slice(1);
  else if (!d.startsWith(country) && d.length <= 10) d = country + d;
  d = d.replace(/\D/g, "");
  return d.length >= 10 && d.length <= 15 ? d : null;
}

/** A link that opens WhatsApp with the text ready. With a number it opens that chat, without one the person picks contacts. */
export function waLink(phone: string | null | undefined, text: string): string {
  const n = waNumber(phone);
  return `https://wa.me/${n ?? ""}?text=${encodeURIComponent(text)}`;
}

const first = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export function nudgeText(member: string, leader: string, titles: string[], site: string): string {
  const what = titles.length ? ` Your check-in${titles.length > 1 ? "s are" : " is"} open: ${titles.join(", ")}.` : "";
  return `Hi ${first(member)}, it's ${first(leader)}.${what} Please answer on TeamPulse. It takes about two minutes: ${site}/signin`;
}

export function welcomeText(member: string, leader: string, tpId: string, site: string): string {
  return `Hi ${first(member)}, it's ${first(leader)}. You're on our TeamPulse. Your TeamPulse ID is ${tpId}. Open ${site}/signin and use the "Create my password" button in the email we sent you. If you can't find it, choose "Forgot your password?" on that page.`;
}

export function inviteText(kind: "new" | "existing", leader: string, link: string): string {
  return kind === "existing"
    ? `Hi, it's ${first(leader)}. Our team now uses TeamPulse for the monthly check-ins. You're already a distributor, so there's nothing new to buy. Please add your details once. It takes about a minute: ${link}\nHave your NeoLife ID ready (like 063-1234567). When I've checked your details you'll get an email with your TeamPulse ID.`
    : `Hi, it's ${first(leader)}. Welcome to the team! Please fill in your details. It takes about a minute: ${link}\nHave your NeoLife ID (like 063-1234567) and the PV of your first order ready. When I've checked your details you'll get an email with your TeamPulse ID.`;
}
