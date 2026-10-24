import { Component, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import './ADMIN.css'
import logo from '../assets/logo.png'

const navigation = [
  ['bakery_dining', 'Dashboard'],
  ['inventory_2', 'Inventory'],
  ['shopping_bag', 'Profit'],
  ['analytics', 'Analytics'],
  ['archive', 'Archives'],
  
]

const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const inventoryStockFilters = [
  { value: 'all', label: 'All Stocks', icon: 'select_all' },
  { value: 'out', label: 'Out of Stock', icon: 'remove_shopping_cart' },
  { value: 'low', label: 'Low Stock', icon: 'warning' },
  { value: 'available', label: 'In Stock', icon: 'inventory_2' },
]
const productDateFormatter = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const pesoFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })
const safeMoneyTotal = (records, amountOf) => records.reduce((cents, record) => cents + Math.round(amountOf(record) * 100), 0) / 100
const manilaDateKey = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date())
const manilaKeyFor = (timestamp) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(timestamp))
const manilaDayStart = (dateKey) => new Date(`${dateKey}T00:00:00+08:00`).getTime()
const dateRangeBounds = (startDate, endDate) => ({
  start: startDate ? manilaDayStart(startDate) : -Infinity,
  end: endDate ? manilaDayStart(endDate) + 24 * 60 * 60 * 1000 : Infinity,
})
const canonicalRevenueRecords = (sales, earnings) => {
  const earningDays = new Set(earnings.map((earning) => manilaKeyFor(earning.date)))
  const saleRecords = sales.filter((sale) => sale.recordType !== 'earning' && !earningDays.has(manilaKeyFor(sale.date)))
  return [...saleRecords.map((sale) => ({ amount: sale.totalPrice, date: sale.date })),
    ...earnings.map((earning) => ({ amount: Number.isInteger(earning.amountCents) ? earning.amountCents / 100 : earning.amount, date: earning.date }))]
}

class ArchivesErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <section className="archive-error" role="alert">
          <span className="material-symbols-outlined" aria-hidden="true">cloud_off</span>
          <p>ARCHIVES UNAVAILABLE</p>
          <h2 id="archives-title">We couldn&apos;t load your archives</h2>
          <span>Please check that Convex is running and try opening Archives again.</span>
          <button type="button" onClick={this.props.onClose}>Close and try again</button>
        </section>
      )
    }
    return this.props.children
  }
}

class ProfitErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <section className="archive-error" role="alert">
          <span className="material-symbols-outlined" aria-hidden="true">cloud_off</span>
          <p>PROFIT DATA UNAVAILABLE</p>
          <h2 id="profit-data-error-title">We couldn&apos;t load Profit Investment</h2>
          <span>The sales service did not return the data for this page. Check the Convex deployment and try again.</span>
          <button type="button" onClick={() => this.setState({ error: null })}>Retry</button>
        </section>
      )
    }
    return this.props.children
  }
}

function getStockStatus(stock) {
  if (stock === 0) return { label: 'Out of Stock', tone: 'out' }
  if (stock <= 10) return { label: 'Low Stock', tone: 'low' }
  return { label: 'In Stock', tone: 'available' }
}

function buildChartPaths(values) {
  const maxValue = Math.max(1, ...values)
  const bottom = 185
  const height = 160
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 500 : (index / (values.length - 1)) * 1000
    const y = bottom - (value / maxValue) * height
    return [x, y]
  })
  const line = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  return { line, area: `${line} L1000,200 L0,200 Z` }
}

