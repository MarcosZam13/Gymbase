// page.tsx — Página de rutina activa del miembro

import { Card, CardContent } from "@core/components/ui/card";
import { getMyRoutine, getRoutineById } from "@/actions/routine.actions";
import { MyRoutineView } from "@/components/gym/routines/MyRoutineView";
import { themeConfig } from "@/lib/theme";

export default async function PortalRoutinesPage(): Promise<React.ReactNode> {
  if (!themeConfig.features.gym_routines) return null;

  const memberRoutine = await getMyRoutine();

  if (!memberRoutine) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mi Rutina</h1>
          <p className="text-muted-foreground">Tu rutina de entrenamiento asignada</p>
        </div>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Aún no tienes una rutina asignada. Contacta a tu entrenador.
          </CardContent>
        </Card>
      </div>
    );
  }

  const routineDetail = await getRoutineById(memberRoutine.routine_id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mi Rutina</h1>
        <p className="text-muted-foreground">Tu rutina de entrenamiento asignada</p>
      </div>
      <MyRoutineView memberRoutine={memberRoutine} routineDetail={routineDetail} />
    </div>
  );
}
