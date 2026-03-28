import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTransactions } from '../../api/hooks';
import { TABLE_NAMES } from '../../api/airtable';
import ConfirmationModal from '../../components/ConfirmationModal';

export default function GasolinePurchaseForm() {
  const { user } = useAuth();
  const { addRecord, loading, error } = useTransactions(TABLE_NAMES.GASOLINE_PURCHASES);
  const [formData, setFormData] = useState({
    purchase_date: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    fuel_liters: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const fuel = parseFloat(formData.fuel_liters);
    if (isNaN(fuel) || fuel <= 0) {
      alert("Fuel added must be a positive number.");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setIsSubmitting(true);
    setSuccess('');

    try {
      // Convert local date/time to UTC string for stable storage
      const utcDate = new Date(formData.purchase_date).toISOString();

      await addRecord({
        purchase_date: utcDate,
        fuel_liters: parseFloat(formData.fuel_liters),
        notes: formData.notes
      });
      setSuccess('Gasoline purchase recorded successfully.');
      setFormData(prev => ({
        ...prev, fuel_liters: '', notes: ''
      }));
    } catch (err) {
      alert(`Failed to save: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) return <div className="text-danger">Error: {error}</div>;

  return (
    <div className="form-container max-w-2xl mx-auto">
      <h3 className="text-xl font-bold mb-md">Record Gasoline Purchase</h3>

      {success && <div className="p-sm bg-success text-success mb-md rounded">{success}</div>}

      <form onSubmit={handleSubmit} className="card">
        <div className="form-group mb-md">
          <label className="form-label">Gas Arrival Date</label>
          <input
            type="datetime-local"
            className="form-control"
            value={formData.purchase_date}
            onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
            required
            style={{ maxWidth: '280px' }}
          />
        </div>

        <div className="form-group mb-md">
          <label className="form-label">Fuel Added (Liters)</label>
          <input
            type="number"
            step="0.01"
            className="form-control"
            placeholder="e.g. 500.00"
            value={formData.fuel_liters}
            onChange={(e) => setFormData({ ...formData, fuel_liters: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Notes (Optional)</label>
          <textarea
            className="form-control"
            rows="2"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        <div className="flex justify-between items-center mt-lg">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setFormData(p => ({ ...p, fuel_liters: '', notes: '' }))}
            disabled={isSubmitting}
          >
            Clear
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || loading}
          >
            {isSubmitting ? 'Saving...' : 'Review & Save'}
          </button>
        </div>
      </form>

      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        title="Confirm Gasoline Purchase"
        isSubmitting={isSubmitting}
        details={{
          'Gas Arrival Date': formData.purchase_date,
          'Fuel Added (Liters)': formData.fuel_liters,
          'Notes': formData.notes || '(None)'
        }}
      />
    </div>
  );
}
