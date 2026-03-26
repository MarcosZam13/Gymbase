// WeekView.tsx — Vista semanal de clases programadas

import { Card, CardContent, CardHeader, CardTitle } from "@core/components/ui/card";
import { ClassCard } from "./ClassCard";
import type { ScheduledClass, ClassBooking } from "@/types/gym-calendar";

interface WeekViewProps {
  classes: ScheduledClass[];
  myBookings: ClassBooking[];
}

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function WeekView({ classes, myBookings }: WeekViewProps): React.ReactNode {
  // Agrupar clases por día de la semana
  const grouped = new Map<string, ScheduledClass[]>();
  for (const cls of classes) {
    const dateKey = new Date(cls.starts_at).toISOString().split("T")[0];
    if (!grouped.has(dateKey)) grouped.set(dateKey, []);
    grouped.get(dateKey)!.push(cls);
  }

  const sortedDays = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));

  if (sortedDays.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No hay clases programadas esta semana.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sortedDays.map(([dateKey, dayClasses]) => {
        const date = new Date(dateKey + "T12:00:00");
        const dayName = DAY_NAMES[date.getDay()];
        const dateLabel = date.toLocaleDateString("es-CR", { day: "numeric", month: "short" });

        return (
          <Card key={dateKey}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {dayName} {dateLabel}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {dayClasses.map((cls) => {
                const booking = myBookings.find((b) => b.class_id === cls.id);
                return <ClassCard key={cls.id} scheduledClass={cls} myBooking={booking} />;
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
