import "dotenv/config";
import { pool } from "./db";
import { hashPassword } from "./auth";

(async () => {
  const pw = await hashPassword("Password123");

  await pool.query(`
    TRUNCATE
      users,
      customers,
      products,
      followups,
      stock_movements,
      challans,
      challan_items
    RESTART IDENTITY CASCADE
  `);

  // Create users
  const users = [
    ["Admin", "admin@erp.local", "Admin"],
    ["Sales", "sales@erp.local", "Sales"],
    ["Warehouse", "warehouse@erp.local", "Warehouse"],
    ["Accounts", "accounts@erp.local", "Accounts"],
  ];

  for (const user of users) {
    await pool.query(
      `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      `,
      [user[0], user[1], pw, user[2]]
    );
  }

  // Create customers
  await pool.query(`
    INSERT INTO customers (
      name,
      mobile,
      email,
      business_name,
      customer_type,
      address,
      status,
      follow_up_date,
      notes
    )
    VALUES (
      'Rajesh Kumar',
      '9876543210',
      'rajesh@example.com',
      'Rajesh Traders',
      'Wholesale',
      'Ahmedabad, Gujarat',
      'Active',
      CURRENT_DATE + 3,
      'Regular wholesale customer'
    )
  `);

  await pool.query(`
    INSERT INTO customers (
      name,
      mobile,
      email,
      business_name,
      customer_type,
      address,
      status
    )
    VALUES (
      'Priya Shah',
      '9123456780',
      'priya@example.com',
      'Priya Retail',
      'Retail',
      'Vadodara, Gujarat',
      'Lead'
    )
  `);

  // Create products
  await pool.query(`
    INSERT INTO products (
      name,
      sku,
      category,
      unit_price,
      current_stock,
      min_stock_alert,
      warehouse
    )
    VALUES
      (
        'Premium Rice 25kg',
        'RICE-25',
        'Groceries',
        1450,
        50,
        10,
        'Main Warehouse'
      ),
      (
        'Wheat Flour 10kg',
        'FLOUR-10',
        'Groceries',
        520,
        8,
        10,
        'Main Warehouse'
      ),
      (
        'Cooking Oil 5L',
        'OIL-5',
        'Grocery',
        780,
        35,
        8,
        'Main Warehouse'
      )
  `);

  console.log("Seed complete. Password for all users: Password123");

  await pool.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});