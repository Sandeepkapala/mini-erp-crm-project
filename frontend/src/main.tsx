import React, { useEffect, useState } from 'react';
import {
  createRoot
} from 'react-dom/client';
import {
  BrowserRouter,
  useNavigate,
  useLocation,
  Routes,
  Route,
  NavLink
} from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  Truck,
  LogOut,
  Plus,
  Search,
  AlertTriangle,
  Menu,
  X,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';
import './styles.css';
import { api } from './lib/api';

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

/* =========================
   LOGIN
========================= */

function Login() {
  const nav = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const d = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          role
        })
      });

      // Save login information
      localStorage.setItem('token', d.token);
      localStorage.setItem('user', JSON.stringify(d.user));

      // Tell App that login happened
      window.dispatchEvent(
        new CustomEvent('auth-changed', {
          detail: d.user
        })
      );

      // Navigate to dashboard
      nav('/');
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div className="login">
      <form onSubmit={submit} className="login-card">

        <div className="brand">
          WHOLE<span>SALE</span>
        </div>

        <h1>Operations Portal</h1>

        <p>
          Mini ERP + CRM for wholesale operations
        </p>

        {err && (
          <div className="error">
            {err}
          </div>
        )}

        <label>
          Email

          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </label>

        <label>
          Password

          <div className="password-wrapper">
  <input
    type={showPassword ? 'text' : 'password'}
    value={password}
    onChange={e => setPassword(e.target.value)}
  />

  <button
    type="button"
    className="password-toggle"
    onClick={() => setShowPassword(!showPassword)}
    aria-label={showPassword ? 'Hide password' : 'Show password'}
  >
    {showPassword ? (
      <EyeOff size={18} />
    ) : (
      <Eye size={18} />
    )}
  </button>
</div>
<label>
  Login as

  <select
    value={role}
    onChange={e => setRole(e.target.value)}
    required
  >
    <option value="">
      Select role
    </option>

    <option value="Admin">
      Admin
    </option>

    <option value="Sales">
      Sales
    </option>

    <option value="Warehouse">
      Warehouse
    </option>

    <option value="Accounts">
      Accounts
    </option>
  </select>
</label>
        </label>

        <button className="primary">
          Sign in
        </button>

        

      </form>
    </div>
  );
}

/* =========================
   APP
========================= */

function App() {
  const nav = useNavigate();
  const loc = useLocation();

  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');

    return savedUser
      ? JSON.parse(savedUser)
      : null;
  });

  const [open, setOpen] = useState(false);

  /*
   * Listen for login/logout changes.
   * This fixes the need to refresh the browser.
   */
  useEffect(() => {
    function handleAuthChange(e: Event) {
      const event = e as CustomEvent;

      if (event.detail) {
        setUser(event.detail);
      } else {
        setUser(null);
      }
    }

    window.addEventListener(
      'auth-changed',
      handleAuthChange
    );

    return () => {
      window.removeEventListener(
        'auth-changed',
        handleAuthChange
      );
    };
  }, []);

  /*
   * Protect private routes.
   */
  useEffect(() => {
    if (
      !localStorage.getItem('token') &&
      loc.pathname !== '/login'
    ) {
      nav('/login');
    }
  }, [loc.pathname, nav]);

  /*
   * If there is no logged-in user,
   * show login page.
   */
  if (!user) {
    return (
      <Routes>
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="*"
          element={<Login />}
        />
      </Routes>
    );
  }

  const allLinks: [string, string, any, string[]][] = [
  ['/', 'Dashboard', LayoutDashboard, ['Admin', 'Sales', 'Warehouse', 'Accounts']],
  ['/customers', 'Customers', Users, ['Admin', 'Sales']],
  ['/products', 'Products', Package, ['Admin', 'Warehouse']],
  ['/challans', 'Sales Challans', Truck, ['Admin', 'Sales', 'Accounts']]
];

const links = allLinks.filter(
  ([, , , roles]) => roles.includes(user.role)
);
const allowedPaths = links.map(
  ([path]: any) => path
);

