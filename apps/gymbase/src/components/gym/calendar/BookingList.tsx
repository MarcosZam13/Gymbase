// BookingList.tsx — Lista de reservas del miembro

"use client";

import { useState } from "react";
import { Calendar, Clock, X, Loader2 } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Card, CardContent } from "@core/components/ui/card";
import { cancelMyBooking } from "@/actions/calendar.actions";
import type { ClassBooking } from "@/types/gym-calendar";

interface BookingListProps {
  bookings: ClassBooking[];
}

export function BookingList({ bookings }: BookingListProps): React.ReactNode {
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  async function handleCancel(bookingId: string): Promise<void> {
    setCancellingId(bookingId);
    await cancelMyBooking(bookingId);
    setCancellingId(null);
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No tienes reservas activas.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {bookings.map((booking) => {
        const cls = booking.scheduled_class;
        if (!cls) return null;
        const date = new Date(cls.starts_at).toLocaleDateString("es-CR", { weekday: "short", day: "numeric", month: "short" });
        const time = new Date(cls.starts_at).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" });
        const isPast = new Date(cls.starts_at) < new Date();

        return (
          <Card key={booking.id} className={isPast ? "opacity-50" : ""}>
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{cls.title}</p>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{date}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{time}</span>
                </div>
              </div>
              {!isPast && (
                <Button size="sm" variant="ghost" onClick={() => handleCancel(booking.id)} disabled={cancellingId === booking.id}>
                  {cancellingId === booking.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 text-red-500" />}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
