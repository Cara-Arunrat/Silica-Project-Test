import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTransactions } from '../../api/hooks';
import { TABLE_NAMES } from '../../api/airtable';
import MasterDataSelect from '../../components/MasterDataSelect';

export default function DeliveryForm() {
  const { user } = useAuth();
  const { addRecord, loading, error } = useTransactions(TABLE_NAMES.DELIVERIES);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    customer_id: '',
    product_grade_id: '',
    truck_id: '',
    driver_id: '',
    tons_delivered: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');

    // Validation
    const tons = parseFloat(formData.tons_delivered);
    if (isNaN(tons) || tons <= 0) {
      alert("Tons delivered must be a positive number.");
      return;
    }

    setIsSubmitting(true);
    try {
      await addRecord({
        date: formData.date,
        customer_id: [formData.customer_id],
        product_grade_id: [formData.product_grade_id],
        truck_id: [formData.truck_id],
        driver_id: [formData.driver_id],
        tons_delivered: tons,
        created_at: new Date().toISOString(),
        created_by: [user.id],
        notes: formData.notes
      });
      setSuccess('Delivery recorded successfully.');
      setFormData(prev => ({
        ...prev,
        customer_id: '', product_grade_id: '', truck_id: '', driver_id: '', tons_delivered: '', notes: ''
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
            <label className="form-label">Tons Delivered</label>
            <input
              type="number"
              step="0.01"
              className="form-control"
              placeholder="e.g. 50.5"
              value={formData.tons_delivered}
              onChange={(e) => setFormData({ ...formData, tons_delivered: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="grid-2-col gap-md">
          <MasterDataSelect
            label="Customer"
            tableName={TABLE_NAMES.CUSTOMERS}
            value={formData.customer_id}
            onChange={(val) => setFormData({ ...formData, customer_id: val })}
            required
            disabled={isSubmitting}
          />
          <MasterDataSelect
            label="Product Grade"
            tableName={TABLE_NAMES.PRODUCT_GRADES}
            value={formData.product_grade_id}
            onChange={(val) => setFormData({ ...formData, product_grade_id: val })}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="grid-2-col gap-md">
          <MasterDataSelect
            label="truck"
            tableName={TABLE_NAMES.truckS}
            value={formData.truck_id}
            onChange={(val) => setFormData({ ...formData, truck_id: val })}
            required
            disabled={isSubmitting}
          />
          <MasterDataSelect
            label="Driver"
            tableName={TABLE_NAMES.DRIVERS}
            value={formData.driver_id}
            onChange={(val) => setFormData({ ...formData, driver_id: val })}
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
              ...p, customer_id: '', product_grade_id: '', truck_id: '', driver_id: '', tons_delivered: '', notes: ''
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
            {isSubmitting ? 'Saving...' : 'Save Delivery'}
          </button>
        </div>
      </form>
    </div>
  );
}
