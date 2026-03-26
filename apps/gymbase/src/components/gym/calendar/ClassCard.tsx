// ClassCard.tsx — Tarjeta de clase programada con botón de reservar/cancelar

"use client";

import { useState } from "react";
import { Clock, MapPin, Users, Loader2 } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Card, CardContent } from "@core/components/ui/card";
import { Badge } from "@core/components/ui/badge";
import { bookClass, cancelMyBooking } from "@/actions/calendar.actions";
import type { ScheduledClass, ClassBooking } from "@/types/gym-calendar";

interface ClassCardProps {
  scheduledClass: ScheduledClass;
  myBooking?: ClassBooking;
}

export function ClassCard({ scheduledClass, myBooking }: ClassCardProps): React.ReactNode {
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const startTime = new Date(scheduledClass.starts_at).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" });
  const endTime = new Date(scheduledClass.ends_at).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" });
  const isFull = scheduledClass.max_capacity !== null && (scheduledClass.bookings_count ?? 0) >= scheduledClass.max_capacity;

  async function handleBook(): Promise<void> {
    setIsLoading(true);
    setFeedback(null);
    const result = await bookClass({ class_id: scheduledClass.id });
    if (!result.success) {
      const msg = typeof result.error === "string" ? result.error : "Error al reservar";
      setFeedback(msg);
    }
    setIsLoading(false);
  }

  async function handleCancel(): Promise<void> {
    if (!myBooking) return;
    setIsLoading(true);
    await cancelMyBooking(myBooking.id);
    setIsLoading(false);
  }

  return (
    <Card className={scheduledClass.is_cancelled ? "opacity-50" : ""}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium text-sm">{scheduledClass.title}</h3>
            {scheduledClass.class_type && (
              <Badge variant="outline" className="text-xs mt-1" style={scheduledClass.class_type.color ? { borderColor: scheduledClass.class_type.color, color: scheduledClass.class_type.color } : {}}>
                {scheduledClass.class_type.name}
              </Badge>
            )}
          </div>
          {scheduledClass.is_cancelled && <Badge variant="destructive">Cancelada</Badge>}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{startTime} - {endTime}</span>
          {scheduledClass.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{scheduledClass.location}</span>}
          {scheduledClass.max_capacity && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {scheduledClass.bookings_count ?? 0}/{scheduledClass.max_capacity}
            </span>
          )}
        </div>
        {scheduledClass.description && <p className="text-xs text-muted-foreground">{scheduledClass.description}</p>}
        {feedback && <p className="text-xs text-red-600">{feedback}</p>}
        {!scheduledClass.is_cancelled && (
          <div className="pt-1">
            {myBooking ? (
              <Button size="sm" variant="outline" onClick={handleCancel} disabled={isLoading} className="gap-1 text-xs">
                {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                Cancelar reserva
              </Button>
            ) : (
              <Button size="sm" onClick={handleBook} disabled={isLoading || isFull} className="gap-1 text-xs">
                {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                {isFull ? "Lleno" : "Reservar"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
