// ForgotPasswordForm.tsx — Formulario para solicitar recuperación de contraseña por email

"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { requestPasswordReset } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle } from "lucide-react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setIsPending(true);
    const result = await requestPasswordReset(email.trim());
    setIsPending(false);
    if (result.success) {
      setSent(true);
    } else {
      setError(typeof result.error === "string" ? result.error : "Error al enviar el correo");
    }
  }

  if (sent) {
    return (
      <Card className="w-full max-w-sm shadow-lg">
        <CardContent className="pt-6 flex flex-col items-center gap-3 text-center">
          <CheckCircle className="w-10 h-10 text-success" />
          <p className="font-medium">Revisa tu correo</p>
          <p className="text-sm text-muted-foreground">
            Si <span className="font-mono text-foreground">{email}</span> está registrado, recibirás un enlace para restablecer tu contraseña.
          </p>
          <Link href="/login" className="text-sm text-primary hover:underline mt-2">
            Volver al inicio de sesión
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Recuperar contraseña</CardTitle>
        <CardDescription>Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@correo.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isPending || !email.trim()}>
            {isPending ? "Enviando…" : "Enviar enlace"}
          </Button>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground text-center">
            Volver al inicio de sesión
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
