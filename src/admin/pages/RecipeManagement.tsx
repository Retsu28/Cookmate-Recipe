import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Edit3, Plus, Star, Trash2, Eye, EyeOff, Upload, Search, Filter, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdminSectionCard } from '../components/AdminSectionCard';
import { AdminTable, type AdminTableColumn } from '../components/AdminTable';
import { RecipeForm } from '../components/RecipeForm';
import { StatusBadge, statusToneFromLabel } from '../components/StatusBadge';
import api from '@/services/api';

interface DbRecipe {
  id: number;
  title: string;
  description: string | null;
  instructions: string[] | null;
  category: string | null;
  difficulty: string | null;
  region_or_origin: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  servings: number | null;
  calories: number | null;
  tags: string[] | null;
  normalized_ingredients: string[] | null;
  image_url: string | null;
  is_featured: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface IngredientRow {
  name: string;
}

const emptyIngredientRow = (): IngredientRow => ({ name: '' });

const emptyForm = {
  title: '', description: '', instructions: '',
  region_or_origin: '', category: '', difficulty: 'Easy',
  prep_time_minutes: '', cook_time_minutes: '', servings: '', calories: '',
  tags: '', normalized_ingredients: '', image_url: '',
  is_featured: false, is_published: true,
};

export default function RecipeManagement() {
  const [recipes, setRecipes] = useState<DbRecipe[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [diffFilter, setDiffFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [initialForm, setInitialForm] = useState(emptyForm);
  const [initialIngredientRows, setInitialIngredientRows] = useState<IngredientRow[]>([emptyIngredientRow()]);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '200');
      if (search) params.set('search', search);
      if (catFilter) params.set('category', catFilter);
      if (diffFilter) params.set('difficulty', diffFilter);
      const data = await api.get<{ recipes: DbRecipe[]; total: number }>(`/api/recipes?${params}`);
      setRecipes(data.recipes);
      setTotal(data.total);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  }, [search, catFilter, diffFilter]);

  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchRecipes(); }, [fetchRecipes]);

  const openCreate = () => {
    setEditingId(null);
    setInitialForm(emptyForm);
    setInitialIngredientRows([emptyIngredientRow()]);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const openEdit = async (r: DbRecipe) => {
    setEditingId(r.id);
    setInitialForm({
      title: r.title,
      description: r.description || '',
      instructions: Array.isArray(r.instructions) ? r.instructions.join('\n') : '',
      region_or_origin: r.region_or_origin || '',
      category: r.category || '',
      difficulty: r.difficulty || 'Easy',
      prep_time_minutes: r.prep_time_minutes?.toString() || '',
      cook_time_minutes: r.cook_time_minutes?.toString() || '',
      servings: r.servings?.toString() || '',
      calories: r.calories?.toString() || '',
      tags: Array.isArray(r.tags) ? r.tags.join('; ') : '',
      normalized_ingredients: Array.isArray(r.normalized_ingredients) ? r.normalized_ingredients.join('; ') : '',
      image_url: r.image_url || '',
      is_featured: r.is_featured,
      is_published: r.is_published,
    });
    // Fetch relational ingredients from the join table
    try {
      const detail = await api.get<{ recipe: any }>(`/api/recipes/${r.id}`);
      const ings: any[] = detail.recipe?.ingredients || [];
      if (ings.length > 0) {
        setInitialIngredientRows(ings.map((i: any) => ({
          name: i.name || '',
        })));
      } else {
        setInitialIngredientRows([emptyIngredientRow()]);
      }
    } catch {
      setInitialIngredientRows([emptyIngredientRow()]);
    }
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSaveRecipe = useCallback(async (formData: any, ingredientRowsData: any[]) => {
    try {
      // Build ingredients array from rows (filter empty names)
      const ingredients = ingredientRowsData.filter((r) => r.name.trim()).map((r) => ({
        name: r.name.trim(),
      }));

      // Auto-generate normalized_ingredients from ingredient names
      const autoNormalized = ingredients.map((i) => i.name.toLowerCase());
      const manualNormalized = formData.normalized_ingredients.split(';').map((t: string) => t.trim().toLowerCase()).filter(Boolean);
      const mergedNormalized = [...new Set([...autoNormalized, ...manualNormalized])];

      const body = {
        ...formData,
        instructions: formData.instructions.split('\n').map((s: string) => s.trim()).filter(Boolean),
        tags: formData.tags.split(';').map((t: string) => t.trim()).filter(Boolean),
        normalized_ingredients: mergedNormalized,
        ingredients,
      };
      if (editingId) {
        await api.put(`/api/recipes/${editingId}`, body);
        toast.success('Recipe updated.');
      } else {
        await api.post('/api/recipes', body);
        toast.success('Recipe created.');
      }
      setShowForm(false);
      fetchRecipes();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save recipe.');
      throw err;
    }
  }, [editingId, fetchRecipes]);

  const handleDelete = useCallback(async (id: number, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/recipes/${id}`);
      toast.success(`"${title}" deleted.`);
      fetchRecipes();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete.');
    }
  }, [fetchRecipes]);

  const handleToggleFeatured = useCallback(async (id: number) => {
    try {
      const data = await api.patch<{ recipe: { is_featured: boolean } }>(`/api/recipes/${id}/featured`);
      toast.success(data.recipe.is_featured ? 'Marked as featured.' : 'Removed from featured.');
      fetchRecipes();
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle featured.');
    }
  }, [fetchRecipes]);

  const handleTogglePublished = useCallback(async (id: number) => {
    try {
      const data = await api.patch<{ recipe: { is_published: boolean } }>(`/api/recipes/${id}/published`);
      toast.success(data.recipe.is_published ? 'Recipe published.' : 'Recipe unpublished.');
      fetchRecipes();
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle published.');
    }
  }, [fetchRecipes]);

  const handleCsvImport = async () => {
    if (!csvText.trim()) { toast.error('Paste CSV content first.'); return; }
    setImporting(true);
    try {
      const data = await api.post<{ inserted: number; updated: number; skipped: number }>('/api/recipes/import-csv', { csvContent: csvText });
      toast.success(`Import done: ${data.inserted} inserted, ${data.updated} updated, ${data.skipped} skipped.`);
      setCsvText('');
      setShowImport(false);
      fetchRecipes();
    } catch (err: any) {
      toast.error(err.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  const columns: AdminTableColumn<DbRecipe>[] = useMemo(() => [
    {
      header: 'Recipe name',
      render: (recipe) => (
        <div className="flex items-center gap-3">
          {recipe.image_url ? (
            <img src={recipe.image_url} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-orange-50 shrink-0" />
          )}
          <div className="cursor-pointer hover:underline" onClick={() => openEdit(recipe)}>
            <p className="font-extrabold text-stone-900 transition-colors hover:text-orange-600">{recipe.title}</p>
            <p className="text-xs font-medium text-stone-400">#{recipe.id} &middot; {recipe.region_or_origin || 'No region'}</p>
          </div>
        </div>
      ),
    },
    { header: 'Category', render: (recipe) => <span className="font-bold text-stone-700">{recipe.category || '—'}</span> },
    { header: 'Difficulty', render: (recipe) => <StatusBadge tone={statusToneFromLabel(recipe.difficulty || 'Unknown')}>{recipe.difficulty || '—'}</StatusBadge> },
    {
      header: 'Featured',
      render: (recipe) => (
        <StatusBadge tone={recipe.is_featured ? 'success' : 'neutral'}>{recipe.is_featured ? 'Featured' : 'Standard'}</StatusBadge>
      ),
    },
    { header: 'Calories', render: (recipe) => recipe.calories?.toLocaleString() || '—' },
    { header: 'Servings', render: (recipe) => <span className="font-bold text-stone-900">{recipe.servings || '—'}</span> },
    { header: 'Status', render: (recipe) => <StatusBadge tone={statusToneFromLabel(recipe.is_published ? 'Published' : 'Draft')}>{recipe.is_published ? 'Published' : 'Draft'}</StatusBadge> },
    {
      header: 'Actions',
      render: (recipe) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" className="rounded-full text-stone-500 hover:bg-orange-50 hover:text-orange-600" aria-label={`Edit ${recipe.title}`} onClick={() => openEdit(recipe)}>
            <Edit3 size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full text-orange-600 hover:bg-orange-50"
            aria-label={`Toggle featured for ${recipe.title}`}
            onClick={() => handleToggleFeatured(recipe.id)}
          >
            <Star size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full text-stone-500 hover:bg-orange-50"
            aria-label={`Toggle published for ${recipe.title}`}
            onClick={() => handleTogglePublished(recipe.id)}
          >
            {recipe.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full text-orange-500 hover:bg-orange-50 hover:text-red-600"
            aria-label={`Delete ${recipe.title}`}
            onClick={() => handleDelete(recipe.id, recipe.title)}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ], [handleDelete, handleToggleFeatured, handleTogglePublished]);

  const renderForm = useCallback(() => (
    <RecipeForm
      formRef={formRef}
      initialForm={initialForm}
      initialIngredientRows={initialIngredientRows}
      isEdit={!!editingId}
      onSave={handleSaveRecipe}
      onCancel={() => { setShowForm(false); setEditingId(null); }}
    />
  ), [initialForm, initialIngredientRows, editingId, handleSaveRecipe]);

  return (
    <div>
      <AdminPageHeader
        title="Recipe Management"
        description={`Manage ${total} CookMate recipes. All actions are connected to the database.`}
        actions={
          <div className="flex gap-2">
            <Button className="rounded-full border-orange-300 text-orange-700" variant="outline" onClick={() => setShowImport(!showImport)}>
              <Upload size={16} /> Import CSV
            </Button>
            <Button className="rounded-full bg-orange-500 px-5 font-bold text-white hover:bg-orange-600" onClick={openCreate}>
              <Plus size={16} /> Add recipe
            </Button>
          </div>
        }
      />

      {/* Search & Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 shadow-sm">
          <Search size={14} className="text-stone-400" />
          <input
            type="text" placeholder="Search recipes..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
          />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 shadow-sm outline-none">
          <option value="">All categories</option>
          {['Main Dish', 'Side Dish', 'Dessert', 'Soup', 'Appetizer', 'Beverage', 'Snack', 'Breakfast', 'Condiment'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={diffFilter} onChange={e => setDiffFilter(e.target.value)} className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 shadow-sm outline-none">
          <option value="">All difficulties</option>
          {['Easy', 'Medium', 'Hard'].map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* CSV Import Panel */}
      {showImport && (
        <AdminSectionCard title="Import Recipes from CSV" description="Paste CSV content below. Must include recipe_name column.">
          <textarea value={csvText} onChange={e => setCsvText(e.target.value)} rows={8}
            className="w-full rounded-xl border border-stone-200 p-4 font-mono text-xs text-stone-700 outline-none focus:border-orange-300"
            placeholder="recipe_id,recipe_name,region_or_origin,category,ingredients,..." />
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setShowImport(false)}>Cancel</Button>
            <Button className="rounded-full bg-orange-500 text-white hover:bg-orange-600" onClick={handleCsvImport} disabled={importing}>
              {importing ? <><Loader2 size={14} className="animate-spin" /> Importing...</> : 'Import'}
            </Button>
          </div>
        </AdminSectionCard>
      )}

      <AdminSectionCard
        title="Recipe Library"
        description={`${total} recipes from PostgreSQL database.`}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12 text-stone-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : (
          <AdminTable
            data={recipes}
            columns={columns}
            getRowKey={(recipe) => recipe.id}
            emptyMessage="No recipes found. Import CSV or add a recipe."
            expandedRowId={showForm ? editingId : null}
            renderExpandedRow={(recipe) => showForm && recipe.id === editingId ? renderForm() : null}
          />
        )}
      </AdminSectionCard>

      {/* Recipe Create Form Modal - Moved to Bottom, only for new recipes */}
      {showForm && !editingId && (
        <div className="mt-8">
          <AdminSectionCard title="Add New Recipe" description="Fill in the recipe details below.">
            {renderForm()}
          </AdminSectionCard>
        </div>
      )}

    </div>
  );
}
