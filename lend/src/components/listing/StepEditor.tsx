import React, { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, ListChecks, Lightbulb } from 'lucide-react';
import type { TaskStep } from '../../types';

interface StepEditorProps {
  value: TaskStep[];
  onChange: (steps: TaskStep[]) => void;
}

export const StepEditor: React.FC<StepEditorProps> = ({ value, onChange }) => {
  const [newInstruction, setNewInstruction] = useState('');

  const addStep = () => {
    const text = newInstruction.trim();
    if (!text) return;
    const next: TaskStep = {
      id: crypto.randomUUID(),
      instruction: text,
      order: value.length,
    };
    onChange([...value, next]);
    setNewInstruction('');
  };

  const updateStep = (id: string, patch: Partial<TaskStep>) => {
    onChange(value.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const removeStep = (id: string) => {
    const filtered = value.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i }));
    onChange(filtered);
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = value.findIndex(s => s.id === id);
    if (idx < 0) return;
    const next = [...value];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next.map((s, i) => ({ ...s, order: i })));
  };

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
          <ListChecks size={28} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-medium">No steps yet</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Add steps your helper should follow in order
          </p>
        </div>
      )}

      {value.map((step, idx) => (
        <div
          key={step.id}
          className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3"
        >
          <div className="flex items-start gap-3">
            {/* Step number badge */}
            <div className="w-7 h-7 rounded-full bg-teal-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
              {idx + 1}
            </div>

            <div className="flex-1 space-y-2">
              {/* Instruction */}
              <textarea
                value={step.instruction}
                onChange={e => updateStep(step.id, { instruction: e.target.value })}
                placeholder={`Step ${idx + 1} instruction…`}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none
                  focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              />

              {/* Optional hint */}
              <div className="relative">
                <Lightbulb
                  size={13}
                  className="absolute left-3 top-2.5 text-amber-400 pointer-events-none"
                />
                <input
                  type="text"
                  value={step.hint ?? ''}
                  onChange={e =>
                    updateStep(step.id, { hint: e.target.value || undefined })
                  }
                  placeholder={'Optional hint (e.g. "turn the valve clockwise")'}
                  className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white text-slate-600 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => move(step.id, -1)}
                disabled={idx === 0}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors"
                title="Move up"
              >
                <ChevronUp size={15} />
              </button>
              <button
                type="button"
                onClick={() => move(step.id, 1)}
                disabled={idx === value.length - 1}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors"
                title="Move down"
              >
                <ChevronDown size={15} />
              </button>
              <button
                type="button"
                onClick={() => removeStep(step.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
                title="Remove step"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Add step */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newInstruction}
          onChange={e => setNewInstruction(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addStep(); } }}
          placeholder="Type a step and press Enter…"
          maxLength={300}
          className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-xl
            focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button
          type="button"
          onClick={addStep}
          disabled={!newInstruction.trim()}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-700
            disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-colors"
        >
          <Plus size={15} />
          Add
        </button>
      </div>
    </div>
  );
};
