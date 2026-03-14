import React from 'react';

export default function ConfirmationModal({ isOpen, onClose, onConfirm, title, details, isSubmitting }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content card shadow-lg" style={{ maxWidth: '450px', width: '90%' }}>
        <h3 className="text-xl font-bold mb-md border-b pb-sm">{title}</h3>
        
        <div className="mb-lg">
          <p className="text-secondary text-sm mb-md italic">Please re-check the details below before saving:</p>
          <div className="space-y-sm bg-bg p-md rounded border border-border">
            {Object.entries(details).map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm py-xs border-b border-border last:border-0">
                <span className="text-secondary font-medium">{label}:</span>
                <span className="font-bold text-right">{value || '-'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-md mt-lg">
          <button 
            className="btn btn-secondary flex-1" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Go Back
          </button>
          <button 
            className="btn btn-primary flex-1" 
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Confirm & Save'}
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
          padding: var(--spacing-md);
        }
        .modal-content {
          animation: modalSlideIn 0.3s ease-out;
        }
        @keyframes modalSlideIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .space-y-sm > * + * { margin-top: var(--spacing-sm); }
        .pb-sm { padding-bottom: var(--spacing-sm); }
        .last\\:border-0:last-child { border-bottom: 0; }
      `}</style>
    </div>
  );
}
