import Airtable from 'airtable';

const pat = import.meta.env.VITE_AIRTABLE_PAT;
const baseId = import.meta.env.VITE_AIRTABLE_BASE_ID;

if (!pat || !baseId) {
  console.error("Missing Airtable environment variables: VITE_AIRTABLE_PAT or VITE_AIRTABLE_BASE_ID");
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
  PLAN: 'Monthly_Plan'
};
