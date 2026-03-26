// page.tsx — Listado de miembros con estado de membresía y búsqueda en tiempo real

import { getMembers } from "@core/actions/admin.actions";
import { MembersClient } from "./MembersClient";

export default async function MembersPage(): Promise<React.ReactNode> {
  const members = await getMembers();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Miembros</h1>
        <p className="text-muted-foreground text-sm">
          Gestiona los miembros registrados y su estado de membresía.
        </p>
      </div>

      <MembersClient members={members} />
    </div>
  );
}
