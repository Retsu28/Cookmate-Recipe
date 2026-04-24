import { useState } from 'react';
import { Edit3, Plus, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdminSectionCard } from '../components/AdminSectionCard';
import { AdminTable, type AdminTableColumn } from '../components/AdminTable';
import { StatusBadge, statusToneFromLabel } from '../components/StatusBadge';
import { adminRecipes, type AdminRecipe } from '../data/adminMockData';

export default function RecipeManagement() {
  const [recipes, setRecipes] = useState<AdminRecipe[]>(adminRecipes);

  const toggleFeatured = (id: number) => {
    setRecipes((current) => current.map((recipe) => (recipe.id === id ? { ...recipe, featured: !recipe.featured } : recipe)));
  };

  const archiveRecipe = (id: number) => {
    setRecipes((current) => current.map((recipe) => (recipe.id === id ? { ...recipe, status: 'Archived', featured: false } : recipe)));
  };

  const columns: AdminTableColumn<AdminRecipe>[] = [
    {
      header: 'Recipe name',
      render: (recipe) => (
        <div>
          <p className="font-extrabold text-stone-900">{recipe.name}</p>
          <p className="text-xs font-medium text-stone-400">Recipe #{recipe.id}</p>
        </div>
      ),
    },
    { header: 'Category', render: (recipe) => <span className="font-bold text-stone-700">{recipe.category}</span> },
    { header: 'Difficulty', render: (recipe) => <StatusBadge tone={statusToneFromLabel(recipe.difficulty)}>{recipe.difficulty}</StatusBadge> },
    {
      header: 'Featured',
      render: (recipe) => (
        <StatusBadge tone={recipe.featured ? 'success' : 'neutral'}>{recipe.featured ? 'Featured' : 'Standard'}</StatusBadge>
      ),
    },
    { header: 'Views', render: (recipe) => recipe.views.toLocaleString() },
    { header: 'Rating', render: (recipe) => <span className="font-bold text-stone-900">{recipe.rating.toFixed(1)}</span> },
    { header: 'Status', render: (recipe) => <StatusBadge tone={statusToneFromLabel(recipe.status)}>{recipe.status}</StatusBadge> },
    {
      header: 'Actions',
      render: (recipe) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" className="rounded-full text-stone-500" aria-label={`Edit ${recipe.name}`}>
            <Edit3 size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full text-amber-600 hover:bg-amber-50"
            aria-label={`Toggle featured for ${recipe.name}`}
            onClick={() => toggleFeatured(recipe.id)}
          >
            <Star size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full text-red-500 hover:bg-red-50"
            aria-label={`Archive ${recipe.name}`}
            onClick={() => archiveRecipe(recipe.id)}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Recipe Management"
        description="Add, edit, feature, and monitor CookMate recipes. Destructive actions are local mock actions until backend admin APIs exist."
        actions={
          <Button className="rounded-full bg-orange-500 px-5 font-bold text-white hover:bg-orange-600">
            <Plus size={16} />
            Add recipe
          </Button>
        }
      />

      <AdminSectionCard
        title="Recipe Library"
        description="Safe admin preview table using demo recipe records."
      >
        <AdminTable data={recipes} columns={columns} getRowKey={(recipe) => recipe.id} />
      </AdminSectionCard>
    </div>
  );
}
