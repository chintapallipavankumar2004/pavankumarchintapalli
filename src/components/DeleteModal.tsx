import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Project } from '../types';

interface DeleteModalProps {
  isOpen: boolean;
  project: Project | null;
  onClose: () => void;
  onConfirm: (projectId: string) => Promise<void>;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  project,
  onClose,
  onConfirm,
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!isOpen || !project) return null;

  return (
    <div
      id="modal-delete-confirm"
      className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md bg-white rounded-2xl border border-red-200 shadow-2xl p-6 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h4 className="text-lg font-bold text-[#141b2b]">Confirm Project Removal</h4>
          <p className="text-xs sm:text-sm text-[#474555] leading-relaxed">
            Are you sure you want to delete{' '}
            <span className="font-bold text-[#141b2b]">"{project.title}"</span>? This removes the
            project from the portfolio. Uploaded media remains in Cloudinary.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-end gap-3">
          {error && (
            <p role="alert" className="text-red-700">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="h-10 px-4 rounded-lg border border-[#c8c4d8] text-[#141b2b] text-xs font-semibold hover:bg-[#f1f3ff] transition-colors cursor-pointer"
          >
            Keep Project
          </button>
          <button
            id="btn-confirm-delete-project"
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                await onConfirm(project.id);
                onClose();
              } catch {
                setError('Could not delete the project. Please try again.');
              } finally {
                setBusy(false);
              }
            }}
            className="h-10 px-5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors shadow-xs cursor-pointer"
          >
            Yes, Permanently Delete
          </button>
        </div>
      </div>
    </div>
  );
};
