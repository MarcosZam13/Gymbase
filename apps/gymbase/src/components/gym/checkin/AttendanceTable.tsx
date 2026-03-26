// AttendanceTable.tsx — Tabla de historial de asistencia para admin

"use client";

import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { Badge } from "@core/components/ui/badge";
import { Button } from "@core/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@core/components/ui/table";
import { checkOut } from "@/actions/checkin.actions";
import type { AttendanceLogWithProfile } from "@/types/gym-checkin";

interface AttendanceTableProps {
  logs: AttendanceLogWithProfile[];
}

export function AttendanceTable({ logs }: AttendanceTableProps): React.ReactNode {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [items, setItems] = useState(logs);

  async function handleCheckout(attendanceId: string): Promise<void> {
    setProcessingId(attendanceId);
    const result = await checkOut({ attendance_id: attendanceId });

    if (result.success && result.data) {
      // Actualizar el item en la lista local
      setItems((prev) =>
        prev.map((item) =>
          item.id === attendanceId
            ? { ...item, check_out_at: result.data!.check_out_at, duration_minutes: result.data!.duration_minutes }
            : item
        )
      );
    }
    setProcessingId(null);
  }

  function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString("es-CR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDuration(minutes: number | null): string {
    if (minutes === null) return "—";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}min`;
    return `${h}h ${m}min`;
  }

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Miembro</TableHead>
            <TableHead>Entrada</TableHead>
            <TableHead>Salida</TableHead>
            <TableHead>Duración</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No hay registros de asistencia
              </TableCell>
            </TableRow>
          ) : (
            items.map((log) => {
              const isOpen = log.check_out_at === null;

              return (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">
                    {log.profile?.full_name ?? log.profile?.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatTime(log.check_in_at)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.check_out_at ? formatTime(log.check_out_at) : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDuration(log.duration_minutes)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={isOpen ? "default" : "secondary"}>
                      {isOpen ? "Adentro" : "Completado"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {isOpen && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={processingId === log.id}
                        onClick={() => handleCheckout(log.id)}
                        className="gap-1"
                      >
                        {processingId === log.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <LogOut className="w-4 h-4" />
                        )}
                        Check-out
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
