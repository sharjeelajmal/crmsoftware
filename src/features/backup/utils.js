import { format } from "date-fns";
import { BRAND } from "@/constants/brand";

export const BACKUP_FILTERS = [
  { value: "today", label: "Today" },
  { value: "last7days", label: "Last 7 Days" },
  { value: "thisyear", label: "This Year" },
  { value: "lifetime", label: "Lifetime" },
];

export const DEFAULT_BACKUP_FILTER = "lifetime";

export const backupFileName = (filter) => `${BRAND.slug}_sales_${filter}_${format(new Date(), "yyyy-MM-dd")}.csv`;

/** Saves a Blob through a temporary <a download> link. */
export const saveBlob = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
