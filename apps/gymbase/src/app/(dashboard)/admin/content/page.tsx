// page.tsx — Gestión de contenido del panel de administración

import { ContentClient } from "@core/app/(dashboard)/admin/content/ContentClient";
import { getAllContent } from "@core/actions/content.actions";
import { getPlans } from "@core/actions/membership.actions";
import { getCategories } from "@core/actions/category.actions";

export default async function AdminContentPage(): Promise<React.ReactNode> {
  const [content, plans, categories] = await Promise.all([
    getAllContent(),
    getPlans(),
    getCategories(),
  ]);
  return <ContentClient initialContent={content} plans={plans} categories={categories} />;
}
