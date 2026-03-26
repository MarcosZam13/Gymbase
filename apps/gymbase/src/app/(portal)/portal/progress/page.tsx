// page.tsx — Dashboard de progreso del miembro con gráficas y fotos

import { Card, CardContent, CardHeader, CardTitle } from "@core/components/ui/card";
import { getProgressChartData, getMySnapshots, getMyProgressPhotos } from "@/actions/progress.actions";
import { ProgressChart } from "@/components/gym/progress/ProgressChart";
import { ProgressSummaryCard } from "@/components/gym/progress/ProgressSummaryCard";
import { ProgressPhotos } from "@/components/gym/progress/ProgressPhotos";
import { themeConfig } from "@/lib/theme";

export default async function PortalProgressPage(): Promise<React.ReactNode> {
  if (!themeConfig.features.gym_progress) return null;

  const [chartData, snapshots, photos] = await Promise.all([
    getProgressChartData(30),
    getMySnapshots(30),
    getMyProgressPhotos(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mi Progreso</h1>
        <p className="text-muted-foreground">Seguimiento de tus métricas y avance</p>
      </div>

      <ProgressSummaryCard snapshots={snapshots} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolución</CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressChart data={chartData} />
        </CardContent>
      </Card>

      <ProgressPhotos photos={photos} />
    </div>
  );
}
