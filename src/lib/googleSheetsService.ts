import { FixedAsset } from '../types';

export interface GoogleSheetsConfig {
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  spreadsheetTitle: string;
  lastSyncedAt: string | null;
  lastSyncedCount: number;
  autoSync: boolean;
}

const STORAGE_KEY = 'tmii_google_sheets_config';

export function getSavedSheetsConfig(): GoogleSheetsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse saved sheets config:', e);
  }
  return {
    spreadsheetId: null,
    spreadsheetUrl: null,
    spreadsheetTitle: 'TMII - Database Terpadu Aset Tetap',
    lastSyncedAt: null,
    lastSyncedCount: 0,
    autoSync: false,
  };
}

export function saveSheetsConfig(config: Partial<GoogleSheetsConfig>): GoogleSheetsConfig {
  const current = getSavedSheetsConfig();
  const updated: GoogleSheetsConfig = { ...current, ...config };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save sheets config to localStorage:', e);
  }
  return updated;
}

function extractGoogleErrorMessage(status: number, rawText: string): string {
  try {
    const json = JSON.parse(rawText);
    if (json?.error?.message) {
      return json.error.message;
    }
  } catch {
    // raw text
  }
  return `${status} - ${rawText}`;
}

/**
 * Buat file Google Spreadsheet baru di Google Drive pengguna
 */
export async function createTmiiSpreadsheet(
  accessToken: string,
  title: string = 'TMII - Database Terpadu Aset Tetap'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; sheetId: number }> {
  const body = {
    properties: {
      title,
      timeZone: 'Asia/Jakarta',
      autoRecalc: 'ON_CHANGE',
    },
    sheets: [
      {
        properties: {
          title: 'Aset Tetap',
          gridProperties: {
            frozenRowCount: 1,
            rowCount: 1000,
            columnCount: 25,
          },
        },
      },
      {
        properties: {
          title: 'Info Sistem',
          gridProperties: {
            frozenRowCount: 1,
            rowCount: 20,
            columnCount: 4,
          },
        },
      },
    ],
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gagal membuat Google Spreadsheet: ${extractGoogleErrorMessage(response.status, errText)}`);
  }

  const result = await response.json();
  const sheetId = result.sheets?.[0]?.properties?.sheetId ?? 0;
  const spreadsheetUrl = result.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${result.spreadsheetId}/edit`;

  return {
    spreadsheetId: result.spreadsheetId,
    spreadsheetUrl,
    sheetId,
  };
}

/**
 * Format baris header agar tampil elegan dan profesional (Bold, warna biru navy TMII, teks putih)
 */
export async function formatSheetHeader(
  spreadsheetId: string,
  sheetId: number,
  accessToken: string
) {
  try {
    const requests = [
      {
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: 19,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: {
                red: 8 / 255,
                green: 20 / 255,
                blue: 31 / 255,
              },
              textFormat: {
                foregroundColor: {
                  red: 1,
                  green: 1,
                  blue: 1,
                },
                fontSize: 10,
                bold: true,
              },
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'MIDDLE',
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
        },
      },
    ];

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });
  } catch (err) {
    console.warn('Gagal memformat header sheet (non-fatal):', err);
  }
}

/**
 * Sinkronkan seluruh data Aset Tetap ke Google Spreadsheet
 */
export async function syncFixedAssetsToSheet(
  spreadsheetId: string,
  assets: FixedAsset[],
  accessToken: string
): Promise<{ updatedRows: number; spreadsheetUrl: string; timestamp: string }> {
  // 1. Ambil metadata spreadsheet untuk verifikasi sheet name
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!metaRes.ok) {
    const errText = await metaRes.text();
    throw new Error(`Gagal membuka spreadsheet ID ${spreadsheetId}: ${extractGoogleErrorMessage(metaRes.status, errText)}`);
  }

  const metaData = await metaRes.json();
  const sheets = metaData.sheets || [];
  
  // Cari tab 'Aset Tetap' atau gunakan sheet pertama
  let targetSheetTitle = 'Aset Tetap';
  let targetSheetId = 0;
  const foundSheet = sheets.find((s: any) => s.properties?.title === 'Aset Tetap');
  
  if (foundSheet) {
    targetSheetTitle = foundSheet.properties.title;
    targetSheetId = foundSheet.properties.sheetId;
  } else if (sheets.length > 0) {
    targetSheetTitle = sheets[0].properties.title;
    targetSheetId = sheets[0].properties.sheetId;
  }

  // 2. Siapkan baris header
  const headers = [
    'No',
    'Kode Aset',
    'Nama Aset',
    'Merk / Tipe',
    'Kategori',
    'Jenis Aset',
    'Klasifikasi',
    'Area',
    'Lokasi Detail',
    'Kondisi',
    'Status',
    'Tanggal Perolehan',
    'Nilai Perolehan (Rp)',
    'Masa Manfaat',
    'Nilai Residu (Rp)',
    'Metode Depresiasi',
    'Penanggung Jawab (PIC)',
    'Keterangan',
    'Tanggal Update Terakhir',
  ];

  // 3. Format baris data
  const rows = assets.map((a, idx) => [
    idx + 1,
    a.code || '-',
    a.name || '-',
    a.brand || '-',
    a.category || '-',
    a.type || '-',
    a.classification || 'Aset',
    a.area || '-',
    a.location || '-',
    a.condition || 'Baik',
    a.status || 'Aktif',
    a.acquisitionDate || '-',
    a.acquisitionCost ? Number(a.acquisitionCost).toLocaleString('id-ID') : '0',
    a.usefulLife || '-',
    a.salvageValue ? Number(a.salvageValue).toLocaleString('id-ID') : '0',
    a.depreciationMethod || 'Garis Lurus',
    a.createdByName || a.createdBy || '-',
    a.notes || '-',
    new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB',
  ]);

  const allValues = [headers, ...rows];

  // 4. Bersihkan data lama di sheet terlebih dahulu agar tidak ada sisa baris
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(targetSheetTitle)}'!A1:S:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  // 5. Tulis data baru
  const range = `'${targetSheetTitle}'!A1:S${allValues.length}`;
  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: allValues,
      }),
    }
  );

  if (!writeRes.ok) {
    const errText = await writeRes.text();
    throw new Error(`Gagal menulis baris data ke Google Sheets: ${extractGoogleErrorMessage(writeRes.status, errText)}`);
  }

  // 6. Format baris header
  await formatSheetHeader(spreadsheetId, targetSheetId, accessToken);

  const timestamp = new Date().toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  });

  const spreadsheetUrl = metaData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Simpan status sinkronisasi
  saveSheetsConfig({
    spreadsheetId,
    spreadsheetUrl,
    spreadsheetTitle: metaData.properties?.title || 'TMII - Database Terpadu Aset Tetap',
    lastSyncedAt: timestamp,
    lastSyncedCount: assets.length,
  });

  return {
    updatedRows: assets.length,
    spreadsheetUrl,
    timestamp,
  };
}
