"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RecuperarPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "No se pudo enviar el código");
        return;
      }
      router.push(`/login/recuperar/verificar?email=${encodeURIComponent(email)}`);
    } catch {
      setError("Error de red");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-sm mx-4">
      <div className="rounded-xl border bg-white shadow-lg p-8" style={{ borderColor: "#1e3a5f20" }}>
        <h1 className="text-lg font-semibold text-gray-900 mb-1">Recuperar contraseña</h1>
        <p className="text-sm text-gray-500 mb-5">
          Ingresa tu correo y te enviaremos un código de 6 dígitos.
        </p>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
            style={{ backgroundColor: "#1e3a5f" }}
          >
            {pending ? "Enviando..." : "Enviar código"}
          </button>

          <Link
            href="/login"
            className="text-center text-sm text-gray-500 hover:text-gray-700 mt-2"
          >
            Volver al inicio de sesión
          </Link>
        </form>
      </div>
    </div>
  );
}
