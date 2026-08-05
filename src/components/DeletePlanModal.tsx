import React from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface DeletePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string | null;
  planName: string;
  onConfirmDelete: (id: string) => void;
}

export const DeletePlanModal: React.FC<DeletePlanModalProps> = ({
  isOpen,
  onClose,
  planId,
  planName,
  onConfirmDelete,
}) => {
  if (!isOpen || !planId) return null;

  const handleDelete = () => {
    onConfirmDelete(planId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Remove Retirement Plan</h2>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">Confirm plan deletion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300 bg-rose-50/50 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-100 dark:border-rose-900/40">
          <p>
            Are you sure you want to remove the plan <strong className="text-slate-900 dark:text-white">"{planName}"</strong>?
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            This action cannot be undone. All assets, income streams, and drawdown configurations associated with this plan will be permanently deleted.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
            <span>Remove Plan</span>
          </button>
        </div>

      </div>
    </div>
  );
};
