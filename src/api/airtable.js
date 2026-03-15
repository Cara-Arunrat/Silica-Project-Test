import Airtable from 'airtable';

const pat = import.meta.env.VITE_AIRTABLE_PAT || 'placeholder';
const baseId = import.meta.env.VITE_AIRTABLE_BASE_ID || 'placeholder';

if (!import.meta.env.VITE_AIRTABLE_PAT || !import.meta.env.VITE_AIRTABLE_BASE_ID) {
  console.warn("Airtable environment variables are missing! Check Vercel Environment Variables.");
}

export const base = new Airtable({ apiKey: pat }).base(baseId);

export const TABLE_NAMES = {
  USERS: 'Users',
  SUPPLIERS: 'Suppliers',
  CUSTOMERS: 'Customers',
  VEHICLES: 'Vehicles',
  DRIVERS: 'Drivers',
  PRODUCT_GRADES: 'Product_Grades',
  PURCHASES: 'Purchase',
  DELIVERIES: 'Delivery',
  GASOLINE: 'Gasoline',
  PRODUCTION: 'Production_Records',
  PLAN: 'Monthly_Plan',
  GASOLINE_PURCHASES: 'Gasoline_purchase',
  RAW_MATERIALS: 'Raw_Materials'
};
