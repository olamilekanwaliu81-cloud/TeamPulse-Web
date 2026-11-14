"use client";

import { useState } from "react";

/** Picks a picture, shrinks it to 320 px in the browser and sends it with the form as a small JPEG. */
export function PhotoField({ initial, initials, label = "Your picture", hint }: { initial?: string | null; initials: string; label?: string; hint?: string }) {
  const [photo, setPhoto] = useState<string>("");
  const [error, setError] = useState("");
  const shown = photo || initial || "";

  async function pick(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      const bmp = await createImageBitmap(file);
      const s = Math.min(1, 320 / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * s);
      c.height = Math.round(bmp.height * s);
      c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
      setPhoto(c.toDataURL("image/jpeg", 0.85));
    } catch {
      setError("That file is not a picture we can read.");
    }
  }

  return (
    <div className="inline" style={{ marginBottom: 16, flexWrap: "nowrap" }}>
      {shown ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="av lg" src={shown} alt="Your picture" />
      ) : (
        <span className="av a1 lg" aria-hidden="true">{initials}</span>
      )}
      <div className="field" style={{ margin: 0, minWidth: 0 }}>
        <label htmlFor="photo-file">{label}</label>
        <input id="photo-file" type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0])} />
        <input type="hidden" name="photo" value={photo} />
        <span className={`hint ${error ? "bad" : ""}`}>{error || hint || "A clear photo of your face. You can change it later."}</span>
      </div>
    </div>
  );
}
