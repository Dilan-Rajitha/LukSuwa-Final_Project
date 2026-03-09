import API from "./axiosConfig";

export type ParseCsvResponse = {
  message: string;
  headers: string[];
  suggestedMapping: {
    name?: string;
    qty?: string;
    sku?: string;
    unit_price?: string;
    expiry_date?: string;
    batch_no?: string;
    brand?: string;
    strength?: string;
  };
  preview: Record<string, any>[];
  totalRows: number;
};

export type ImportCsvResponse = {
  message: string;
  imported?: number;
  upserts?: number;
  autoDeleted?: number;

  // NEW
  autoRefreshed?: boolean;
  refreshDeletedItems?: number;
};

export type InventoryItem = {
  _id: string;
  name: string;
  sku?: string;
  qty: number;
  unit_price?: number;
  batch_no?: string;
  expiry_date?: string | null;
  brand?: string;
  strength?: string;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AutoDeleteSettings = {
  enabled: boolean;
  daysBeforeExpiry: number;
};

// NEW
export type AutoRefreshSettings = {
  enabled: boolean;
  clearAfterDays: number;
};

export type ListInventoryResponse = {
  count: number;
  items: InventoryItem[];
  autoDeleteSettings: AutoDeleteSettings;

  // NEW
  autoRefreshSettings: AutoRefreshSettings;
  lastClearedAt?: string;
  autoRefreshed?: boolean;
  refreshDeletedItems?: number;
};

export async function parseInventoryCsv(fileUri: string, fileName: string) {
  const form = new FormData();
  form.append(
    "file",
    {
      uri: fileUri,
      name: fileName || `inventory_${Date.now()}.csv`,
      type: "text/csv",
    } as any
  );

  const res = await API.post<ParseCsvResponse>("/inventory/parse-csv", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function importInventoryCsv(params: {
  fileUri: string;
  fileName: string;
  mapping: Record<string, string>;
  mode: "merge" | "replace";
}) {
  const form = new FormData();
  form.append(
    "file",
    {
      uri: params.fileUri,
      name: params.fileName || `inventory_${Date.now()}.csv`,
      type: "text/csv",
    } as any
  );

  form.append("mapping", JSON.stringify(params.mapping));
  form.append("mode", params.mode);

  const res = await API.post<ImportCsvResponse>("/inventory/import-csv", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
}

export async function fetchInventory(q: string = "") {
  const res = await API.get<ListInventoryResponse>(
    `/inventory${q ? `?q=${encodeURIComponent(q)}` : ""}`
  );
  return res.data;
}

export async function updateInventoryItem(id: string, data: Partial<InventoryItem>) {
  const res = await API.patch<{ message: string; item: InventoryItem }>(
    `/inventory/${id}`,
    data
  );
  return res.data;
}

export async function deleteInventoryItem(id: string) {
  const res = await API.delete<{ message: string }>(`/inventory/${id}`);
  return res.data;
}

export async function updateAutoDeleteSettings(settings: AutoDeleteSettings) {
  const res = await API.put<{ message: string; autoDeleteSettings: AutoDeleteSettings }>(
    "/inventory/settings/auto-delete",
    settings
  );
  return res.data;
}

// NEW
export async function updateAutoRefreshSettings(settings: AutoRefreshSettings) {
  const res = await API.put<{
    message: string;
    autoRefreshSettings: AutoRefreshSettings;
    lastClearedAt?: string;
  }>("/inventory/settings/auto-refresh", settings);

  return res.data;
}

export async function manualCleanupInventory() {
  const res = await API.post<{ message: string; deleted: number }>("/inventory/cleanup");
  return res.data;
}