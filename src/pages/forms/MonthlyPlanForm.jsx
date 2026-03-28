import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTransactions } from '../../api/hooks';
import { TABLE_NAMES } from '../../api/airtable';
import MasterDataSelect from '../../components/MasterDataSelect';
import ConfirmationModal from '../../components/ConfirmationModal';

export default function MonthlyPlanForm() {
  const { user } = useAuth();
  const { addRecord, loading, error } = useTransactions(TABLE_NAMES.PLAN);
  const [formData, setFormData] = useState({
    month: new Date().toISOString().substring(0, 7), // YYYY-MM
    customer_id: '',
    planned_tons: '',
    notes: ''
  });

  // Track labels for confirmation modal
  const [selectedLabels, setSelectedLabels] = useState({
    customer: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const tons = parseFloat(formData.planned_tons);
    if (isNaN(tons) || tons <= 0) {
      alert("Please enter a valid positive number for planned tons.");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setIsSubmitting(true);
    setSuccess('');
    
    try {
      // Send both 'period' (for logic) and 'month' (for display/compatibility)
      // Since 'month' is now computed in Airtable, our hook will automatically strip it if it fails
      const [year, month] = formData.month.split('-');
      const periodDate = `${year}-${month}-01`;
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
      const displayMonth = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      await addRecord({
        period: periodDate,
        month: displayMonth,
        customer: [formData.customer_id],
        planned_tons: parseFloat(formData.planned_tons),
        notes: formData.notes
      });
      setSuccess('Monthly Plan logged successfully.');
      setFormData(prev => ({ ...prev, customer_id: '', planned_tons: '', notes: '' }));
    } catch (err) {
      alert(`Failed to save: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) return <div className="text-danger">Error: {error}</div>;

  return (
    <div className="form-container max-w-2xl mx-auto">
      <h3 className="text-xl font-bold mb-md">Enter Monthly Delivery Plan</h3>
      
      {success && <div className="p-sm bg-success text-success mb-md rounded">{success}</div>}
      
      <form onSubmit={handleSubmit} className="card">
        <div className="grid-2-col gap-md mb-md">
          <div className="form-group">
            <label className="form-label">Target Month</label>
            <input 
              type="month" 
              className="form-control" 
              value={formData.month}
              onChange={(e) => setFormData({...formData, month: e.target.value})}
              required
            />
          </div>
          
          <MasterDataSelect 
            label="Customer"
            tableName={TABLE_NAMES.CUSTOMERS}
            value={formData.customer_id}
            onChange={(val) => setFormData({...formData, customer_id: val})}
            onSelectLabel={(label) => setSelectedLabels({ customer: label })}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group mb-md">
          <label className="form-label">Target Volume (Tons)</label>
          <input 
            type="number" 
            step="0.01"
            className="form-control" 
            placeholder="e.g. 1000"
            value={formData.planned_tons}
            onChange={(e) => setFormData({...formData, planned_tons: e.target.value})}
            required
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Notes (Optional)</label>
          <textarea 
            className="form-control" 
            rows="2"
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
          />
        </div>
        
        <div className="flex justify-between items-center mt-lg">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => setFormData(p => ({ ...p, customer_id: '', planned_tons: '', notes: '' }))}
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
        title="Confirm Monthly Plan"
        isSubmitting={isSubmitting}
        details={{
          'Target Month': formData.month,
          'Customer': selectedLabels.customer,
          'Planned Tons': `${formData.planned_tons} t`,
          'Notes': formData.notes || '(None)'
        }}
      />
    </div>
  );
}
