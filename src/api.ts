import Database from '@tauri-apps/plugin-sql';
import { invoke } from '@tauri-apps/api/core';

// ── Typed return shapes ───────────────────────────────────────────

interface CommandOk<T> { success: true; data: T }
interface CommandErr { success: false; error: string }
type CmdResult<T> = CommandOk<T> | CommandErr

interface HashResult { success: boolean; data?: string; error?: string; hash?: string }
interface CompareResult { success: boolean; data?: boolean; error?: string; match?: boolean }

interface ReceiptInfo {
    filename: string
    invoiceNumber: string
    createdAt: string
    filePath: string
    size: number
}

interface ReceiptSaveResult { success: boolean; data?: string; filePath?: string; error?: string }
interface ReceiptListResult { success: boolean; data?: ReceiptInfo[]; files?: ReceiptInfo[]; error?: string }
interface ReceiptBasicResult { success: boolean; error?: string }

// ── DB ────────────────────────────────────────────────────────────

let db: Database | null = null;
export async function initDb() {
    if (!db) {
        db = await Database.load('sqlite:al_barkat_mart.db');
    }
    return db;
}

// ── API Object ────────────────────────────────────────────────────

export const api = {
    db: {
        run: async (query: string, params: unknown[] = []) => {
            const database = await initDb();
            try {
                const info = await database.execute(query, params);
                return { success: true as const, info };
            } catch (e: unknown) {
                return { success: false as const, error: String(e instanceof Error ? e.message : e) };
            }
        },
        get: async (query: string, params: unknown[] = []) => {
            const database = await initDb();
            try {
                const rows = await database.select<Record<string, unknown>[]>(query, params);
                return { success: true as const, row: rows[0] };
            } catch (e: unknown) {
                return { success: false as const, error: String(e instanceof Error ? e.message : e), row: undefined };
            }
        },
        all: async (query: string, params: unknown[] = []) => {
            const database = await initDb();
            try {
                const rows = await database.select<Record<string, unknown>[]>(query, params);
                return { success: true as const, rows };
            } catch (e: unknown) {
                return { success: false as const, error: String(e instanceof Error ? e.message : e), rows: [] as Record<string, unknown>[] };
            }
        }
    },
    auth: {
        hash: async (text: string): Promise<HashResult> => {
            const raw = await invoke<CmdResult<string>>('auth_hash', { text })
            const r = raw as CmdResult<string>
            if (r.success) return { success: true, data: r.data, hash: r.data }
            return { success: false, error: r.error }
        },
        compare: async (text: string, hash: string): Promise<CompareResult> => {
            const r = await invoke<CmdResult<boolean>>('auth_compare', { text, hash })
            if (r.success) return { success: true, data: r.data, match: r.data }
            return { success: false, error: r.error }
        },
    },
    receipt: {
        save: async (invoiceNumber: string, htmlContent: string): Promise<ReceiptSaveResult> => {
            const r = await invoke<CmdResult<string>>('receipt_save', { invoiceNumber, htmlContent })
            if (r.success) return { success: true, data: r.data, filePath: r.data }
            return { success: false, error: r.error }
        },
        list: async (): Promise<ReceiptListResult> => {
            const r = await invoke<CmdResult<ReceiptInfo[]>>('receipt_list')
            if (r.success) return { success: true, data: r.data, files: r.data }
            return { success: false, error: r.error }
        },
        openFolder: async (): Promise<ReceiptBasicResult> => {
            const r = await invoke<CmdResult<null>>('receipt_open_folder')
            return r.success ? { success: true } : { success: false, error: r.error }
        },
        openFile: async (filePath: string): Promise<ReceiptBasicResult> => {
            const r = await invoke<CmdResult<null>>('receipt_open_file', { filePath })
            return r.success ? { success: true } : { success: false, error: r.error }
        },
        delete: async (filePath: string): Promise<ReceiptBasicResult> => {
            const r = await invoke<CmdResult<null>>('receipt_delete', { filePath })
            return r.success ? { success: true } : { success: false, error: r.error }
        },
        printFile: async (filePath: string): Promise<ReceiptBasicResult> => {
            const r = await invoke<CmdResult<null>>('receipt_print_file', { filePath })
            return r.success ? { success: true } : { success: false, error: r.error }
        },
    },
    printReceipt: () => { window.print(); }
};

declare global {
    interface Window {
        api: typeof api;
    }
}

window.api = api;
