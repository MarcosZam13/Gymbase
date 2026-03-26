// page.tsx — Calendario de clases disponibles y reservas del miembro

import { Card, CardContent, CardHeader, CardTitle } from "@core/components/ui/card";
import { getWeekSchedule, getMyBookings } from "@/actions/calendar.actions";
import { WeekView } from "@/components/gym/calendar/WeekView";
import { BookingList } from "@/components/gym/calendar/BookingList";
import { themeConfig } from "@/lib/theme";

export default async function PortalCalendarPage(): Promise<React.ReactNode> {
  if (!themeConfig.features.gym_calendar) return null;

  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const [weekClasses, myBookings] = await Promise.all([
    getWeekSchedule(monday.toISOString(), sunday.toISOString()),
    getMyBookings(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Calendario</h1>
        <p className="text-muted-foreground">Clases disponibles y tus reservas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <WeekView classes={weekClasses} myBookings={myBookings} />
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mis reservas</CardTitle>
            </CardHeader>
            <CardContent>
              <BookingList bookings={myBookings} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
