import { useState, useEffect, memo } from 'react';
import { motion, Variants } from 'motion/react';
import { Plus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface IngredientRow {
  name: string;
}

const emptyIngredientRow = (): IngredientRow => ({ name: '' });

interface RecipeFormProps {
  initialForm: any;
  initialIngredientRows: IngredientRow[];
  onSave: (form: any, ingredientRows: IngredientRow[]) => Promise<void>;
  onCancel: () => void;
  isEdit: boolean;
  formRef?: React.RefObject<HTMLDivElement>;
}

const formContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.02 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 5 },
  visible: { opacity: 1, y: 0, transition: { type: 'tween', duration: 0.2, ease: 'easeOut' } },
};

function RecipeFormBase({ initialForm, initialIngredientRows, onSave, onCancel, isEdit, formRef }: RecipeFormProps) {
  const [form, setForm] = useState(initialForm);
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>(initialIngredientRows);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initialForm);
    setIngredientRows(initialIngredientRows);
  }, [initialForm, initialIngredientRows]);

  const updateIngredientRow = (index: number, field: keyof IngredientRow, value: string) => {
    setIngredientRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addIngredientRow = () => setIngredientRows((prev) => [...prev, emptyIngredientRow()]);

  const removeIngredientRow = (index: number) => {
    setIngredientRows((prev) => (prev.length <= 1 ? [emptyIngredientRow()] : prev.filter((_, i) => i !== index)));
  };

  const handleSaveClick = async () => {
    if (!form.title.trim()) {
      toast.error('Recipe title is required.');
      return;
    }
    setSaving(true);
    try {
      await onSave(form, ingredientRows);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      ref={formRef}
      variants={formContainerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <motion.div variants={itemVariants} className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">Title *</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
          />
        </motion.div>

        <motion.div variants={itemVariants} className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">Region / Origin</label>
          <input
            value={form.region_or_origin}
            onChange={(e) => setForm({ ...form, region_or_origin: e.target.value })}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">Category</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
          >
            <option value="">Select category</option>
            {['Main Dish', 'Side Dish', 'Dessert', 'Soup', 'Appetizer', 'Beverage', 'Snack', 'Breakfast', 'Condiment'].map(
              (c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              )
            )}
          </select>
        </motion.div>

        <motion.div variants={itemVariants}>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">Difficulty</label>
          <select
            value={form.difficulty}
            onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
          >
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </motion.div>

        <motion.div variants={itemVariants}>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">Image URL</label>
          <input
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
            placeholder="https://..."
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">Prep Time (min)</label>
          <input
            type="number"
            value={form.prep_time_minutes}
            onChange={(e) => setForm({ ...form, prep_time_minutes: e.target.value })}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">Cook Time (min)</label>
          <input
            type="number"
            value={form.cook_time_minutes}
            onChange={(e) => setForm({ ...form, cook_time_minutes: e.target.value })}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">Servings</label>
          <input
            type="number"
            value={form.servings}
            onChange={(e) => setForm({ ...form, servings: e.target.value })}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">Calories</label>
          <input
            type="number"
            value={form.calories}
            onChange={(e) => setForm({ ...form, calories: e.target.value })}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
          />
        </motion.div>

        <motion.div variants={itemVariants} className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">
            Tags (semicolon-separated)
          </label>
          <input
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
            placeholder="savory; braised; rice meal"
          />
        </motion.div>

        <motion.div variants={itemVariants} className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">Ingredients</label>
          <div className="space-y-2">
            {ingredientRows.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  value={row.name}
                  onChange={(e) => updateIngredientRow(idx, 'name', e.target.value)}
                  placeholder="Ingredient name"
                  className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-300"
                />
                <button
                  type="button"
                  onClick={() => removeIngredientRow(idx)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-stone-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addIngredientRow}
            className="mt-2 flex items-center gap-1 text-xs font-bold text-orange-500 hover:text-orange-600"
          >
            <Plus size={14} /> Add Ingredient
          </button>
        </motion.div>

        <motion.div variants={itemVariants} className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">
            Extra Normalized Ingredients (optional, semicolon-separated)
          </label>
          <input
            value={form.normalized_ingredients}
            onChange={(e) => setForm({ ...form, normalized_ingredients: e.target.value })}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
            placeholder="additional keywords; alternate names"
          />
        </motion.div>

        <motion.div variants={itemVariants} className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">
            Instructions (one step per line)
          </label>
          <textarea
            value={form.instructions}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            rows={4}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
            placeholder="Step 1...\nStep 2..."
          />
        </motion.div>

        <motion.div variants={itemVariants} className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm font-bold text-stone-700">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
              className="accent-orange-500"
            />{' '}
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-stone-700">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
              className="accent-orange-500"
            />{' '}
            Published
          </label>
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className="mt-4 flex justify-end gap-2">
        <Button variant="outline" className="rounded-full bg-white" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          className="rounded-full bg-orange-500 px-6 text-white hover:bg-orange-600"
          onClick={handleSaveClick}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 size={14} className="mr-2 animate-spin" /> Saving...
            </>
          ) : isEdit ? (
            'Update Recipe'
          ) : (
            'Create Recipe'
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
}

export const RecipeForm = memo(RecipeFormBase);
