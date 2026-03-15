import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTransactions, useMasterData } from '../../api/hooks';
import { TABLE_NAMES } from '../../api/airtable';
import MasterDataSelect from '../../components/MasterDataSelect';
import ConfirmationModal from '../../components/ConfirmationModal';
import { Plus, Trash2, Calculator } from 'lucide-react';

export default function PurchaseForm() {
  const { user } = useAuth();
  const { addRecord, loading: submitLoading, error: submitError } = useTransactions(TABLE_NAMES.PURCHASES);
  
  // Fetch master data for Suppliers and Raw Materials
  const { data: suppliers, loading: suppliersLoading } = useMasterData(TABLE_NAMES.SUPPLIERS, true);
  const { data: rawMaterials, loading: materialsLoading } = useMasterData(TABLE_NAMES.RAW_MATERIALS, true);

  const [header, setHeader] = useState({
    date: new Date().toISOString().split('T')[0],
    supplier_id: '',
    material_id: '',
    price_per_unit: 0
  });

  const [rows, setRows] = useState([
    { tons_purchase: '', total_cost: 0, notes: '', tempId: Date.now() }
  ]);

  const [selectedLabels, setSelectedLabels] = useState({
    supplier: '',
    material: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState('');

  // Handle Material Selection and Price Lookup
  const handleMaterialChange = (id) => {
    const material = rawMaterials.find(m => m._id === id);
    const price = material ? (material.Price_per_unit || material.price_per_unit || 0) : 0;
    const name = material ? (material.product_code || material.Name || '') : '';
    
    setHeader(prev => ({ ...prev, material_id: id, price_per_unit: price }));
    setSelectedLabels(prev => ({ ...prev, material: name }));
    
    // Recalculate all row costs based on new price
    setRows(prevRows => prevRows.map(row => ({
      ...row,
      total_cost: (parseFloat(row.tons_purchase) || 0) * price
    })));
  };

  const addRow = () => {
    setRows([...rows, { tons_purchase: '', total_cost: 0, notes: '', tempId: Date.now() }]);
  };

  const removeRow = (id) => {
    if (rows.length > 1) {
      setRows(rows.filter(r => r.tempId !== id));
    }
  };

  const updateRow = (id, field, value) => {
    setRows(rows.map(r => {
      if (r.tempId === id) {
        const updated = { ...r, [field]: value };
        if (field === 'tons_purchase') {
          updated.total_cost = (parseFloat(value) || 0) * header.price_per_unit;
        }
        return updated;
      }
      return r;
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!header.supplier_id) {
      alert("Please select a supplier.");
      return;
    }

    if (!header.material_id) {
      alert("Please select a raw material.");
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
      for (const row of rows) {
        await addRecord({
          date: header.date,
          supplier_id: [header.supplier_id],
          material_id: [header.material_id],
          tons_purchase: parseFloat(row.tons_purchase),
          price_per_unit: header.price_per_unit,
          total_cost: row.total_cost,
          notes: row.notes
        });
      }
      
      setSuccess(`${rows.length} purchase(s) recorded successfully.`);
      setRows([{ tons_purchase: '', total_cost: 0, notes: '', tempId: Date.now() }]);
    } catch (err) {
      alert(`Failed to save: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalTons = rows.reduce((sum, r) => sum + (parseFloat(r.tons_purchase) || 0), 0);
  const totalCostCombined = rows.reduce((sum, r) => sum + (r.total_cost || 0), 0);

  return (
    <div className="form-container max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-md">
        <h3 className="text-xl font-bold">Purchase Order Entry</h3>
        <div className="flex gap-sm">
          {totalTons > 0 && (
            <span className="badge bg-primary-light text-primary font-bold px-md py-xs rounded flex items-center gap-xs shadow-sm">
              {totalTons.toFixed(2)} tons
            </span>
          )}
          {totalCostCombined > 0 && (
            <span className="badge bg-success-light text-success font-bold px-md py-xs rounded flex items-center gap-xs shadow-sm">
              ฿{totalCostCombined.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
      </div>
      
      {success && <div className="p-md bg-success text-success mb-md rounded shadow-sm border border-success-light flex items-center gap-sm">
        <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
        {success}
      </div>}
      
      <form onSubmit={handleSubmit} className="space-y-lg">
        {/* Header Section */}
        <div className="card bg-surface-variant overflow-hidden">
          <div className="p-md border-b border-border bg-bg-light">
             <p className="text-xs font-bold text-secondary uppercase">General Information</p>
          </div>
          <div className="p-md">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-lg">
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
                label="Select Raw Material"
                tableName={TABLE_NAMES.RAW_MATERIALS}
                value={header.material_id}
                onChange={handleMaterialChange}
                required
                disabled={isSubmitting}
              />

              <div className="form-group">
                <label className="form-label">Price per unit (Baht)</label>
                <div className="form-control bg-bg flex items-center font-bold text-primary">
                  {header.price_per_unit > 0 ? `฿ ${header.price_per_unit.toFixed(2)}` : 'Select material...'}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label mb-sm">Supplier Selection</label>
              {suppliersLoading ? (
                <div className="text-secondary text-sm animate-pulse">Loading suppliers...</div>
              ) : (
                <div className="flex flex-wrap gap-sm">
                  {suppliers.map(s => (
                    <label key={s._id} className="cursor-pointer group">
                      <input 
                        type="radio"
                        name="supplier"
                        className="hidden"
                        value={s._id}
                        checked={header.supplier_id === s._id}
                        onChange={() => {
                          setHeader({ ...header, supplier_id: s._id });
                          setSelectedLabels({ ...selectedLabels, supplier: s.supplier_name || s.Name });
                        }}
                        disabled={isSubmitting}
                      />
                      <div className={`px-lg py-sm rounded-lg border transition-all duration-200 ${
                        header.supplier_id === s._id 
                          ? 'bg-primary text-white border-primary shadow-md transform scale-105' 
                          : 'bg-surface text-secondary border-border hover:border-primary-light hover:bg-bg-light'
                      } font-medium text-sm`}>
                        {s.supplier_name || s.Name}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rows Section */}
        <div className="card shadow-sm border border-border">
          <div className="px-md py-sm border-b border-border bg-bg-light flex justify-between items-center">
            <p className="text-xs font-bold text-secondary uppercase tracking-wider text-opacity-70">Purchase Records ({rows.length})</p>
          </div>

          <div className="p-md space-y-md">
            {rows.map((row, index) => (
              <div key={row.tempId} className={`flex flex-col sm:flex-row items-stretch gap-md p-md rounded-xl border transition-all duration-300 ${isSubmitting ? 'opacity-50' : 'hover:border-primary-light hover:shadow-md'} bg-surface`} style={{ borderColor: 'var(--border-color)' }}>
                <div className="hidden sm:flex flex-none items-center justify-center">
                  <span className="w-8 h-8 rounded-lg bg-bg border border-border flex items-center justify-center text-xs font-bold text-secondary">
                    {index + 1}
                  </span>
                </div>
                
                <div className="flex-1 purchase-row-entry">
                  <div className="form-group mb-0 col-tons">
                    <label className="form-label text-[10px] uppercase font-bold text-secondary truncate">Tons</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="form-control font-medium text-sm" 
                      placeholder="0.00"
                      value={row.tons_purchase}
                      onChange={(e) => updateRow(row.tempId, 'tons_purchase', e.target.value)}
                      required
                      disabled={isSubmitting}
                      style={{ height: '38px' }}
                    />
                  </div>

                  <div className="form-group mb-0 col-cost">
                    <label className="form-label text-[10px] uppercase font-bold text-secondary truncate">Total Cost</label>
                    <div className="form-control bg-bg-light flex items-center font-bold text-sm text-primary border-dashed" style={{ height: '38px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                       ฿ {row.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="form-group mb-0 col-notes">
                    <label className="form-label text-[10px] uppercase font-bold text-secondary truncate">Notes</label>
                    <input 
                      type="text"
                      className="form-control text-sm" 
                      placeholder="Optional notes..."
                      value={row.notes}
                      onChange={(e) => updateRow(row.tempId, 'notes', e.target.value)}
                      disabled={isSubmitting}
                      style={{ height: '38px' }}
                    />
                  </div>
                </div>

                <div className="flex items-end pb-xs">
                  {rows.length > 1 && (
                    <button 
                      type="button" 
                      className="btn btn-icon text-danger hover:bg-danger-light transition-colors p-sm rounded-lg"
                      onClick={() => removeRow(row.tempId)}
                      disabled={isSubmitting}
                      title="Remove Row"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="px-md py-md bg-bg-light border-t border-border flex justify-center">
             <button 
                type="button" 
                className="btn btn-secondary w-full max-w-sm flex items-center justify-center gap-sm font-bold shadow-sm"
                onClick={addRow}
                disabled={isSubmitting}
              >
                <Plus size={20} /> Add New Record
              </button>
          </div>
        </div>
        
        <div className="flex justify-between items-center py-lg pt-0">
          <button 
            type="button" 
            className="btn btn-secondary text-danger border-danger hover:bg-danger-light"
            onClick={() => {
              if (window.confirm("Are you sure you want to clear all operational rows?")) {
                setRows([{ tons_purchase: '', total_cost: 0, notes: '', tempId: Date.now() }]);
              }
            }}
            disabled={isSubmitting}
          >
            Clear Records
          </button>
          <button 
            type="submit" 
            className="btn btn-primary px-xl py-md font-bold text-lg shadow-lg transform active:scale-95 transition-all"
            disabled={isSubmitting || submitLoading || suppliersLoading || materialsLoading}
          >
            {isSubmitting ? 'Processing...' : `Confirm & Save ${rows.length} ${rows.length === 1 ? 'Record' : 'Records'}`}
          </button>
        </div>
      </form>

      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        title="Final Review: Purchase Entry"
        isSubmitting={isSubmitting}
        details={{
          'Date': header.date,
          'Supplier': selectedLabels.supplier,
          'Material': selectedLabels.material,
          'Unit Price': `฿ ${header.price_per_unit.toFixed(2)}`,
          'Combined Weight': `${totalTons.toFixed(2)} tons`,
          'Total Valuation': `฿ ${totalCostCombined.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
        }}
      >
        <div className="mt-md max-h-48 overflow-y-auto border rounded-xl p-sm bg-bg shadow-inner">
          <table className="w-full text-xs text-left">
            <thead className="sticky top-0 bg-bg border-b">
              <tr className="text-secondary opacity-70">
                <th className="py-xs px-sm">#</th>
                <th className="py-xs">Quantity</th>
                <th className="py-xs">Row Cost</th>
                <th className="py-xs">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.tempId} className="border-b last:border-0 hover:bg-bg-light transition-colors">
                  <td className="py-sm px-sm font-bold text-secondary">{i+1}</td>
                  <td className="py-sm font-medium">{r.tons_purchase} t</td>
                  <td className="py-sm font-black text-primary">฿{r.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="py-sm italic text-secondary text-[10px]">{r.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ConfirmationModal>
      
      <style>{`
        .max-w-5xl { max-width: 64rem; }
        .bg-surface-variant { background-color: rgba(var(--primary-rgb), 0.02); border: 1px solid var(--border-color); border-radius: var(--border-radius-lg); }
        .bg-bg-light { background-color: rgba(var(--primary-rgb), 0.04); }
        .bg-success-light { background-color: rgba(34, 197, 94, 0.1); }
        .badge { display: inline-flex; items-center; }
        .form-control.bg-bg { border-style: solid; }
        .shadow-inner { box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06); }
        
        .purchase-row-entry {
          display: flex;
          gap: 12px;
          align-items: flex-end;
          width: 100%;
        }
        .col-tons { flex: 0 0 110px; }
        .col-cost { flex: 0 0 160px; }
        .col-notes { flex: 1; min-width: 0; }
        @media (max-width: 640px) {
          .purchase-row-entry { flex-direction: column; align-items: stretch; }
          .col-tons, .col-cost { flex: 1; }
        }
      `}</style>
    </div>
  );
}
