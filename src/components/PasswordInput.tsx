"use client";

import { useState } from "react";

export function PasswordInput(props: { id: string; name: string; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="pwwrap">
      <input id={props.id} name={props.name} type={show ? "text" : "password"} autoComplete={props.autoComplete} />
      <button type="button" className="pwtog" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
        {show ? "Hide" : "Show"}
      </button>
    </span>
  );
}
