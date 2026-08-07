import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  generateCSV,
  generateXLSX,
  createCSVDownload,
  createXLSXDownload,
  makeFilename,
} from "@/lib/export";

describe("generateCSV", () => {
  it("quotes headers and cells, including numbers", () => {
    const csv = generateCSV({
      title: "Test",
      columns: [
        { key: "name", header: "Name" },
        { key: "age", header: "Age" },
      ],
      data: [
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
      ],
    });
    expect(csv).toBe('"Name","Age"\n"Alice","30"\n"Bob","25"\n');
  });

  it("escapes embedded quotes and commas", () => {
    const csv = generateCSV({
      title: "Test",
      columns: [{ key: "note", header: "Note" }],
      data: [{ note: 'He said "hi", ok' }],
    });
    expect(csv).toBe('"Note"\n"He said ""hi"", ok"\n');
  });

  it("emits subtitle as the first line and footer after a blank line", () => {
    const csv = generateCSV({
      title: "Test",
      subtitle: "Generated report",
      columns: [{ key: "x", header: "X" }],
      data: [{ x: 1 }],
      footer: "End of report",
    });
    expect(csv).toBe('"Generated report"\n"X"\n"1"\n\n"End of report"');
  });

  it("serializes Date cells to ISO strings", () => {
    const csv = generateCSV({
      title: "Test",
      columns: [{ key: "d", header: "Date" }],
      data: [{ d: new Date("2026-08-06T10:00:00.000Z") }],
    });
    expect(csv).toContain('"2026-08-06T10:00:00.000Z"');
  });

  it("applies column formatters", () => {
    const csv = generateCSV({
      title: "Test",
      columns: [{ key: "amount", header: "Amount", format: (v) => `Rs.${String(v)}` }],
      data: [{ amount: 100 }],
    });
    expect(csv).toContain('"Rs.100"');
  });
});

describe("generateXLSX", () => {
  it("returns a readable workbook with truncated sheet name", () => {
    const buf = generateXLSX({
      title: "A very long report title that definitely exceeds thirty one characters",
      columns: [
        { key: "a", header: "Alpha" },
        { key: "b", header: "Beta" },
      ],
      data: [
        { a: 1, b: "two" },
        { a: 3, b: "four" },
      ],
    });
    expect(buf).toBeInstanceOf(Buffer);

    const wb = XLSX.read(buf, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    expect(sheetName.length).toBeLessThanOrEqual(31);

    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
    expect(rows[0]).toEqual(["Alpha", "Beta"]);
    expect(rows[1]).toEqual([1, "two"]);
    expect(rows[2]).toEqual([3, "four"]);
  });

  it("writes the title row when a subtitle is present", () => {
    const buf = generateXLSX({
      title: "Report",
      subtitle: "Q3 summary",
      columns: [{ key: "a", header: "Alpha" }],
      data: [{ a: "x" }],
    });
    const wb = XLSX.read(buf, { type: "buffer" });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
    expect(rows[0]).toEqual(["Q3 summary"]);
    expect(rows[1]).toEqual([]);
    expect(rows[2]).toEqual(["Alpha"]);
    expect(rows[3]).toEqual(["x"]);
  });
});

describe("download helpers", () => {
  it("builds a CSV response with attachment headers", () => {
    const res = createCSVDownload("a,b\n1,2", "report");
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toContain('"report.csv"');
  });

  it("builds an XLSX response with attachment headers", () => {
    const res = createXLSXDownload(Buffer.from("data"), "report");
    expect(res.headers.get("content-type")).toContain("spreadsheetml.sheet");
    expect(res.headers.get("content-disposition")).toContain('"report.xlsx"');
  });
});

describe("makeFilename", () => {
  it("appends a timestamp and extension", () => {
    expect(makeFilename("members", "csv")).toMatch(/^members-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.csv$/);
    expect(makeFilename("payments", "xlsx")).toMatch(/\.xlsx$/);
  });
});
