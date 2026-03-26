// page.tsx — Gestión de calendario de clases para admin

import { Card, CardContent, CardHeader, CardTitle } from "@core/components/ui/card";
import { getClassTypes, getWeekSchedule } from "@/actions/calendar.actions";
import { getAdmins } from "@/actions/settings.actions";
import { ScheduleForm } from "@/components/gym/calendar/ScheduleForm";
import { ClassTypeForm } from "@/components/gym/calendar/ClassTypeForm";
import { WeekView } from "@/components/gym/calendar/WeekView";

export default async function AdminCalendarPage(): Promise<React.ReactNode> {
  // Obtener la semana actual (lunes a domingo)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const [classTypes, weekClasses, instructors] = await Promise.all([
    getClassTypes(),
    getWeekSchedule(monday.toISOString(), sunday.toISOString()),
    getAdmins(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Calendario</h1>
        <p className="text-muted-foreground">Gestión de clases y horarios</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <WeekView classes={weekClasses} myBookings={[]} />
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Programar clase</CardTitle>
            </CardHeader>
            <CardContent>
              <ScheduleForm classTypes={classTypes} instructors={instructors} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tipos de clase</CardTitle>
            </CardHeader>
            <CardContent>
              <ClassTypeForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
