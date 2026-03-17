import Database from '@tauri-apps/plugin-sql';
import { invoke } from '@tauri-apps/api/core';

let db: Database | null = null;
export async function initDb() {
    if (!db) {
        db = await Database.load('sqlite:al_barkat_mart.db');
    }
    return db;
}

export const api = {
    db: {
        run: async (query: string, params: any[] = []) => {
            const database = await initDb();
            try {
                const info = await database.execute(query, params);
                return { success: true, info };
            } catch (e: any) {
                return { success: false, error: e.message || String(e) };
            }
        },
        get: async (query: string, params: any[] = []) => {
            const database = await initDb();
            try {
                const rows = await database.select<any[]>(query, params);
                return { success: true, row: rows[0] };
            } catch (e: any) {
                return { success: false, error: e.message || String(e) };
            }
        },
        all: async (query: string, params: any[] = []) => {
            const database = await initDb();
            try {
                const rows = await database.select<any[]>(query, params);
                return { success: true, rows };
            } catch (e: any) {
                return { success: false, error: e.message || String(e) };
            }
        }
    },
    auth: {
        hash: async (text: string) => invoke('auth_hash', { text }),
        compare: async (text: string, hash: string) => invoke('auth_compare', { text, hash })
    },
    receipt: {
        save: async (invoiceNumber: string, htmlContent: string) => invoke('receipt_save', { invoiceNumber, htmlContent }),
        list: async () => invoke('receipt_list'),
        openFolder: async () => invoke('receipt_open_folder'),
        openFile: async (filePath: string) => invoke('receipt_open_file', { filePath }),
        delete: async (filePath: string) => invoke('receipt_delete', { filePath }),
        printFile: async (filePath: string) => invoke('receipt_print_file', { filePath })
    },
    printReceipt: () => { window.print(); }
};

declare global {
    interface Window {
        api: typeof api;
    }
}

window.api = api;
