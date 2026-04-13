"use client";

export function CsvExportButton({
  filename,
  rows,
}: {
  filename: string;
  rows: Record<string, string | number>[];
}) {
  const onClick = () => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]!);
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(",")];
    for (const r of rows) lines.push(headers.map((h) => escape(r[h])).join(","));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
    >
      Export CSV
    </button>
  );
}
