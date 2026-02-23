import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ExportColumn {
  header: string;
  accessor: string | ((row: any) => string | number);
}

/** Download a CSV file from tabular data */
export function exportCSV(filename: string, columns: ExportColumn[], rows: any[]) {
  const sep = ";";
  const header = columns.map((c) => `"${c.header}"`).join(sep);
  const body = rows.map((row) =>
    columns
      .map((c) => {
        const val = typeof c.accessor === "function" ? c.accessor(row) : row[c.accessor];
        return `"${String(val ?? "").replace(/"/g, '""')}"`;
      })
      .join(sep)
  );
  const bom = "\uFEFF";
  const blob = new Blob([bom + [header, ...body].join("\n")], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filename}.csv`);
}

/** Download a PDF file from tabular data */
export function exportPDF(
  filename: string,
  title: string,
  columns: ExportColumn[],
  rows: any[],
  meta?: string
) {
  const doc = new jsPDF({ orientation: columns.length > 5 ? "landscape" : "portrait" });

  doc.setFontSize(16);
  doc.text(title, 14, 20);

  if (meta) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(meta, 14, 27);
    doc.setTextColor(0);
  }

  const tableData = rows.map((row) =>
    columns.map((c) => {
      const val = typeof c.accessor === "function" ? c.accessor(row) : row[c.accessor];
      return String(val ?? "—");
    })
  );

  autoTable(doc, {
    startY: meta ? 32 : 28,
    head: [columns.map((c) => c.header)],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(`${filename}.pdf`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Format a date for display in exports */
export function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR");
}

/** Format a date range as metadata string */
export function exportMeta(from?: Date, to?: Date, storeType?: string) {
  const parts: string[] = [];
  if (from) parts.push(`Du ${from.toLocaleDateString("fr-FR")}`);
  if (to) parts.push(`au ${to.toLocaleDateString("fr-FR")}`);
  if (storeType && storeType !== "all") parts.push(`Type: ${storeType === "bulk" ? "Interne" : "Employé"}`);
  parts.push(`Exporté le ${new Date().toLocaleDateString("fr-FR")}`);
  return parts.join(" · ");
}
