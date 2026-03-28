import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTransactions } from '../../api/hooks';
import { TABLE_NAMES } from '../../api/airtable';
import MasterDataSelectionGrid from '../../components/MasterDataSelectionGrid';
import ConfirmationModal from '../../components/ConfirmationModal';

export default function DeliveryForm() {
  const { user } = useAuth();
  const { addRecord, loading, error } = useTransactions(TABLE_NAMES.DELIVERIES);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    customer_id: '',
    product_grade_id: '',
    vehicle_id: '',
    driver_id: '',
    net_weight_kg: '',
    delivery_certificate_no: '',
    weighing_sequence_no: '',
    notes: ''
  });

  // Track labels for confirmation modal
  const [selectedLabels, setSelectedLabels] = useState({
    customer: '',
    product: '',
    vehicle: '',
    driver: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const kg = parseFloat(formData.net_weight_kg);
    if (isNaN(kg) || kg <= 0) {
      alert("Net weight delivered must be a positive number.");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setIsSubmitting(true);
    setSuccess('');

    try {
      await addRecord({
        date: formData.date,
        customer_id: [formData.customer_id],
        product_grade_id: [formData.product_grade_id],
        vehicle_name: [formData.vehicle_id], // Linked record field
        driver_id: [formData.driver_id],
        net_weight_kg: parseFloat(formData.net_weight_kg),
        delivery_certificate_no: formData.delivery_certificate_no,
        weighing_sequence_no: formData.weighing_sequence_no,
        notes: formData.notes
      });
      setSuccess('Delivery recorded successfully.');
      setFormData(prev => ({
        ...prev,
        customer_id: '', product_grade_id: '', vehicle_id: '', driver_id: '', net_weight_kg: '', delivery_certificate_no: '', weighing_sequence_no: '', notes: ''
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
      <h3 className="text-xl font-bold mb-md">Record Delivery</h3>

      {success && <div className="p-sm bg-success text-success mb-md rounded">{success}</div>}

      <form onSubmit={handleSubmit} className="card">
        <div className="grid-2-col gap-md">
          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-control"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Net Weight Delivered (Kg)</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              placeholder="e.g. 5050.50"
              value={formData.net_weight_kg}
              onChange={(e) => setFormData({ ...formData, net_weight_kg: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="grid-2-col gap-md">
          <div className="form-group">
            <label className="form-label">Delivery Certificate No.</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter certificate number"
              value={formData.delivery_certificate_no}
              onChange={(e) => setFormData({ ...formData, delivery_certificate_no: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Weighing Sequence No.</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter sequence number"
              value={formData.weighing_sequence_no}
              onChange={(e) => setFormData({ ...formData, weighing_sequence_no: e.target.value })}
              required
            />
          </div>
        </div>

        <MasterDataSelectionGrid
          label="Customer"
          tableName={TABLE_NAMES.CUSTOMERS}
          value={formData.customer_id}
          onChange={(val) => setFormData({ ...formData, customer_id: val })}
          onSelectLabel={(label) => setSelectedLabels(p => ({ ...p, customer: label }))}
          required
          disabled={isSubmitting}
        />

        <MasterDataSelectionGrid
          label="Product Grade"
          tableName={TABLE_NAMES.PRODUCT_GRADES}
          value={formData.product_grade_id}
          onChange={(val) => setFormData({ ...formData, product_grade_id: val })}
          onSelectLabel={(label) => setSelectedLabels(p => ({ ...p, product: label }))}
          required
          disabled={isSubmitting}
        />

        <div className="grid-2-col gap-md">
          <MasterDataSelectionGrid
            label="Vehicle"
            tableName={TABLE_NAMES.VEHICLES}
            value={formData.vehicle_id}
            onChange={(val) => setFormData({ ...formData, vehicle_id: val })}
            onSelectLabel={(label) => setSelectedLabels(p => ({ ...p, vehicle: label }))}
            required
            disabled={isSubmitting}
            filterFn={(item) => {
              const type = item.vehicle_type || item.Vehicle_Type || item.vehicle_Type || '';
              return String(type).trim() === 'รถพ่วง/เทรลเล่อ';
            }}
          />
          <MasterDataSelectionGrid
            label="Driver"
            tableName={TABLE_NAMES.DRIVERS}
            value={formData.driver_id}
            onChange={(val) => setFormData({ ...formData, driver_id: val })}
            onSelectLabel={(label) => setSelectedLabels(p => ({ ...p, driver: label }))}
            required
            disabled={isSubmitting}
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
            onClick={() => setFormData(p => ({
              ...p, customer_id: '', product_grade_id: '', vehicle_id: '', driver_id: '', net_weight_kg: '', delivery_certificate_no: '', weighing_sequence_no: '', notes: ''
            }))}
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
        title="Confirm Delivery Entry"
        isSubmitting={isSubmitting}
        details={{
          'Date': formData.date,
          'Customer': selectedLabels.customer,
          'Product': selectedLabels.product,
          'Vehicle': selectedLabels.vehicle,
          'Driver': selectedLabels.driver,
          'Weight (Kg)': `${formData.net_weight_kg}`,
          'Certificate No.': formData.delivery_certificate_no,
          'Weighing Seq No.': formData.weighing_sequence_no,
          'Notes': formData.notes || '(None)'
        }}
      />
    </div>
  );
}