export default function Admin({ onSignOut }) {
  const dashboardStats = useQuery(api.historysale.dashboardStats)
  const dashboardProducts = useQuery(api.addproduct.list) ?? []
  const inventoryAlertsPageSize = 6
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [range, setRange] = useState('Monthly')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isArchivesOpen, setIsArchivesOpen] = useState(false)
  const [inventoryAlertsPage, setInventoryAlertsPage] = useState(1)

  const selectNavigation = (label) => {
    if (label === 'Archives') {
      setIsArchivesOpen(true)
      setIsMenuOpen(false)
      return
    }
    setActiveNav(label)
    setIsMenuOpen(false)
  }
  const stats = dashboardStats ?? { netProfit: 0, profitPercentage: 0, dailyRevenue: 0, weeklyRevenue: 0, monthlyRevenueTotal: 0, dailyRevenueBuckets: [0, 0, 0, 0, 0, 0, 0], monthlyRevenue: Array.from({ length: 12 }, () => 0), yearlyRevenue: Array.from({ length: 5 }, () => 0), yearlyLabels: [] }
  const maxDailyRevenue = Math.max(1, ...stats.dailyRevenueBuckets)
  const chartValues = range === 'Monthly' ? stats.monthlyRevenue : stats.yearlyRevenue
  const chartLabels = range === 'Monthly' ? months : stats.yearlyLabels
  const chartPaths = buildChartPaths(chartValues)
  const chartTotal = chartValues.reduce((sum, value) => sum + value, 0)
  const stockAlerts = dashboardProducts.filter((product) => product.stock <= 10).toSorted((first, second) => first.stock - second.stock)
  const inventoryAlertsTotalPages = Math.max(1, Math.ceil(stockAlerts.length / inventoryAlertsPageSize))
  const currentInventoryAlertsPage = Math.min(inventoryAlertsPage, inventoryAlertsTotalPages)
  const inventoryAlertsPageStart = (currentInventoryAlertsPage - 1) * inventoryAlertsPageSize
  const visibleStockAlerts = stockAlerts.slice(
    inventoryAlertsPageStart,
    inventoryAlertsPageStart + inventoryAlertsPageSize,
  )

  return (
    <div className="admin-shell">
      <aside id="admin-sidebar" className={`admin-sidebar${isMenuOpen ? ' is-open' : ''}`}>
        <div className="admin-brand">
          <button
            className="admin-brand-button"
            type="button"
            aria-label={isMenuOpen ? 'Close admin menu' : 'Open admin menu'}
            aria-controls="admin-sidebar"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            <img src={logo} alt="Khamala and Kshitija Cake and Pastries" />
            <span className="mobile-menu-icon material-symbols-outlined" aria-hidden="true">
              {isMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>

        <nav className="admin-nav" aria-label="Admin navigation">
          <ul>
            {navigation.map(([icon, label]) => (
              <li key={label}>
                <button
                  className={activeNav === label || (label === 'Archives' && isArchivesOpen) ? 'active' : ''}
                  type="button"
                  aria-current={activeNav === label ? 'page' : undefined}
                  onClick={() => selectNavigation(label)}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
                  <span>{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <button className="sidebar-action" type="button" onClick={onSignOut}>
          <span className="material-symbols-outlined" aria-hidden="true">logout</span>
          Sign Out
        </button>
      </aside>

      {isMenuOpen ? (
        <button
          className="admin-sidebar-backdrop"
          type="button"
          aria-label="Close admin menu"
          onClick={() => setIsMenuOpen(false)}
        />
      ) : null}

      <main className="admin-main">
        {activeNav === 'Inventory' ? <InventoryView /> : activeNav === 'Profit' ? <ProfitErrorBoundary><ProfitView /></ProfitErrorBoundary> : activeNav === 'Analytics' ? <AnalyticsView /> : (
          <>
        <header className="admin-heading">
          <div>
            <h2>Dashboard</h2>
            <p>Sales and inventory performance overview</p>
          </div>
          <span className="admin-date">Updated today</span>
        </header>

        <section className="metrics-grid" aria-label="Key performance metrics">
          <MetricCard label="Net Profit" value={pesoFormatter.format(stats.netProfit)} badge={`${stats.profitPercentage >= 0 ? '+' : ''}${stats.profitPercentage.toFixed(1)}%`} badgeTone={stats.profitPercentage >= 0 ? 'positive' : 'negative'}>
            <div className="progress-track"><span style={{ width: `${Math.min(100, Math.max(0, stats.profitPercentage))}%` }} /></div>
          </MetricCard>
          <MetricCard label="Daily Sales" value={pesoFormatter.format(stats.dailyRevenue)} icon="trending_up">
            <p className="metric-detail">Today&apos;s total sales amount</p>
          </MetricCard>
          <MetricCard label="Weekly Sales" value={pesoFormatter.format(stats.weeklyRevenue)} icon="history">
            <div className="mini-bars">{stats.dailyRevenueBuckets.map((amount, index) => <span key={index} className={amount === maxDailyRevenue && amount > 0 ? 'peak' : ''} title={pesoFormatter.format(amount)} style={{ height: `${Math.max(12, (amount / maxDailyRevenue) * 100)}%` }} />)}</div>
          </MetricCard>
          <MetricCard label="Monthly Sales" value={pesoFormatter.format(stats.monthlyRevenueTotal)} detail="Current month total sales amount" />
        </section>

        <section className="analytics-grid">
          <div className="admin-card revenue-card">
            <div className="section-head">
              <div>
                <h3>Revenue Trends</h3>
                <p>{range === 'Monthly' ? 'Current year by month' : 'Revenue across the last five years'} · {pesoFormatter.format(chartTotal)}</p>
              </div>
              <div className="range-tabs">
                {['Yearly', 'Monthly'].map((option) => (
                  <button key={option} className={range === option ? 'active' : ''} type="button" aria-pressed={range === option} onClick={() => setRange(option)}>{option}</button>
                ))}
              </div>
            </div>
            <div className="chart-wrap" aria-label={`${range} revenue chart`}>
              <svg preserveAspectRatio="none" viewBox="0 0 1000 200" role="img">
                <defs>
                  <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#735c00" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#735c00" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={chartPaths.area} fill="url(#revenueGradient)" />
                <path d={chartPaths.line} fill="none" stroke="#735c00" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
              </svg>
            </div>
            <div className="chart-months">{chartLabels.map((label) => <span key={label}>{label}</span>)}</div>
          </div>

        </section>

        <section className="orders-section">
          <div className="section-head">
            <div>
              <h3>Inventory Alerts</h3>
              <p>Products that are out of stock or running low</p>
            </div>
            <button className="link-button" type="button" onClick={() => selectNavigation('Inventory')}>View Inventory <span className="material-symbols-outlined">arrow_forward</span></button>
          </div>
          <div className="admin-card orders-card">
            <table className="orders-table">
              <thead><tr><th>Product</th><th>No. of Stock</th><th>Status</th><th>Last Stock Update</th><th className="amount">Price</th></tr></thead>
              <tbody>
                {visibleStockAlerts.map((product) => (
                  <tr key={product._id}>
                    <td><strong className="alert-product-name">{product.name}</strong></td>
                    <td><span className={`stock-badge ${getStockStatus(product.stock).tone}`}>{product.stock}</span></td>
                    <td><span className={`status ${product.stock === 0 ? 'out' : 'low'}`}>{product.stock === 0 ? 'Out of Stock' : 'Low Stock'}</span></td>
                    <td>{product.stockUpdatedAt ? productDateFormatter.format(product.stockUpdatedAt) : 'Not updated'}</td>
                    <td className="amount">{pesoFormatter.format(product.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stockAlerts.length === 0 ? <p className="inventory-empty">All products have healthy stock levels.</p> : null}
          </div>
          {stockAlerts.length > inventoryAlertsPageSize ? (
            <Pagination
              currentPage={currentInventoryAlertsPage}
              totalPages={inventoryAlertsTotalPages}
              pageStart={inventoryAlertsPageStart}
              pageSize={inventoryAlertsPageSize}
              totalItems={stockAlerts.length}
              onPageChange={setInventoryAlertsPage}
            />
          ) : null}
        </section>
          </>
        )}
      </main>
      {isArchivesOpen ? <div className="archive-modal-backdrop" role="presentation" onMouseDown={() => setIsArchivesOpen(false)}><div className="archive-modal" role="dialog" aria-modal="true" aria-labelledby="archives-title" onMouseDown={(event) => event.stopPropagation()}><ArchivesErrorBoundary onClose={() => setIsArchivesOpen(false)}><ArchivesView onClose={() => setIsArchivesOpen(false)} /></ArchivesErrorBoundary></div></div> : null}
    </div>
  )
}

function InventoryView() {
  const pageSize = 5
  const products = useQuery(api.addproduct.list) ?? []
  const addProduct = useMutation(api.addproduct.add)
  const updateProduct = useMutation(api.addproduct.update)
  const removeProduct = useMutation(api.addproduct.remove)
  const [editingProduct, setEditingProduct] = useState(null)
  const [pendingEditProduct, setPendingEditProduct] = useState(null)
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [addedProductName, setAddedProductName] = useState('')
  const [updatedProductName, setUpdatedProductName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [formError, setFormError] = useState('')
  const [selectedPage, setSelectedPage] = useState(1)
  const [selectedStockStatus, setSelectedStockStatus] = useState('all')
  const filteredProducts = selectedStockStatus !== 'all'
    ? products.filter((product) => getStockStatus(product.stock).tone === selectedStockStatus)
    : products
  const stockCounts = products.reduce((counts, product) => {
    counts[getStockStatus(product.stock).tone] += 1
    return counts
  }, { out: 0, low: 0, available: 0 })
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
  const currentPage = Math.min(selectedPage, totalPages)
  const pageStart = (currentPage - 1) * pageSize
  const visibleProducts = filteredProducts.slice(pageStart, pageStart + pageSize)

  const selectStockStatus = (status) => {
    setSelectedStockStatus(status)
    setSelectedPage(1)
  }

  const openProductModal = (product = null) => {
    setEditingProduct(product)
    setFormError('')
    setIsModalOpen(true)
  }

  const closeProductModal = () => {
    setEditingProduct(null)
    setIsModalOpen(false)
  }

  const confirmProductEdit = () => {
    if (!pendingEditProduct) return
    const product = pendingEditProduct
    setPendingEditProduct(null)
    openProductModal(product)
  }

  const saveProduct = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setFormError('')
    const formData = new FormData(event.currentTarget)
    const product = {
      name: formData.get('name').trim(),
      category: formData.get('category'),
      stock: Number(formData.get('stock')),
      price: Number(formData.get('price')),
    }

    try {
      if (editingProduct) {
        await updateProduct({ id: editingProduct._id, ...product })
        setUpdatedProductName(product.name)
      } else {
        await addProduct(product)
        setSelectedPage(1)
        setAddedProductName(product.name)
      }
      closeProductModal()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save product.')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteProduct = async () => {
    if (!pendingDeleteProduct) return
    setIsDeleting(true)
    setDeleteError('')
    try {
      await removeProduct({ id: pendingDeleteProduct._id })
      setPendingDeleteProduct(null)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Unable to delete product.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <section className="inventory-view">
      <header className="inventory-heading">
        <div>
          <p className="inventory-eyebrow">PRODUCT MANAGEMENT</p>
          <h2>Inventory</h2>
          <p>Manage product availability, stock levels, and pricing.</p>
        </div>
        <button className="add-product-button" type="button" onClick={() => openProductModal()}>
          <span className="material-symbols-outlined" aria-hidden="true">add</span>
          Add Product
        </button>
      </header>

      <nav className="inventory-category-filters" aria-label="Filter inventory by stock status">
        {inventoryStockFilters.map((status) => {
          const isActive = selectedStockStatus === status.value
          const count = status.value === 'all' ? products.length : stockCounts[status.value]
          return (
            <button key={status.value} className={`${status.value}${isActive ? ' active' : ''}`} type="button" aria-pressed={isActive} onClick={() => selectStockStatus(status.value)}>
              <span className="material-symbols-outlined" aria-hidden="true">{status.icon}</span>
              <span><strong>{count}</strong><small>{status.label}</small></span>
              <span className="inventory-filter-check material-symbols-outlined" aria-hidden="true">check_circle</span>
            </button>
          )
        })}
      </nav>

      <div className="admin-card inventory-table-card">
        <table className="inventory-table">
          <thead>
            <tr><th>No.</th><th>Product Name</th><th>Category</th><th>No. of Stock</th><th>Price</th><th>Status</th><th>Date &amp; Time Added</th><th>Stock Updated</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {visibleProducts.map((product, index) => (
              <tr key={product._id}>
                <td data-label="No.">{String(pageStart + index + 1).padStart(2, '0')}</td>
                <td data-label="Product Name"><strong>{product.name}</strong></td>
                <td data-label="Category"><span className={`category-badge ${product.category?.toLowerCase() ?? 'unassigned'}`}>{product.category ?? 'Unassigned'}</span></td>
                <td data-label="No. of Stock"><span className={`stock-badge ${getStockStatus(product.stock).tone}`}>{product.stock}</span></td>
                <td data-label="Price">₱{product.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                <td data-label="Status">
                  <span className={`inventory-status ${getStockStatus(product.stock).tone}`}>
                    <span aria-hidden="true" />
                    {getStockStatus(product.stock).label}
                  </span>
                </td>
                <td className="product-created" data-label="Date & Time Added">
                  <time dateTime={new Date(product._creationTime).toISOString()}>
                    {productDateFormatter.format(product._creationTime)}
                  </time>
                </td>
                <td className="product-created" data-label="Stock Updated">
                  {product.stockUpdatedAt ? (
                    <time dateTime={new Date(product.stockUpdatedAt).toISOString()}>
                      {productDateFormatter.format(product.stockUpdatedAt)}
                    </time>
                  ) : <span className="not-updated">Not updated</span>}
                </td>
                <td data-label="Actions">
                  <div className="inventory-actions">
                    <button type="button" aria-label={`Edit ${product.name}`} onClick={() => setPendingEditProduct(product)}>
                      <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                    </button>
                    <button className="delete" type="button" aria-label={`Delete ${product.name}`} onClick={() => {
                      setDeleteError('')
                      setPendingDeleteProduct(product)
                    }}>
                      <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredProducts.length === 0 ? <p className="inventory-empty">{products.length === 0 ? 'No products yet. Add your first product to get started.' : `No ${inventoryStockFilters.find((status) => status.value === selectedStockStatus)?.label.toLowerCase()} products found.`}</p> : null}
      </div>

      {filteredProducts.length > pageSize ? (
        <nav className="inventory-pagination" aria-label="Inventory pagination">
          <p>Showing {pageStart + 1}–{Math.min(pageStart + pageSize, filteredProducts.length)} of {filteredProducts.length}</p>
          <div>
            <button type="button" disabled={currentPage === 1} onClick={() => setSelectedPage(currentPage - 1)} aria-label="Previous page">
              <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <button key={page} className={currentPage === page ? 'active' : ''} type="button" aria-current={currentPage === page ? 'page' : undefined} onClick={() => setSelectedPage(page)}>{page}</button>
            ))}
            <button type="button" disabled={currentPage === totalPages} onClick={() => setSelectedPage(currentPage + 1)} aria-label="Next page">
              <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
            </button>
          </div>
        </nav>
      ) : null}

      {pendingEditProduct ? (
        <div className="product-modal-backdrop" role="presentation" onMouseDown={() => setPendingEditProduct(null)}>
          <section className="product-modal product-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="product-edit-confirm-title" aria-describedby="product-edit-confirm-description" onMouseDown={(event) => event.stopPropagation()}>
            <div className="product-confirm-icon" aria-hidden="true">
              <span className="material-symbols-outlined">edit</span>
            </div>
            <p className="product-success-eyebrow">CONFIRM EDIT</p>
            <h3 id="product-edit-confirm-title">Are you sure you want to edit this product?</h3>
            <p id="product-edit-confirm-description">You are about to make changes to <strong>{pendingEditProduct.name}</strong>.</p>
            <div className="product-modal-actions">
              <button className="cancel" type="button" onClick={() => setPendingEditProduct(null)}>Cancel</button>
              <button className="save" type="button" onClick={confirmProductEdit}>Yes, Edit Product</button>
            </div>
          </section>
        </div>
      ) : null}

      {pendingDeleteProduct ? (
        <div className="product-modal-backdrop" role="presentation" onMouseDown={() => !isDeleting && setPendingDeleteProduct(null)}>
          <section className="product-modal product-confirm-modal product-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="product-delete-confirm-title" aria-describedby="product-delete-confirm-description" onMouseDown={(event) => event.stopPropagation()}>
            <div className="product-delete-icon" aria-hidden="true">
              <span className="material-symbols-outlined">delete</span>
            </div>
            <p className="product-delete-eyebrow">ARCHIVE PRODUCT</p>
            <h3 id="product-delete-confirm-title">Move this product to archives?</h3>
            <p id="product-delete-confirm-description"><strong>{pendingDeleteProduct.name}</strong> will leave your inventory and can be restored later.</p>
            {deleteError ? <p className="product-form-error" role="alert">{deleteError}</p> : null}
            <div className="product-modal-actions">
              <button className="cancel" type="button" disabled={isDeleting} onClick={() => setPendingDeleteProduct(null)}>Cancel</button>
              <button className="delete-confirm" type="button" disabled={isDeleting} onClick={deleteProduct}>{isDeleting ? 'Archiving…' : 'Yes, Archive Product'}</button>
            </div>
          </section>
        </div>
      ) : null}

      {isModalOpen ? (
        <div className="product-modal-backdrop" role="presentation" onMouseDown={closeProductModal}>
          <section className="product-modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="product-modal-header">
              <div>
                <p>{editingProduct ? 'UPDATE INVENTORY' : 'NEW INVENTORY ITEM'}</p>
                <h3 id="product-modal-title">{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
              </div>
              <button type="button" aria-label="Close product form" onClick={closeProductModal}>
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>
            <form key={editingProduct?._id ?? 'new'} onSubmit={saveProduct}>
              <label>Product Name<input name="name" type="text" defaultValue={editingProduct?.name ?? ''} placeholder="e.g. Chocolate Cake" required /></label>
              <label>Category
                <select name="category" defaultValue={editingProduct?.category ?? 'Cake'} required>
                  <option value="Cake">Cake</option>
                  <option value="Snacks">Snacks</option>
                </select>
              </label>
              <div className="product-form-row">
                <label>No. of Stock<input name="stock" type="number" min="0" max="1000000" step="1" defaultValue={editingProduct?.stock ?? ''} placeholder="0" required /></label>
                <label>Price (₱)<input name="price" type="number" min="0" step="0.01" defaultValue={editingProduct?.price ?? ''} placeholder="0.00" required /></label>
              </div>
              {formError ? <p className="product-form-error" role="alert">{formError}</p> : null}
              <div className="product-modal-actions">
                <button className="cancel" type="button" disabled={isSaving} onClick={closeProductModal}>Cancel</button>
                <button className="save" type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : editingProduct ? 'Save Changes' : 'Add Product'}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {addedProductName ? (
        <div className="product-modal-backdrop" role="presentation" onMouseDown={() => setAddedProductName('')}>
          <section className="product-modal product-success-modal" role="dialog" aria-modal="true" aria-labelledby="product-success-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="product-success-icon" aria-hidden="true">
              <span className="material-symbols-outlined">check</span>
            </div>
            <p className="product-success-eyebrow">INVENTORY UPDATED</p>
            <h3 id="product-success-title">Product successfully added</h3>
            <p><strong>{addedProductName}</strong> is now available in your inventory.</p>
            <button type="button" onClick={() => setAddedProductName('')}>Done</button>
          </section>
        </div>
      ) : null}

      {updatedProductName ? (
        <div className="product-modal-backdrop" role="presentation" onMouseDown={() => setUpdatedProductName('')}>
          <section className="product-modal product-success-modal" role="dialog" aria-modal="true" aria-labelledby="product-update-success-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="product-success-icon" aria-hidden="true">
              <span className="material-symbols-outlined">check</span>
            </div>
            <p className="product-success-eyebrow">CHANGES SAVED</p>
            <h3 id="product-update-success-title">Product successfully updated</h3>
            <p>Your changes to <strong>{updatedProductName}</strong> have been saved.</p>
            <button type="button" onClick={() => setUpdatedProductName('')}>Done</button>
          </section>
        </div>
      ) : null}
    </section>
  )
}

function ProfitView() {
  const pageSize = 5
  const profitQuery = useQuery(api.profit.list)
  const earningsQuery = useQuery(api.historysale.earningsList)
  const records = profitQuery ?? []
  const earnings = earningsQuery ?? []
  const salesToday = useQuery(api.historysale.todayStats) ?? { total: 0, count: 0 }
  const addProfit = useMutation(api.profit.add)
  const addEarning = useMutation(api.historysale.addEarning)
  const updateEarning = useMutation(api.historysale.updateEarning)
  const removeEarning = useMutation(api.historysale.removeEarning)
  const updateProfit = useMutation(api.profit.update)
  const removeProfit = useMutation(api.profit.remove)
  const [selectedPage, setSelectedPage] = useState(1)
  const [activeSummary, setActiveSummary] = useState('investment')
  const [historySearch, setHistorySearch] = useState('')
  const [historyStartDate, setHistoryStartDate] = useState('')
  const [historyEndDate, setHistoryEndDate] = useState('')
  const [selectedEarning, setSelectedEarning] = useState(null)
  const [pendingEditEarning, setPendingEditEarning] = useState(null)
  const [pendingRemoveEarning, setPendingRemoveEarning] = useState(null)
  const [editingEarning, setEditingEarning] = useState(null)
  const [editEarningDate, setEditEarningDate] = useState('')
  const [editEarningAmount, setEditEarningAmount] = useState('')
  const [editEarningNotes, setEditEarningNotes] = useState('')
  const [earningActionError, setEarningActionError] = useState('')
  const [isSavingEarningEdit, setIsSavingEarningEdit] = useState(false)
  const [isRemovingEarning, setIsRemovingEarning] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [reportType, setReportType] = useState('investment')
  const [reportStartDate, setReportStartDate] = useState(manilaDateKey())
  const [reportEndDate, setReportEndDate] = useState(manilaDateKey())
  const [reportError, setReportError] = useState('')
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [pendingEditRecord, setPendingEditRecord] = useState(null)
  const [pendingDeleteRecord, setPendingDeleteRecord] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEarningModalOpen, setIsEarningModalOpen] = useState(false)
  const [savedProfitAmount, setSavedProfitAmount] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [formError, setFormError] = useState('')
  const [earningError, setEarningError] = useState('')
  const [isSavingEarning, setIsSavingEarning] = useState(false)
  const [earningDate, setEarningDate] = useState(manilaDateKey)
  const [earningAmount, setEarningAmount] = useState('')
  const [earningNotes, setEarningNotes] = useState('')
  const [earningToast, setEarningToast] = useState('')
  const earningButtonRef = useRef(null)
  const earningDialogRef = useRef(null)
  const reportButtonRef = useRef(null)
  const reportDialogRef = useRef(null)
  const generatingReportRef = useRef(false)
  const savingEarningRef = useRef(false)
  const earningRequestIdRef = useRef(null)
  const earningRequestSignatureRef = useRef(null)
  const totalInvestment = safeMoneyTotal(records, (record) => record.totalProfit)
  const historyBounds = dateRangeBounds(historyStartDate, historyEndDate)
  const filteredInvestments = records.filter((record) => {
    const date = record._creationTime
    const searchMatches = !historySearch || String(record._id).toLowerCase().includes(historySearch.toLowerCase())
    return searchMatches && date >= historyBounds.start && date < historyBounds.end
  })
  const filteredEarnings = earnings.filter((earning) => {
    const search = historySearch.trim().toLowerCase()
    const date = earning.date ?? earning._creationTime
    return (!search || String(earning.transactionId ?? earning._id).toLowerCase().includes(search) || (earning.notes ?? '').toLowerCase().includes(search)) && date >= historyBounds.start && date < historyBounds.end
  })
  const visibleHistory = activeSummary === 'investment' ? filteredInvestments : filteredEarnings
  const historyTotalAmount = activeSummary === 'investment'
    ? safeMoneyTotal(filteredInvestments, (record) => record.totalProfit)
    : safeMoneyTotal(filteredEarnings, (record) => Number.isInteger(record.amountCents) ? record.amountCents / 100 : record.amount)
  const totalPages = Math.max(1, Math.ceil(visibleHistory.length / pageSize))
  const currentPage = Math.min(selectedPage, totalPages)
  const pageStart = (currentPage - 1) * pageSize
  const visibleHistoryRecords = visibleHistory.slice(pageStart, pageStart + pageSize)
  const reportBounds = dateRangeBounds(reportStartDate, reportEndDate)
  const reportEarnings = earnings.filter((item) => item.date >= reportBounds.start && item.date < reportBounds.end)
  const reportInvestments = records.filter((item) => item._creationTime >= reportBounds.start && item._creationTime < reportBounds.end)

  useEffect(() => {
    if (!isEarningModalOpen) return undefined
    const triggerButton = earningButtonRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    earningDialogRef.current?.querySelector('input')?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !savingEarningRef.current) {
        setIsEarningModalOpen(false)
        return
      }
      if (event.key === 'Tab' && earningDialogRef.current) {
        const focusable = [...earningDialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled)')]
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      triggerButton?.focus()
    }
  }, [isEarningModalOpen])

  useEffect(() => {
    if (!earningToast) return undefined
    const timeout = window.setTimeout(() => setEarningToast(''), 4200)
    return () => window.clearTimeout(timeout)
  }, [earningToast])

  useEffect(() => {
    if (!isReportModalOpen) return undefined
    const triggerButton = reportButtonRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    reportDialogRef.current?.querySelector('button:not(:disabled), select, input')?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !generatingReportRef.current) { setIsReportModalOpen(false); return }
      if (event.key === 'Tab' && reportDialogRef.current) {
        const focusable = [...reportDialogRef.current.querySelectorAll('button:not(:disabled), select:not(:disabled), input:not(:disabled)')]
        if (focusable.length === 0) return
        if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1).focus() }
        else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus() }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      triggerButton?.focus()
    }
  }, [isReportModalOpen])

  const openModal = (record = null) => {
    setEditingRecord(record)
    setFormError('')
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setEditingRecord(null)
    setIsModalOpen(false)
    setFormError('')
  }

  const confirmProfitEdit = () => {
    if (!pendingEditRecord) return
    const record = pendingEditRecord
    setPendingEditRecord(null)
    openModal(record)
  }

  const saveProfit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setFormError('')
    const totalProfit = Number(new FormData(event.currentTarget).get('totalProfit'))

    try {
      if (editingRecord) {
        await updateProfit({ id: editingRecord._id, totalProfit })
      } else {
        await addProfit({ totalProfit })
        setSavedProfitAmount(totalProfit)
      }
      closeModal()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save profit record.')
    } finally {
      setIsSaving(false)
    }
  }

  const saveEarning = async (event) => {
    event.preventDefault()
    if (savingEarningRef.current) return
    const amount = Number(earningAmount)
    if (!Number.isFinite(amount) || amount <= 0 || !/^\d+(\.\d{1,2})?$/.test(earningAmount)) {
      setEarningError('Enter a positive amount with no more than two decimal places.')
      return
    }
    if (!earningDate) {
      setEarningError('Select an earning date.')
      return
    }
    savingEarningRef.current = true
    setIsSavingEarning(true)
    setEarningError('')
    try {
      const requestSignature = JSON.stringify([amount, earningDate, earningNotes.trim()])
      if (!earningRequestIdRef.current || earningRequestSignatureRef.current !== requestSignature) {
        earningRequestIdRef.current = globalThis.crypto?.randomUUID?.() ?? `earning-${Date.now()}-${Math.random().toString(36).slice(2)}`
        earningRequestSignatureRef.current = requestSignature
      }
      await addEarning({
        amount,
        date: new Date(`${earningDate}T00:00:00+08:00`).getTime(),
        notes: earningNotes.trim() || undefined,
        requestId: earningRequestIdRef.current,
      })
      earningRequestIdRef.current = null
      earningRequestSignatureRef.current = null
      setIsEarningModalOpen(false)
      setEarningToast("Today's earnings have been recorded successfully.")
    } catch (error) {
      setEarningError(error instanceof Error ? error.message : 'Could not save earnings. Check your connection and try again.')
    } finally {
      savingEarningRef.current = false
      setIsSavingEarning(false)
    }
  }

  const openFinancialReport = () => {
    setReportType(activeSummary === 'investment' ? 'investment' : 'earnings')
    setReportStartDate(manilaDateKey())
    setReportEndDate(manilaDateKey())
    setReportError('')
    setIsReportModalOpen(true)
  }

  const applyReportQuickFilter = (filter) => {
    const today = manilaDateKey()
    const todayDate = new Date(`${today}T00:00:00+08:00`)
    const day = 24 * 60 * 60 * 1000
    if (filter === 'today') { setReportStartDate(today); setReportEndDate(today); return }
    if (filter === 'yesterday') {
      const yesterday = manilaKeyFor(todayDate.getTime() - day)
      setReportStartDate(yesterday); setReportEndDate(yesterday); return
    }
    if (filter === 'last7') {
      setReportStartDate(manilaKeyFor(todayDate.getTime() - 6 * day)); setReportEndDate(today); return
    }
    if (filter === 'thisMonth') {
      setReportStartDate(`${today.slice(0, 7)}-01`); setReportEndDate(today); return
    }
    if (filter === 'lastMonth') {
      const previousMonthEnd = manilaKeyFor(manilaDayStart(`${today.slice(0, 7)}-01`) - day)
      const year = previousMonthEnd.slice(0, 4)
      const month = previousMonthEnd.slice(5, 7)
      const lastDay = Number(previousMonthEnd.slice(-2))
      setReportStartDate(`${year}-${month}-01`); setReportEndDate(`${year}-${month}-${String(lastDay).padStart(2, '0')}`)
    }
  }

  const downloadReport = async (event) => {
    event.preventDefault()
    if (!reportStartDate || !reportEndDate) { setReportError('Select both report dates.'); return }
    if (reportStartDate > reportEndDate) { setReportError('The end date cannot be earlier than the start date.'); return }
    generatingReportRef.current = true
    setIsGeneratingReport(true)
    setReportError('')
    try {
      const { downloadFinancialReport } = await import('./financialReport')
      await downloadFinancialReport({ type: reportType, startDate: reportStartDate, endDate: reportEndDate, earnings: reportEarnings, investments: reportInvestments })
      setIsReportModalOpen(false)
    } catch (error) {
      setReportError(error instanceof Error ? error.message : 'Unable to generate the financial report. Please try again.')
    } finally {
      generatingReportRef.current = false
      setIsGeneratingReport(false)
    }
  }

  const deleteProfit = async () => {
    if (!pendingDeleteRecord) return
    setIsDeleting(true)
    setDeleteError('')
    try {
      await removeProfit({ id: pendingDeleteRecord._id })
      setPendingDeleteRecord(null)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Unable to delete profit record.')
    } finally {
      setIsDeleting(false)
    }
  }

  const requestEarningEdit = (record) => {
    setEarningActionError('')
    setPendingEditEarning(record)
  }

  const confirmEarningEdit = () => {
    if (!pendingEditEarning) return
    setEditEarningDate(manilaKeyFor(pendingEditEarning.date ?? pendingEditEarning._creationTime))
    setEditEarningAmount(String(Number.isInteger(pendingEditEarning.amountCents) ? pendingEditEarning.amountCents / 100 : pendingEditEarning.amount))
    setEditEarningNotes(pendingEditEarning.notes ?? '')
    setEarningActionError('')
    setEditingEarning(pendingEditEarning)
    setPendingEditEarning(null)
  }

  const saveEarningEdit = async (event) => {
    event.preventDefault()
    const amount = Number(editEarningAmount)
    if (!Number.isFinite(amount) || amount <= 0 || !/^\d+(\.\d{1,2})?$/.test(editEarningAmount)) {
      setEarningActionError('Enter a positive amount with no more than two decimal places.')
      return
    }
    if (!editEarningDate) { setEarningActionError('Select an earning date.'); return }
    setIsSavingEarningEdit(true)
    setEarningActionError('')
    try {
      await updateEarning({
        id: editingEarning._id,
        amount,
        date: manilaDayStart(editEarningDate),
        notes: editEarningNotes.trim() || undefined,
      })
      setEditingEarning(null)
      setEarningToast('Earnings transaction updated successfully.')
    } catch (error) {
      setEarningActionError(error instanceof Error ? error.message : 'Unable to update earnings. Please try again.')
    } finally {
      setIsSavingEarningEdit(false)
    }
  }

  const confirmRemoveEarning = async () => {
    if (!pendingRemoveEarning || isRemovingEarning) return
    setIsRemovingEarning(true)
    setEarningActionError('')
    try {
      await removeEarning({ id: pendingRemoveEarning._id })
      setPendingRemoveEarning(null)
      setEarningToast('Earnings transaction removed successfully.')
    } catch (error) {
      setEarningActionError(error instanceof Error ? error.message : 'Unable to remove earnings. Please try again.')
    } finally {
      setIsRemovingEarning(false)
    }
  }

  return (
    <section className="profit-view">
      <header className="inventory-heading profit-heading">
        <div>
          <p className="inventory-eyebrow">SHOP INVESTMENT AND SALES</p>
          <h2>Profit Investment</h2>
          <p>Record and manage the profit reinvested into your shop.</p>
        </div>
        <div className="profit-heading-actions">
          <button className="add-product-button" type="button" onClick={() => openModal()}>
            <span className="material-symbols-outlined" aria-hidden="true">add</span>
            Add Profit
          </button>
          <button ref={earningButtonRef} className="add-product-button secondary" type="button" onClick={() => {
            setEarningError('')
            setEarningDate(manilaDateKey())
            setEarningAmount('')
            setEarningNotes('')
            setIsEarningModalOpen(true)
          }}>
            <span className="material-symbols-outlined" aria-hidden="true">add</span>
            Add Earning Today
          </button>
          <button ref={reportButtonRef} className="add-product-button report-action-button" type="button" onClick={openFinancialReport}>
            <span className="material-symbols-outlined" aria-hidden="true">picture_as_pdf</span>
            Generate PDF Report
          </button>
        </div>
      </header>

      <div className="profit-summary-grid">
          <button className={`profit-summary-card profit-summary-select${activeSummary === 'investment' ? ' is-active' : ''}`} type="button" aria-pressed={activeSummary === 'investment'} onClick={() => { setActiveSummary('investment'); setSelectedPage(1) }}>
          <span className="material-symbols-outlined" aria-hidden="true">account_balance_wallet</span>
          <div><small>TOTAL PROFIT INVESTED</small><strong>{pesoFormatter.format(totalInvestment)}</strong></div>
          <p>{records.length} {records.length === 1 ? 'record' : 'records'}</p>
        </button>
        <button className={`profit-summary-card profit-summary-select${activeSummary === 'earnings' ? ' is-active' : ''}`} type="button" aria-pressed={activeSummary === 'earnings'} onClick={() => { setActiveSummary('earnings'); setSelectedPage(1); setHistorySearch(''); setHistoryStartDate(manilaDateKey()); setHistoryEndDate(manilaDateKey()) }}>
          <span className="material-symbols-outlined" aria-hidden="true">trending_up</span>
          <div><small>SALES TODAY</small><strong>{pesoFormatter.format(salesToday.total)}</strong></div>
          <p>{salesToday.count} {salesToday.count === 1 ? 'sale' : 'sales'}</p>
        </button>
      </div>

      <div className="admin-card inventory-table-card">
        <div className="financial-history-toolbar">
          <div><p className="inventory-eyebrow">{activeSummary === 'investment' ? 'CAPITAL HISTORY' : 'DAILY EARNINGS HISTORY'}</p><h3>{activeSummary === 'investment' ? 'Profit Investment Transactions' : 'Earnings Transactions'}</h3><p>{visibleHistory.length} transactions · {pesoFormatter.format(historyTotalAmount)} total</p></div>
          <div className="financial-history-filters">
            <label className="sr-only" htmlFor="financial-history-search">Search transactions</label>
            <input id="financial-history-search" type="search" value={historySearch} placeholder={activeSummary === 'investment' ? 'Search record ID' : 'Search ID or description'} onChange={(event) => { setSelectedPage(1); setHistorySearch(event.target.value) }} />
            <label><span>From</span><input type="date" value={historyStartDate} onChange={(event) => { setSelectedPage(1); setHistoryStartDate(event.target.value) }} /></label>
            <label><span>To</span><input type="date" value={historyEndDate} onChange={(event) => { setSelectedPage(1); setHistoryEndDate(event.target.value) }} /></label>
          </div>
        </div>
        {activeSummary === 'investment' ? (
          <table className="inventory-table profit-table">
            <thead><tr><th>No.</th><th>Transaction ID</th><th>Total of Profit</th><th>Date &amp; Time Added</th><th>Actions</th></tr></thead>
            <tbody>{visibleHistoryRecords.map((record, index) => (
              <tr key={record._id}>
                <td data-label="No.">{String(pageStart + index + 1).padStart(2, '0')}</td>
                <td data-label="Transaction ID"><code>{String(record._id).slice(-9)}</code></td>
                <td data-label="Total of Profit"><strong className="profit-amount">{pesoFormatter.format(record.totalProfit)}</strong></td>
                <td className="product-created" data-label="Date & Time Added"><time dateTime={new Date(record._creationTime).toISOString()}>{productDateFormatter.format(record._creationTime)}</time></td>
                <td data-label="Actions"><div className="inventory-actions">
                  <button type="button" aria-label="Edit profit record" onClick={() => setPendingEditRecord(record)}><span className="material-symbols-outlined" aria-hidden="true">edit</span></button>
                  <button className="delete" type="button" aria-label="Delete profit record" onClick={() => { setDeleteError(''); setPendingDeleteRecord(record) }}><span className="material-symbols-outlined" aria-hidden="true">delete</span></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        ) : (
          <table className="inventory-table profit-table earnings-table">
            <thead><tr><th>No.</th><th>Date</th><th>Description</th><th>Amount</th><th>Details</th><th>Actions</th></tr></thead>
            <tbody>{visibleHistoryRecords.map((record, index) => (
              <tr key={record._id}>
                <td data-label="No.">{String(pageStart + index + 1).padStart(2, '0')}</td>
                <td className="product-created" data-label="Date"><time dateTime={new Date(record.date ?? record._creationTime).toISOString()}>{productDateFormatter.format(record.date ?? record._creationTime)}</time></td>
                <td data-label="Description">{record.notes || 'Daily earnings'}</td>
                <td data-label="Amount"><strong className="profit-amount">{pesoFormatter.format(Number.isInteger(record.amountCents) ? record.amountCents / 100 : record.amount)}</strong></td>
                <td data-label="Details"><button className="financial-details-button" type="button" onClick={() => setSelectedEarning(record)}>View details</button></td>
                <td data-label="Actions"><div className="inventory-actions earning-row-actions">
                  <button type="button" aria-label={`Edit earnings transaction ${record.transactionId ?? record._id}`} onClick={() => requestEarningEdit(record)}><span className="material-symbols-outlined" aria-hidden="true">edit</span></button>
                  <button className="delete" type="button" aria-label={`Remove earnings transaction ${record.transactionId ?? record._id}`} onClick={() => { setEarningActionError(''); setPendingRemoveEarning(record) }}><span className="material-symbols-outlined" aria-hidden="true">delete</span></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        )}
        {(activeSummary === 'investment' ? profitQuery === undefined : earningsQuery === undefined) ? <p className="inventory-empty">Loading transactions…</p> : null}
        {visibleHistory.length === 0 && profitQuery !== undefined && earningsQuery !== undefined ? <p className="inventory-empty">No {activeSummary === 'investment' ? 'profit investments' : 'earnings'} match these filters.</p> : null}
      </div>
      {visibleHistory.length > pageSize ? <Pagination currentPage={currentPage} totalPages={totalPages} pageStart={pageStart} pageSize={pageSize} totalItems={visibleHistory.length} onPageChange={setSelectedPage} /> : null}

      {pendingEditRecord ? (
        <div className="product-modal-backdrop" role="presentation" onMouseDown={() => setPendingEditRecord(null)}>
          <section className="product-modal product-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="profit-edit-confirm-title" aria-describedby="profit-edit-confirm-description" onMouseDown={(event) => event.stopPropagation()}>
            <div className="product-confirm-icon" aria-hidden="true">
              <span className="material-symbols-outlined">edit</span>
            </div>
            <p className="product-success-eyebrow">CONFIRM EDIT</p>
            <h3 id="profit-edit-confirm-title">Are you sure you want to edit this profit?</h3>
            <p id="profit-edit-confirm-description">You are about to change the <strong>{pesoFormatter.format(pendingEditRecord.totalProfit)}</strong> profit record.</p>
            <div className="product-modal-actions">
              <button className="cancel" type="button" onClick={() => setPendingEditRecord(null)}>Cancel</button>
              <button className="save" type="button" onClick={confirmProfitEdit}>Yes, Edit Profit</button>
            </div>
          </section>
        </div>
      ) : null}

      {pendingDeleteRecord ? (
        <div className="product-modal-backdrop" role="presentation" onMouseDown={() => !isDeleting && setPendingDeleteRecord(null)}>
          <section className="product-modal product-confirm-modal product-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="profit-delete-confirm-title" aria-describedby="profit-delete-confirm-description" onMouseDown={(event) => event.stopPropagation()}>
            <div className="product-delete-icon" aria-hidden="true">
              <span className="material-symbols-outlined">delete</span>
            </div>
            <p className="product-delete-eyebrow">ARCHIVE PROFIT</p>
            <h3 id="profit-delete-confirm-title">Move this profit record to archives?</h3>
            <p id="profit-delete-confirm-description"><strong>{pesoFormatter.format(pendingDeleteRecord.totalProfit)}</strong> will leave your profit records and can be restored later.</p>
            {deleteError ? <p className="product-form-error" role="alert">{deleteError}</p> : null}
            <div className="product-modal-actions">
              <button className="cancel" type="button" disabled={isDeleting} onClick={() => setPendingDeleteRecord(null)}>Cancel</button>
              <button className="delete-confirm" type="button" disabled={isDeleting} onClick={deleteProfit}>{isDeleting ? 'Archiving…' : 'Yes, Archive Profit'}</button>
            </div>
          </section>
        </div>
      ) : null}

      {isModalOpen ? (
        <div className="product-modal-backdrop" role="presentation" onMouseDown={closeModal}>
          <section className="product-modal profit-modal" role="dialog" aria-modal="true" aria-labelledby="profit-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="product-modal-header">
              <div><p>SHOP INVESTMENT</p><h3 id="profit-modal-title">{editingRecord ? 'Edit Profit' : 'Add Profit'}</h3></div>
              <button type="button" aria-label="Close profit form" onClick={closeModal}><span className="material-symbols-outlined" aria-hidden="true">close</span></button>
            </div>
            <form key={editingRecord?._id ?? 'new-profit'} onSubmit={saveProfit}>
              <div className="profit-form-intro"><span className="material-symbols-outlined" aria-hidden="true">savings</span><p>Enter the total profit you want to invest back into the shop.</p></div>
              <label>Total Profit to Invest (₱)<input name="totalProfit" type="number" min="0.01" step="0.01" defaultValue={editingRecord?.totalProfit ?? ''} placeholder="0.00" autoFocus required /></label>
              {formError ? <p className="product-form-error" role="alert">{formError}</p> : null}
              <div className="product-modal-actions">
                <button className="cancel" type="button" disabled={isSaving} onClick={closeModal}>Cancel</button>
                <button className="save" type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : editingRecord ? 'Save Changes' : 'Save Profit'}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {isEarningModalOpen ? (
        <div className="earning-modal-backdrop" role="presentation" onMouseDown={() => !isSavingEarning && setIsEarningModalOpen(false)}>
          <section ref={earningDialogRef} className="earning-modal" role="dialog" aria-modal="true" aria-labelledby="earning-modal-title" aria-describedby="earning-modal-subtitle" onMouseDown={(event) => event.stopPropagation()}>
            <header className="earning-modal-header">
              <div className="earning-modal-heading">
                <span className="material-symbols-outlined" aria-hidden="true">monitoring</span>
                <div><h3 id="earning-modal-title">Add Today&apos;s Earnings</h3><p id="earning-modal-subtitle">Record your shop&apos;s daily sales and earnings.</p></div>
              </div>
              <button className="earning-modal-close" type="button" aria-label="Close earnings form" disabled={isSavingEarning} onClick={() => setIsEarningModalOpen(false)}><span className="material-symbols-outlined" aria-hidden="true">close</span></button>
            </header>
            <form className="earning-form" onSubmit={saveEarning} noValidate>
              <label className="earning-field">Date
                <input type="date" value={earningDate} max={manilaDateKey()} required onChange={(event) => setEarningDate(event.target.value)} aria-invalid={Boolean(earningError && !earningDate)} />
              </label>
              <label className="earning-field">Earnings Amount (₱)
                <span className="earning-currency-input"><span aria-hidden="true">₱</span><input inputMode="decimal" type="number" min="0.01" step="0.01" value={earningAmount} placeholder="0.00" required onChange={(event) => setEarningAmount(event.target.value)} aria-invalid={Boolean(earningError && (!earningAmount || Number(earningAmount) <= 0))} /></span>
              </label>
              <label className="earning-field">Description / Notes <span className="earning-optional">Optional</span>
                <textarea value={earningNotes} maxLength={500} rows={4} placeholder="e.g., Total sales from today's shop operations" onChange={(event) => setEarningNotes(event.target.value)} />
                <small className="earning-character-count">{earningNotes.length}/500</small>
              </label>
              {earningError ? <p className="earning-form-error" role="alert">{earningError}</p> : null}
              <footer className="earning-modal-footer">
                <button className="earning-cancel" type="button" disabled={isSavingEarning} onClick={() => setIsEarningModalOpen(false)}>Cancel</button>
                <button className="earning-save" type="submit" disabled={isSavingEarning}>
                  {isSavingEarning ? <><span className="earning-spinner" aria-hidden="true" />Saving...</> : 'Save Earnings'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}

      {earningToast ? <div className="earning-success-toast" role="status" aria-live="polite"><span className="material-symbols-outlined" aria-hidden="true">check_circle</span>{earningToast}</div> : null}

      {selectedEarning ? (
        <div className="earning-modal-backdrop" role="presentation" onMouseDown={() => setSelectedEarning(null)}>
          <section className="earning-modal earning-detail-modal" role="dialog" aria-modal="true" aria-labelledby="earning-detail-title" onMouseDown={(event) => event.stopPropagation()}>
            <header className="earning-modal-header"><div className="earning-modal-heading"><span className="material-symbols-outlined" aria-hidden="true">receipt_long</span><div><h3 id="earning-detail-title">Earning Details</h3><p>Saved financial transaction</p></div></div><button className="earning-modal-close" type="button" aria-label="Close transaction details" onClick={() => setSelectedEarning(null)}><span className="material-symbols-outlined" aria-hidden="true">close</span></button></header>
            <dl className="earning-detail-list"><div><dt>Amount</dt><dd>{pesoFormatter.format(Number.isInteger(selectedEarning.amountCents) ? selectedEarning.amountCents / 100 : selectedEarning.amount)}</dd></div><div><dt>Date</dt><dd>{productDateFormatter.format(selectedEarning.date ?? selectedEarning._creationTime)}</dd></div><div><dt>Transaction ID</dt><dd>{selectedEarning.transactionId ?? String(selectedEarning._id)}</dd></div><div><dt>Description</dt><dd>{selectedEarning.notes || 'Daily earnings'}</dd></div><div><dt>Recorded</dt><dd>{productDateFormatter.format(selectedEarning.createdAt ?? selectedEarning._creationTime)}</dd></div></dl>
            <footer className="earning-modal-footer"><button className="earning-save" type="button" onClick={() => setSelectedEarning(null)}>Done</button></footer>
          </section>
        </div>
      ) : null}

      {pendingEditEarning ? (
        <div className="product-modal-backdrop" role="presentation" onMouseDown={() => setPendingEditEarning(null)}>
          <section className="product-modal product-confirm-modal earning-action-confirm" role="alertdialog" aria-modal="true" aria-labelledby="earning-edit-confirm-title" aria-describedby="earning-edit-confirm-description" onMouseDown={(event) => event.stopPropagation()}>
            <div className="product-confirm-icon" aria-hidden="true"><span className="material-symbols-outlined">edit</span></div>
            <p className="product-success-eyebrow">ADMIN CONFIRMATION</p>
            <h3 id="earning-edit-confirm-title">Review before editing this earning</h3>
            <p id="earning-edit-confirm-description">You are about to edit <strong>{pesoFormatter.format(Number.isInteger(pendingEditEarning.amountCents) ? pendingEditEarning.amountCents / 100 : pendingEditEarning.amount)}</strong> recorded on <strong>{productDateFormatter.format(pendingEditEarning.date ?? pendingEditEarning._creationTime)}</strong>. The linked History Sales record will be updated at the same time.</p>
            {earningActionError ? <p className="product-form-error" role="alert">{earningActionError}</p> : null}
            <div className="product-modal-actions"><button className="cancel" type="button" onClick={() => setPendingEditEarning(null)}>Cancel</button><button className="save" type="button" onClick={confirmEarningEdit}>Continue to Edit</button></div>
          </section>
        </div>
      ) : null}

      {pendingRemoveEarning ? (
        <div className="product-modal-backdrop" role="presentation" onMouseDown={() => !isRemovingEarning && setPendingRemoveEarning(null)}>
          <section className="product-modal product-confirm-modal product-delete-modal earning-action-confirm" role="alertdialog" aria-modal="true" aria-labelledby="earning-remove-confirm-title" aria-describedby="earning-remove-confirm-description" onMouseDown={(event) => event.stopPropagation()}>
            <div className="product-delete-icon" aria-hidden="true"><span className="material-symbols-outlined">delete</span></div>
            <p className="product-delete-eyebrow">ADMIN CONFIRMATION</p>
            <h3 id="earning-remove-confirm-title">Remove this earnings transaction?</h3>
            <p id="earning-remove-confirm-description"><strong>{pesoFormatter.format(Number.isInteger(pendingRemoveEarning.amountCents) ? pendingRemoveEarning.amountCents / 100 : pendingRemoveEarning.amount)}</strong> from <strong>{productDateFormatter.format(pendingRemoveEarning.date ?? pendingRemoveEarning._creationTime)}</strong> will be removed from Earnings and its linked History Sales record. Dashboard and report totals will update after confirmation.</p>
            {earningActionError ? <p className="product-form-error" role="alert">{earningActionError}</p> : null}
            <div className="product-modal-actions"><button className="cancel" type="button" disabled={isRemovingEarning} onClick={() => setPendingRemoveEarning(null)}>Cancel</button><button className="delete-confirm" type="button" disabled={isRemovingEarning} onClick={confirmRemoveEarning}>{isRemovingEarning ? 'Removing…' : 'Yes, Remove Earnings'}</button></div>
          </section>
        </div>
      ) : null}

      {editingEarning ? (
        <div className="earning-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSavingEarningEdit) setEditingEarning(null) }}>
          <section className="earning-modal" role="dialog" aria-modal="true" aria-labelledby="earning-edit-title" onMouseDown={(event) => event.stopPropagation()}>
            <header className="earning-modal-header"><div className="earning-modal-heading"><span className="material-symbols-outlined" aria-hidden="true">edit_note</span><div><h3 id="earning-edit-title">Edit Earnings</h3><p>Update this transaction and its linked sales history.</p></div></div><button className="earning-modal-close" type="button" disabled={isSavingEarningEdit} aria-label="Close edit earnings form" onClick={() => setEditingEarning(null)}><span className="material-symbols-outlined" aria-hidden="true">close</span></button></header>
            <form className="earning-form" onSubmit={saveEarningEdit} noValidate>
              <label className="earning-field">Date<input type="date" value={editEarningDate} required onChange={(event) => setEditEarningDate(event.target.value)} aria-invalid={Boolean(earningActionError && !editEarningDate)} /></label>
              <label className="earning-field">Earnings Amount (₱)<span className="earning-currency-input"><span aria-hidden="true">₱</span><input type="number" min="0.01" step="0.01" inputMode="decimal" value={editEarningAmount} placeholder="0.00" required onChange={(event) => setEditEarningAmount(event.target.value)} aria-invalid={Boolean(earningActionError && (!editEarningAmount || Number(editEarningAmount) <= 0))} /></span></label>
              <label className="earning-field">Description / Notes <span className="earning-optional">Optional</span><textarea value={editEarningNotes} maxLength={500} rows={4} placeholder="Add a description for this earning" onChange={(event) => setEditEarningNotes(event.target.value)} /><small className="earning-character-count">{editEarningNotes.length}/500</small></label>
              {earningActionError ? <p className="earning-form-error" role="alert">{earningActionError}</p> : null}
              <footer className="earning-modal-footer"><button className="earning-cancel" type="button" disabled={isSavingEarningEdit} onClick={() => setEditingEarning(null)}>Cancel</button><button className="earning-save" type="submit" disabled={isSavingEarningEdit}>{isSavingEarningEdit ? <><span className="earning-spinner" aria-hidden="true" />Saving…</> : 'Save Changes'}</button></footer>
            </form>
          </section>
        </div>
      ) : null}

      {isReportModalOpen ? (
        <div className="earning-modal-backdrop report-selection-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isGeneratingReport) setIsReportModalOpen(false) }}>
          <section ref={reportDialogRef} className="earning-modal report-selection-modal" role="dialog" aria-modal="true" aria-labelledby="financial-report-title" aria-describedby="financial-report-subtitle" onMouseDown={(event) => event.stopPropagation()}>
            <header className="earning-modal-header"><div className="earning-modal-heading"><span className="material-symbols-outlined" aria-hidden="true">picture_as_pdf</span><div><h3 id="financial-report-title">Generate Financial Report</h3><p id="financial-report-subtitle">Select a date range to generate your shop&apos;s financial report.</p></div></div><button className="earning-modal-close" type="button" aria-label="Close report form" disabled={isGeneratingReport} onClick={() => setIsReportModalOpen(false)}><span className="material-symbols-outlined" aria-hidden="true">close</span></button></header>
            <form className="earning-form" onSubmit={downloadReport}>
              <label className="earning-field">Report Type<select value={reportType} onChange={(event) => setReportType(event.target.value)}><option value="earnings">Earnings Report</option><option value="investment">Profit Investment Report</option><option value="combined">Combined Financial Report</option></select></label>
              <div className="report-quick-filters" aria-label="Quick date filters">{[['today', 'Today'], ['yesterday', 'Yesterday'], ['last7', 'Last 7 Days'], ['thisMonth', 'This Month'], ['lastMonth', 'Last Month']].map(([value, label]) => <button key={value} type="button" onClick={() => applyReportQuickFilter(value)}>{label}</button>)}</div>
              <div className="report-date-fields"><label className="earning-field">Start Date<input type="date" required value={reportStartDate} onChange={(event) => setReportStartDate(event.target.value)} /></label><label className="earning-field">End Date<input type="date" required value={reportEndDate} min={reportStartDate} onChange={(event) => setReportEndDate(event.target.value)} /></label></div>
              <div className="report-preview-summary"><p className="inventory-eyebrow">REPORT PREVIEW</p><p>{reportStartDate && reportEndDate ? `${reportStartDate} to ${reportEndDate}` : 'Select both dates'}</p>{reportType !== 'investment' ? <span>{reportEarnings.length} earnings · {pesoFormatter.format(safeMoneyTotal(reportEarnings, (row) => Number.isInteger(row.amountCents) ? row.amountCents / 100 : row.amount))}</span> : null}{reportType !== 'earnings' ? <span>{reportInvestments.length} investments · {pesoFormatter.format(safeMoneyTotal(reportInvestments, (row) => row.totalProfit))}</span> : null}</div>
              {reportError ? <p className="earning-form-error" role="alert">{reportError}</p> : null}
              <footer className="earning-modal-footer"><button className="earning-cancel" type="button" disabled={isGeneratingReport} onClick={() => setIsReportModalOpen(false)}>Cancel</button><button className="earning-save" type="submit" disabled={isGeneratingReport || earningsQuery === undefined || profitQuery === undefined}>{isGeneratingReport ? <><span className="earning-spinner" aria-hidden="true" />Generating…</> : <><span className="material-symbols-outlined" aria-hidden="true">download</span>Generate &amp; Download PDF</>}</button></footer>
            </form>
          </section>
        </div>
      ) : null}

      {savedProfitAmount !== null ? (
        <div className="product-modal-backdrop" role="presentation" onMouseDown={() => setSavedProfitAmount(null)}>
          <section className="product-modal product-success-modal" role="dialog" aria-modal="true" aria-labelledby="profit-save-success-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="product-success-icon" aria-hidden="true">
              <span className="material-symbols-outlined">check</span>
            </div>
            <p className="product-success-eyebrow">PROFIT RECORDED</p>
            <h3 id="profit-save-success-title">Profit successfully saved</h3>
            <p><strong>{pesoFormatter.format(savedProfitAmount)}</strong> has been added to your profit investment records.</p>
            <button type="button" onClick={() => setSavedProfitAmount(null)}>Done</button>
          </section>
        </div>
      ) : null}
    </section>
  )
}

function AnalyticsView() {
  const pageSize = 10
  const sales = useQuery(api.historysale.list) ?? []
  const earnings = useQuery(api.historysale.earningsList) ?? []
  const profitRecords = useQuery(api.profit.list) ?? []
  const updateSale = useMutation(api.historysale.update)
  const removeSale = useMutation(api.historysale.remove)
  const [selectedPage, setSelectedPage] = useState(1)
  const [pendingEditSale, setPendingEditSale] = useState(null)
  const [editingSale, setEditingSale] = useState(null)
  const [pendingDeleteSale, setPendingDeleteSale] = useState(null)
  const [isSavingSale, setIsSavingSale] = useState(false)
  const [isDeletingSale, setIsDeletingSale] = useState(false)
  const [saleError, setSaleError] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const [reportError, setReportError] = useState('')
  const [reportGeneratedAt, setReportGeneratedAt] = useState(null)
  const totalPages = Math.max(1, Math.ceil(sales.length / pageSize))
  const currentPage = Math.min(selectedPage, totalPages)
  const pageStart = (currentPage - 1) * pageSize
  const visibleSales = sales.slice(pageStart, pageStart + pageSize)
  const totalInvestment = safeMoneyTotal(profitRecords, (record) => record.totalProfit)
  const canonicalRevenue = canonicalRevenueRecords(sales, earnings)
  const totalRevenue = safeMoneyTotal(canonicalRevenue, (sale) => sale.amount)
  const interestRevenue = totalRevenue - totalInvestment
  const revenueTone = interestRevenue > 0 ? 'positive' : interestRevenue < 0 ? 'negative' : 'neutral'
  const revenueLabel = interestRevenue > 0 ? 'Interest Revenue' : interestRevenue < 0 ? 'Low Interest Revenue' : 'Break-even Revenue'

  const { start: startTimestamp, end: endExclusive } = dateRangeBounds(startDate, endDate)
  const reportSales = canonicalRevenue.filter((sale) => sale.date >= startTimestamp && sale.date < endExclusive)
  const reportGrandTotal = safeMoneyTotal(reportSales, (sale) => sale.amount)
  const reportTotalQty = reportSales.length
  const reportInvestment = profitRecords
    .filter((record) => record._creationTime >= startTimestamp && record._creationTime < endExclusive)
    .reduce((sum, record) => sum + Math.round(record.totalProfit * 100), 0) / 100
  const reportRevenue = reportGrandTotal - reportInvestment

  const confirmSaleEdit = () => {
    if (!pendingEditSale) return
    setEditingSale(pendingEditSale)
    setPendingEditSale(null)
    setSaleError('')
  }

  const saveSale = async (event) => {
    event.preventDefault()
    if (!editingSale) return
    setIsSavingSale(true)
    setSaleError('')
    const formData = new FormData(event.currentTarget)

    try {
      await updateSale({
        id: editingSale._id,
        date: new Date(`${formData.get('date')}T12:00:00`).getTime(),
        productName: formData.get('productName').trim(),
        eachPrice: Number(formData.get('eachPrice')),
        totalQty: Number(formData.get('totalQty')),
      })
      setEditingSale(null)
    } catch (error) {
      setSaleError(error instanceof Error ? error.message : 'Unable to update sale record.')
    } finally {
      setIsSavingSale(false)
    }
  }

  const deleteSale = async () => {
    if (!pendingDeleteSale) return
    setIsDeletingSale(true)
    setSaleError('')

    try {
      await removeSale({ id: pendingDeleteSale._id })
      setPendingDeleteSale(null)
    } catch (error) {
      setSaleError(error instanceof Error ? error.message : 'Unable to delete sale record.')
    } finally {
      setIsDeletingSale(false)
    }
  }

  const generateReport = (event) => {
    event.preventDefault()
    if (startDate && endDate && startDate > endDate) {
      setReportError('The start date must be before the end date.')
      return
    }
    setReportError('')
    setReportGeneratedAt(Date.now())
    setReportOpen(true)
  }

  return (
    <section className="analytics-view">
      <header className="inventory-heading">
        <div><p className="inventory-eyebrow">SALES INTELLIGENCE</p><h2>Analytics</h2><p>Review sales history, investment performance, and revenue interest.</p></div>
      </header>

      <div className="analytics-summary-grid">
        <article><span>Gross Revenue</span><strong>{pesoFormatter.format(totalRevenue)}</strong><small>From {canonicalRevenue.length} sales and earnings transactions</small></article>
        <article><span>Profit Invested</span><strong>{pesoFormatter.format(totalInvestment)}</strong><small>Capital invested in shop</small></article>
        <article className={revenueTone}><span>{revenueLabel}</span><strong>{pesoFormatter.format(interestRevenue)}</strong><small>{interestRevenue > 0 ? 'Revenue is above investment' : interestRevenue < 0 ? 'Revenue is below investment' : 'Revenue matches investment'}</small></article>
      </div>

      <form className="report-generator" onSubmit={generateReport}>
        <div><span className="material-symbols-outlined" aria-hidden="true">picture_as_pdf</span><div><h3>Generate Sales Report</h3><p>Select a date range, preview the report, then save it as PDF.</p></div></div>
        <label>From<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
        <label>To<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
        <button type="submit"><span className="material-symbols-outlined" aria-hidden="true">description</span>Generate Report</button>
        {reportError ? <p className="report-error" role="alert">{reportError}</p> : null}
      </form>

      <div className="admin-card inventory-table-card analytics-table-card">
        <div className="analytics-table-heading"><div><h3>Sales History</h3><p>Live records from the Convex historysale table</p></div><span>{sales.length} records</span></div>
        <table className="inventory-table analytics-table">
          <thead><tr><th>Date</th><th>Product Name</th><th>Each Price</th><th>Total Qty</th><th>Total Price</th><th>Actions</th></tr></thead>
          <tbody>{visibleSales.map((sale) => (
            <tr key={sale._id}>
              <td className="product-created" data-label="Date"><time dateTime={new Date(sale.date).toISOString()}>{productDateFormatter.format(sale.date)}</time></td>
              <td data-label="Product Name"><strong>{sale.productName}</strong>{sale.recordType === 'earning' && sale.notes ? <small className="linked-earning-notes">{sale.notes}</small> : null}</td>
              <td data-label="Each Price">{pesoFormatter.format(sale.eachPrice)}</td>
              <td data-label="Total Qty"><span className="sale-qty">{sale.totalQty}</span></td>
              <td data-label="Total Price"><strong className="profit-amount">{pesoFormatter.format(sale.totalPrice)}</strong></td>
              <td data-label="Actions">
                <div className="inventory-actions">
                  {sale.recordType === 'earning' ? <span className="linked-earning-label">Linked earning</span> : <><button type="button" aria-label={`Edit sale for ${sale.productName}`} onClick={() => {
                    setSaleError('')
                    setPendingEditSale(sale)
                  }}><span className="material-symbols-outlined" aria-hidden="true">edit</span></button>
                  <button className="delete" type="button" aria-label={`Delete sale for ${sale.productName}`} onClick={() => {
                    setSaleError('')
                    setPendingDeleteSale(sale)
                  }}><span className="material-symbols-outlined" aria-hidden="true">delete</span></button></>}
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
        {sales.length === 0 ? <p className="inventory-empty">No sales history records found.</p> : null}
      </div>

      {sales.length > pageSize ? <Pagination currentPage={currentPage} totalPages={totalPages} pageStart={pageStart} pageSize={pageSize} totalItems={sales.length} onPageChange={setSelectedPage} /> : null}

      {pendingEditSale ? (
        <div className="product-modal-backdrop" role="presentation" onMouseDown={() => setPendingEditSale(null)}>
          <section className="product-modal product-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="sale-edit-confirm-title" aria-describedby="sale-edit-confirm-description" onMouseDown={(event) => event.stopPropagation()}>
            <div className="product-confirm-icon" aria-hidden="true"><span className="material-symbols-outlined">edit</span></div>
            <p className="product-success-eyebrow">CONFIRM EDIT</p>
            <h3 id="sale-edit-confirm-title">Are you sure you want to edit this sale?</h3>
            <p id="sale-edit-confirm-description">You are about to change the sale record for <strong>{pendingEditSale.productName}</strong>.</p>
            <div className="product-modal-actions">
              <button className="cancel" type="button" onClick={() => setPendingEditSale(null)}>Cancel</button>
              <button className="save" type="button" onClick={confirmSaleEdit}>Yes, Edit Sale</button>
            </div>
          </section>
        </div>
      ) : null}

      {editingSale ? (
        <div className="product-modal-backdrop" role="presentation" onMouseDown={() => !isSavingSale && setEditingSale(null)}>
          <section className="product-modal sale-edit-modal" role="dialog" aria-modal="true" aria-labelledby="sale-edit-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="product-modal-header">
              <div><p>UPDATE SALES HISTORY</p><h3 id="sale-edit-title">Edit Sale</h3></div>
              <button type="button" disabled={isSavingSale} aria-label="Close sale form" onClick={() => setEditingSale(null)}><span className="material-symbols-outlined" aria-hidden="true">close</span></button>
            </div>
            <form key={editingSale._id} onSubmit={saveSale}>
              <label>Sale Date<input name="date" type="date" defaultValue={new Date(editingSale.date - new Date(editingSale.date).getTimezoneOffset() * 60000).toISOString().slice(0, 10)} required /></label>
              <label>Product Name<input name="productName" type="text" defaultValue={editingSale.productName} required /></label>
              <div className="product-form-row">
                <label>Each Price<input name="eachPrice" type="number" min="0" step="0.01" defaultValue={editingSale.eachPrice} required /></label>
                <label>Total Qty<input name="totalQty" type="number" min="1" step="1" defaultValue={editingSale.totalQty} required /></label>
              </div>
              {saleError ? <p className="product-form-error" role="alert">{saleError}</p> : null}
              <div className="product-modal-actions">
                <button className="cancel" type="button" disabled={isSavingSale} onClick={() => setEditingSale(null)}>Cancel</button>
                <button className="save" type="submit" disabled={isSavingSale}>{isSavingSale ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {pendingDeleteSale ? (
        <div className="product-modal-backdrop" role="presentation" onMouseDown={() => !isDeletingSale && setPendingDeleteSale(null)}>
          <section className="product-modal product-confirm-modal product-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="sale-delete-confirm-title" aria-describedby="sale-delete-confirm-description" onMouseDown={(event) => event.stopPropagation()}>
            <div className="product-delete-icon" aria-hidden="true"><span className="material-symbols-outlined">delete</span></div>
            <p className="product-delete-eyebrow">ARCHIVE SALE</p>
            <h3 id="sale-delete-confirm-title">Move this sale to archives?</h3>
            <p id="sale-delete-confirm-description">The <strong>{pendingDeleteSale.productName}</strong> sale worth <strong>{pesoFormatter.format(pendingDeleteSale.totalPrice)}</strong> can be restored later.</p>
            {saleError ? <p className="product-form-error" role="alert">{saleError}</p> : null}
            <div className="product-modal-actions">
              <button className="cancel" type="button" disabled={isDeletingSale} onClick={() => setPendingDeleteSale(null)}>Cancel</button>
              <button className="delete-confirm" type="button" disabled={isDeletingSale} onClick={deleteSale}>{isDeletingSale ? 'Archiving…' : 'Yes, Archive Sale'}</button>
            </div>
          </section>
        </div>
      ) : null}

      {reportOpen ? (
        <div className="report-modal-backdrop" role="presentation">
          <section className="report-modal" role="dialog" aria-modal="true" aria-labelledby="report-title">
            <header className="report-modal-toolbar"><button type="button" onClick={() => setReportOpen(false)}><span className="material-symbols-outlined" aria-hidden="true">close</span>Close</button><button className="save-pdf" type="button" onClick={() => window.print()}><span className="material-symbols-outlined" aria-hidden="true">download</span>Save PDF</button></header>
            <div className="report-paper">
              <div className="report-brand"><img src={logo} alt="" /><div><p>KHAMALA AND KSHITIJA&apos;S</p><h2 id="report-title">Sales Revenue Report</h2><span>{startDate || 'All dates'} — {endDate || 'Present'}</span></div></div>
              <div className="report-meta"><span>Generated</span><strong>{reportGeneratedAt ? productDateFormatter.format(reportGeneratedAt) : ''}</strong></div>
              <table><thead><tr><th>Date</th><th>Transaction</th><th>Amount</th></tr></thead><tbody>{reportSales.map((sale, index) => <tr key={`${sale.date}-${index}`}><td>{productDateFormatter.format(sale.date)}</td><td>{sale.productName ?? 'Sales revenue'}</td><td>{pesoFormatter.format(sale.amount)}</td></tr>)}</tbody></table>
              {reportSales.length === 0 ? <p className="report-empty">No sales found for this date range.</p> : null}
              <footer className="report-totals">
                <div><span>Total Quantity</span><strong>{reportTotalQty}</strong></div>
                <div className="report-money-totals">
                  <div><span>Grand Total</span><strong>{pesoFormatter.format(reportGrandTotal)}</strong></div>
                  <div className={reportRevenue >= 0 ? 'report-revenue positive' : 'report-revenue negative'}><span>Revenue</span><strong>{pesoFormatter.format(reportRevenue)}</strong></div>
                </div>
              </footer>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}

function ArchivesView({ onClose }) {
  const archiveResults = useQuery(api.archives.list)
  const archives = archiveResults ?? []
  const restoreArchive = useMutation(api.archives.restore)
  const removeArchive = useMutation(api.archives.remove)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [pendingAction, setPendingAction] = useState(null)
  const [isWorking, setIsWorking] = useState(false)
  const [actionError, setActionError] = useState('')
  const typeLabels = { addproduct: 'Inventory', profit: 'Profit', historysale: 'Sale' }
  const normalizedSearch = search.trim().toLowerCase()
  const filteredArchives = archives.filter((item) =>
    (type === 'all' || item.source === type) &&
    (!normalizedSearch || item.label.toLowerCase().includes(normalizedSearch) || (typeLabels[item.source] ?? item.source).toLowerCase().includes(normalizedSearch))
  )

  const confirmAction = async () => {
    if (!pendingAction) return
    setIsWorking(true)
    setActionError('')
    try {
      if (pendingAction.action === 'restore') await restoreArchive({ id: pendingAction.item._id })
      else await removeArchive({ id: pendingAction.item._id })
      setPendingAction(null)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update this archived item.')
    } finally {
      setIsWorking(false)
    }
  }

  const openAction = (action, item) => {
    setActionError('')
    setPendingAction({ action, item })
  }

  return (
    <section className="archive-view">
      <header className="admin-heading inventory-heading archive-heading">
        <div><h2 id="archives-title">Archives</h2><p>Restore deleted records or remove them permanently</p></div>
        <div className="archive-heading-actions"><span className="admin-date">{archives.length} archived item{archives.length === 1 ? '' : 's'}</span><button type="button" aria-label="Close archives" onClick={onClose}><span className="material-symbols-outlined" aria-hidden="true">close</span></button></div>
      </header>
      <div className="archive-toolbar">
        <label className="archive-search"><span className="material-symbols-outlined" aria-hidden="true">search</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search archived items…" aria-label="Search archived items" /></label>
        <label className="archive-filter"><span>Filter</span><select value={type} onChange={(event) => setType(event.target.value)}><option value="all">All tables</option><option value="addproduct">Inventory</option><option value="profit">Profit</option><option value="historysale">Sales</option></select></label>
      </div>
      <div className="admin-card inventory-table-card" aria-busy={archiveResults === undefined}>
        <table className="inventory-table archive-table">
          <thead><tr><th>Item</th><th>Original Table</th><th>Date Deleted</th><th>Actions</th></tr></thead>
          <tbody>{filteredArchives.map((item) => <tr key={item._id}><td><strong>{item.label}</strong></td><td><span className={`archive-type ${item.source}`}>{typeLabels[item.source] ?? 'Unknown'}</span></td><td>{productDateFormatter.format(item.deletedAt)}</td><td><div className="inventory-actions"><button type="button" aria-label={`Restore ${item.label}`} title="Restore" onClick={() => openAction('restore', item)}><span className="material-symbols-outlined" aria-hidden="true">restore</span></button><button className="delete" type="button" aria-label={`Permanently delete ${item.label}`} title="Delete permanently" onClick={() => openAction('delete', item)}><span className="material-symbols-outlined" aria-hidden="true">delete_forever</span></button></div></td></tr>)}</tbody>
        </table>
        {archiveResults === undefined ? <div className="archive-empty" role="status"><span className="material-symbols-outlined" aria-hidden="true">hourglass_top</span><strong>Loading archives…</strong></div> : filteredArchives.length === 0 ? <div className="archive-empty"><span className="material-symbols-outlined" aria-hidden="true">inventory_2</span><strong>No archived items found</strong><p>{archives.length ? 'Try changing your search or filter.' : 'Deleted records will appear here automatically.'}</p></div> : null}
      </div>
      {pendingAction ? <div className="product-modal-backdrop" role="presentation" onMouseDown={() => !isWorking && setPendingAction(null)}><section className={`product-modal product-confirm-modal ${pendingAction.action === 'delete' ? 'product-delete-modal' : ''}`} role="alertdialog" aria-modal="true" aria-labelledby="archive-confirm-title" onMouseDown={(event) => event.stopPropagation()}><div className={pendingAction.action === 'delete' ? 'product-delete-icon' : 'product-confirm-icon'} aria-hidden="true"><span className="material-symbols-outlined">{pendingAction.action === 'delete' ? 'delete_forever' : 'restore'}</span></div><p className={pendingAction.action === 'delete' ? 'product-delete-eyebrow' : 'product-success-eyebrow'}>{pendingAction.action === 'delete' ? 'PERMANENT DELETE' : 'RESTORE ITEM'}</p><h3 id="archive-confirm-title">{pendingAction.action === 'delete' ? 'Delete this item permanently?' : 'Restore this item?'}</h3><p><strong>{pendingAction.item.label}</strong> {pendingAction.action === 'delete' ? 'cannot be recovered after this action.' : `will return to the ${typeLabels[pendingAction.item.source]} table.`}</p>{actionError ? <p className="product-form-error" role="alert">{actionError}</p> : null}<div className="product-modal-actions"><button className="cancel" type="button" disabled={isWorking} onClick={() => setPendingAction(null)}>Cancel</button><button className={pendingAction.action === 'delete' ? 'delete-confirm' : 'save'} type="button" disabled={isWorking} onClick={confirmAction}>{isWorking ? 'Working…' : pendingAction.action === 'delete' ? 'Yes, Delete Forever' : 'Yes, Restore Item'}</button></div></section></div> : null}
    </section>
  )
}

function Pagination({ currentPage, totalPages, pageStart, pageSize, totalItems, onPageChange }) {
  return (
    <nav className="inventory-pagination" aria-label="Table pagination">
      <p>Showing {pageStart + 1}–{Math.min(pageStart + pageSize, totalItems)} of {totalItems}</p>
      <div>
        <button type="button" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} aria-label="Previous page"><span className="material-symbols-outlined" aria-hidden="true">chevron_left</span></button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => <button key={page} className={currentPage === page ? 'active' : ''} type="button" aria-current={currentPage === page ? 'page' : undefined} onClick={() => onPageChange(page)}>{page}</button>)}
        <button type="button" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)} aria-label="Next page"><span className="material-symbols-outlined" aria-hidden="true">chevron_right</span></button>
      </div>
    </nav>
  )
}

function MetricCard({ label, value, icon, detail, badge, badgeTone, children }) {
  return (
    <article className="admin-card metric-card">
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        {badge ? <span className={badgeTone === 'negative' ? 'metric-negative' : 'metric-positive'}>{badge}</span> : null}
        {icon && <span className="material-symbols-outlined metric-icon" aria-hidden="true">{icon}</span>}
      </div>
      <div className="metric-value">{value}</div>
      {detail && <p className="metric-detail">{detail}</p>}
      {children}
    </article>
  )
}
