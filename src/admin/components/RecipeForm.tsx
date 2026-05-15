import { useState, useEffect, memo, useRef } from 'react';
import { Plus, X, Loader2, Upload, Trash2, Play, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface IngredientRow {
  name: string;
}

interface InstructionRow {
  text: string;
  startTime: string; // in seconds
  endTime: string;   // in seconds
  intervalTime: string; // optional additional cooking time stored as seconds, input/display as MM:SS
}

const emptyIngredientRow = (): IngredientRow => ({ name: '' });
const emptyInstructionRow = (): InstructionRow => ({ text: '', startTime: '', endTime: '', intervalTime: '' });

interface RecipeFormProps {
  initialForm: any;
  initialIngredientRows: IngredientRow[];
  initialInstructionRows?: InstructionRow[];
  initialVideoFilename?: string | null;
  onSave: (formData: FormData) => Promise<void>;
  onCancel: () => void;
  isEdit: boolean;
  formRef?: React.RefObject<HTMLDivElement | null>;
}

function formatTimeInput(seconds: string): string {
  if (!seconds) return '';
  const secs = parseInt(seconds, 10);
  if (isNaN(secs)) return seconds;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function parseTimeInput(value: string): string {
  if (!value) return '';
  // Handle MM:SS format
  if (value.includes(':')) {
    const [m, s] = value.split(':').map(v => parseInt(v.trim(), 10) || 0);
    return String(m * 60 + s);
  }
  return value.replace(/\D/g, '');
}

function RecipeFormBase({ initialForm, initialIngredientRows, initialInstructionRows, initialVideoFilename, onSave, onCancel, isEdit, formRef }: RecipeFormProps) {
  const [form, setForm] = useState(initialForm);
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>(initialIngredientRows);
  const [instructionRows, setInstructionRows] = useState<InstructionRow[]>(
    initialInstructionRows && initialInstructionRows.length > 0
      ? initialInstructionRows
      : [emptyInstructionRow()]
  );
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [existingVideo, setExistingVideo] = useState<string | null>(initialVideoFilename || null);
  const [removeExistingVideo, setRemoveExistingVideo] = useState(false);
  const [saving, setSaving] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(initialForm);
    setIngredientRows(initialIngredientRows);
    setInstructionRows(
      initialInstructionRows && initialInstructionRows.length > 0
        ? initialInstructionRows
        : [emptyInstructionRow()]
    );
    setExistingVideo(initialVideoFilename || null);
    setRemoveExistingVideo(false);
    setVideoFile(null);
    setVideoPreviewUrl(null);
  }, [initialForm, initialIngredientRows, initialInstructionRows, initialVideoFilename]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    };
  }, [videoPreviewUrl]);

  const updateIngredientRow = (index: number, field: keyof IngredientRow, value: string) => {
    setIngredientRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addIngredientRow = () => setIngredientRows((prev) => [...prev, emptyIngredientRow()]);

  const removeIngredientRow = (index: number) => {
    setIngredientRows((prev) => (prev.length <= 1 ? [emptyIngredientRow()] : prev.filter((_, i) => i !== index)));
  };

  const updateInstructionRow = (index: number, field: keyof InstructionRow, value: string) => {
    setInstructionRows((prev) => prev.map((row, i) => {
      if (i !== index) return row;
      if (field === 'startTime' || field === 'endTime' || field === 'intervalTime') {
        return { ...row, [field]: parseTimeInput(value) };
      }
      return { ...row, [field]: value };
    }));
  };

  const addInstructionRow = () => setInstructionRows((prev) => [...prev, emptyInstructionRow()]);

  const removeInstructionRow = (index: number) => {
    setInstructionRows((prev) => (prev.length <= 1 ? [emptyInstructionRow()] : prev.filter((_, i) => i !== index)));
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'video/mp4' && !file.name.endsWith('.mp4')) {
        toast.error('Only MP4 video files are allowed');
        return;
      }
      if (file.size > 30 * 1024 * 1024) {
        toast.error('Video file size must be less than 30MB');
        return;
      }
      setVideoFile(file);
      setVideoPreviewUrl(URL.createObjectURL(file));
      setRemoveExistingVideo(true); // Mark existing for replacement
    }
  };

  const handleRemoveVideo = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setRemoveExistingVideo(true);
    setExistingVideo(null);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleSaveClick = async () => {
    if (!form.title.trim()) {
      toast.error('Recipe title is required.');
      return;
    }

    // Validate instruction rows have text
    const validInstructions = instructionRows.filter(r => r.text.trim());
    if (validInstructions.length === 0) {
      toast.error('At least one instruction step is required.');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      
      // Basic fields
      formData.append('title', form.title.trim());
      formData.append('description', form.description || '');
      formData.append('prep_time_minutes', form.prep_time_minutes || '');
      formData.append('cook_time_minutes', form.cook_time_minutes || '');
      formData.append('servings', form.servings || '');
      formData.append('serving_size', form.serving_size || '');
      formData.append('calories', form.calories || '');
      formData.append('protein_g', form.protein_g || '');
      formData.append('carbs_g', form.carbs_g || '');
      formData.append('fat_g', form.fat_g || '');
      formData.append('sodium_mg', form.sodium_mg || '');
      formData.append('fiber_g', form.fiber_g || '');
      formData.append('difficulty', form.difficulty || 'Easy');
      formData.append('region_or_origin', form.region_or_origin || '');
      formData.append('category', form.category || '');
      formData.append('tags', form.tags || '');
      formData.append('normalized_ingredients', form.normalized_ingredients || '');
      formData.append('image_url', form.image_url || '');
      formData.append('is_featured', form.is_featured ? 'true' : 'false');
      formData.append('is_published', form.is_published ? 'true' : 'false');

      // Instructions array
      const instructionsArray = validInstructions.map(r => r.text.trim());
      formData.append('instructions', JSON.stringify(instructionsArray));

      // Instruction timestamps
      const timestampsArray = validInstructions.map(r => ({
        start: parseInt(r.startTime, 10) || 0,
        end: parseInt(r.endTime, 10) || 0,
        interval: parseInt(r.intervalTime, 10) || 0
      }));
      formData.append('instruction_timestamps', JSON.stringify(timestampsArray));

      // Ingredients
      const ingredients = ingredientRows.filter(r => r.name.trim()).map(r => ({ name: r.name.trim() }));
      formData.append('ingredients', JSON.stringify(ingredients));

      // Video file
      if (videoFile) {
        formData.append('video', videoFile);
      }
      if (removeExistingVideo && !videoFile) {
        formData.append('remove_video', 'true');
      }

      // Video credits
      formData.append('video_credits', form.video_credits || '');

      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      ref={formRef}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">Title *</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">Region / Origin</label>
          <input
            value={form.region_or_origin}
            onChange={(e) => setForm({ ...form, region_or_origin: e.target.value })}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
          />
        </div>

        <div>
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
        </div>

        <div>
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
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">Image URL</label>
          <input
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">Prep Time (min)</label>
          <input
            type="number"
            value={form.prep_time_minutes}
            onChange={(e) => setForm({ ...form, prep_time_minutes: e.target.value })}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">Cook Time (min)</label>
          <input
            type="number"
            value={form.cook_time_minutes}
            onChange={(e) => setForm({ ...form, cook_time_minutes: e.target.value })}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">Servings</label>
          <input
            type="number"
            value={form.servings}
            onChange={(e) => setForm({ ...form, servings: e.target.value })}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">Calories</label>
          <input
            type="number"
            value={form.calories}
            onChange={(e) => setForm({ ...form, calories: e.target.value })}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
          />
        </div>

        {/* Nutrition Section */}
        <div className="sm:col-span-2">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-400">Serving Size</label>
          <input
            type="text"
            value={form.serving_size}
            onChange={(e) => setForm({ ...form, serving_size: e.target.value })}
            placeholder="e.g., 1 cup (240g)"
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-400">
            Nutrition per Serving (optional)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-400">Protein (g)</label>
              <input
                type="number"
                step="0.1"
                value={form.protein_g}
                onChange={(e) => setForm({ ...form, protein_g: e.target.value })}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-400">Carbs (g)</label>
              <input
                type="number"
                step="0.1"
                value={form.carbs_g}
                onChange={(e) => setForm({ ...form, carbs_g: e.target.value })}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-400">Fat (g)</label>
              <input
                type="number"
                step="0.1"
                value={form.fat_g}
                onChange={(e) => setForm({ ...form, fat_g: e.target.value })}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-400">Sodium (mg)</label>
              <input
                type="number"
                value={form.sodium_mg}
                onChange={(e) => setForm({ ...form, sodium_mg: e.target.value })}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-400">Fiber (g)</label>
              <input
                type="number"
                step="0.1"
                value={form.fiber_g}
                onChange={(e) => setForm({ ...form, fiber_g: e.target.value })}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-300"
              />
            </div>
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">
            Tags (semicolon-separated)
          </label>
          <input
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
            placeholder="savory; braised; rice meal"
          />
        </div>

        <div className="sm:col-span-2">
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
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">
            Extra Normalized Ingredients (optional, semicolon-separated)
          </label>
          <input
            value={form.normalized_ingredients}
            onChange={(e) => setForm({ ...form, normalized_ingredients: e.target.value })}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
            placeholder="additional keywords; alternate names"
          />
        </div>

        {/* Video Upload */}
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">
            Recipe Video (MP4, max 30MB)
          </label>
          
          {/* Existing or Preview Video */}
          {(existingVideo && !removeExistingVideo) || videoPreviewUrl ? (
            <div className="mb-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Play size={20} className="text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-700 truncate">
                    {videoFile ? videoFile.name : existingVideo}
                  </p>
                  <p className="text-xs text-stone-400">
                    {videoFile ? `${(videoFile.size / 1024 / 1024).toFixed(2)} MB` : 'Uploaded video'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveVideo}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-stone-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {videoPreviewUrl && (
                <video
                  src={videoPreviewUrl}
                  controls
                  className="w-full max-h-48 rounded-lg"
                />
              )}
            </div>
          ) : null}
          
          {/* Upload Button */}
          <div className="flex items-center gap-3">
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,.mp4"
              onChange={handleVideoChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-stone-200 bg-white text-sm font-medium text-stone-700 hover:border-orange-300 hover:text-orange-600 transition-colors"
            >
              <Upload size={16} />
              {existingVideo || videoFile ? 'Replace Video' : 'Upload MP4 Video'}
            </button>
          </div>

          {/* YouTube / Video Credits */}
          <div className="mt-3 space-y-2">
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">
              Video Credits
            </label>
            <input
              type="text"
              value={(() => { const p = (form.video_credits || '').split('|'); return p[0] || ''; })()}
              onChange={(e) => {
                const parts = (form.video_credits || '').split('|');
                const url = parts[1] || '';
                setForm({ ...form, video_credits: `${e.target.value}|${url}` });
              }}
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
              placeholder="Video author name (e.g. Panlasang Pinoy)"
            />
            <input
              type="text"
              value={(() => { const p = (form.video_credits || '').split('|'); return p[1] || ''; })()}
              onChange={(e) => {
                const parts = (form.video_credits || '').split('|');
                const name = parts[0] || '';
                setForm({ ...form, video_credits: `${name}|${e.target.value}` });
              }}
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
              placeholder="YouTube / source URL (e.g. https://youtu.be/...)"
            />
          </div>
        </div>

        {/* Per-line Instructions with Timestamps */}
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">
            Instructions with Video Timestamps
          </label>
          <p className="text-xs text-stone-400 mb-2">
            Add each step with optional start/end times (MM:SS format, e.g. 0:30, 2:45). 
            Interval = additional cooking time after video ends in MM:SS format (e.g. 5:00 = 5 minutes).
          </p>
          <div className="space-y-2">
            {instructionRows.map((row, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold mt-2 shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <input
                    value={row.text}
                    onChange={(e) => updateInstructionRow(idx, 'text', e.target.value)}
                    placeholder="Step description"
                    className="sm:col-span-6 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-300"
                  />
                  <div className="sm:col-span-2">
                    <label className="text-xs text-stone-400 mb-1 block">Start</label>
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-stone-400 shrink-0" />
                      <input
                        value={formatTimeInput(row.startTime)}
                        onChange={(e) => updateInstructionRow(idx, 'startTime', e.target.value)}
                        placeholder="0:00"
                        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-300"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-stone-400 mb-1 block">End</label>
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-stone-400 shrink-0" />
                      <input
                        value={formatTimeInput(row.endTime)}
                        onChange={(e) => updateInstructionRow(idx, 'endTime', e.target.value)}
                        placeholder="0:00"
                        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-300"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-stone-400 mb-1 block">Interval (opt.)</label>
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-stone-400 shrink-0" />
                      <input
                        value={formatTimeInput(row.intervalTime)}
                        onChange={(e) => updateInstructionRow(idx, 'intervalTime', e.target.value)}
                        placeholder="0:00"
                        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-300"
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeInstructionRow(idx)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-stone-400 hover:bg-red-50 hover:text-red-500 transition-colors mt-1"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addInstructionRow}
            className="mt-2 flex items-center gap-1 text-xs font-bold text-orange-500 hover:text-orange-600"
          >
            <Plus size={14} /> Add Instruction Step
          </button>
        </div>

        <div className="flex items-center gap-6">
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
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
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
      </div>
    </div>
  );
}

export const RecipeForm = memo(RecipeFormBase);
