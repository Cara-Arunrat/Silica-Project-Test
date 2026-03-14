import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTransactions } from '../../api/hooks';
import { TABLE_NAMES } from '../../api/airtable';
import MasterDataSelect from '../../components/MasterDataSelect';
import ConfirmationModal from '../../components/ConfirmationModal';
import { Plus, Trash2 } from 'lucide-react';

export default function PurchaseForm() {
  const { user } = useAuth();
  const { addRecord, loading, error } = useTransactions(TABLE_NAMES.PURCHASES);
  
  const [header, setHeader] = useState({
    date: new Date().toISOString().split('T')[0],
    supplier_id: ''
  });

  const [rows, setRows] = useState([
    { tons_purchase: '', notes: '', tempId: Date.now() }
  ]);

  const [selectedLabels, setSelectedLabels] = useState({
    supplier: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState('');

  const addRow = () => {
    setRows([...rows, { tons_purchase: '', notes: '', tempId: Date.now() }]);
  };

  const removeRow = (id) => {
    if (rows.length > 1) {
      setRows(rows.filter(r => r.tempId !== id));
    }
  };

  const updateRow = (id, field, value) => {
    setRows(rows.map(r => r.tempId === id ? { ...r, [field]: value } : r));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!header.supplier_id) {
      alert("Please select a supplier.");
      return;
    }

    const invalid = rows.some(r => {
      const v = parseFloat(r.tons_purchase);
      return isNaN(v) || v <= 0;
    });

    if (invalid) {
      alert("All records must have a valid positive tonnage.");
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setIsSubmitting(true);
    setSuccess('');

    try {
      // Loop through rows and save each
      // Note: We do them sequentially for simplicity and to follow hook pattern
      for (const row of rows) {
        await addRecord({
          date: header.date,
          supplier_id: [header.supplier_id],
          tons_purchase: parseFloat(row.tons_purchase),
          notes: row.notes
        });
      }
      
      setSuccess(`${rows.length} purchase(s) recorded successfully.`);
      // Reset only rows, keep header (date/supplier) as per usual user preference for bulk entry
      setRows([{ tons_purchase: '', notes: '', tempId: Date.now() }]);
    } catch (err) {
      alert(`Failed to save: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) return <div className="text-danger">Error: {error}</div>;

  const totalTons = rows.reduce((sum, r) => sum + (parseFloat(r.tons_purchase) || 0), 0);

  return (
    <div className="form-container max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-md">
        <h3 className="text-xl font-bold">Bulk Purchase Entry</h3>
        {rows.length > 1 && (
          <span className="badge bg-primary-light text-primary font-bold px-md py-xs rounded">
            Total: {totalTons.toFixed(2)} tons
          </span>
        )}
      </div>
      
      {success && <div className="p-sm bg-success text-success mb-md rounded shadow-sm">{success}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-lg">
        {/* Header Section */}
        <div className="card bg-surface-variant">
          <p className="text-xs font-bold text-secondary uppercase mb-sm">General Information</p>
          <div className="grid-2-col gap-md">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input 
                type="date" 
                className="form-control" 
                value={header.date}
                onChange={(e) => setHeader({...header, date: e.target.value})}
                required
              />
            </div>
            
            <MasterDataSelect 
              label="Supplier"
              tableName={TABLE_NAMES.SUPPLIERS}
              value={header.supplier_id}
              onChange={(val) => setHeader({...header, supplier_id: val})}
              onSelectLabel={(label) => setSelectedLabels({ supplier: label })}
              required
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Rows Section */}
        <div className="card">
          <div className="flex justify-between items-center mb-md border-b border-border pb-sm">
            <p className="text-xs font-bold text-secondary uppercase">Purchase Records ({rows.length})</p>
          </div>

          <div className="space-y-md">
            {rows.map((row, index) => (
              <div key={row.tempId} className={`flex items-start gap-md p-md rounded border transition-colors ${isSubmitting ? 'opacity-50' : 'hover:bg-bg'}`} style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex-none pt-sm">
                  <span className="w-6 h-6 rounded-full bg-border flex items-center justify-center text-xs font-bold text-secondary">
                    {index + 1}
                  </span>
                </div>
                
                <div className="flex-1 grid-2-col gap-md">
                  <div className="form-group mb-0">
                    <label className="form-label text-xs">Tons (Required)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="form-control" 
                      placeholder="0.00"
                      value={row.tons_purchase}
                      onChange={(e) => updateRow(row.tempId, 'tons_purchase', e.target.value)}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="form-group mb-0">
                    <label className="form-label text-xs">Notes (Optional)</label>
                    <input 
                      type="text"
                      className="form-control" 
                      placeholder="Optional notes..."
                      value={row.notes}
                      onChange={(e) => updateRow(row.tempId, 'notes', e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {rows.length > 1 && (
                  <button 
                    type="button" 
                    className="btn btn-icon text-danger hover:bg-danger-light mt-lg"
                    onClick={() => removeRow(row.tempId)}
                    disabled={isSubmitting}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-lg pt-md border-t border-border flex justify-center">
             <button 
                type="button" 
                className="btn btn-secondary w-full max-w-xs flex items-center justify-center gap-sm"
                onClick={addRow}
                disabled={isSubmitting}
              >
                <Plus size={18} /> Add Another Row
              </button>
          </div>
        </div>
        
        <div className="flex justify-between items-center py-md">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => {
              if (window.confirm("Are you sure you want to clear all rows?")) {
                setRows([{ tons_purchase: '', notes: '', tempId: Date.now() }]);
              }
            }}
            disabled={isSubmitting}
          >
            Clear All
          </button>
          <button 
            type="submit" 
            className="btn btn-primary px-xl"
            disabled={isSubmitting || loading}
          >
            {isSubmitting ? 'Saving Records...' : `Review & Save ${rows.length} ${rows.length === 1 ? 'Record' : 'Records'}`}
          </button>
        </div>
      </form>

      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        title="Confirm Bulk Purchase"
        isSubmitting={isSubmitting}
        details={{
          'Date': header.date,
          'Supplier': selectedLabels.supplier,
          'Total Records': rows.length,
          'Combined Weight': `${totalTons.toFixed(2)} tons`
        }}
      >
        <div className="mt-md max-h-40 overflow-y-auto border rounded p-sm bg-bg">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b">
                <th className="py-xs">Row</th>
                <th className="py-xs">Tons</th>
                <th className="py-xs">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.tempId} className="border-b last:border-0">
                  <td className="py-xs font-bold text-secondary">{i+1}</td>
                  <td className="py-xs">{r.tons_purchase} t</td>
                  <td className="py-xs italic text-secondary">{r.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ConfirmationModal>
      
      <style>{`
        .grid-2-col { display: grid; grid-template-columns: 1fr; }
        @media (min-width: 640px) {
          .grid-2-col { grid-template-columns: 1fr 1fr; }
        }
        .max-w-4xl { max-width: 56rem; }
        .bg-surface-variant { background-color: rgba(0,0,0,0.02); }
        .space-y-lg > * + * { margin-top: var(--spacing-lg); }
        .space-y-md > * + * { margin-top: var(--spacing-md); }
        .bg-primary-light { background-color: var(--primary-bg); }
        .btn-icon { padding: 8px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .max-h-40 { max-height: 10rem; }
      `}</style>
    </div>
  );
}
