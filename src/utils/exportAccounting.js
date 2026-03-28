import * as XLSX from 'xlsx';

/**
 * Export data to .xlsx format
 * @param {string} sheetName - Name of the sheet
 * @param {string[]} headers - Column headers
 * @param {Array<Array>} rows - Row data (array of arrays)
 * @param {string} fileName - File name without extension
 */
export function exportToXlsx(sheetName, headers, rows, fileName) {
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Auto-width columns
  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map(r => String(r[i] ?? '').length)
    );
    return { wch: Math.min(maxLen + 4, 40) };
  });
  ws['!cols'] = colWidths;

  // Bold header row
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) {
      ws[addr].s = { font: { bold: true } };
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31)); // Sheet name max 31 chars
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
