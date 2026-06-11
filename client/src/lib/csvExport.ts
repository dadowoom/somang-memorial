type CsvCell = string | number | boolean | Date | null | undefined;

type CsvColumn<T> = {
  label: string;
  value: (row: T) => CsvCell;
};

function escapeCsvCell(value: CsvCell) {
  if (value === null || value === undefined) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function downloadCsv<T>(
  filename: string,
  rows: T[],
  columns: CsvColumn<T>[]
) {
  const header = columns.map(column => escapeCsvCell(column.label)).join(",");
  const body = rows.map(row =>
    columns.map(column => escapeCsvCell(column.value(row))).join(",")
  );
  const csv = [header, ...body].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
