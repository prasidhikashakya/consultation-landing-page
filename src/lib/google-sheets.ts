import "server-only";

import { google, type sheets_v4 } from "googleapis";
import { leadSheetHeaders } from "@/lib/lead-fields";

export type LeadDetails = {
  fullName: string;
  email: string;
  whatsapp: string;
  businessName: string;
  website: string;
  mainMarketingNeed: string;
  message: string;
  submissionId: string;
};

type LeadEmailStatus = "Pending" | "Not configured" | "Sent" | "Failed";

function getSpreadsheetId(): string {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();
  if (!spreadsheetId) throw new Error("LEAD_CONFIG_MISSING");
  return spreadsheetId;
}

function getSheetsClient() {
  const rawCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!rawCredentials) throw new Error("LEAD_CONFIG_MISSING");

  let credentials: { client_email?: string; private_key?: string; project_id?: string };
  try {
    credentials = JSON.parse(rawCredentials) as typeof credentials;
  } catch {
    throw new Error("LEAD_CONFIG_INVALID");
  }

  if (!credentials.client_email || !credentials.private_key) throw new Error("LEAD_CONFIG_INVALID");

  const auth = new google.auth.GoogleAuth({
    credentials: {
      ...credentials,
      private_key: credentials.private_key.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

function quoteTabName(name: string): string {
  return `'${name.replace(/'/g, "''")}'`;
}

function sheetColor(hex: string) {
  const value = hex.replace("#", "");
  return {
    red: parseInt(value.slice(0, 2), 16) / 255,
    green: parseInt(value.slice(2, 4), 16) / 255,
    blue: parseInt(value.slice(4, 6), 16) / 255,
  };
}

async function resolveSheet(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
): Promise<{ sheetId: number; title: string; columnCount: number; banded: boolean; hasFilter: boolean }> {
  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(sheetId,title,gridProperties(columnCount)),bandedRanges(bandedRangeId),basicFilter)",
  });
  const tabName = process.env.GOOGLE_SHEETS_TAB_NAME?.trim();
  const tab = tabName
    ? response.data.sheets?.find((item) => item.properties?.title === tabName)
    : response.data.sheets?.[0];
  // Google Sheets commonly assigns ID 0 to the first tab, so test for nullish
  // values instead of treating 0 as a missing ID.
  if (tab?.properties?.sheetId == null || !tab.properties.title) throw new Error("LEAD_SHEET_TAB_MISSING");

  return {
    sheetId: tab.properties.sheetId,
    title: tab.properties.title,
    columnCount: tab.properties.gridProperties?.columnCount ?? 0,
    banded: Boolean(tab.bandedRanges?.length),
    hasFilter: Boolean(tab.basicFilter),
  };
}

