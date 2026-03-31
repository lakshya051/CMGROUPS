import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim();

/** 1-based column index → A, B, …, Z, AA, … */
const colLetter = (n) => {
    let s = '';
    let x = n;
    while (x > 0) {
        const m = (x - 1) % 26;
        s = String.fromCharCode(65 + m) + s;
        x = Math.floor((x - 1) / 26);
    }
    return s;
};

const getAuth = () => {
    const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL?.trim();
    const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!clientEmail || !privateKey) {
        throw new Error(
            'Missing GOOGLE_SHEETS_CLIENT_EMAIL or GOOGLE_SHEETS_PRIVATE_KEY in environment variables'
        );
    }

    return new google.auth.GoogleAuth({
        credentials: {
            client_email: clientEmail,
            private_key: privateKey,
        },
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive',
        ],
    });
};

const getSheets = async () => {
    const auth = await getAuth();
    return google.sheets({ version: 'v4', auth });
};

const requireSpreadsheetId = () => {
    if (!SPREADSHEET_ID) {
        throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID is not set in .env');
    }
    return SPREADSHEET_ID;
};

// ─── READ ────────────────────────────────────────────────────

export const getSheetData = async (sheetName) => {
    const id = requireSpreadsheetId();
    const sheets = await getSheets();
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: id,
        range: `${sheetName}!A:ZZ`,
    });
    return res.data.values || [];
};

// ─── WRITE ───────────────────────────────────────────────────

export const writeSheetData = async (sheetName, headers, rows) => {
    const id = requireSpreadsheetId();
    const sheets = await getSheets();
    const values = [headers, ...rows];
    const numRows = values.length;
    const widths = values.map((r) => (Array.isArray(r) ? r.length : 0));
    const numCols = Math.max(headers.length, ...widths, 1);
    const endCol = colLetter(numCols);
    const a1Range = `${sheetName}!A1:${endCol}${numRows}`;

    // Clear existing cells so old rows don’t linger; then write with an explicit range (more reliable than A1-only).
    await sheets.spreadsheets.values.clear({
        spreadsheetId: id,
        range: `${sheetName}!A:ZZ`,
    });

    await sheets.spreadsheets.values.update({
        spreadsheetId: id,
        range: a1Range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
    });
};

export const appendRow = async (sheetName, row) => {
    const id = requireSpreadsheetId();
    const sheets = await getSheets();
    await sheets.spreadsheets.values.append({
        spreadsheetId: id,
        range: `${sheetName}!A:A`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [row] },
    });
};

export const updateRowById = async (sheetName, id, row) => {
    const sid = requireSpreadsheetId();
    const sheets = await getSheets();
    const data = await getSheetData(sheetName);
    const rowIndex = data.findIndex((r) => String(r[0]) === String(id));
    if (rowIndex === -1) {
        await appendRow(sheetName, row);
        return;
    }
    const rowNumber = rowIndex + 1; // Sheets is 1-indexed
    const numCols = Math.max(row.length, 1);
    const endCol = colLetter(numCols);
    await sheets.spreadsheets.values.update({
        spreadsheetId: sid,
        range: `${sheetName}!A${rowNumber}:${endCol}${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] },
    });
};

// ─── SHEET MANAGEMENT ────────────────────────────────────────

export const getSheetNames = async () => {
    const id = requireSpreadsheetId();
    const sheets = await getSheets();
    const res = await sheets.spreadsheets.get({
        spreadsheetId: id,
    });
    return (res.data.sheets || []).map((s) => s.properties.title);
};

export const ensureSheetExists = async (sheetName) => {
    const id = requireSpreadsheetId();
    const existing = await getSheetNames();
    if (existing.includes(sheetName)) return;
    const sheets = await getSheets();
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: id,
        requestBody: {
            requests: [
                {
                    addSheet: {
                        properties: { title: sheetName },
                    },
                },
            ],
        },
    });
};

export const formatHeaderRow = async (sheetName) => {
    const id = requireSpreadsheetId();
    const sheets = await getSheets();
    const sheetsList = await sheets.spreadsheets.get({
        spreadsheetId: id,
    });
    const sheet = sheetsList.data.sheets.find(
        (s) => s.properties.title === sheetName
    );
    if (!sheet) return;
    const sheetId = sheet.properties.sheetId;

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: id,
        requestBody: {
            requests: [
                {
                    repeatCell: {
                        range: {
                            sheetId,
                            startRowIndex: 0,
                            endRowIndex: 1,
                        },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: { red: 0.91, green: 0.12, blue: 0.39 },
                                textFormat: {
                                    bold: true,
                                    foregroundColor: { red: 1, green: 1, blue: 1 },
                                },
                            },
                        },
                        fields: 'userEnteredFormat(backgroundColor,textFormat)',
                    },
                },
            ],
        },
    });
};
