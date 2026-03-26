// page.tsx — Página raíz: redirige al login
import { redirect } from "next/navigation";

export default function HomePage(): never {
  redirect("/login");
}
