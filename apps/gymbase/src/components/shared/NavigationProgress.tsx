// NavigationProgress.tsx — Barra de progreso de navegación para Next.js App Router
// Detecta clicks en <a> para iniciar, y cambio de pathname para terminar.

"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function NavigationProgress(): React.ReactNode {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPathRef = useRef(pathname);
  const progressRef = useRef(0);

  // Cuando el pathname cambia → navegación completada → llevar a 100% y ocultar
  useEffect(() => {
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;

    if (intervalRef.current) clearInterval(intervalRef.current);
    setProgress(100);
    const t = setTimeout(() => {
      setVisible(false);
      setProgress(0);
      progressRef.current = 0;
    }, 350);
    return () => clearTimeout(t);
  }, [pathname]);

  // Detectar clicks en links internos → iniciar barra
  useEffect(() => {
    const start = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      progressRef.current = 0;
      setProgress(0);
      setVisible(true);

      intervalRef.current = setInterval(() => {
        // Avance rápido al principio, cada vez más lento al acercarse a 80%
        const remaining = 80 - progressRef.current;
        const step = Math.max(remaining * 0.15, 1.5);
        progressRef.current = Math.min(progressRef.current + step, 80);
        setProgress(progressRef.current);
        if (progressRef.current >= 80 && intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }, 150);
    };

    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      // Solo links internos
      if (
        !href ||
        href.startsWith("http") ||
        href.startsWith("//") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) return;
      start();
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, right: 0,
        height: 2, zIndex: 9999, pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          backgroundColor: "var(--gym-accent)",
          boxShadow: `0 0 8px var(--gym-accent)`,
          transition: progress >= 100
            ? "width 0.15s ease-out"
            : "width 0.3s ease-out",
        }}
      />
    </div>
  );
}
