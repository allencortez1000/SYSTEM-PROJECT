export function appendDateToExportName(baseName: string, date = new Date(), extension = "xls") {
  const cleanedBaseName = String(baseName || "export").trim().replace(/\s+/g, "-");
  const cleanedExtension = String(extension || "xls").replace(/^\.+/, "");
  return `${cleanedBaseName}-${date.toISOString().slice(0, 10)}.${cleanedExtension}`;
}
