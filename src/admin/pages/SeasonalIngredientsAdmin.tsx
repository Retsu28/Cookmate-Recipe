import { useState, useCallback, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Leaf,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdminSectionCard } from '../components/AdminSectionCard';
import {
  type PhSeason,
  type SeasonalData,
  type SeasonalItem,
  type YearRoundItem,
  MONTH_NAMES,
  STATUS_OPTIONS,
  defaultSeasonalData,
  fetchSeasonalData,
  loadSeasonalData,
  resetSeasonalDataToApi,
  saveSeasonalDataToApi,
} from '@/data/seasonalData';

const EMOJI_SUGGESTIONS = ['🥬', '🥕', '🥔', '🌿', '🫘', '🍍', '🥦', '🥭', '🍉', '🍈', '🧅', '🫛', '🌽', '🍠', '🧄', '🌶️', '🍅', '🍆', '🎃', '🫚'];

type EditTarget =
  | { type: 'season-ing'; seasonId: string; index: number; item: SeasonalItem }
  | { type: 'year-round'; index: number; item: YearRoundItem }
  | { type: 'month'; month: number; index: number; item: SeasonalItem }
  | null;

type AddTarget =
  | { type: 'season-ing'; seasonId: string }
  | { type: 'year-round' }
  | { type: 'month'; month: number }
  | null;

const emptyItem = (): SeasonalItem => ({ name: '', status: 'Peak Season', emoji: '🌿', tip: '' });
const emptyYr = (): YearRoundItem => ({ name: '', emoji: '🌿', tip: '' });

