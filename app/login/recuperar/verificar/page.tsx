"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function Form() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") || "";
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/password-reset/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error || "Código inválido");
        return;
      }
      setOk(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      setError("Error de red");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-sm mx-4">
      <div className="rounded-xl border bg-white shadow-lg p-8" style={{ borderColor: "#0062a820" }}>
        <h1 className="text-lg font-semibold text-gray-900 mb-1">Verificar código</h1>
        <p className="text-sm text-gray-500 mb-5">
          Revisa el correo <span className="font-medium text-gray-700">{email}</span> e ingresa el código que recibiste.
        </p>

        {ok ? (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-3 text-center">
            Contraseña actualizada. Redirigiendo…
          </p>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                Código de 6 dígitos
              </label>
              <input
                id="code"
                name="code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Nueva contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400 mt-1">Mínimo 8 caracteres.</p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={pending || code.length !== 6 || password.length < 8}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: "#0062a8" }}
            >
              {pending ? "Actualizando..." : "Actualizar contraseña"}
            </button>

            <Link
              href="/login/recuperar"
              className="text-center text-sm text-gray-500 hover:text-gray-700 mt-2"
            >
              Usar otro correo
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}

export default function VerificarPage() {
  return (
    <Suspense fallback={null}>
      <Form />
    </Suspense>
  );
}
