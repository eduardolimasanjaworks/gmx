export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: any) => string;
}

export const exportToCSV = (
  data: any[],
  columns: ExportColumn[],
  filename: string,
  includeMetadata: boolean = false
) => {
  const headers = columns.map((col) => col.label);
  if (includeMetadata) {
    headers.push("Metadata (JSON)");
  }

  const csvRows = [headers.join(",")];

  data.forEach((row) => {
    const values = columns.map((col) => {
      const value = getNestedValue(row, col.key);
      const formattedValue = col.format ? col.format(value) : value;
      return `"${String(formattedValue || "").replace(/"/g, '""')}"`;
    });

    if (includeMetadata && row.metadata) {
      values.push(`"${JSON.stringify(row.metadata).replace(/"/g, '""')}"`);
    }

    csvRows.push(values.join(","));
  });

  const csvContent = csvRows.join("\n");
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${Date.now()}.csv`;
  link.click();
};

const getNestedValue = (obj: any, path: string): any => {
  return path.split(".").reduce((current, key) => current?.[key], obj);
};
