# Architecture

React frontend -> REST API (Express/TypeScript) -> PostgreSQL.

JWT authentication protects the API. Role middleware restricts writes: Admin/Sales manage CRM and create challans; Admin/Warehouse manage products. Challan confirmation uses a database transaction and row locks so concurrent sales cannot oversell inventory.

Data model: users, customers, followups, products, stock_movements, challans, challan_items. `challan_items` intentionally stores product snapshots so historical challans remain readable even if the catalog changes.
