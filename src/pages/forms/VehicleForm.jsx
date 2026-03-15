import React, { useState } from 'react';
import { useMasterData } from '../../api/hooks';
import { TABLE_NAMES } from '../../api/airtable';
import ConfirmationModal from '../../components/ConfirmationModal';

export default function VehicleForm() {
  const { addRecord, loading, error } = useMasterData(TABLE_NAMES.VEHICLES);
  const [formData, setFormData] = useState({
    vehicle_name: '',
    vehicle_type: '',
    truck_plate: '',
    trailer_plate: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.vehicle_name.trim()) {
      alert("Please enter a Vehicle Name.");
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
        vehicle_name: formData.vehicle_name.trim(),
        vehicle_type: formData.vehicle_type.trim(),
        truck_plate: formData.truck_plate.trim(),
        trailer_plate: formData.trailer_plate.trim()
      });
      setSuccess('Vehicle information saved successfully.');
      setFormData({
        vehicle_name: '',
        vehicle_type: '',
        truck_plate: '',
        trailer_plate: ''
      });
    } catch (err) {
      alert(`Failed to save: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) return <div className="text-danger">Error: {error}</div>;

  return (
    <div className="form-container max-w-2xl mx-auto">
      <h3 className="text-xl font-bold mb-md">Add New Vehicle</h3>
      
      {success && <div className="p-sm bg-success text-success mb-md rounded">{success}</div>}
      
      <form onSubmit={handleSubmit} className="card">
        <div className="grid-2-col gap-md mb-md">
          <div className="form-group">
            <label className="form-label">Vehicle Name</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. Truck 01"
              value={formData.vehicle_name}
              onChange={(e) => setFormData({...formData, vehicle_name: e.target.value})}
              required
              disabled={isSubmitting}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Vehicle Type</label>
            <div className="flex flex-wrap gap-sm mt-xs">
              {['รถพ่วง/เทรลเล่อ', 'แบคโฮ', 'รถตัก'].map(type => (
                <label key={type} className="flex items-center gap-xs cursor-pointer group">
                  <input 
                    type="radio"
                    className="hidden"
                    name="vehicle_type"
                    value={type}
                    checked={formData.vehicle_type === type}
                    onChange={(e) => setFormData({...formData, vehicle_type: e.target.value})}
                    disabled={isSubmitting}
                  />
                  <div className={`px-md py-xs rounded-md border transition-all ${
                    formData.vehicle_type === type 
                      ? 'bg-primary text-white border-primary shadow-sm' 
                      : 'bg-surface text-secondary border-border hover:border-primary-light'
                  }`} style={{ fontSize: '14px', fontWeight: 500 }}>
                    {type}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="grid-2-col gap-md mb-md">
          <div className="form-group">
            <label className="form-label">Truck Plate</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. 70-1234"
              value={formData.truck_plate}
              onChange={(e) => setFormData({...formData, truck_plate: e.target.value})}
              disabled={isSubmitting}
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Trailer Plate</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. 70-5678"
              value={formData.trailer_plate}
              onChange={(e) => setFormData({...formData, trailer_plate: e.target.value})}
              disabled={isSubmitting}
            />
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-lg">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => setFormData({ vehicle_name: '', vehicle_type: '', truck_plate: '', trailer_plate: '' })}
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
        title="Confirm Vehicle Information"
        isSubmitting={isSubmitting}
        details={{
          'Vehicle Name': formData.vehicle_name,
          'Vehicle Type': formData.vehicle_type || '(Not selected)',
          'Truck Plate': formData.truck_plate || '(None)',
          'Trailer Plate': formData.trailer_plate || '(None)'
        }}
      />
    </div>
  );
}
