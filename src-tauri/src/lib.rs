pub mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let migrations = vec![
    tauri_plugin_sql::Migration {
        version: 1,
        description: "create_initial_tables",
        sql: "
        CREATE TABLE IF NOT EXISTS owner (
            id INTEGER PRIMARY KEY,
            pin_hash TEXT NOT NULL,
            locked_out_until DATETIME
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );

        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            barcode TEXT UNIQUE,
            name TEXT NOT NULL,
            category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
            cost_price REAL NOT NULL DEFAULT 0,
            selling_price REAL NOT NULL,
            stock INTEGER NOT NULL DEFAULT 0,
            min_stock_alert INTEGER NOT NULL DEFAULT 5,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_number TEXT NOT NULL UNIQUE,
            subtotal REAL NOT NULL,
            discount REAL NOT NULL DEFAULT 0,
            tax_amount REAL NOT NULL DEFAULT 0,
            total REAL NOT NULL,
            payment_method TEXT NOT NULL,
            amount_paid REAL NOT NULL,
            change_amount REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_number);
        CREATE INDEX IF NOT EXISTS idx_sales_datetime ON sales(created_at);

        CREATE TABLE IF NOT EXISTS sale_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
            product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
            product_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            total REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS cash_drawer (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            closed_at DATETIME,
            starting_cash REAL NOT NULL,
            expected_cash REAL,
            actual_cash REAL,
            variance REAL
        );

        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        ",
        kind: tauri_plugin_sql::MigrationKind::Up,
    },
    tauri_plugin_sql::Migration {
        version: 2,
        description: "add_enterprise_features",
        sql: "
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            pin_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'Cashier',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            total_spent REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            contact_person TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        ",
        kind: tauri_plugin_sql::MigrationKind::Up,
    },
    tauri_plugin_sql::Migration {
        version: 3,
        description: "alter_sales_products_safe",
        sql: "
        CREATE TABLE IF NOT EXISTS sales_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_number TEXT NOT NULL UNIQUE,
            subtotal REAL NOT NULL,
            discount REAL NOT NULL DEFAULT 0,
            tax_amount REAL NOT NULL DEFAULT 0,
            total REAL NOT NULL,
            payment_method TEXT NOT NULL,
            amount_paid REAL NOT NULL,
            change_amount REAL NOT NULL,
            customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT OR IGNORE INTO sales_new SELECT id,invoice_number,subtotal,discount,tax_amount,total,payment_method,amount_paid,change_amount,NULL,created_at FROM sales;
        DROP TABLE sales;
        ALTER TABLE sales_new RENAME TO sales;

        CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_number);
        CREATE INDEX IF NOT EXISTS idx_sales_datetime ON sales(created_at);

        CREATE TABLE IF NOT EXISTS products_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            barcode TEXT UNIQUE,
            name TEXT NOT NULL,
            category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
            cost_price REAL NOT NULL DEFAULT 0,
            selling_price REAL NOT NULL,
            stock INTEGER NOT NULL DEFAULT 0,
            min_stock_alert INTEGER NOT NULL DEFAULT 5,
            supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT OR IGNORE INTO products_new SELECT id,barcode,name,category_id,cost_price,selling_price,stock,min_stock_alert,NULL,created_at FROM products;
        DROP TABLE products;
        ALTER TABLE products_new RENAME TO products;

        CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
        ",
        kind: tauri_plugin_sql::MigrationKind::Up,
    }
  ];

  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(
        tauri_plugin_sql::Builder::default()
            .add_migrations("sqlite:al_barkat_mart.db", migrations)
            .build(),
    )
    .invoke_handler(tauri::generate_handler![
        commands::auth_hash,
        commands::auth_compare,
        commands::receipt_save,
        commands::receipt_list,
        commands::receipt_open_folder,
        commands::receipt_open_file,
        commands::receipt_delete,
        commands::receipt_print_file,
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
