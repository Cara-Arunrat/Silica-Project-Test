import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTransactions } from '../../api/hooks';
import { TABLE_NAMES } from '../../api/airtable';
import MasterDataSelect from '../../components/MasterDataSelect';
import ConfirmationModal from '../../components/ConfirmationModal';

export default function GasolineForm() {
  const { user } = useAuth();
  const { addRecord, loading, error } = useTransactions(TABLE_NAMES.GASOLINE);
  const [formData, setFormData] = useState({
    date: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    vehicle_id: '',
    driver_id: '',
    fuel_used_liters: '',
    total_price: '',
    notes: ''
  });

  // Track labels for confirmation modal
  const [selectedLabels, setSelectedLabels] = useState({
    vehicle: '',
    driver: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const fuel = parseFloat(formData.fuel_used_liters);
    if (isNaN(fuel) || fuel <= 0) {
      alert("Fuel used must be a positive number.");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setIsSubmitting(true);
    setSuccess('');

    try {
      // Convert local date/time to UTC string for stable Airtable storage
      const utcDate = new Date(formData.date).toISOString();

      await addRecord({
        date: utcDate,
        vehicle: selectedLabels.vehicle, // Sending as string (matches your Airtable field type)
        driver: [formData.driver_id],     // Sending as ID array (Linked Record)
        fuel_used_liters: parseFloat(formData.fuel_used_liters),
        total_price: parseFloat(formData.total_price) || 0,
        notes: formData.notes
      });
      setSuccess('Gasoline log recorded successfully.');
      setFormData(prev => ({
        ...prev, vehicle_id: '', driver_id: '', fuel_used_liters: '', total_price: '', notes: ''
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
      <h3 className="text-xl font-bold mb-md">Record Gasoline Usage</h3>

      {success && <div className="p-sm bg-success text-success mb-md rounded">{success}</div>}

      <form onSubmit={handleSubmit} className="card">
        <div className="form-group mb-md">
          <label className="form-label">Date</label>
          <input
            type="datetime-local"
            className="form-control"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            style={{ maxWidth: '280px' }}
          />
        </div>

        <div className="grid-2-col gap-md mb-md">
          <MasterDataSelect
            label="Vehicle"
            tableName={TABLE_NAMES.VEHICLES}
            value={formData.vehicle_id}
            onChange={(val) => setFormData({ ...formData, vehicle_id: val })}
            onSelectLabel={(label) => setSelectedLabels(p => ({ ...p, vehicle: label }))}
            required
            disabled={isSubmitting}
          />
          <MasterDataSelect
            label="Driver"
            tableName={TABLE_NAMES.DRIVERS}
            value={formData.driver_id}
            onChange={(val) => setFormData({ ...formData, driver_id: val })}
            onSelectLabel={(label) => setSelectedLabels(p => ({ ...p, driver: label }))}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="grid-2-col gap-md mb-md">
          <div className="form-group mb-0">
            <label className="form-label">Fuel Used (Liters)</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              placeholder="e.g. 45.5"
              value={formData.fuel_used_liters}
              onChange={(e) => setFormData({ ...formData, fuel_used_liters: e.target.value })}
              required
            />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Total Fuel Price (Baht)</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              placeholder="e.g. 1500.00"
              value={formData.total_price}
              onChange={(e) => setFormData({ ...formData, total_price: e.target.value })}
            />
          </div>
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
            onClick={() => setFormData(p => ({ ...p, vehicle_id: '', driver_id: '', fuel_used_liters: '', total_price: '', notes: '' }))}
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
        title="Confirm Gasoline Log"
        isSubmitting={isSubmitting}
        details={{
          'Date': formData.date,
          'Vehicle': selectedLabels.vehicle,
          'Driver': selectedLabels.driver,
          'Fuel Used (Liters)': formData.fuel_used_liters,
          'Total Fuel Price (Baht)': formData.total_price || '(Not specified)',
          'Notes': formData.notes || '(None)'
        }}
      />
    </div>
  );
}
