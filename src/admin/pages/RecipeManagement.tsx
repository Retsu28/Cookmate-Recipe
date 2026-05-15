import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Edit3, Plus, Star, Trash2, Eye, EyeOff, Search, Filter, Loader2, X } from 'lucide-react';
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
  serving_size: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  sodium_mg: number | null;
  fiber_g: number | null;
  tags: string[] | null;
  normalized_ingredients: string[] | null;
  image_url: string | null;
  video_filename: string | null;
  instruction_timestamps: { start: number; end: number; interval?: number }[] | null;
  video_credits: string | null;
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
  title: '', description: '',
  region_or_origin: '', category: '', difficulty: 'Easy',
  prep_time_minutes: '', cook_time_minutes: '', servings: '', serving_size: '',
  calories: '', protein_g: '', carbs_g: '', fat_g: '', sodium_mg: '', fiber_g: '',
  tags: '', normalized_ingredients: '', image_url: '',
  is_featured: false, is_published: true, video_credits: '',
};

interface InstructionRow {
  text: string;
  startTime: string;
  endTime: string;
  intervalTime: string;
}

export default function RecipeManagement() {
  const [recipes, setRecipes] = useState<DbRecipe[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [diffFilter, setDiffFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
  const [initialForm, setInitialForm] = useState(emptyForm);
  const [initialIngredientRows, setInitialIngredientRows] = useState<IngredientRow[]>([emptyIngredientRow()]);
  const [initialInstructionRows, setInitialInstructionRows] = useState<InstructionRow[]>([{ text: '', startTime: '', endTime: '', intervalTime: '' }]);
  const [initialVideoFilename, setInitialVideoFilename] = useState<string | null>(null);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '20');
      if (search) params.set('search', search);
      if (catFilter) params.set('category', catFilter);
      if (diffFilter) params.set('difficulty', diffFilter);
      const data = await api.get<{ recipes: DbRecipe[]; total: number }>(`/api/recipes?${params}`);
      // Sort: featured first, then by created_at (newest first)
      const sortedRecipes = data.recipes.sort((a, b) => {
        if (a.is_featured === b.is_featured) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return a.is_featured ? -1 : 1;
      });
      setRecipes(sortedRecipes);
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
    setInitialInstructionRows([{ text: '', startTime: '', endTime: '', intervalTime: '' }]);
    setInitialVideoFilename(null);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const openEdit = async (r: DbRecipe) => {
    setEditingId(r.id);
    setInitialForm({
      title: r.title,
      description: r.description || '',
      region_or_origin: r.region_or_origin || '',
      category: r.category || '',
      difficulty: r.difficulty || 'Easy',
      prep_time_minutes: r.prep_time_minutes?.toString() || '',
      cook_time_minutes: r.cook_time_minutes?.toString() || '',
      servings: r.servings?.toString() || '',
      serving_size: r.serving_size || '',
      calories: r.calories?.toString() || '',
      protein_g: r.protein_g?.toString() || '',
      carbs_g: r.carbs_g?.toString() || '',
      fat_g: r.fat_g?.toString() || '',
      sodium_mg: r.sodium_mg?.toString() || '',
      fiber_g: r.fiber_g?.toString() || '',
      tags: Array.isArray(r.tags) ? r.tags.join('; ') : '',
      normalized_ingredients: Array.isArray(r.normalized_ingredients) ? r.normalized_ingredients.join('; ') : '',
      image_url: r.image_url || '',
      is_featured: r.is_featured,
      is_published: r.is_published,
      video_credits: r.video_credits || '',
    });
    
    // Set video filename
    setInitialVideoFilename(r.video_filename || null);
    
    // Build instruction rows with timestamps
    const instructions = r.instructions || [];
    const timestamps = r.instruction_timestamps || [];
    const instRows: InstructionRow[] = instructions.map((text, idx) => ({
      text,
      startTime: timestamps[idx]?.start?.toString() || '',
      endTime: timestamps[idx]?.end?.toString() || '',
      intervalTime: timestamps[idx]?.interval?.toString() || '',
    }));
    setInitialInstructionRows(instRows.length > 0 ? instRows : [{ text: '', startTime: '', endTime: '', intervalTime: '' }]);
    
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

  const handleSaveRecipe = useCallback(async (formData: FormData) => {
    try {
      if (editingId) {
        await api.putFormData(`/api/recipes/${editingId}`, formData);
        toast.success('Recipe updated.');
      } else {
        await api.postFormData('/api/recipes', formData);
        toast.success('Recipe created.');
      }
      setShowForm(false);
      setInitialVideoFilename(null);
      fetchRecipes();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save recipe.');
      throw err;
    }
  }, [editingId, fetchRecipes]);

  const handleDelete = useCallback((id: number, title: string) => {
    setDeleteTarget({ id, title });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    const { id, title } = deleteTarget;
    setDeleteTarget(null);
    try {
      await api.delete(`/api/recipes/${id}`);
      toast.success(`"${title}" deleted.`);
      fetchRecipes();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete.');
    }
  }, [deleteTarget, fetchRecipes]);

  const handleToggleFeatured = useCallback(async (id: number) => {
    // Check if already at featured limit (8 max)
    const featuredCount = recipes.filter(r => r.is_featured).length;
    const recipe = recipes.find(r => r.id === id);
    const isCurrentlyFeatured = recipe?.is_featured ?? false;
    
    // Only check limit when trying to feature (not when unfeaturing)
    if (!isCurrentlyFeatured && featuredCount >= 15) {
      toast.error('Maximum 15 featured recipes allowed. Unfeature another recipe first.');
      return;
    }
    
    try {
      const data = await api.patch<{ recipe: { is_featured: boolean } }>(`/api/recipes/${id}/featured`);
      toast.success(data.recipe.is_featured ? 'Marked as featured.' : 'Removed from featured.');
      fetchRecipes();
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle featured.');
    }
  }, [recipes, fetchRecipes]);

  const handleTogglePublished = useCallback(async (id: number) => {
    try {
      const data = await api.patch<{ recipe: { is_published: boolean } }>(`/api/recipes/${id}/published`);
      toast.success(data.recipe.is_published ? 'Recipe published.' : 'Recipe unpublished.');
      fetchRecipes();
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle published.');
    }
  }, [fetchRecipes]);

  const columns: AdminTableColumn<DbRecipe>[] = useMemo(() => [
    {
      header: 'Recipe name',
      render: (recipe) => (
        <div className="flex items-center gap-3">
          {recipe.image_url ? (
            <img 
              src={recipe.image_url} 
              alt="" 
              loading="lazy"
              className="h-10 w-10 rounded-lg object-cover shrink-0" 
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-orange-50 shrink-0" />
          )}
          <div className="cursor-pointer hover:underline" onClick={() => openEdit(recipe)}>
            <p className="font-extrabold text-stone-900 hover:text-orange-600">{recipe.title}</p>
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
            className={recipe.is_featured ? "rounded-full bg-amber-100 text-amber-500 hover:bg-amber-200" : "rounded-full text-stone-400 hover:bg-orange-50 hover:text-orange-600"}
            aria-label={`Toggle featured for ${recipe.title}`}
            onClick={() => handleToggleFeatured(recipe.id)}
          >
            <Star size={14} fill={recipe.is_featured ? "currentColor" : "none"} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full text-stone-500 hover:bg-orange-50"
            aria-label={`Toggle published for ${recipe.title}`}
            onClick={() => handleTogglePublished(recipe.id)}
          >
            {recipe.is_published ? <Eye size={14} /> : <EyeOff size={14} />}
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
  ], []); // eslint-disable-line react-hooks/exhaustive-deps

  const renderForm = useCallback(() => (
    <RecipeForm
      formRef={formRef}
      initialForm={initialForm}
      initialIngredientRows={initialIngredientRows}
      initialInstructionRows={initialInstructionRows}
      initialVideoFilename={initialVideoFilename}
      isEdit={!!editingId}
      onSave={handleSaveRecipe}
      onCancel={() => { setShowForm(false); setEditingId(null); }}
    />
  ), [initialForm, initialIngredientRows, initialInstructionRows, initialVideoFilename, editingId, handleSaveRecipe]);

  return (
    <div>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete recipe?"
        description={`"${deleteTarget?.title ?? ''}" will be permanently removed from the database. This cannot be undone.`}
        confirmLabel="Delete recipe"
        tone="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      <AdminPageHeader
        title="Recipe Management"
        description={`Manage ${total} CookMate recipes. All actions are connected to the database.`}
        actions={
          <div className="flex gap-2">
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
            emptyMessage="No recipes found. Add a recipe."
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
