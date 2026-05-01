import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTransactions } from '../../api/hooks';
import { TABLE_NAMES } from '../../api/airtable';
import { ShieldCheck, X, CalendarDays, RefreshCw, FileText } from 'lucide-react';

export default function CertReminderForm() {
  const { user } = useAuth();
  const { addRecord } = useTransactions(TABLE_NAMES.CERT_REMINDER);

  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const emptyForm = {
    name: '',
    active_date: '',
    expiration_date: '',
    renew_days: '',
  };

  const [form, setForm] = useState(emptyForm);

  const openModal = () => {
    setForm(emptyForm);
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setShowModal(false);
    setError('');
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    if (!form.name.trim()) return 'Certificate Name is required.';
    if (!form.active_date) return 'Active Date is required.';
    if (!form.expiration_date) return 'Expiration Date is required.';
    if (form.expiration_date < form.active_date) {
      return 'Expiration Date cannot be earlier than Active Date.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await addRecord({
        Name: form.name.trim(),
        Active_date: form.active_date,
        Expiration_date: form.expiration_date,
        Renew_days: form.renew_days ? parseInt(form.renew_days, 10) : null,
        created_by: user?.username || user?.name || 'manager',
        created_at: new Date().toISOString(),
        Complete_date: null,
      });

      setSuccess(`Certificate "${form.name}" saved successfully!`);
      setShowModal(false);
      setForm(emptyForm);

      // Auto-clear toast after 4s
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(`Failed to save: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cert-form-wrapper">
      {/* Success toast */}
      {success && (
        <div className="cert-toast cert-toast-success">
          <ShieldCheck size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* Entry card */}
      <div className="cert-entry-card">
        <div className="cert-entry-icon">
          <ShieldCheck size={40} strokeWidth={1.5} />
        </div>
        <h3 className="cert-entry-title">Certificate Reminders</h3>
        <p className="cert-entry-desc">
          Track vehicle and equipment certificates. Set expiry dates and renewal windows so nothing lapses.
        </p>
        <button className="btn btn-primary cert-open-btn" onClick={openModal}>
          + Add New Certificate
        </button>
      </div>

      {/* Modal overlay */}
      {showModal && (
        <div className="cert-modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="cert-modal">
            {/* Modal header */}
            <div className="cert-modal-header">
              <div className="cert-modal-title-group">
                <ShieldCheck size={20} />
                <h3 className="cert-modal-title">New Certificate Entry</h3>
              </div>
              <button className="cert-modal-close" onClick={closeModal} disabled={isSubmitting}>
                <X size={20} />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSubmit} className="cert-modal-body">
              {error && (
                <div className="cert-error-banner">
                  <span>{error}</span>
                </div>
              )}

              {/* Certificate Name */}
              <div className="form-group">
                <label className="form-label">
                  <FileText size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  Certificate Name <span className="cert-required">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Vehicle Safety Certificate"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  disabled={isSubmitting}
                  required
                  autoFocus
                />
              </div>

              {/* Dates row */}
              <div className="cert-dates-row">
                <div className="form-group">
                  <label className="form-label">
                    <CalendarDays size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Active Date <span className="cert-required">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.active_date}
                    onChange={(e) => handleChange('active_date', e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <CalendarDays size={14} style={{ display: 'inline', marginRight: '6px' }} />
                    Expiration Date <span className="cert-required">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.expiration_date}
                    min={form.active_date || undefined}
                    onChange={(e) => handleChange('expiration_date', e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              {/* Renewal Days */}
              <div className="form-group">
                <label className="form-label">
                  <RefreshCw size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  Renewal Reminder (days before expiry)
                </label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="e.g. 30"
                  min="0"
                  value={form.renew_days}
                  onChange={(e) => handleChange('renew_days', e.target.value)}
                  disabled={isSubmitting}
                  style={{ maxWidth: '160px' }}
                />
              </div>

              {/* Actions */}
              <div className="cert-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Submit Certificate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .cert-form-wrapper { position: relative; }

        /* Toast */
        .cert-toast {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-md) var(--spacing-lg);
          border-radius: var(--border-radius);
          margin-bottom: var(--spacing-lg);
          font-weight: 600;
          font-size: 0.9rem;
          animation: slideDown 0.3s ease;
        }
        .cert-toast-success {
          background: rgba(34, 197, 94, 0.12);
          color: var(--success-color, #16a34a);
          border: 1px solid rgba(34, 197, 94, 0.3);
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Entry card */
        .cert-entry-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: var(--spacing-xl) var(--spacing-lg);
          background: var(--surface-color);
          border: 1px dashed var(--border-color);
          border-radius: var(--border-radius-lg);
          min-height: 260px;
          gap: var(--spacing-md);
          transition: border-color 0.2s;
        }
        .cert-entry-card:hover { border-color: var(--primary-color); }
        .cert-entry-icon { color: var(--primary-color); opacity: 0.6; }
        .cert-entry-title { font-size: 1.25rem; font-weight: 700; margin: 0; }
        .cert-entry-desc { color: var(--text-secondary); max-width: 380px; font-size: 0.9rem; margin: 0; }
        .cert-open-btn { min-width: 200px; margin-top: var(--spacing-sm); }

        /* Modal */
        .cert-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .cert-modal {
          background: var(--surface-color);
          border-radius: var(--border-radius-lg);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          width: 100%;
          max-width: 520px;
          margin: var(--spacing-lg);
          animation: slideUp 0.25s ease;
          overflow: hidden;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cert-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-md) var(--spacing-lg);
          border-bottom: 1px solid var(--border-color);
          background: rgba(var(--primary-rgb), 0.04);
        }
        .cert-modal-title-group {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          color: var(--primary-color);
        }
        .cert-modal-title {
          font-size: 1rem;
          font-weight: 700;
          margin: 0;
          color: var(--text-color);
        }
        .cert-modal-close {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-secondary);
          padding: var(--spacing-xs);
          border-radius: var(--border-radius);
          display: flex;
          align-items: center;
          transition: background 0.2s, color 0.2s;
        }
        .cert-modal-close:hover { background: var(--bg-color); color: var(--text-color); }

        .cert-modal-body {
          padding: var(--spacing-lg);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .cert-error-banner {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #dc2626;
          border-radius: var(--border-radius);
          padding: var(--spacing-sm) var(--spacing-md);
          font-size: 0.875rem;
          font-weight: 500;
        }
        .cert-required { color: #ef4444; margin-left: 2px; }
        .cert-dates-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-md);
        }
        .cert-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--spacing-md);
          padding-top: var(--spacing-sm);
          border-top: 1px solid var(--border-color);
          margin-top: var(--spacing-sm);
        }

        @media (max-width: 480px) {
          .cert-dates-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
