import { useState, useEffect, useCallback } from 'react';
import { Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdminSectionCard } from '../components/AdminSectionCard';
import { AdminTable, type AdminTableColumn } from '../components/AdminTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import api from '@/services/api';

interface Ingredient {
  id: number;
  name: string;
  category: string | null;
  image_url: string | null;
  used_in_recipes: number;
}

interface IngredientForm {
  name: string;
  category: string;
  image_url: string;
}

const emptyForm: IngredientForm = { name: '', category: '', image_url: '' };

export default function IngredientManagement() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<IngredientForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const fetchIngredients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ ingredients: Ingredient[] }>('/api/ingredients');
      setIngredients(data.ingredients || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load ingredients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchIngredients(); }, [fetchIngredients]);

  const filtered = ingredients.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (ingredient: Ingredient) => {
    setEditingId(ingredient.id);
    setForm({ name: ingredient.name, category: ingredient.category || '', image_url: ingredient.image_url || '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required.'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/api/ingredients/${editingId}`, form);
        toast.success('Ingredient updated.');
      } else {
        await api.post('/api/ingredients', form);
        toast.success('Ingredient created.');
      }
      setShowForm(false);
      fetchIngredients();
    } catch (err: any) {
      toast.error(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;
    setDeleteTarget(null);
    try {
      await api.delete(`/api/ingredients/${id}`);
      toast.success(`"${name}" deleted.`);
      setIngredients((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      toast.error(err.message || 'Delete failed.');
    }
  }, [deleteTarget]);

  const columns: AdminTableColumn<Ingredient>[] = [
    {
      header: 'Ingredient',
      render: (i) => (
        <div>
          <p className="font-extrabold text-stone-900">{i.name}</p>
          <p className="text-xs font-medium text-stone-400">ID #{i.id}</p>
        </div>
      ),
    },
    { header: 'Used in recipes', render: (i) => <span className="font-semibold text-stone-600">{i.used_in_recipes} recipes</span> },
    {
      header: 'Actions',
      render: (i) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => openEdit(i)}>
            <Pencil size={13} /> Edit
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full text-red-500 hover:text-red-600" onClick={() => setDeleteTarget({ id: i.id, name: i.name })}>
            <Trash2 size={13} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete ingredient?"
        description={`"${deleteTarget?.name ?? ''}" will be permanently removed. Recipes using it will lose this ingredient link.`}
        confirmLabel="Delete ingredient"
        tone="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      <AdminPageHeader
        title="Ingredient Management"
        description={`Manage ${ingredients.length} ingredients — names, categories, images, and recipe usage.`}
        actions={
          <Button className="rounded-full bg-orange-500 px-5 font-bold text-white hover:bg-orange-600" onClick={openCreate}>
            <Plus size={16} /> Add ingredient
          </Button>
        }
      />

      {/* Inline form */}
      {showForm && (
        <div className="mb-6 rounded-[2rem] border border-orange-100 bg-white p-6 shadow-lg shadow-stone-200/40">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-stone-900">{editingId ? 'Edit Ingredient' : 'New Ingredient'}</h3>
            <button onClick={() => setShowForm(false)} className="rounded-full p-1 text-stone-400 hover:text-stone-600"><X size={18} /></button>
          </div>
          <div className="grid gap-4 sm:grid-cols-1">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-stone-500">Name *</label>
              <input
                type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                placeholder="e.g. Garlic"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Button className="rounded-full bg-orange-500 px-6 font-bold text-white hover:bg-orange-600" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editingId ? 'Save changes' : 'Create'}
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <AdminSectionCard title="Ingredient Catalog" description="Live data from the PostgreSQL ingredients table.">
        {/* Search */}
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or category..."
            className="w-full rounded-full border border-stone-200 bg-stone-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"><X size={14} /></button>}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-orange-500" /></div>
        ) : (
          <AdminTable data={filtered} columns={columns} getRowKey={(i) => i.id} emptyMessage="No ingredients found." />
        )}
      </AdminSectionCard>
    </div>
  );
}
