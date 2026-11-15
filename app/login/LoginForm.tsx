"use client";

import { useActionState } from "react";
import { requestMagicLink, type LoginState } from "./actions";

const initialState: LoginState = { message: "", ok: false };

export function LoginForm() {
  const [state, action, pending] = useActionState(requestMagicLink, initialState);
  return <form action={action} className="login-form">
    <label htmlFor="email">Email address</label>
    <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
    <button className="primary-action" disabled={pending}>{pending ? "Sending…" : "Email me a sign-in link"}</button>
    <p className={state.ok ? "form-success" : "form-error"} aria-live="polite">{state.message}</p>
  </form>;
}
