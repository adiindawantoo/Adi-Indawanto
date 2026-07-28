import * as XLSX from 'xlsx';

/**
 * Helper untuk mengekspor array objek ke file Excel (.xlsx) secara client-side.
 */
export function exportToExcel(data: any[], fileName: string, sheetName: string = 'Data') {
  // Buat worksheet dari JSON data
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Buat workbook baru
  const wb = XLSX.utils.book_new();
  
  // Tambahkan worksheet ke dalam workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Tulis file dan unduh di browser
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
