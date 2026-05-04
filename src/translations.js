// Central translation dictionary mapping English keys to Thai UI strings
export const translations = {
  sidebar_menu: {
    "Dashboard": "สรุปข้อมูล",
    "Inputs": "ฟอร์มกรอกข้อมูล",
    "Inputs 2": "ฟอร์มกรอกข้อมูล 2",
    "History": "ข้อมูลย้อนหลัง",
    "Accounting": "บัญชี",
    "Master Data": "ข้อมูลหลัก",
    "Test Sieve Result": "ผลการทดสอบทราย",
    "Logout": "ออกจากระบบ"
  },
  tabs: {
    "Daily Data Entry": "ฟอร์มกรอกข้อมูล",
    "Purchase": "วัตถุดิบเข้า",
    "Deliveries": "ใบส่งสินค้า",
    "Gasoline Purchase": "น้ำมันเข้าออก",
    "Gasoline Usage": "ส่งรายบุคคล",
    "Monthly Plans": "แผนส่งทราย",
    "Cert. Reminder": "ใบอนุญาติ",
    "Test Sieve": "ทดสอบทราย",
    "Manager Inputs": "ส่วนของผู้จัดการ",
    "Vehicles": "จัดการรถบรรทุก"
  },
  purchase_form: {
    "Bulk Purchase Entry": "เพิ่มข้อมูลวัตถุดิบเข้า",
    "Date": "วันที่",
    "Supplier": "ชื่อท่าทราย",
    "Supplier Selection": "เลือกชื่อท่าทราย",
    "Purchase records": "รายการที่ซื้อเข้า",
    "Raw Material": "วัตถุดิบ",
    "Tons (Required)": "จำนวนตัน",
    "Price per unit (Baht)": "ราคาต่อหน่วย (บาท)",
    "Total Cost": "รวมต่อเที่ยว",
    "Note (Optional)": "หมายเหตุ",
    "Add Another Row": "เพิ่มรายการ",
    "Clear All": "ลบรายการทั้งหมด",
    "Review & Save": "ยืนยัน"
  },
  delivery_form: {
    "Record Delivery": "บันทึกใบส่งสินค้า",
    "Date": "วันที่ส่ง",
    "Customer": "สถานที่ส่ง",
    "Product Grade": "เกรดสินค้า",
    "Vehicle": "รถบรรทุก",
    "Driver": "พนักงานขับรถ",
    "Net Weight Delivered (Kg)": "จำนวนตัน (ก.ก.)",
    "Delivery Certificate No.": "เลขที่ใบขน",
    "Weighing Sequence No.": "ลำดับที่ชั่ง",
    "Notes (Optional)": "หมายเหตุ",
    "Review & Save": "ยืนยัน"
  },
  common_ui: {
    "Clear": "ล้างข้อมูล",
    "Back": "ย้อนกลับ",
    "Confirm": "ตกลง",
    "Cancel": "ยกเลิก",
    "Loading...": "กำลังโหลด...",
    "Success": "บันทึกข้อมูลสำเร็จ",
    "Error": "เกิดข้อผิดพลาด",
    "Save": "บันทึก",
    "Edit": "แก้ไข",
    "Delete": "ลบ"
  }
};

/**
 * Helper function to retrieve a translation.
 * Usage: t('purchase_form', 'Date') -> "วันที่"
 */
export const t = (section, key) => {
  if (translations[section] && translations[section][key]) {
    return translations[section][key];
  }
  console.warn(`Translation missing for [${section}][${key}]`);
  return key; // Fallback to English key if not found
};
