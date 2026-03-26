// page.tsx — Panel admin de ocupación: widget + historial + check-in manual + escáner

import Link from "next/link";
import { ScanLine } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@core/components/ui/card";
import { getOccupancy, getAttendanceLogs } from "@/actions/checkin.actions";
import { getMembers } from "@core/actions/admin.actions";
import { OccupancyWidget } from "@/components/gym/checkin/OccupancyWidget";
import { AttendanceTable } from "@/components/gym/checkin/AttendanceTable";
import { ManualCheckinForm } from "@/components/gym/checkin/ManualCheckinForm";

export default async function AdminOccupancyPage(): Promise<React.ReactNode> {
  const [occupancy, todayLogs, members] = await Promise.all([
    getOccupancy(),
    getAttendanceLogs({ today: true }),
    getMembers(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ocupación</h1>
          <p className="text-muted-foreground">Control de asistencia y ocupación del gimnasio</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/qr/scan">
            <ScanLine className="w-4 h-4" />
            Abrir escáner
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Widget de ocupación */}
          <OccupancyWidget data={occupancy} />

          {/* Historial del día */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Asistencia de hoy</CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceTable logs={todayLogs} />
            </CardContent>
          </Card>
        </div>

        {/* Columna lateral: check-in manual */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Check-in manual</CardTitle>
            </CardHeader>
            <CardContent>
              <ManualCheckinForm members={members} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
