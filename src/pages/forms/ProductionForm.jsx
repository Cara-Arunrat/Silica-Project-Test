import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTransactions } from '../../api/hooks';
import { TABLE_NAMES } from '../../api/airtable';
import MasterDataSelect from '../../components/MasterDataSelect';
import ConfirmationModal from '../../components/ConfirmationModal';

export default function ProductionForm() {
  const { user } = useAuth();
  const { addRecord, loading, error } = useTransactions(TABLE_NAMES.PRODUCTION);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    raw_input_tons: '',
    output_tons: '',
    notes: ''
  });
  
  // Auto-calculated
  const [yieldPercent, setYieldPercent] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const input = parseFloat(formData.raw_input_tons);
    const output = parseFloat(formData.output_tons);
    
    if (!isNaN(input) && !isNaN(output) && input > 0) {
      setYieldPercent(((output / input) * 100).toFixed(2));
    } else {
      setYieldPercent('');
    }
  }, [formData.raw_input_tons, formData.output_tons]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const input = parseFloat(formData.raw_input_tons);
    const output = parseFloat(formData.output_tons);

    if (isNaN(input) || isNaN(output) || input <= 0 || output < 0) {
      alert("Please enter valid positive numbers for tons.");
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
        raw_input_tons: parseFloat(formData.raw_input_tons),
        output_tons: parseFloat(formData.output_tons),
        yield_percent: parseFloat(yieldPercent),
        notes: formData.notes
      });
      setSuccess('Production record saved successfully.');
      setFormData(prev => ({ ...prev, raw_input_tons: '', output_tons: '', notes: '' }));
    } catch (err) {
      alert(`Failed to save: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) return <div className="text-danger">Error: {error}</div>;

  return (
    <div className="form-container max-w-2xl mx-auto">
      <h3 className="text-xl font-bold mb-md">Record Daily Production</h3>
      
      {success && <div className="p-sm bg-success text-success mb-md rounded">{success}</div>}
      
      <form onSubmit={handleSubmit} className="card">
        <div className="form-group mb-md">
          <label className="form-label">Date</label>
          <input 
            type="date" 
            className="form-control" 
            value={formData.date}
            onChange={(e) => setFormData({...formData, date: e.target.value})}
            required
            style={{ maxWidth: '200px' }}
          />
        </div>

        <div className="grid-2-col gap-md mb-md">
          <div className="form-group">
            <label className="form-label">Raw Input (Tons)</label>
            <input 
              type="number" 
              step="0.01"
              className="form-control" 
              placeholder="e.g. 100"
              value={formData.raw_input_tons}
              onChange={(e) => setFormData({...formData, raw_input_tons: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Output (Tons)</label>
            <input 
              type="number" 
              step="0.01"
              className="form-control" 
              placeholder="e.g. 85"
              value={formData.output_tons}
              onChange={(e) => setFormData({...formData, output_tons: e.target.value})}
              required
            />
          </div>
        </div>
        
        <div className="form-group mb-md p-md" style={{ backgroundColor: 'var(--bg-color)', borderRadius: 'var(--border-radius)' }}>
          <label className="form-label">Production Yield %</label>
          <input 
            type="text" 
            className="form-control font-bold" 
            value={yieldPercent ? `${yieldPercent} %` : ''}
            disabled
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Notes / Downtime Issues (Optional)</label>
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
            onClick={() => setFormData(p => ({ ...p, raw_input_tons: '', output_tons: '', notes: '' }))}
            disabled={isSubmitting}
          >
            Clear
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isSubmitting || loading || !yieldPercent}
          >
            {isSubmitting ? 'Saving...' : 'Review & Save'}
          </button>
        </div>
      </form>

      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        title="Confirm Production Log"
        isSubmitting={isSubmitting}
        details={{
          'Date': formData.date,
          'Raw Input': `${formData.raw_input_tons} t`,
          'Output Tons': `${formData.output_tons} t`,
          'Yield %': `${yieldPercent} %`,
          'Notes': formData.notes || '(None)'
        }}
      />
    </div>
  );
}
