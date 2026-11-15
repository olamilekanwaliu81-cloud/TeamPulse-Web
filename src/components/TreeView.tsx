"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { initials } from "@/lib/rules";

export type TreeNode = {
  id: string; name: string; photo: string | null; rank: string; status: "invited" | "active" | "inactive";
  tpId: string; ppv: number | null; qpv: number | null; month: "qualified" | "title_only" | "no_bonus" | "unreported"; children: TreeNode[];
};

const HUES = ["#3A5BA0", "#7A3B3B", "#4B4B9A", "#3B6B4F", "#6B5A2B", "#5A3B7A"];
const hue = (id: string) => HUES[[...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % HUES.length, 0)];

function Card({ n, root, count, closed, toggle }: { n: TreeNode; root?: boolean; count: number; closed: boolean; toggle: () => void }) {
  const face = n.photo
    // eslint-disable-next-line @next/next/no-img-element
    ? <img className="av lg" src={n.photo} alt="" />
    : <span className="av lg" style={{ background: hue(n.id), color: "#fff" }} aria-hidden="true">{initials(n.name)}</span>;
  const inner = (
    <>
      {face}
      <b className="on">{root ? "You" : n.name}</b>
      <span className="orank">{n.rank}</span>
      <span className="ost">{n.status === "invited" ? "Invited. No login yet." : n.status === "inactive" ? "Inactive" : root ? `${count} directly sponsored` : n.ppv == null ? "No PPV yet" : `${n.ppv.toLocaleString("en-US")} PPV`}</span>
      {!root && n.status === "active" && count > 0 && n.qpv != null && <span className="ost sm">{n.qpv.toLocaleString("en-US")} QPV</span>}
      {!root && n.status === "active" && n.month !== "unreported" && <span className={`st ${n.month === "qualified" ? "q" : n.month === "no_bonus" ? "n" : "t"}`} style={{ marginTop: 4 }}>{n.month === "qualified" ? "Qualified" : n.month === "no_bonus" ? "No bonus" : "Title only"}</span>}
      <span className="mono oid">{n.tpId}</span>
    </>
  );
  const cls = `ocard ${root ? "root" : ""} ${n.status === "invited" ? "inv" : ""} ${n.status === "inactive" ? "dim" : ""}`;
  return (
    <>
      {root ? <div className={cls}>{inner}</div> : <Link className={cls} href={`/team/${n.id}`} prefetch={false}>{inner}</Link>}
      {count > 0 && (
        <button className="otog" type="button" onClick={toggle} aria-expanded={!closed} aria-label={`${closed ? "Show" : "Hide"} ${count} below ${n.name}`}>
          {closed ? "+" : "−"} {count}
        </button>
      )}
    </>
  );
}

