"use client";

import { useState } from "react";

/** A small button that copies a link to the clipboard. */
export function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  return (
    <button className="btn sm" type="button" onClick={async () => {
      try { await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 2000); } catch { window.prompt("Copy this link:", url); }
    }}>{done ? "Copied" : "Copy link"}</button>
  );
}
