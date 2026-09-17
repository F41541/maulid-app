"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, AlertCircle, ArrowRight } from "lucide-react";
import { setCachedUser } from "@/lib/role-utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal masuk. Periksa username dan password.");
      }

      if (data?.user) {
        setCachedUser(data.user);
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat mencoba masuk.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center px-4 py-12 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-lg p-6 sm:p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mb-3 border border-emerald-100 dark:border-emerald-900">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Masuk ke Portal
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gunakan akun panitia untuk mengelola kegiatan.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-sm flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Email / Username" required>
            <Input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Contoh: mfaisalfahri02@gmail.com"
              autoComplete="username"
            />
          </FormField>

          <FormField label="Password" required>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password Anda"
              autoComplete="current-password"
            />
          </FormField>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              isLoading={loading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Masuk ke Dashboard
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}

