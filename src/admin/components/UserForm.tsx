import { useState, useEffect, memo } from 'react';
import { motion, Variants } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface UserFormProps {
  initialForm: {
    name: string;
    email: string;
    role: string;
    skillLevel: string;
  };
  onSave: (form: any) => Promise<void>;
  onCancel: () => void;
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

function UserFormBase({ initialForm, onSave, onCancel, formRef }: UserFormProps) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  const handleSaveClick = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required.');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
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
        <motion.div variants={itemVariants}>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">Full Name *</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">Email Address</label>
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">System Role</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
          >
            <option value="user">Standard User</option>
            <option value="admin">Administrator</option>
          </select>
        </motion.div>

        <motion.div variants={itemVariants}>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-stone-400">Skill Level</label>
          <select
            value={form.skillLevel}
            onChange={(e) => setForm({ ...form, skillLevel: e.target.value })}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-300"
          >
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
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
          ) : (
            'Save Changes'
          )}
        </Button>
      </motion.div>
    </motion.div>
  );
}

export const UserForm = memo(UserFormBase);
