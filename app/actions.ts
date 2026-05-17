"use server";

import { parse } from "csv-parse/sync";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  requireAuth,
  validateCredentials,
} from "@/lib/auth";
import { assertDatabaseUrl, sql } from "@/lib/db";

type ParsedExpenseRow = {
  rowNumber: number;
  originalDate: string;
  transactionDate: string;
  monthKey: string;
  spent: string;
  received: string;
  description: string;
};

function revalidateExpensePages() {
  revalidatePath("/");
}

export async function login(formData: FormData) {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!validateCredentials(username, password)) {
    redirect("/login?error=invalid");
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: AUTH_COOKIE_NAME,
    value: createSessionToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  redirect("/login");
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

function readField(record: Record<string, unknown>, aliases: string[]) {
  for (const alias of aliases) {
    const value = record[alias];

    if (value !== undefined && value !== null) {
      return String(value).trim();
    }
  }

  return "";
}

function parseAmount(value: string, rowNumber: number, columnName: string) {
  const normalizedValue = value.trim();

  if (
    !normalizedValue ||
    normalizedValue === "-" ||
    normalizedValue === "--" ||
    normalizedValue === "—"
  ) {
    return "0.00";
  }

  const amount = Number(normalizedValue.replace(/[$,\s]/g, ""));

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`Row ${rowNumber}: ${columnName} must be a valid amount.`);
  }

  return amount.toFixed(2);
}

function parseDate(value: string, rowNumber: number) {
  const trimmed = value.trim();
  const dayFirstMatch = trimmed.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/,
  );
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (!dayFirstMatch && !isoMatch) {
    throw new Error(
      `Row ${rowNumber}: date must look like 1/3/26, 01/03/2026, or 2026-03-01.`,
    );
  }

  const [yearPart, monthPart, dayPart] = isoMatch
    ? [isoMatch[1], isoMatch[2], isoMatch[3]]
    : [dayFirstMatch![3], dayFirstMatch![2], dayFirstMatch![1]];

  const rawYear = Number(yearPart);
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;
  const month = Number(monthPart);
  const day = Number(dayPart);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Row ${rowNumber}: date is not valid.`);
  }

  const transactionDate = date.toISOString().slice(0, 10);
  const monthKey = transactionDate.slice(0, 7);

  return { transactionDate, monthKey };
}

function formatMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return `${month}/${year}`;
}

function parseExpenseCsv(csvText: string) {
  const records = parse(csvText, {
    bom: true,
    columns: (headers: string[]) => headers.map(normalizeHeader),
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, unknown>[];

  const rows = records.map((record, index) => {
    const rowNumber = index + 2;
    const dateValue = readField(record, ["date"]);
    const description = readField(record, [
      "description",
      "escription",
      "desc",
    ]);

    if (!dateValue) {
      throw new Error(`Row ${rowNumber}: date is required.`);
    }

    if (!description) {
      throw new Error(`Row ${rowNumber}: description is required.`);
    }

    const { transactionDate, monthKey } = parseDate(dateValue, rowNumber);
    const spent = parseAmount(
      readField(record, ["spent", "spend"]),
      rowNumber,
      "spent",
    );
    const received = parseAmount(
      readField(record, ["received", "recieved", "receied"]),
      rowNumber,
      "received",
    );

    return {
      rowNumber,
      originalDate: dateValue,
      transactionDate,
      monthKey,
      spent,
      received,
      description,
    };
  });

  if (rows.length === 0) {
    throw new Error("CSV has no expense rows.");
  }

  const monthKey = rows[0].monthKey;
  const wrongMonthRow = rows.find((row) => row.monthKey !== monthKey);

  if (wrongMonthRow) {
    throw new Error(
      `Row ${wrongMonthRow.rowNumber}: date "${wrongMonthRow.originalDate}" is in ${formatMonthKey(
        wrongMonthRow.monthKey,
      )}, but this CSV started as ${formatMonthKey(
        monthKey,
      )}. Upload one month at a time or fix that row.`,
    );
  }

  return { monthKey, rows };
}

async function saveExpenseImport({
  filename,
  monthKey,
  rows,
}: {
  filename: string;
  monthKey: string;
  rows: ParsedExpenseRow[];
}) {
  assertDatabaseUrl();

  await sql.begin(async (transaction) => {
    await transaction`
      delete from expense_imports
      where month_key = ${monthKey}
    `;

    const [expenseImport] = await transaction<{ id: number }[]>`
      insert into expense_imports (filename, month_key, row_count)
      values (${filename}, ${monthKey}, ${rows.length})
      returning id
    `;

    const values = rows.map((row) => ({
      import_id: expenseImport.id,
      transaction_date: row.transactionDate,
      month_key: row.monthKey,
      spent: row.spent,
      received: row.received,
      description: row.description,
    }));

    await transaction`
      insert into expense_entries ${transaction(
        values,
        "import_id",
        "transaction_date",
        "month_key",
        "spent",
        "received",
        "description",
      )}
    `;
  });
}

export async function uploadExpenseCsv(formData: FormData) {
  await requireAuth();

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    redirect("/?error=Choose a CSV file first.");
  }

  let monthKey = "";
  let rowCount = 0;

  try {
    const csvText = await file.text();
    const parsed = parseExpenseCsv(csvText);

    await saveExpenseImport({
      filename: file.name,
      monthKey: parsed.monthKey,
      rows: parsed.rows,
    });

    monthKey = parsed.monthKey;
    rowCount = parsed.rows.length;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not import this CSV.";

    redirect(`/?error=${encodeURIComponent(message)}`);
  }

  revalidateExpensePages();
  redirect(`/?month=${monthKey}&upload=success&rows=${rowCount}`);
}