/** The network as an organisation chart: the viewer on top, each person joined to their sponsor. Fits the screen, zooms, saves as PNG. */
export function TreeView({ root, team }: { root: TreeNode; team: string }) {
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState<"fit" | number>("fit");
  const [scale, setScale] = useState(1);
  const box = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null), inn = useRef<HTMLDivElement>(null);

  const toggle = (id: string) => setClosed((s) => { const x = new Set(s); if (x.has(id)) x.delete(id); else x.add(id); return x; });

  const levels: number[] = [];
  (function walk(ns: TreeNode[], d: number) { if (!ns.length) return; levels[d] = (levels[d] ?? 0) + ns.length; ns.forEach((n) => walk(n.children, d + 1)); })(root.children, 0);
  const total = levels.reduce((a, b) => a + b, 0);

  const fit = useCallback(() => {
    const b = box.current, s = stage.current, i = inn.current;
    if (!b || !s || !i) return;
    i.style.transform = "none";
    const nw = i.offsetWidth, nh = i.offsetHeight;
    let k: number;
    if (zoom === "fit") {
      const cs = getComputedStyle(b), aw = b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const top = b.getBoundingClientRect().top + window.scrollY;
      const ah = Math.max(260, window.innerHeight - Math.min(top, window.innerHeight * 0.45) - 40);
      k = Math.max(0.2, Math.min(1, aw / nw, (window.innerHeight - 90) / nh, ah / nh));
    } else k = zoom;
    i.style.transform = `scale(${k})`;
    s.style.width = `${nw * k}px`;
    s.style.height = `${nh * k}px`;
    setScale(k);
  }, [zoom]);

  useLayoutEffect(() => { fit(); }, [fit, closed, root]);
  useEffect(() => { window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit); }, [fit]);

  const step = (f: number) => setZoom(Math.min(2, Math.max(0.2, scale * f)));

  async function savePng() {
    const i = inn.current; if (!i) return;
    const prev = i.style.transform; i.style.transform = "none";
    const o = i.getBoundingClientRect(), W = Math.ceil(i.offsetWidth), H = Math.ceil(i.offsetHeight);
    const rel = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height }; };
    const PAD = 36, HEAD = 64, K = 2, cv = document.createElement("canvas");
    cv.width = (W + PAD * 2) * K; cv.height = (H + PAD * 2 + HEAD) * K;
    const c = cv.getContext("2d")!; c.scale(K, K);
    const ACC = "#2F62F5", INK = "#0F1B44", MUT = "#6B7799", FONT = "system-ui,-apple-system,sans-serif";
    c.fillStyle = "#fff"; c.fillRect(0, 0, cv.width, cv.height);
    const ox = PAD, oy = PAD + HEAD;
    c.textBaseline = "top"; c.textAlign = "left";
    c.fillStyle = INK; c.font = `800 22px ${FONT}`; c.fillText(`TeamPulse network${team ? " · " + team : ""}`, PAD, PAD - 4);
    c.fillStyle = MUT; c.font = `500 13px ${FONT}`; c.fillText(`${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · ${total} members`, PAD, PAD + 26);
    c.strokeStyle = ACC; c.lineWidth = 2;
    const walk = (li: Element) => {
      const card = li.querySelector(":scope>.ocard"), ul = li.querySelector(":scope>ul");
      if (!card || !ul) return;
      const kids = [...ul.children].filter((x) => x.tagName === "LI");
      const pr = rel(card), px = ox + pr.x + pr.w / 2, py = oy + pr.y + pr.h + 2;
      const krs = kids.map((k) => rel(k.querySelector(":scope>.ocard")!)), ky = oy + krs[0].y, my = (py + ky) / 2;
      const xs = krs.map((r) => ox + r.x + r.w / 2);
      c.beginPath(); c.moveTo(px, py); c.lineTo(px, my); c.stroke();
      c.beginPath(); c.moveTo(Math.min(px, ...xs), my); c.lineTo(Math.max(px, ...xs), my); c.stroke();
      xs.forEach((x) => { c.beginPath(); c.moveTo(x, my); c.lineTo(x, ky); c.stroke(); });
      kids.forEach(walk);
    };
    const rootLi = i.querySelector("ul>li"); if (rootLi) walk(rootLi);
    const wrap = (txt: string, maxW: number) => {
      const lines: string[] = []; let cur = "";
      txt.split(/\s+/).forEach((w) => { const t = cur ? cur + " " + w : w; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
      if (cur) lines.push(cur); return lines;
    };
    for (const card of i.querySelectorAll(".ocard")) {
      const r = rel(card), cx = ox + r.x + r.w / 2, av = card.querySelector(".av")!, ar = rel(av), d = ar.w, ax = ox + ar.x + d / 2, ay = oy + ar.y + d / 2;
      c.save(); c.globalAlpha = card.classList.contains("dim") ? 0.55 : 1;
      c.beginPath(); c.arc(ax, ay, d / 2 - 2, 0, Math.PI * 2); c.save(); c.clip();
      if (av instanceof HTMLImageElement) { try { c.drawImage(av, ax - d / 2, ay - d / 2, d, d); } catch { /* skip */ } }
      else {
        const cs = getComputedStyle(av); c.fillStyle = cs.backgroundColor; c.fillRect(ax - d / 2, ay - d / 2, d, d);
        c.fillStyle = cs.color; c.font = `700 ${d * 0.3}px ${FONT}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(av.textContent?.trim() ?? "", ax, ay + 1); c.textBaseline = "top";
      }
      c.restore();
      c.beginPath(); c.arc(ax, ay, d / 2 - 2, 0, Math.PI * 2); c.lineWidth = 4; c.strokeStyle = ACC;
      if (card.classList.contains("inv")) c.setLineDash([8, 6]); c.stroke(); c.setLineDash([]); c.lineWidth = 2;
      c.textAlign = "center";
      const put = (el: Element | null, color: string, upper: boolean) => {
        if (!el) return; const cs = getComputedStyle(el), er = rel(el);
        c.fillStyle = color; c.font = `${cs.fontWeight} ${cs.fontSize} ${FONT}`;
        const lh = parseFloat(cs.fontSize) * 1.2; wrap(upper ? (el.textContent ?? "").toUpperCase() : el.textContent ?? "", r.w - 6).forEach((ln, k) => c.fillText(ln, cx, oy + er.y + k * lh));
      };
      put(card.querySelector(".on"), ACC, true); put(card.querySelector(".orank"), INK, true);
      card.querySelectorAll(".ost").forEach((e) => put(e, INK, false)); put(card.querySelector(".oid"), MUT, false);
      c.restore();
    }
    i.style.transform = prev;
    const blob: Blob | null = await new Promise((ok) => cv.toBlob(ok, "image/png"));
    if (!blob) return;
    const name = `teampulse-network-${new Date().toISOString().slice(0, 10)}.png`;
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  const li = (n: TreeNode): React.ReactNode => (
    <li key={n.id}>
      <Card n={n} count={n.children.length} closed={closed.has(n.id)} toggle={() => toggle(n.id)} />
      {n.children.length > 0 && !closed.has(n.id) && <ul>{n.children.map(li)}</ul>}
    </li>
  );

  return (
    <div className="otree-wrap">
      <div className="inline" style={{ margin: "12px 0 4px", gap: 8 }}>
        <span className="sub">Your network, level by level.</span>
        {levels.map((n, k) => <span key={k} className="pill">Level {k + 1}: {n}</span>)}
      </div>
      <p className="sub" style={{ margin: "0 0 8px" }}>Select a person to open their profile. The numbered button hides or shows the people below.</p>
      <div className="otools">
        <span className="sub">{zoom === "fit" ? `Fitted to screen (${Math.round(scale * 100)}%)` : `Zoom ${Math.round(scale * 100)}%`}</span>
        <div className="inline" style={{ gap: 6 }}>
          <button className="btn sm" type="button" onClick={() => step(0.8)} aria-label="Zoom out">&minus;</button>
          <button className="btn sm" type="button" onClick={() => setZoom("fit")}>Fit to screen</button>
          <button className="btn sm" type="button" onClick={() => step(1.25)} aria-label="Zoom in">+</button>
          <button className="btn sm primary" type="button" onClick={savePng}>Download as picture (PNG)</button>
        </div>
      </div>
      <div className="otree" ref={box} tabIndex={0} aria-label="Network tree">
        <div className="ostage" ref={stage}>
          <div className="oin" ref={inn}>
            <ul>
              <li>
                <Card n={root} root count={root.children.length} closed={closed.has(root.id)} toggle={() => toggle(root.id)} />
                {root.children.length > 0 && !closed.has(root.id) && <ul>{root.children.map(li)}</ul>}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
