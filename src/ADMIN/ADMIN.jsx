import { Component, useState } from 'react'
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
const inventoryCategoryFilters = [
  { value: 'all', label: 'All Products', icon: 'inventory_2' },
  { value: 'Cake', label: 'Cake', icon: 'cake' },
  { value: 'Snacks', label: 'Snacks', icon: 'cookie' },
]
const productDateFormatter = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const pesoFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })

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
        {activeNav === 'Inventory' ? <InventoryView /> : activeNav === 'Profit' ? <ProfitView /> : activeNav === 'Analytics' ? <AnalyticsView /> : (
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
  const [selectedCategory, setSelectedCategory] = useState('all')
  const filteredProducts = selectedCategory === 'all' ? products : products.filter((product) => product.category === selectedCategory)
  const categoryCounts = products.reduce((counts, product) => {
    if (product.category === 'Cake') counts.Cake += 1
    if (product.category === 'Snacks') counts.Snacks += 1
    return counts
  }, { Cake: 0, Snacks: 0 })
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
  const currentPage = Math.min(selectedPage, totalPages)
  const pageStart = (currentPage - 1) * pageSize
  const visibleProducts = filteredProducts.slice(pageStart, pageStart + pageSize)

  const selectCategory = (category) => {
    setSelectedCategory(category)
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

      <nav className="inventory-category-filters" aria-label="Filter inventory by category">
        {inventoryCategoryFilters.map((category) => {
          const count = category.value === 'all' ? products.length : categoryCounts[category.value]
          const isActive = selectedCategory === category.value
          return (
            <button key={category.value} className={isActive ? 'active' : ''} type="button" aria-pressed={isActive} onClick={() => selectCategory(category.value)}>
              <span className="material-symbols-outlined" aria-hidden="true">{category.icon}</span>
              <span><strong>{count}</strong><small>{category.label}</small></span>
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
        {filteredProducts.length === 0 ? <p className="inventory-empty">{products.length === 0 ? 'No products yet. Add your first product to get started.' : `No ${selectedCategory.toLowerCase()} products found.`}</p> : null}
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
  const records = useQuery(api.profit.list) ?? []
  const addProfit = useMutation(api.profit.add)
  const updateProfit = useMutation(api.profit.update)
  const removeProfit = useMutation(api.profit.remove)
  const [selectedPage, setSelectedPage] = useState(1)
  const [editingRecord, setEditingRecord] = useState(null)
  const [pendingEditRecord, setPendingEditRecord] = useState(null)
  const [pendingDeleteRecord, setPendingDeleteRecord] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [savedProfitAmount, setSavedProfitAmount] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [formError, setFormError] = useState('')
  const totalInvestment = records.reduce((sum, record) => sum + record.totalProfit, 0)
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize))
  const currentPage = Math.min(selectedPage, totalPages)
  const pageStart = (currentPage - 1) * pageSize
  const visibleRecords = records.slice(pageStart, pageStart + pageSize)

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

  return (
    <section className="profit-view">
      <header className="inventory-heading">
        <div>
          <p className="inventory-eyebrow">SHOP INVESTMENT</p>
          <h2>Profit Investment</h2>
          <p>Record and manage the profit reinvested into your shop.</p>
        </div>
        <button className="add-product-button" type="button" onClick={() => openModal()}>
          <span className="material-symbols-outlined" aria-hidden="true">add</span>
          Add Profit
        </button>
      </header>

      <div className="profit-summary-card">
        <span className="material-symbols-outlined" aria-hidden="true">account_balance_wallet</span>
        <div><small>TOTAL PROFIT INVESTED</small><strong>₱{totalInvestment.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></div>
        <p>{records.length} {records.length === 1 ? 'record' : 'records'}</p>
      </div>

      <div className="admin-card inventory-table-card">
        <table className="inventory-table profit-table">
          <thead><tr><th>No.</th><th>Total of Profit</th><th>Date &amp; Time Added</th><th>Actions</th></tr></thead>
          <tbody>
            {visibleRecords.map((record, index) => (
              <tr key={record._id}>
                <td data-label="No.">{String(pageStart + index + 1).padStart(2, '0')}</td>
                <td data-label="Total of Profit"><strong className="profit-amount">₱{record.totalProfit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></td>
                <td className="product-created" data-label="Date & Time Added"><time dateTime={new Date(record._creationTime).toISOString()}>{productDateFormatter.format(record._creationTime)}</time></td>
                <td data-label="Actions">
                  <div className="inventory-actions">
                    <button type="button" aria-label="Edit profit record" onClick={() => setPendingEditRecord(record)}><span className="material-symbols-outlined" aria-hidden="true">edit</span></button>
                    <button className="delete" type="button" aria-label="Delete profit record" onClick={() => {
                      setDeleteError('')
                      setPendingDeleteRecord(record)
                    }}><span className="material-symbols-outlined" aria-hidden="true">delete</span></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 ? <p className="inventory-empty">No profit investments recorded yet.</p> : null}
      </div>
      {records.length > pageSize ? <Pagination currentPage={currentPage} totalPages={totalPages} pageStart={pageStart} pageSize={pageSize} totalItems={records.length} onPageChange={setSelectedPage} /> : null}

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
  const totalInvestment = profitRecords.reduce((sum, record) => sum + record.totalProfit, 0)
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalPrice, 0)
  const interestRevenue = totalRevenue - totalInvestment
  const revenueTone = interestRevenue > 0 ? 'positive' : interestRevenue < 0 ? 'negative' : 'neutral'
  const revenueLabel = interestRevenue > 0 ? 'Interest Revenue' : interestRevenue < 0 ? 'Low Interest Revenue' : 'Break-even Revenue'

  const startTimestamp = startDate ? new Date(`${startDate}T00:00:00`).getTime() : -Infinity
  const endTimestamp = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : Infinity
  const reportSales = sales.filter((sale) => sale.date >= startTimestamp && sale.date <= endTimestamp)
  const reportGrandTotal = reportSales.reduce((sum, sale) => sum + sale.totalPrice, 0)
  const reportTotalQty = reportSales.reduce((sum, sale) => sum + sale.totalQty, 0)
  const reportInvestment = profitRecords
    .filter((record) => record._creationTime >= startTimestamp && record._creationTime <= endTimestamp)
    .reduce((sum, record) => sum + record.totalProfit, 0)
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
    if (startDate && endDate && startTimestamp > endTimestamp) {
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
        <article><span>Gross Revenue</span><strong>{pesoFormatter.format(totalRevenue)}</strong><small>From {sales.length} sales</small></article>
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
              <td data-label="Product Name"><strong>{sale.productName}</strong></td>
              <td data-label="Each Price">{pesoFormatter.format(sale.eachPrice)}</td>
              <td data-label="Total Qty"><span className="sale-qty">{sale.totalQty}</span></td>
              <td data-label="Total Price"><strong className="profit-amount">{pesoFormatter.format(sale.totalPrice)}</strong></td>
              <td data-label="Actions">
                <div className="inventory-actions">
                  <button type="button" aria-label={`Edit sale for ${sale.productName}`} onClick={() => {
                    setSaleError('')
                    setPendingEditSale(sale)
                  }}><span className="material-symbols-outlined" aria-hidden="true">edit</span></button>
                  <button className="delete" type="button" aria-label={`Delete sale for ${sale.productName}`} onClick={() => {
                    setSaleError('')
                    setPendingDeleteSale(sale)
                  }}><span className="material-symbols-outlined" aria-hidden="true">delete</span></button>
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
              <table><thead><tr><th>Date</th><th>Product Name</th><th>Each Price</th><th>Total Qty</th><th>Total Price</th></tr></thead><tbody>{reportSales.map((sale) => <tr key={sale._id}><td>{productDateFormatter.format(sale.date)}</td><td>{sale.productName}</td><td>{pesoFormatter.format(sale.eachPrice)}</td><td>{sale.totalQty}</td><td>{pesoFormatter.format(sale.totalPrice)}</td></tr>)}</tbody></table>
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
