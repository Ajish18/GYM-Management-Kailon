"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { CheckCircle2, FileSpreadsheet, Loader2, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BULK_IMPORT_MAX_ROWS } from "@/lib/validations/members";
import { bulkImportMembersAction } from "@/lib/actions/bulk-import.actions";
import { cn } from "@/lib/utils";

type Gender = "MALE" | "FEMALE" | "OTHER" | "UNDISCLOSED";

type PreviewRow = {
  name: string;
  phone: string;
  email: string;
  gender: Gender;
  dob: string;
  error?: string;
};

const GENDER_ALIASES: Record<string, Gender> = {
  male: "MALE",
  m: "MALE",
  female: "FEMALE",
  f: "FEMALE",
  other: "OTHER",
  o: "OTHER",
  undisclosed: "UNDISCLOSED",
};

// Header key → canonical field. Keys are lowercased + non-alphanumeric stripped.
const FIELD_ALIASES: Record<string, string> = {
  name: "name",
  fullname: "name",
  membername: "name",
  member: "name",
  phone: "phone",
  phonenumber: "phone",
  mobile: "phone",
  mobilenumber: "phone",
  contact: "phone",
  contactnumber: "phone",
  email: "email",
  emailaddress: "email",
  gender: "gender",
  sex: "gender",
  dob: "dob",
  dateofbirth: "dob",
  birthdate: "dob",
  birthday: "dob",
  emergencycontactname: "emergencyContactName",
  emergencyname: "emergencyContactName",
  contactperson: "emergencyContactName",
  emergencycontactphone: "emergencyContactPhone",
  emergencyphone: "emergencyContactPhone",
  healthnotes: "healthNotes",
  notes: "healthNotes",
  medicalnotes: "healthNotes",
};

function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function formatDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    const d = XLSX.SSF.parse_date_code(value);
    if (d) {
      return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
    return String(value);
  }
  if (typeof value === "string") return value.trim();
  return "";
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function parseRows(sheet: XLSX.WorkSheet): PreviewRow[] {
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return json.map((raw) => {
    const pick = (field: string) => {
      for (const [key, val] of Object.entries(raw)) {
        if (FIELD_ALIASES[normalizeKey(key)] === field && cellText(val)) return val;
      }
      return "";
    };

    const genderRaw = normalizeKey(cellText(pick("gender")));
    const gender: Gender = GENDER_ALIASES[genderRaw] ?? "UNDISCLOSED";

    return {
      name: cellText(pick("name")),
      phone: cellText(pick("phone")),
      email: cellText(pick("email")),
      gender,
      dob: formatDate(pick("dob")),
    };
  });
}

function validateRow(row: PreviewRow): string | undefined {
  if (row.name.length < 2) return "Name is required";
  if (row.phone.length < 7) return "Enter a valid phone number";
  if (!/^[0-9+\-\s()]+$/.test(row.phone)) return "Enter a valid phone number";
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) return "Invalid email";
  return undefined;
}

const TEMPLATE_HEADER = "name,phone,email,gender,dob,emergencyContactName,emergencyContactPhone,healthNotes";
const TEMPLATE_ROW = "Priya Sharma,9876543210,priya@email.com,FEMALE,1995-04-12,,,";

function downloadTemplate() {
  const blob = new Blob([`${TEMPLATE_HEADER}\n${TEMPLATE_ROW}\n`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "members-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function BulkImportMembers() {
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: { row: number; message: string }[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const validated = useMemo(() => rows.map((r) => ({ ...r, error: validateRow(r) })), [rows]);
  const validCount = validated.filter((r) => !r.error).length;

  async function onFile(file: File) {
    setResult(null);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const workbook = XLSX.read(buf, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) {
        toast.error("No sheet found in the file");
        setRows([]);
        return;
      }
      const parsed = parseRows(sheet).filter((r) => r.name || r.phone);
      if (parsed.length > BULK_IMPORT_MAX_ROWS) {
        toast.error(`File has ${parsed.length} rows — first ${BULK_IMPORT_MAX_ROWS} will be imported`);
        parsed.length = BULK_IMPORT_MAX_ROWS;
      }
      setRows(parsed);
      if (parsed.length === 0) toast.error("No rows found — check the file has a header row");
    } catch {
      toast.error("Could not read that file. Use .csv or .xlsx");
      setRows([]);
    }
  }

  async function onImport() {
    const payload = validated.filter((r) => !r.error).map((r) => ({ ...r }));
    if (payload.length === 0) return;
    setImporting(true);
    const res = await bulkImportMembersAction(payload);
    setImporting(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    setResult(res.data);
    toast.success(`${res.data.created} member${res.data.created === 1 ? "" : "s"} imported`);
    router.refresh();
  }

  function onReset() {
    setRows([]);
    setFileName(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Upload a member list
          </CardTitle>
          <CardDescription>
            Import from a <span className="font-medium">.csv</span> or{" "}
            <span className="font-medium">.xlsx</span> file. Include a header row with columns like{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">name, phone, email, gender, dob</code>.
            Up to {BULK_IMPORT_MAX_ROWS} rows per import.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={importing}>
              <Upload className="h-4 w-4" />
              {fileName ? "Choose another file" : "Choose file"}
            </Button>
            <Button variant="ghost" onClick={downloadTemplate}>
              Download template
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
          </div>
          {fileName && (
            <p className="text-sm text-muted-foreground">
              {fileName} —{" "}
              <span className={cn(validCount > 0 ? "text-success" : "text-destructive")}>
                {validCount} valid
              </span>{" "}
              / {validated.length} rows
            </p>
          )}
        </CardContent>
      </Card>

      {validated.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Preview</CardTitle>
              <CardDescription>Review before importing. Invalid rows are skipped.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onReset} disabled={importing}>
                Clear
              </Button>
              <Button size="sm" onClick={onImport} disabled={importing || validCount === 0}>
                {importing && <Loader2 className="h-4 w-4 animate-spin" />}
                Import {validCount} member{validCount === 1 ? "" : "s"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[28rem] overflow-auto rounded-2xl border">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead className="w-14">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>DOB</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validated.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{r.name || "—"}</TableCell>
                      <TableCell className="tabular-nums">{r.phone || "—"}</TableCell>
                      <TableCell>{r.email || "—"}</TableCell>
                      <TableCell className="capitalize">{r.gender.toLowerCase()}</TableCell>
                      <TableCell className="tabular-nums">{r.dob || "—"}</TableCell>
                      <TableCell>
                        {r.error ? (
                          <Badge variant="destructive" className="gap-1 whitespace-nowrap">
                            <XCircle className="h-3 w-3" />
                            {r.error}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1 text-success">
                            <CheckCircle2 className="h-3 w-3" />
                            Ready
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-1 py-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <p className="mt-2 font-semibold">
              {result.created} member{result.created === 1 ? "" : "s"} imported
            </p>
            <p className="text-sm text-muted-foreground">
              {result.errors.length > 0
                ? `${result.errors.length} row${result.errors.length === 1 ? " was" : "s were"} skipped`
                : "All rows imported successfully"}
            </p>
            {result.errors.length > 0 && (
              <div className="mt-3 max-h-32 overflow-auto rounded-xl border p-3 text-left">
                <ul className="space-y-1 text-sm">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-muted-foreground">
                      Row {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button variant="outline" size="sm" className="mt-4" onClick={onReset}>
              Import another file
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
