import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTransactions } from '../../api/hooks';
import { TABLE_NAMES } from '../../api/airtable';
import MasterDataSelect from '../../components/MasterDataSelect';
import ConfirmationModal from '../../components/ConfirmationModal';

export default function GasolineForm() {
  const { user } = useAuth();
  const { addRecord, loading, error } = useTransactions(TABLE_NAMES.GASOLINE);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    vehicle_id: '',
    driver_id: '',
    meter_start: '',
    meter_end: '',
    notes: ''
  });

  // Track labels for confirmation modal
  const [selectedLabels, setSelectedLabels] = useState({
    vehicle: '',
    driver: ''
  });

  // Auto-calculated
  const [fuelUsed, setFuelUsed] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    const start = parseFloat(formData.meter_start);
    const end = parseFloat(formData.meter_end);

    if (!isNaN(start) && !isNaN(end)) {
      if (end >= start) {
        setFuelUsed((end - start).toFixed(2));
        setValidationError('');
      } else {
        setFuelUsed('');
        setValidationError('Meter End must be greater than or equal to Meter Start.');
      }
    } else {
      setFuelUsed('');
      setValidationError('');
    }
  }, [formData.meter_start, formData.meter_end]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validationError || !fuelUsed) return;
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setIsSubmitting(true);
    setSuccess('');

    try {
      await addRecord({
        date: formData.date,
        vehicle_id: [formData.vehicle_id],
        driver_id: [formData.driver_id],
        meter_start: parseFloat(formData.meter_start),
        meter_end: parseFloat(formData.meter_end),
        fuel_used: parseFloat(fuelUsed),
        notes: formData.notes
      });
      setSuccess('Gasoline log recorded successfully.');
      setFormData(prev => ({
        ...prev, vehicle_id: '', driver_id: '', meter_start: '', meter_end: '', notes: ''
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
      {validationError && <div className="p-sm bg-danger text-danger mb-md rounded" style={{ backgroundColor: 'var(--danger-bg)' }}>{validationError}</div>}

      <form onSubmit={handleSubmit} className="card">
        <div className="form-group mb-md">
          <label className="form-label">Date</label>
          <input
            type="date"
            className="form-control"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            style={{ maxWidth: '200px' }}
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

        <div className="grid-2-col gap-md p-md mb-md" style={{ backgroundColor: 'var(--bg-color)', borderRadius: 'var(--border-radius)' }}>
          <div className="form-group mb-0">
            <label className="form-label">Meter Start</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              value={formData.meter_start}
              onChange={(e) => setFormData({ ...formData, meter_start: e.target.value })}
              required
            />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Meter End</label>
            <input
              type="number"
              step="0.01"
              className={`form-control ${validationError ? 'border-danger' : ''}`}
              value={formData.meter_end}
              onChange={(e) => setFormData({ ...formData, meter_end: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="form-group mb-md">
          <label className="form-label flex justify-between">
            <span>Fuel Used (Calculated)</span>
          </label>
          <input
            type="text"
            className="form-control font-bold"
            value={fuelUsed ? `${fuelUsed} Units` : ''}
            disabled
            style={{ backgroundColor: 'var(--bg-color)' }}
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
            onClick={() => setFormData(p => ({ ...p, vehicle_id: '', driver_id: '', meter_start: '', meter_end: '', notes: '' }))}
            disabled={isSubmitting}
          >
            Clear
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || loading || !!validationError || !fuelUsed}
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
          'Meter Start': `${formData.meter_start}`,
          'Meter End': `${formData.meter_end}`,
          'Total Fuel Used': `${fuelUsed} Units`,
          'Notes': formData.notes || '(None)'
        }}
      />
    </div>
  );
}
