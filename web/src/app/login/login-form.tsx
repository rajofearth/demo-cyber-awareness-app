"use client";

import { useActionState } from "react";
import { authenticate, type AuthState } from "./actions";

export function LoginForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(authenticate, null);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="password" className="meta mb-2 block text-ink-3">
          {configured ? "PASSWORD" : "CREATE PASSWORD"}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={configured ? "current-password" : "new-password"}
          autoFocus
          className="mat-well w-full rounded-[10px] px-3 py-2.5 text-[13px] text-ink outline-none placeholder:text-ink-3"
          placeholder={configured ? "Enter password" : "At least 8 characters"}
        />
      </div>

      {!configured ? (
        <div>
          <label htmlFor="confirm" className="meta mb-2 block text-ink-3">
            CONFIRM
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            required
            minLength={8}
            className="mat-well w-full rounded-[10px] px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-3"
            placeholder="Repeat password"
          />
        </div>
      ) : null}

      {state?.error ? (
        <div className="rounded-[10px] bg-flag/10 px-3 py-2.5 text-[12.5px] text-flag">
          {state.error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mat-cap w-full rounded-[10px] py-2.5 text-[13px] font-medium text-ink disabled:opacity-50"
      >
        {pending ? "Checking…" : configured ? "Unlock" : "Create password and unlock"}
      </button>
    </form>
  );
}
