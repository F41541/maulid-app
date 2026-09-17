import * as XLSX from "xlsx";

/**
 * Mitigasi Formula Injection (CSV / Excel Injection)
 * Karakter awalan formula: '=', '+', '-', '@' diprefix tanda kutip tunggal "'"
 */
export function sanitizeFormula<T>(val: T): T | string {
  if (typeof val === "string" && ["=", "+", "-", "@"].includes(val.charAt(0))) {
    return `'${val}`;
  }
  return val;
}

export interface ExcelExportOptions {
  sheetName: string;
  fileName: string;
  data: (string | number | boolean | null | undefined)[][];
}

export function exportToExcel({ sheetName, fileName, data }: ExcelExportOptions): void {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`);
}