if (
  loc.pathname !== '/login' &&
  !allowedPaths.includes(loc.pathname)
) {
  nav('/');
  return null;
}

  /*
   * LOGOUT
   */
  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Immediately update React state
    setUser(null);

    // Navigate to login
    nav('/login');
  }

  return (
    <div className="app">

      <aside className={open ? 'open' : ''}>

        <div className="logo">
          WHOLE<span>SALE</span>
        </div>

        <div className="role">
          {user.name}
          <b>{user.role}</b>
        </div>

        <nav>
          {links.map(
            ([to, label, Icon]: any) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setOpen(false)}
              >
                <Icon size={18} />
                {label}
              </NavLink>
            )
          )}
        </nav>

        <button
          className="logout"
          onClick={logout}
        >
          <LogOut size={18} />
          Logout
        </button>

      </aside>

      <main>

        <header>

          <button
            className="menu"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>

          <div>
            <strong>
              {
                links.find(
                  x => x[0] === loc.pathname
                )?.[1] || 'Operations'
              }
            </strong>

            <span>
              Wholesale management workspace
            </span>
          </div>

        </header>

        <section className="content">

          <Routes>

            <Route
              path="/"
              element={<Dashboard />}
            />

            <Route
              path="/customers"
              element={<Customers />}
            />

            <Route
              path="/products"
              element={<Products />}
            />

            <Route
              path="/challans"
              element={<Challans />}
            />

          </Routes>

        </section>

      </main>

    </div>
  );
}

/* =========================
   DASHBOARD
========================= */

function Dashboard() {
  const [d, setD] = useState<any>();

  useEffect(() => {
    api('/dashboard').then(setD);
  }, []);

  return (
    <>
      <div className="page-title">

        <div>
          <h1>Dashboard</h1>
          <p>Today's operational overview</p>
        </div>

      </div>

      <div className="stats">

        {[
          [
            'Customers',
            d?.customers || 0,
            'active records'
          ],
          [
            'Products',
            d?.products || 0,
            'catalog items'
          ],
          [
            'Confirmed Challans',
            d?.confirmedChallans || 0,
            'sales documents'
          ],
          [
            'Low Stock',
            d?.lowStock || 0,
            'need attention'
          ]
        ].map((x, i) => (
          <div
            className="stat"
            key={x[0] as string}
          >
            <span>{x[0]}</span>
            <b>{x[1]}</b>
            <small>{x[2]}</small>
          </div>
        ))}

      </div>

      <div className="panel">

        <h2>Business flow</h2>

        <div className="flow">

          <div>
            01
            <strong>Manage customers</strong>
            <small>
              CRM, leads & follow-ups
            </small>
          </div>

          <div>
            02
            <strong>Maintain inventory</strong>
            <small>
              Products & stock movement
            </small>
          </div>

          <div>
            03
            <strong>Create challan</strong>
            <small>
              Confirm sale & reduce stock
            </small>
          </div>

        </div>

      </div>
    </>
  );
}

