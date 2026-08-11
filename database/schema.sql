CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(180) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL
        CHECK(role IN ('Admin', 'Sales', 'Warehouse', 'Accounts')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    mobile VARCHAR(30) NOT NULL,
    email VARCHAR(180),
    business_name VARCHAR(180) NOT NULL,
    gst_number VARCHAR(30),
    customer_type VARCHAR(20) NOT NULL
        CHECK(customer_type IN ('Retail', 'Wholesale', 'Distributor')),
    address TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Lead'
        CHECK(status IN ('Lead', 'Active', 'Inactive')),
    follow_up_date DATE,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS followups (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    follow_up_date DATE,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(180) NOT NULL,
    sku VARCHAR(80) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL
        CHECK(unit_price >= 0),
    current_stock INT NOT NULL
        CHECK(current_stock >= 0),
    min_stock_alert INT NOT NULL
        CHECK(min_stock_alert >= 0),
    warehouse VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    quantity_changed INT NOT NULL,
    movement_type VARCHAR(3) NOT NULL
        CHECK(movement_type IN ('IN', 'OUT')),
    reason TEXT NOT NULL,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challans (
    id SERIAL PRIMARY KEY,
    challan_number VARCHAR(80) UNIQUE NOT NULL,
    customer_id INT REFERENCES customers(id),
    status VARCHAR(20) NOT NULL
        CHECK(status IN ('Draft', 'Confirmed', 'Cancelled')),
    total_quantity INT NOT NULL DEFAULT 0,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challan_items (
    id SERIAL PRIMARY KEY,
    challan_id INT REFERENCES challans(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id),
    product_name VARCHAR(180) NOT NULL,
    sku VARCHAR(80) NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    quantity INT NOT NULL
        CHECK(quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_customers_search
ON customers(name, mobile, business_name);

CREATE INDEX IF NOT EXISTS idx_products_sku
ON products(sku);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product
ON stock_movements(product_id, created_at DESC);