import { Image, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdminSectionCard } from '../components/AdminSectionCard';
import { AdminTable, type AdminTableColumn } from '../components/AdminTable';
import { StatusBadge, statusToneFromLabel } from '../components/StatusBadge';
import { adminIngredients, type AdminIngredient } from '../data/adminMockData';

export default function IngredientManagement() {
  const openIngredientEditor = (ingredient?: AdminIngredient) => {
    toast.info(ingredient ? `Ingredient editor preview for ${ingredient.name}.` : 'Ingredient creation preview is not connected to a backend yet.');
  };

  const reviewIngredientImage = (ingredient: AdminIngredient) => {
    toast.info(`Image review preview for ${ingredient.name}.`);
  };

  const columns: AdminTableColumn<AdminIngredient>[] = [
    {
      header: 'Ingredient',
      render: (ingredient) => (
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
            <Image size={18} />
          </div>
          <div>
            <p className="font-extrabold text-stone-900">{ingredient.name}</p>
            <p className="text-xs font-medium text-stone-400">Ingredient #{ingredient.id}</p>
          </div>
        </div>
      ),
    },
    { header: 'Category', render: (ingredient) => <span className="font-bold text-stone-700">{ingredient.category}</span> },
    { header: 'Used in recipes', render: (ingredient) => `${ingredient.usedInRecipes} recipes` },
    { header: 'Image status', render: (ingredient) => <StatusBadge tone={statusToneFromLabel(ingredient.imageStatus)}>{ingredient.imageStatus}</StatusBadge> },
    { header: 'Status', render: (ingredient) => <StatusBadge tone={statusToneFromLabel(ingredient.status)}>{ingredient.status}</StatusBadge> },
    {
      header: 'Actions',
      render: (ingredient) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => openIngredientEditor(ingredient)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full text-stone-500" onClick={() => reviewIngredientImage(ingredient)}>
            Review image
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Ingredient Management"
        description="Track ingredient categories, image readiness, and recipe usage counts for search and AI camera workflows."
        actions={
          <Button className="rounded-full bg-orange-500 px-5 font-bold text-white hover:bg-orange-600" onClick={() => openIngredientEditor()}>
            <Plus size={16} />
            Add ingredient
          </Button>
        }
      />

      <AdminSectionCard title="Ingredient Catalog" description="Ingredient image state is demo metadata, not an automated media pipeline yet.">
        <AdminTable data={adminIngredients} columns={columns} getRowKey={(ingredient) => ingredient.id} />
      </AdminSectionCard>
    </div>
  );
}