async function ensureLeadSheet(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheet: Awaited<ReturnType<typeof resolveSheet>>,
): Promise<void> {
  const tabRange = quoteTabName(sheet.title);
  const valuesResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabRange}!A1:L20`,
  });
  const rows = valuesResponse.data.values ?? [];
  const firstRow = (rows[0] ?? []).map((value) => String(value ?? "").trim());
  const rowHasValues = (row: unknown[] | undefined) => Boolean(row?.some((value) => String(value ?? "").trim()));
  const hasAnyData = rows.some((row) => rowHasValues(row));
  const visibleHeaders = leadSheetHeaders.slice(0, 11);
  const isBlank = !hasAnyData;

  if (isBlank) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tabRange}!A1:L1`,
      valueInputOption: "RAW",
      requestBody: { values: [[...leadSheetHeaders]] },
    });
  } else {
    const matchesVisibleSchema = visibleHeaders.every((header, index) => firstRow[index] === header);
    const internalHeader = firstRow[11];
    if (!matchesVisibleSchema || (internalHeader && internalHeader !== leadSheetHeaders[11])) {
      throw new Error("LEAD_SHEET_HEADERS_MISMATCH");
    }
    if (!internalHeader) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tabRange}!L1`,
        valueInputOption: "RAW",
        requestBody: { values: [[leadSheetHeaders[11]]] },
      });
    }
  }

  const requests: sheets_v4.Schema$Request[] = [
    ...(sheet.columnCount < 12
      ? [{ appendDimension: { sheetId: sheet.sheetId, dimension: "COLUMNS", length: 12 - sheet.columnCount } }]
      : []),
    {
      updateSheetProperties: {
        properties: { sheetId: sheet.sheetId, gridProperties: { frozenRowCount: 1 } },
        fields: "gridProperties.frozenRowCount",
      },
    },
    {
      repeatCell: {
        range: { sheetId: sheet.sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 11 },
        cell: {
          userEnteredFormat: {
            backgroundColor: sheetColor("#00318E"),
            textFormat: { foregroundColor: sheetColor("#FFFFFF"), bold: true, fontSize: 10 },
            verticalAlignment: "MIDDLE",
            wrapStrategy: "WRAP",
            borders: { bottom: { style: "SOLID_MEDIUM", color: sheetColor("#099DDD") } },
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,verticalAlignment,wrapStrategy,borders)",
      },
    },
    {
      updateDimensionProperties: {
        range: { sheetId: sheet.sheetId, dimension: "ROWS", startIndex: 0, endIndex: 1 },
        properties: { pixelSize: 46 },
        fields: "pixelSize",
      },
    },
    {
      repeatCell: {
        range: { sheetId: sheet.sheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: 11 },
        cell: {
          userEnteredFormat: {
            verticalAlignment: "TOP",
            wrapStrategy: "WRAP",
            textFormat: { foregroundColor: sheetColor("#1F2937") },
          },
        },
        fields: "userEnteredFormat(verticalAlignment,wrapStrategy,textFormat.foregroundColor)",
      },
    },
    {
      updateDimensionProperties: {
        range: { sheetId: sheet.sheetId, dimension: "COLUMNS", startIndex: 11, endIndex: 12 },
        properties: { hiddenByUser: true },
        fields: "hiddenByUser",
      },
    },
  ];

  const widths = [170, 230, 160, 190, 250, 235, 320, 190, 145, 175, 180];
  widths.forEach((pixelSize, index) => {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId: sheet.sheetId, dimension: "COLUMNS", startIndex: index, endIndex: index + 1 },
        properties: { pixelSize },
        fields: "pixelSize",
      },
    });
  });

  if (!sheet.banded) {
    requests.push({
      addBanding: {
        bandedRange: {
          range: { sheetId: sheet.sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: 11 },
          rowProperties: {
            headerColor: sheetColor("#00318E"),
            firstBandColor: sheetColor("#FFFFFF"),
            secondBandColor: sheetColor("#F2F8FC"),
          },
        },
      },
    });
  }

  if (!sheet.hasFilter) {
    requests.push({
      setBasicFilter: {
        filter: { range: { sheetId: sheet.sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: 11 } },
      },
    });
  }

  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
}

function dateToSheetsSerial(date: Date): number {
  return date.getTime() / 86_400_000 + 25_569;
}

export async function saveLead(lead: LeadDetails, emailConfigured: boolean): Promise<{ rowNumber: number; duplicate: boolean; submittedAt: string }> {
  const spreadsheetId = getSpreadsheetId();
  const sheets = getSheetsClient();
  const sheet = await resolveSheet(sheets, spreadsheetId);
  await ensureLeadSheet(sheets, spreadsheetId, sheet);

  const tabRange = quoteTabName(sheet.title);
  const idColumn = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabRange}!L2:L`,
  });
  const existingIdIndex = (idColumn.data.values ?? []).findIndex((row) => String(row[0] ?? "") === lead.submissionId);
  if (existingIdIndex >= 0) return { rowNumber: existingIdIndex + 2, duplicate: true, submittedAt: "" };

  const now = new Date();
  const emailStatus: LeadEmailStatus = emailConfigured ? "Pending" : "Not configured";
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabRange}!A:L`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[
        lead.fullName,
        lead.email,
        lead.whatsapp,
        lead.businessName,
        lead.website,
        lead.mainMarketingNeed,
        lead.message,
        dateToSheetsSerial(now),
        "New",
        emailStatus,
        "Not booked",
        lead.submissionId,
      ]],
    },
  });

  const updatedRange = response.data.updates?.updatedRange ?? "";
  const rowNumber = Number(updatedRange.match(/![A-Z]+(\d+)/)?.[1]);
  if (!Number.isInteger(rowNumber) || rowNumber < 2) throw new Error("LEAD_ROW_NOT_CONFIRMED");

  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: { sheetId: sheet.sheetId, startRowIndex: rowNumber - 1, endRowIndex: rowNumber, startColumnIndex: 0, endColumnIndex: 11 },
              cell: { userEnteredFormat: { verticalAlignment: "TOP", wrapStrategy: "WRAP" } },
              fields: "userEnteredFormat(verticalAlignment,wrapStrategy)",
            },
          },
          {
            updateDimensionProperties: {
              range: { sheetId: sheet.sheetId, dimension: "ROWS", startIndex: rowNumber - 1, endIndex: rowNumber },
              properties: { pixelSize: 48 },
              fields: "pixelSize",
            },
          },
          {
            repeatCell: {
              range: { sheetId: sheet.sheetId, startRowIndex: 1, endRowIndex: rowNumber, startColumnIndex: 7, endColumnIndex: 8 },
              cell: { userEnteredFormat: { numberFormat: { type: "DATE_TIME", pattern: "dd mmm yyyy, hh:mm AM/PM" } } },
              fields: "userEnteredFormat.numberFormat",
            },
          },
        ],
      },
    });
  } catch {
    // The append succeeded; a formatting failure must not cause a false save failure.
    console.warn("[lead-submission] Saved row formatting could not be updated.");
  }

  return { rowNumber, duplicate: false, submittedAt: now.toISOString() };
}

export async function updateLeadEmailStatus(rowNumber: number, status: "Sent" | "Failed"): Promise<void> {
  const spreadsheetId = getSpreadsheetId();
  const sheets = getSheetsClient();
  const sheet = await resolveSheet(sheets, spreadsheetId);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoteTabName(sheet.title)}!J${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [[status]] },
  });
}
