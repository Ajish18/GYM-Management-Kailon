import * as XLSX from "xlsx";

/** Column definition for a report export */
export interface ExportColumn<T = Record<string, unknown>> {
  /** Unique key matching the data property */
  key: string;
  /** Column header label */
  header: string;
  /** Optional formatter for the cell value */
  format?: (value: T[keyof T], row: T) => string | number | Date;
  /** Optional width hint for Excel (approximate characters) */
  width?: number;
}

/** Options for generating exports */
export interface ExportOptions<T = Record<string, unknown>> {
  /** Report title (used as sheet name and filename base) */
  title: string;
  /** Column definitions */
  columns: ExportColumn<T>[];
  /** Data rows */
  data: T[];
  /** Optional subtitle / description row */
  subtitle?: string;
  /** Optional footer note */
  footer?: string;
}

/** Convert data to CSV string */
export function generateCSV<T extends Record<string, unknown>>(
  options: ExportOptions<T>
): string {
  const { columns, data, subtitle, footer } = options;

  const headers = columns.map((c) => c.header);
  const rows = data.map((row) =>
    columns.map((col) => {
      const value = row[col.key] as T[keyof T];
      if (col.format) return col.format(value, row);
      if (value instanceof Date) return value.toISOString();
      if (typeof value === "object" && value !== null) return JSON.stringify(value);
      return value ?? "";
    })
  );

  let csv = "";
  if (subtitle) {
    csv += `"${subtitle}"\n`;
  }
  csv += headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(",") + "\n";
  for (const row of rows) {
    csv += row
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(",") + "\n";
  }
  if (footer) {
    csv += `\n"${footer}"`;
  }

  return csv;
}

/** Convert data to XLSX (Excel) buffer */
export function generateXLSX<T extends Record<string, unknown>>(
  options: ExportOptions<T>
): Buffer {
  const { columns, data, title, subtitle, footer } = options;

  const workbook = XLSX.utils.book_new();

  // Prepare data array for sheet
  const headers = columns.map((c) => c.header);
  const rows = data.map((row) =>
    columns.map((col) => {
      const value = row[col.key] as T[keyof T];
      if (col.format) return col.format(value, row);
      return value ?? "";
    })
  );

  // Build sheet data with optional subtitle and footer
  const sheetData: (string | number | Date)[][] = [];

  if (subtitle) {
    sheetData.push([subtitle]);
    sheetData.push([]); // blank row
  }

  sheetData.push(headers);
  sheetData.push(...(rows as (string | number | Date)[][]));

  if (footer) {
    sheetData.push([]);
    sheetData.push([footer]);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Set column widths
  const colWidths = columns.map((c) => ({ wch: c.width ?? Math.max(c.header.length, 12) }));
  worksheet["!cols"] = colWidths;

  // Style header row (bold)
  const headerRange = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
  for (let C = headerRange.s.c; C <= headerRange.e.c; C++) {
    const cellAddr = XLSX.utils.encode_cell({ r: subtitle ? 2 : 0, c: C });
    if (worksheet[cellAddr]) {
      worksheet[cellAddr].s = { font: { bold: true } };
    }
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, title.slice(0, 31)); // Excel sheet name limit

  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

/** Create a download response for CSV */
export function createCSVDownload(
  csv: string,
  filename: string
): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}

/** Create a download response for XLSX */
export function createXLSXDownload(
  buffer: Buffer,
  filename: string
): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
    },
  });
}

/** Generate filename with timestamp */
export function makeFilename(base: string, extension: "csv" | "xlsx"): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-");
  return `${base}-${timestamp}.${extension}`;
}