function StatusBadge({ status }: { status: SeasonalItem['status'] }) {
  const map: Record<string, string> = {
    'Peak Season': 'bg-green-100 text-green-700',
    'Just In': 'bg-orange-100 text-orange-700',
    'Available': 'bg-blue-100 text-blue-700',
    'Limited Time': 'bg-red-100 text-red-600',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest ${map[status] ?? 'bg-stone-100 text-stone-600'}`}>
      {status}
    </span>
  );
}

interface ItemRowProps {
  emoji: string;
  name: string;
  status?: SeasonalItem['status'];
  tip: string;
  onEdit: () => void;
  onDelete: () => void;
}
function ItemRow({ emoji, name, status, tip, onEdit, onDelete }: ItemRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2.5 dark:border-stone-700 dark:bg-stone-800/50">
      <GripVertical size={14} className="shrink-0 text-stone-300" />
      <span className="text-xl leading-none">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-extrabold text-stone-800 dark:text-stone-100">{name}</span>
          {status && <StatusBadge status={status} />}
        </div>
        {tip && <p className="mt-0.5 text-xs text-stone-400 dark:text-stone-500 truncate">{tip}</p>}
      </div>
      <div className="flex gap-1 shrink-0">
        <button onClick={onEdit} className="rounded-lg p-1.5 text-stone-400 hover:bg-white hover:text-orange-500 dark:hover:bg-stone-700 transition-colors">
          <Pencil size={13} />
        </button>
        <button onClick={onDelete} className="rounded-lg p-1.5 text-stone-400 hover:bg-white hover:text-red-500 dark:hover:bg-stone-700 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

interface ItemFormProps {
  value: SeasonalItem | YearRoundItem;
  hasStatus: boolean;
  onChange: (v: SeasonalItem | YearRoundItem) => void;
  onSave: () => void;
  onCancel: () => void;
  label: string;
}
function ItemForm({ value, hasStatus, onChange, onSave, onCancel, label }: ItemFormProps) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <p className="mb-3 text-xs font-extrabold uppercase tracking-widest text-orange-600">{label}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold text-stone-500">Name *</label>
          <input
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            placeholder="e.g. Mangga (Mango)"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-stone-500">Emoji *</label>
          <div className="flex gap-2">
            <input
              className="w-24 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              value={value.emoji}
              onChange={(e) => onChange({ ...value, emoji: e.target.value })}
              placeholder="🌿"
            />
            <div className="flex flex-wrap gap-1">
              {EMOJI_SUGGESTIONS.slice(0, 8).map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => onChange({ ...value, emoji: em })}
                  className={`rounded-lg p-1 text-lg transition-colors hover:bg-orange-50 dark:hover:bg-orange-950/30 ${value.emoji === em ? 'bg-orange-100 ring-1 ring-orange-400 dark:bg-orange-900/40' : ''}`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        </div>
        {hasStatus && (
          <div>
            <label className="mb-1 block text-xs font-bold text-stone-500">Status *</label>
            <select
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              value={(value as SeasonalItem).status}
              onChange={(e) => onChange({ ...value, status: e.target.value as SeasonalItem['status'] })}
            >
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
        <div className={hasStatus ? '' : 'sm:col-span-2'}>
          <label className="mb-1 block text-xs font-bold text-stone-500">Tip / Description</label>
          <input
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            value={value.tip}
            onChange={(e) => onChange({ ...value, tip: e.target.value })}
            placeholder="Usage tip for Filipino cooking..."
          />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" className="rounded-full bg-orange-500 text-white hover:bg-orange-600" onClick={onSave}>
          <Save size={13} /> Save
        </Button>
        <Button size="sm" variant="outline" className="rounded-full" onClick={onCancel}>
          <X size={13} /> Cancel
        </Button>
      </div>
    </div>
  );
}

export default function SeasonalIngredientsAdmin() {
  const [data, setData] = useState<SeasonalData>(() => loadSeasonalData());
  const [activeTab, setActiveTab] = useState<'seasons' | 'monthly' | 'yearround'>('seasons');
  const [expandedSeason, setExpandedSeason] = useState<string | null>('tag-init');
  const [expandedMonth, setExpandedMonth] = useState<number | null>(new Date().getMonth());
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [addTarget, setAddTarget] = useState<AddTarget>(null);
  const [addForm, setAddForm] = useState<SeasonalItem | YearRoundItem>(emptyItem());
  const [editForm, setEditForm] = useState<SeasonalItem | YearRoundItem>(emptyItem());
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSeasonalData().then(setData).catch(() => {});
  }, []);

  const mutate = useCallback((updater: (d: SeasonalData) => SeasonalData) => {
    setData((prev) => updater(prev));
    setHasUnsaved(true);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSeasonalDataToApi(data);
      setHasUnsaved(false);
      toast.success('Seasonal data saved! Changes are now live for all users.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all seasonal data to defaults? This cannot be undone.')) return;
    setSaving(true);
    try {
      await resetSeasonalDataToApi();
      setData(defaultSeasonalData);
      setHasUnsaved(false);
      toast.success('Reset to default Philippine seasonal data.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // --- Season ingredient CRUD ---
  const deleteSeasonIng = (seasonId: string, idx: number) => {
    mutate((d) => ({
      ...d,
      seasons: d.seasons.map((s) =>
        s.id === seasonId ? { ...s, ingredients: s.ingredients.filter((_, i) => i !== idx) } : s,
      ),
    }));
  };

  const openEditSeasonIng = (seasonId: string, idx: number, item: SeasonalItem) => {
    setEditTarget({ type: 'season-ing', seasonId, index: idx, item });
    setEditForm({ ...item });
    setAddTarget(null);
  };

  const saveEditSeasonIng = () => {
    if (!editTarget || editTarget.type !== 'season-ing') return;
    if (!(editForm as SeasonalItem).name.trim()) { toast.error('Name is required.'); return; }
    const { seasonId, index } = editTarget;
    mutate((d) => ({
      ...d,
      seasons: d.seasons.map((s) =>
        s.id === seasonId
          ? { ...s, ingredients: s.ingredients.map((item, i) => (i === index ? (editForm as SeasonalItem) : item)) }
          : s,
      ),
    }));
    setEditTarget(null);
  };

  const addSeasonIng = (seasonId: string) => {
    if (!(addForm as SeasonalItem).name.trim()) { toast.error('Name is required.'); return; }
    mutate((d) => ({
      ...d,
      seasons: d.seasons.map((s) =>
        s.id === seasonId ? { ...s, ingredients: [...s.ingredients, addForm as SeasonalItem] } : s,
      ),
    }));
    setAddTarget(null);
    setAddForm(emptyItem());
    toast.success('Ingredient added to season.');
  };

  // --- Month CRUD ---
  const deleteMonthIng = (month: number, idx: number) => {
    mutate((d) => ({
      ...d,
      byMonth: { ...d.byMonth, [month]: (d.byMonth[month] || []).filter((_, i) => i !== idx) },
    }));
  };

  const openEditMonthIng = (month: number, idx: number, item: SeasonalItem) => {
    setEditTarget({ type: 'month', month, index: idx, item });
    setEditForm({ ...item });
    setAddTarget(null);
  };

  const saveEditMonthIng = () => {
    if (!editTarget || editTarget.type !== 'month') return;
    if (!(editForm as SeasonalItem).name.trim()) { toast.error('Name is required.'); return; }
    const { month, index } = editTarget;
    mutate((d) => ({
      ...d,
      byMonth: {
        ...d.byMonth,
        [month]: (d.byMonth[month] || []).map((item, i) => (i === index ? (editForm as SeasonalItem) : item)),
      },
    }));
    setEditTarget(null);
  };

  const addMonthIng = (month: number) => {
    if (!(addForm as SeasonalItem).name.trim()) { toast.error('Name is required.'); return; }
    mutate((d) => ({
      ...d,
      byMonth: { ...d.byMonth, [month]: [...(d.byMonth[month] || []), addForm as SeasonalItem] },
    }));
    setAddTarget(null);
    setAddForm(emptyItem());
    toast.success('Ingredient added to month.');
  };

  // --- Year-round CRUD ---
  const deleteYrIng = (idx: number) => {
    mutate((d) => ({ ...d, yearRound: d.yearRound.filter((_, i) => i !== idx) }));
  };

  const openEditYrIng = (idx: number, item: YearRoundItem) => {
    setEditTarget({ type: 'year-round', index: idx, item });
    setEditForm({ ...item });
    setAddTarget(null);
  };

  const saveEditYrIng = () => {
    if (!editTarget || editTarget.type !== 'year-round') return;
    if (!editForm.name.trim()) { toast.error('Name is required.'); return; }
    const { index } = editTarget;
    mutate((d) => ({
      ...d,
      yearRound: d.yearRound.map((item, i) => (i === index ? (editForm as YearRoundItem) : item)),
    }));
    setEditTarget(null);
  };

  const addYrIng = () => {
    if (!addForm.name.trim()) { toast.error('Name is required.'); return; }
    mutate((d) => ({ ...d, yearRound: [...d.yearRound, addForm as YearRoundItem] }));
    setAddTarget(null);
    setAddForm(emptyYr());
    toast.success('Year-round ingredient added.');
  };

  // --- Season meta edit ---
  const updateSeasonMeta = (id: string, field: keyof PhSeason, value: string) => {
    mutate((d) => ({
      ...d,
      seasons: d.seasons.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    }));
  };

  const tabs = [
    { id: 'seasons' as const, label: 'Season Sections' },
    { id: 'monthly' as const, label: 'Monthly View' },
    { id: 'yearround' as const, label: 'Year-Round Staples' },
  ];

  return (
    <div>
      <AdminPageHeader
        eyebrow="Content Management"
        title="Seasonal Ingredients"
        description="Edit Philippine seasonal produce data. Changes are saved to the database and apply site-wide for all users across all devices."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-full gap-1.5"
              onClick={handleReset}
              disabled={saving}
            >
              <RotateCcw size={14} /> Reset to defaults
            </Button>
            <Button
              className="rounded-full gap-1.5 bg-orange-500 text-white hover:bg-orange-600"
              onClick={handleSave}
              disabled={!hasUnsaved || saving}
            >
              <Save size={14} />
              {saving ? 'Saving…' : hasUnsaved ? 'Save changes' : 'All saved'}
            </Button>
          </div>
        }
      />

      {hasUnsaved && (
        <div className="mb-5 flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-900/50 dark:bg-orange-950/30">
          <Leaf size={15} className="text-orange-500" />
          <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">
            You have unsaved changes. Click <strong>Save changes</strong> to publish them to the site.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-2 rounded-2xl border border-stone-100 bg-white p-1.5 dark:border-stone-800 dark:bg-stone-900 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
              activeTab === t.id
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* === SEASONS TAB === */}
      {activeTab === 'seasons' && (
        <div className="space-y-4">
          {data.seasons.map((season) => (
            <AdminSectionCard
              key={season.id}
              title={`${season.name} — ${season.label}`}
              description={`${season.months} · ${season.ingredients.length} ingredients`}
            >
              {/* Season meta fields */}
              <div className="mb-5 grid gap-3 sm:grid-cols-2 border-b border-stone-100 pb-5 dark:border-stone-700">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-stone-400">Season Name</label>
                  <input
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                    value={season.name}
                    onChange={(e) => updateSeasonMeta(season.id, 'name', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-stone-400">Label / Sub-title</label>
                  <input
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                    value={season.label}
                    onChange={(e) => updateSeasonMeta(season.id, 'label', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-stone-400">Months Label</label>
                  <input
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                    value={season.months}
                    onChange={(e) => updateSeasonMeta(season.id, 'months', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-stone-400">Description</label>
                  <input
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                    value={season.description}
                    onChange={(e) => updateSeasonMeta(season.id, 'description', e.target.value)}
                  />
                </div>
              </div>

              {/* Toggle ingredient list */}
              <button
                onClick={() => setExpandedSeason(expandedSeason === season.id ? null : season.id)}
                className="mb-3 flex w-full items-center justify-between rounded-xl px-1 text-sm font-extrabold text-stone-700 hover:text-orange-600 dark:text-stone-300 dark:hover:text-orange-400"
              >
                <span>Ingredients ({season.ingredients.length})</span>
                {expandedSeason === season.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {expandedSeason === season.id && (
                <div className="space-y-2">
                  {season.ingredients.map((ing, idx) => (
                    <div key={idx}>
                      {editTarget?.type === 'season-ing' && editTarget.seasonId === season.id && editTarget.index === idx ? (
                        <ItemForm
                          value={editForm}
                          hasStatus
                          onChange={setEditForm}
                          onSave={saveEditSeasonIng}
                          onCancel={() => setEditTarget(null)}
                          label="Edit ingredient"
                        />
                      ) : (
                        <ItemRow
                          emoji={ing.emoji}
                          name={ing.name}
                          status={ing.status}
                          tip={ing.tip}
                          onEdit={() => openEditSeasonIng(season.id, idx, ing)}
                          onDelete={() => deleteSeasonIng(season.id, idx)}
                        />
                      )}
                    </div>
                  ))}

                  {addTarget?.type === 'season-ing' && addTarget.seasonId === season.id ? (
                    <ItemForm
                      value={addForm}
                      hasStatus
                      onChange={setAddForm}
                      onSave={() => addSeasonIng(season.id)}
                      onCancel={() => { setAddTarget(null); setAddForm(emptyItem()); }}
                      label="Add ingredient"
                    />
                  ) : (
                    <button
                      onClick={() => { setAddTarget({ type: 'season-ing', seasonId: season.id }); setAddForm(emptyItem()); setEditTarget(null); }}
                      className="mt-1 flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-stone-200 px-3 py-2 text-sm font-bold text-stone-400 hover:border-orange-300 hover:text-orange-500 transition-colors dark:border-stone-600 dark:hover:border-orange-700"
                    >
                      <Plus size={14} /> Add ingredient to {season.name}
                    </button>
                  )}
                </div>
              )}
            </AdminSectionCard>
          ))}
        </div>
      )}

      {/* === MONTHLY TAB === */}
      {activeTab === 'monthly' && (
        <div className="space-y-3">
          <p className="mb-2 text-sm font-medium text-stone-500 dark:text-stone-400">
            These are the 6 ingredients shown in the <strong>Dashboard card preview</strong> and the "Fresh this month" section of the Seasonal Guide.
          </p>
          {MONTH_NAMES.map((monthName, mi) => {
            const items = data.byMonth[mi] || [];
            const isOpen = expandedMonth === mi;
            return (
              <AdminSectionCard
                key={mi}
                title={monthName}
                description={`${items.length} ingredients shown this month`}
              >
                <button
                  onClick={() => setExpandedMonth(isOpen ? null : mi)}
                  className="mb-3 flex w-full items-center justify-between rounded-xl px-1 text-sm font-extrabold text-stone-700 hover:text-orange-600 dark:text-stone-300 dark:hover:text-orange-400"
                >
                  <span>Ingredients ({items.length})</span>
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isOpen && (
                  <div className="space-y-2">
                    {items.map((ing, idx) => (
                      <div key={idx}>
                        {editTarget?.type === 'month' && editTarget.month === mi && editTarget.index === idx ? (
                          <ItemForm
                            value={editForm}
                            hasStatus
                            onChange={setEditForm}
                            onSave={saveEditMonthIng}
                            onCancel={() => setEditTarget(null)}
                            label="Edit ingredient"
                          />
                        ) : (
                          <ItemRow
                            emoji={ing.emoji}
                            name={ing.name}
                            status={ing.status}
                            tip={ing.tip}
                            onEdit={() => openEditMonthIng(mi, idx, ing)}
                            onDelete={() => deleteMonthIng(mi, idx)}
                          />
                        )}
                      </div>
                    ))}

                    {addTarget?.type === 'month' && addTarget.month === mi ? (
                      <ItemForm
                        value={addForm}
                        hasStatus
                        onChange={setAddForm}
                        onSave={() => addMonthIng(mi)}
                        onCancel={() => { setAddTarget(null); setAddForm(emptyItem()); }}
                        label="Add ingredient"
                      />
                    ) : (
                      <button
                        onClick={() => { setAddTarget({ type: 'month', month: mi }); setAddForm(emptyItem()); setEditTarget(null); }}
                        className="mt-1 flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-stone-200 px-3 py-2 text-sm font-bold text-stone-400 hover:border-orange-300 hover:text-orange-500 transition-colors dark:border-stone-600 dark:hover:border-orange-700"
                      >
                        <Plus size={14} /> Add ingredient for {monthName}
                      </button>
                    )}
                  </div>
                )}
              </AdminSectionCard>
            );
          })}
        </div>
      )}

      {/* === YEAR-ROUND TAB === */}
      {activeTab === 'yearround' && (
        <AdminSectionCard
          title="Year-Round Staples"
          description="These appear in the 'Year-Round Staples' section of the Seasonal Guide. Available at any palengke regardless of season."
        >
          <div className="space-y-2">
            {data.yearRound.map((item, idx) => (
              <div key={idx}>
                {editTarget?.type === 'year-round' && editTarget.index === idx ? (
                  <ItemForm
                    value={editForm}
                    hasStatus={false}
                    onChange={setEditForm}
                    onSave={saveEditYrIng}
                    onCancel={() => setEditTarget(null)}
                    label="Edit staple"
                  />
                ) : (
                  <ItemRow
                    emoji={item.emoji}
                    name={item.name}
                    tip={item.tip}
                    onEdit={() => openEditYrIng(idx, item)}
                    onDelete={() => deleteYrIng(idx)}
                  />
                )}
              </div>
            ))}

            {addTarget?.type === 'year-round' ? (
              <ItemForm
                value={addForm}
                hasStatus={false}
                onChange={setAddForm}
                onSave={addYrIng}
                onCancel={() => { setAddTarget(null); setAddForm(emptyYr()); }}
                label="Add staple"
              />
            ) : (
              <button
                onClick={() => { setAddTarget({ type: 'year-round' }); setAddForm(emptyYr()); setEditTarget(null); }}
                className="mt-1 flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-stone-200 px-3 py-2 text-sm font-bold text-stone-400 hover:border-orange-300 hover:text-orange-500 transition-colors dark:border-stone-600 dark:hover:border-orange-700"
              >
                <Plus size={14} /> Add year-round staple
              </button>
            )}
          </div>
        </AdminSectionCard>
      )}
    </div>
  );
}