/* =========================
   CUSTOMERS
========================= */
function Customers() {
  const [data, setData] = useState<any>({
    data: []
  });

  const [q, setQ] = useState('');
  const [show, setShow] = useState(false);
  const [editShow, setEditShow] = useState(false);

  const [form, setForm] = useState<any>({
    name: '',
    mobile: '',
    email: '',
    businessName: '',
    gstNumber: '',
    customerType: 'Retail',
    address: '',
    status: 'Lead',
    followUpDate: '',
    notes: ''
  });

  const [editCustomerData, setEditCustomerData] =
    useState<any>({});

  const [selected, setSelected] = useState<any>();

  async function load() {
    setData(
      await api(
        '/customers?search=' +
          encodeURIComponent(q)
      )
    );
  }

  useEffect(() => {
    load();
  }, []);

  // ADD CUSTOMER
  async function save(e: React.FormEvent) {
    e.preventDefault();

    await api('/customers', {
      method: 'POST',
      body: JSON.stringify(form)
    });

    setShow(false);

    setForm({
      name: '',
      mobile: '',
      email: '',
      businessName: '',
      gstNumber: '',
      customerType: 'Retail',
      address: '',
      status: 'Lead',
      followUpDate: '',
      notes: ''
    });

    load();
  }

  // VIEW CUSTOMER
  async function detail(id: number) {
    setSelected(
      await api('/customers/' + id)
    );
  }

  // OPEN EDIT FORM
  function editCustomer(customer: any) {
    setEditCustomerData({
      id: customer.id,
      name: customer.name || '',
      mobile: customer.mobile || '',
      email: customer.email || '',
      businessName:
        customer.business_name || '',
      gstNumber:
        customer.gst_number || '',
      customerType:
        customer.customer_type || 'Retail',
      address:
        customer.address || '',
      status:
        customer.status || 'Lead',
      followUpDate:
        customer.follow_up_date || '',
      notes:
        customer.notes || ''
    });

    setEditShow(true);
  }

  // SAVE EDITED CUSTOMER
  async function updateCustomer(
    e: React.FormEvent
  ) {
    e.preventDefault();

    await api(
      '/customers/' +
        editCustomerData.id,
      {
        method: 'PUT',
        body: JSON.stringify({
          name: editCustomerData.name,
          mobile: editCustomerData.mobile,
          email: editCustomerData.email,
          businessName:
            editCustomerData.businessName,
          gstNumber:
            editCustomerData.gstNumber,
          customerType:
            editCustomerData.customerType,
          address:
            editCustomerData.address,
          status:
            editCustomerData.status,
          followUpDate:
            editCustomerData.followUpDate,
          notes:
            editCustomerData.notes
        })
      }
    );

    setEditShow(false);
    load();
  }

  // DELETE CUSTOMER
  async function deleteCustomer() {
    if (
      !window.confirm(
        'Are you sure you want to delete this customer?'
      )
    ) {
      return;
    }

    await api(
      '/customers/' +
        editCustomerData.id,
      {
        method: 'DELETE'
      }
    );

    setEditShow(false);
    setSelected(null);
    load();
  }

  return (
    <>
      <div className="page-title">

        <div>
          <h1>Customers</h1>
          <p>
            CRM records and follow-ups
          </p>
        </div>

        <button
          className="primary"
          onClick={() => setShow(true)}
        >
          <Plus size={18} />
          Add customer
        </button>

      </div>


      <div className="toolbar">

        <div className="search">

          <Search size={18} />

          <input
            placeholder="Search name, mobile or business"
            value={q}
            onChange={e =>
              setQ(e.target.value)
            }
            onKeyDown={e =>
              e.key === 'Enter' && load()
            }
          />

        </div>

      </div>


      <div className="panel table-wrap">

        <table>

          <thead>

            <tr>
              <th>Customer</th>
              <th>Business</th>
              <th>Type</th>
              <th>Status</th>
              <th>Follow-up</th>
              <th>Action</th>
            </tr>

          </thead>


          <tbody>

            {data.data.length === 0 ? (

              <tr>
                <td
                  colSpan={6}
                  className="empty-state"
                >
                  No customers
                </td>
              </tr>

            ) : (

              data.data.map((c: any) => (

                <tr
                  key={c.id}
                  onClick={() =>
                    detail(c.id)
                  }
                >

                  <td>
                    <b>{c.name}</b>
                    <small>
                      {c.mobile}
                    </small>
                  </td>

                  <td>
                    {c.business_name}
                  </td>

                  <td>
                    {c.customer_type}
                  </td>

                  <td>

                    <span
                      className={
                        'badge ' +
                        c.status.toLowerCase()
                      }
                    >
                      {c.status}
                    </span>

                  </td>

                  <td>
                    {c.follow_up_date || '—'}
                  </td>

                  <td>

                    <button
                      type="button"
                      className="edit-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        editCustomer(c);
                      }}
                    >
                      Edit
                    </button>

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>


      {/* ADD CUSTOMER */}

      {show && (

        <Modal
          title="Add customer"
          close={() =>
            setShow(false)
          }
        >

          <form
            className="form"
            onSubmit={save}
          >

            {[
              ['name', 'Customer name'],
              ['mobile', 'Mobile number'],
              ['email', 'Email'],
              [
                'businessName',
                'Business name'
              ],
              [
                'gstNumber',
                'GST number (optional)'
              ],
              ['address', 'Address']
            ].map(([k, l]) => (

              <label key={k}>

                {l}

                <input
                  required={
                    ![
                      'email',
                      'gstNumber'
                    ].includes(k)
                  }
                  value={form[k]}
                  onChange={e =>
                    setForm({
                      ...form,
                      [k]: e.target.value
                    })
                  }
                />

              </label>

            ))}


            <div className="grid2">

              <label>
                Type

                <select
                  value={
                    form.customerType
                  }
                  onChange={e =>
                    setForm({
                      ...form,
                      customerType:
                        e.target.value
                    })
                  }
                >
                  <option>Retail</option>
                  <option>Wholesale</option>
                  <option>Distributor</option>
                </select>

              </label>


              <label>
                Status

                <select
                  value={form.status}
                  onChange={e =>
                    setForm({
                      ...form,
                      status:
                        e.target.value
                    })
                  }
                >
                  <option>Lead</option>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>

              </label>

            </div>


            <label>
              Follow-up date

              <input
                type="date"
                value={
                  form.followUpDate
                }
                onChange={e =>
                  setForm({
                    ...form,
                    followUpDate:
                      e.target.value
                  })
                }
              />

            </label>


            <label>
              Notes

              <textarea
                value={form.notes}
                onChange={e =>
                  setForm({
                    ...form,
                    notes:
                      e.target.value
                  })
                }
              />

            </label>


            <button
              className="primary"
              type="submit"
            >
              <Save size={17} />
              Save customer
            </button>

          </form>

        </Modal>

      )}


      {/* EDIT CUSTOMER */}

      {editShow && (

        <Modal
          title="Edit Customer"
          close={() =>
            setEditShow(false)
          }
        >

          <form
            className="form"
            onSubmit={updateCustomer}
          >

            <label>
              Customer name

              <input
                required
                value={
                  editCustomerData.name
                }
                onChange={e =>
                  setEditCustomerData({
                    ...editCustomerData,
                    name:
                      e.target.value
                  })
                }
              />

            </label>


            <label>
              Mobile number

              <input
                required
                value={
                  editCustomerData.mobile
                }
                onChange={e =>
                  setEditCustomerData({
                    ...editCustomerData,
                    mobile:
                      e.target.value
                  })
                }
              />

            </label>


            <label>
              Email

              <input
                value={
                  editCustomerData.email
                }
                onChange={e =>
                  setEditCustomerData({
                    ...editCustomerData,
                    email:
                      e.target.value
                  })
                }
              />

            </label>


            <label>
              Business name

              <input
                required
                value={
                  editCustomerData.businessName
                }
                onChange={e =>
                  setEditCustomerData({
                    ...editCustomerData,
                    businessName:
                      e.target.value
                  })
                }
              />

            </label>


            <label>
              GST number

              <input
                value={
                  editCustomerData.gstNumber
                }
                onChange={e =>
                  setEditCustomerData({
                    ...editCustomerData,
                    gstNumber:
                      e.target.value
                  })
                }
              />

            </label>


            <div className="grid2">

              <label>
                Type

                <select
                  value={
                    editCustomerData.customerType
                  }
                  onChange={e =>
                    setEditCustomerData({
                      ...editCustomerData,
                      customerType:
                        e.target.value
                    })
                  }
                >
                  <option>Retail</option>
                  <option>Wholesale</option>
                  <option>Distributor</option>
                </select>

              </label>


              <label>
                Status

                <select
                  value={
                    editCustomerData.status
                  }
                  onChange={e =>
                    setEditCustomerData({
                      ...editCustomerData,
                      status:
                        e.target.value
                    })
                  }
                >
                  <option>Lead</option>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>

              </label>

            </div>


            <label>
              Address

              <textarea
                required
                value={
                  editCustomerData.address
                }
                onChange={e =>
                  setEditCustomerData({
                    ...editCustomerData,
                    address:
                      e.target.value
                  })
                }
              />

            </label>


            <label>
              Follow-up date

              <input
                type="date"
                value={
                  editCustomerData.followUpDate
                }
                onChange={e =>
                  setEditCustomerData({
                    ...editCustomerData,
                    followUpDate:
                      e.target.value
                  })
                }
              />

            </label>


            <label>
              Notes

              <textarea
                value={
                  editCustomerData.notes
                }
                onChange={e =>
                  setEditCustomerData({
                    ...editCustomerData,
                    notes:
                      e.target.value
                  })
                }
              />

            </label>


            <div className="edit-actions">

              <button
                type="submit"
                className="primary"
              >
                <Save size={17} />
                Save Changes
              </button>


              <button
                type="button"
                className="delete-btn"
                onClick={
                  deleteCustomer
                }
              >
                Delete
              </button>

            </div>

          </form>

        </Modal>

      )}

    </>
  );
}
/* =========================
   PRODUCTS
========================= */

function Products() {
  const [data, setData] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [show, setShow] = useState(false);

  const [form, setForm] = useState<any>({
    name: '',
    sku: '',
    category: '',
    unitPrice: 0,
    currentStock: 0,
    minStockAlert: 5,
    warehouse: 'Main Warehouse'
  });

  const [editShow, setEditShow] = useState(false);
  const [editProductData, setEditProductData] = useState<any>({});

  async function load() {
    setData(
      await api(
        '/products?search=' +
          encodeURIComponent(q)
      )
    );
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();

    await api('/products', {
      method: 'POST',
      body: JSON.stringify(form)
    });

    setShow(false);

    setForm({
      name: '',
      sku: '',
      category: '',
      unitPrice: 0,
      currentStock: 0,
      minStockAlert: 5,
      warehouse: 'Main Warehouse'
    });

    load();
  }

  // OPEN EDIT FORM
  function editProduct(product: any) {
    setEditProductData({
      id: product.id,
      name: product.name || '',
      sku: product.sku || '',
      category: product.category || '',
      unitPrice: product.unit_price || '',
      currentStock: product.current_stock || 0,
      minStockAlert: product.min_stock_alert || 0,
      warehouse: product.warehouse || ''
    });

    setEditShow(true);
  }

  // SAVE EDITED PRODUCT
  async function updateProduct(e: React.FormEvent) {
    e.preventDefault();

    await api('/products/' + editProductData.id, {
      method: 'PUT',
      body: JSON.stringify({
        name: editProductData.name,
        sku: editProductData.sku,
        category: editProductData.category,
        unitPrice: Number(editProductData.unitPrice),
        minStockAlert: Number(editProductData.minStockAlert),
        warehouse: editProductData.warehouse
      })
    });

    setEditShow(false);
    load();
  }

  // DELETE PRODUCT
  async function deleteProduct() {
    if (
      !window.confirm(
        'Are you sure you want to delete this product?'
      )
    ) {
      return;
    }

    await api(
      '/products/' + editProductData.id,
      {
        method: 'DELETE'
      }
    );

    setEditShow(false);
    load();
  }

  return (
    <>
      <div className="page-title">

        <div>
          <h1>Products & Inventory</h1>
          <p>
            Catalog, stock levels and warehouse visibility
          </p>
        </div>

        <button
          className="primary"
          onClick={() => setShow(true)}
        >
          <Plus size={18} />
          Add product
        </button>

      </div>

      <div className="toolbar">

        <div className="search">

          <Search size={18} />

          <input
            placeholder="Search SKU, product or category"
            value={q}
            onChange={e =>
              setQ(e.target.value)
            }
            onKeyDown={e =>
              e.key === 'Enter' && load()
            }
          />

        </div>

      </div>

      <div className="panel table-wrap">

        <table>

          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Warehouse</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>

            {data.length === 0 ? (

              <tr>
                <td
                  colSpan={7}
                  className="empty-state"
                >
                  No products
                </td>
              </tr>

            ) : (

              data.map((p: any) => (

                <tr key={p.id}>

                  <td>
                    <b>{p.name}</b>
                  </td>

                  <td>
                    {p.sku}
                  </td>

                  <td>
                    {p.category}
                  </td>

                  <td>
                    ₹
                    {Number(
                      p.unit_price
                    ).toLocaleString()}
                  </td>

                  <td>

                    {p.current_stock <=
                    p.min_stock_alert ? (

                      <span className="low">
                        <AlertTriangle
                          size={15}
                        />
                        {p.current_stock}
                      </span>

                    ) : (

                      p.current_stock

                    )}

                  </td>

                  <td>
                    {p.warehouse}
                  </td>

                  <td>

                    <button
                      type="button"
                      className="edit-btn"
                      onClick={() =>
                        editProduct(p)
                      }
                    >
                      Edit
                    </button>

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>


      {/* ADD PRODUCT */}

      {show && (

        <Modal
          title="Add product"
          close={() => setShow(false)}
        >

          <form
            className="form"
            onSubmit={save}
          >

            {[
              ['name', 'Product name'],
              ['sku', 'SKU / code'],
              ['category', 'Category'],
              ['unitPrice', 'Unit price'],
              ['currentStock', 'Current stock'],
              [
                'minStockAlert',
                'Minimum stock alert'
              ],
              ['warehouse', 'Warehouse']
            ].map(([k, l]) => (

              <label key={k}>

                {l}

                <input
                  type={
                    [
                      'unitPrice',
                      'currentStock',
                      'minStockAlert'
                    ].includes(k)
                      ? 'number'
                      : 'text'
                  }
                  required
                  value={form[k]}
                  onChange={e =>
                    setForm({
                      ...form,
                      [k]: e.target.value
                    })
                  }
                />

              </label>

            ))}

            <button
              className="primary"
              type="submit"
            >
              <Save size={17} />
              Save product
            </button>

          </form>

        </Modal>

      )}


      {/* EDIT PRODUCT */}

      {editShow && (

        <Modal
          title="Edit Product"
          close={() =>
            setEditShow(false)
          }
        >

          <form
            className="form"
            onSubmit={updateProduct}
          >

            <label>
              Product name

              <input
                required
                value={
                  editProductData.name
                }
                onChange={e =>
                  setEditProductData({
                    ...editProductData,
                    name: e.target.value
                  })
                }
              />

            </label>


            <label>
              SKU / Code

              <input
                required
                value={
                  editProductData.sku
                }
                onChange={e =>
                  setEditProductData({
                    ...editProductData,
                    sku: e.target.value
                  })
                }
              />

            </label>


            <label>
              Category

              <input
                required
                value={
                  editProductData.category
                }
                onChange={e =>
                  setEditProductData({
                    ...editProductData,
                    category: e.target.value
                  })
                }
              />

            </label>


            <label>
              Unit price

              <input
                type="number"
                required
                value={
                  editProductData.unitPrice
                }
                onChange={e =>
                  setEditProductData({
                    ...editProductData,
                    unitPrice:
                      e.target.value
                  })
                }
              />

            </label>


            <label>
              Minimum stock alert

              <input
                type="number"
                required
                value={
                  editProductData.minStockAlert
                }
                onChange={e =>
                  setEditProductData({
                    ...editProductData,
                    minStockAlert:
                      e.target.value
                  })
                }
              />

            </label>


            <label>
              Warehouse

              <input
                required
                value={
                  editProductData.warehouse
                }
                onChange={e =>
                  setEditProductData({
                    ...editProductData,
                    warehouse:
                      e.target.value
                  })
                }
              />

            </label>


            <div
              className="edit-actions"
            >

              <button
                type="submit"
                className="primary"
              >
                <Save size={17} />
                Save Changes
              </button>


              <button
                type="button"
                className="delete-btn"
                onClick={
                  deleteProduct
                }
              >
                Delete
              </button>

            </div>

          </form>

        </Modal>

      )}

    </>
  );
}

/* =========================
   CHALLANS
========================= */

function Challans() {
  const [customers, setCustomers] =
    useState<any[]>([]);

  const [products, setProducts] =
    useState<any[]>([]);

  const [list, setList] =
    useState<any[]>([]);

  const [customerId, setCustomerId] =
    useState('');

  const [items, setItems] =
    useState<any[]>([]);

  const [status, setStatus] =
    useState('Draft');

  const [show, setShow] =
    useState(false);

  const [err, setErr] =
    useState('');

  async function load() {
    setCustomers(
      (
        await api(
          '/customers?limit=50'
        )
      ).data
    );

    setProducts(
      await api('/products')
    );

    setList(
      await api('/challans')
    );
  }

  useEffect(() => {
    load();
  }, []);

  function add() {
    if (products.length) {
      setItems([
        ...items,
        {
          productId: products[0].id,
          quantity: 1
        }
      ]);
    }
  }

  async function save() {
    setErr('');

    try {

      await api('/challans', {
        method: 'POST',
        body: JSON.stringify({
          customerId: Number(customerId),
          status,
          items
        })
      });

      setShow(false);
      setItems([]);

      load();

    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <>
      <div className="page-title">

        <div>
          <h1>Sales Challans</h1>
          <p>
            Create draft or confirmed sales documents
          </p>
        </div>

        <button
          className="primary"
          onClick={() => setShow(true)}
        >
          <Plus size={18} />
          Create challan
        </button>

      </div>

      <div className="panel table-wrap">

        <table>

          <thead>
            <tr>
              <th>Challan</th>
              <th>Customer</th>
              <th>Total qty</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
<tbody>
  {list.length === 0 ? (
    <tr>
      <td colSpan={5} className="empty-state">
        No challans
      </td>
    </tr>
  ) : (
    list.map((c: any) => (
      <tr key={c.id}>
        <td><b>{c.challan_number}</b></td>
        <td>{c.customer_name}</td>
        <td>{c.total_quantity}</td>
        <td>
          <span className={'badge ' + c.status.toLowerCase()}>
            {c.status}
          </span>
        </td>
        <td>{c.created_at?.slice(0, 10)}</td>
      </tr>
    ))
  )}
</tbody>

        </table>

      </div>

      {show && (
        <Modal
          title="Create sales challan"
          close={() => setShow(false)}
        >

          <div className="form">

            <label>
              Customer

              <select
                value={customerId}
                onChange={e =>
                  setCustomerId(
                    e.target.value
                  )
                }
              >

                <option value="">
                  Select customer
                </option>

                {customers.map(c => (
                  <option
                    key={c.id}
                    value={c.id}
                  >
                    {c.name} — {c.business_name}
                  </option>
                ))}

              </select>

            </label>

            <label>
              Status

              <select
                value={status}
                onChange={e =>
                  setStatus(
                    e.target.value
                  )
                }
              >
                <option>Draft</option>
                <option>Confirmed</option>
              </select>

            </label>

            <h3>Products</h3>

            {items.map((it, i) => (
              <div
                className="item-row"
                key={i}
              >

                <select
                  value={it.productId}
                  onChange={e => {
                    const n = [...items];

                    n[i].productId =
                      Number(e.target.value);

                    setItems(n);
                  }}
                >

                  {products.map(p => (
                    <option
                      key={p.id}
                      value={p.id}
                    >
                      {p.name} (stock{' '}
                      {p.current_stock})
                    </option>
                  ))}

                </select>

                <input
                  type="number"
                  min="1"
                  value={it.quantity}
                  onChange={e => {
                    const n = [...items];

                    n[i].quantity =
                      Number(e.target.value);

                    setItems(n);
                  }}
                />

              </div>
            ))}

            <button
              className="secondary"
              onClick={add}
            >
              + Add product
            </button>

            {err && (
              <div className="error">
                {err}
              </div>
            )}

            <button
              className="primary"
              disabled={
                !customerId ||
                !items.length
              }
              onClick={save}
            >
              <Save size={17} />
              Save challan
            </button>

          </div>

        </Modal>
      )}

    </>
  );
}

/* =========================
   MODAL
========================= */

function Modal({
  title,
  close,
  children
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overlay">

      <div className="modal">

        <div className="modal-head">

          <h2>{title}</h2>

          <button onClick={close}>
            <X />
          </button>

        </div>

        {children}

      </div>

    </div>
  );
}

/* =========================
   ROOT
========================= */

createRoot(
  document.getElementById('root')!
).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);