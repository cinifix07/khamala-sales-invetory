import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import './ADMIN.css'
import logo from '../assets/logo.png'

const navigation = [
  ['bakery_dining', 'Dashboard'],
  ['inventory_2', 'Inventory'],
  ['shopping_bag', 'Profit'],
  ['analytics', 'Analytics'],
  
]

const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const productDateFormatter = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const pesoFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })

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
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [range, setRange] = useState('Monthly')
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const selectNavigation = (label) => {
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
                  className={activeNav === label ? 'active' : ''}
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
                {stockAlerts.map((product) => (
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
        </section>
          </>
        )}
      </main>
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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [selectedPage, setSelectedPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(products.length / pageSize))
  const currentPage = Math.min(selectedPage, totalPages)
  const pageStart = (currentPage - 1) * pageSize
  const visibleProducts = products.slice(pageStart, pageStart + pageSize)

  const openProductModal = (product = null) => {
    setEditingProduct(product)
    setFormError('')
    setIsModalOpen(true)
  }

  const closeProductModal = () => {
    setEditingProduct(null)
    setIsModalOpen(false)
  }

  const saveProduct = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setFormError('')
    const formData = new FormData(event.currentTarget)
    const product = {
      name: formData.get('name').trim(),
      stock: Number(formData.get('stock')),
      price: Number(formData.get('price')),
    }

    try {
      if (editingProduct) {
        await updateProduct({ id: editingProduct._id, ...product })
      } else {
        await addProduct(product)
        setSelectedPage(1)
      }
      closeProductModal()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save product.')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteProduct = async (id) => {
    try {
      await removeProduct({ id })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to delete product.')
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

      <div className="inventory-summary">
        <strong>{products.length}</strong>
        <span>Total products</span>
      </div>

      <div className="admin-card inventory-table-card">
        <table className="inventory-table">
          <thead>
            <tr><th>No.</th><th>Product Name</th><th>No. of Stock</th><th>Price</th><th>Status</th><th>Date &amp; Time Added</th><th>Stock Updated</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {visibleProducts.map((product, index) => (
              <tr key={product._id}>
                <td data-label="No.">{String(pageStart + index + 1).padStart(2, '0')}</td>
                <td data-label="Product Name"><strong>{product.name}</strong></td>
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
                    <button type="button" aria-label={`Edit ${product.name}`} onClick={() => openProductModal(product)}>
                      <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                    </button>
                    <button className="delete" type="button" aria-label={`Delete ${product.name}`} onClick={() => deleteProduct(product._id)}>
                      <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 ? <p className="inventory-empty">No products yet. Add your first product to get started.</p> : null}
      </div>

      {products.length > pageSize ? (
        <nav className="inventory-pagination" aria-label="Inventory pagination">
          <p>Showing {pageStart + 1}–{Math.min(pageStart + pageSize, products.length)} of {products.length}</p>
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
    </section>
  )
}

function ProfitView() {
  const records = useQuery(api.profit.list) ?? []
  const addProfit = useMutation(api.profit.add)
  const updateProfit = useMutation(api.profit.update)
  const removeProfit = useMutation(api.profit.remove)
  const [editingRecord, setEditingRecord] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const totalInvestment = records.reduce((sum, record) => sum + record.totalProfit, 0)

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
      }
      closeModal()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save profit record.')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteProfit = async (id) => {
    try {
      await removeProfit({ id })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to delete profit record.')
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
            {records.map((record, index) => (
              <tr key={record._id}>
                <td data-label="No.">{String(index + 1).padStart(2, '0')}</td>
                <td data-label="Total of Profit"><strong className="profit-amount">₱{record.totalProfit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></td>
                <td className="product-created" data-label="Date & Time Added"><time dateTime={new Date(record._creationTime).toISOString()}>{productDateFormatter.format(record._creationTime)}</time></td>
                <td data-label="Actions">
                  <div className="inventory-actions">
                    <button type="button" aria-label="Edit profit record" onClick={() => openModal(record)}><span className="material-symbols-outlined" aria-hidden="true">edit</span></button>
                    <button className="delete" type="button" aria-label="Delete profit record" onClick={() => deleteProfit(record._id)}><span className="material-symbols-outlined" aria-hidden="true">delete</span></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 ? <p className="inventory-empty">No profit investments recorded yet.</p> : null}
      </div>

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
    </section>
  )
}

function AnalyticsView() {
  const pageSize = 10
  const sales = useQuery(api.historysale.list) ?? []
  const profitRecords = useQuery(api.profit.list) ?? []
  const [selectedPage, setSelectedPage] = useState(1)
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
          <thead><tr><th>Date</th><th>Product Name</th><th>Each Price</th><th>Total Qty</th><th>Total Price</th></tr></thead>
          <tbody>{visibleSales.map((sale) => (
            <tr key={sale._id}>
              <td className="product-created" data-label="Date"><time dateTime={new Date(sale.date).toISOString()}>{productDateFormatter.format(sale.date)}</time></td>
              <td data-label="Product Name"><strong>{sale.productName}</strong></td>
              <td data-label="Each Price">{pesoFormatter.format(sale.eachPrice)}</td>
              <td data-label="Total Qty"><span className="sale-qty">{sale.totalQty}</span></td>
              <td data-label="Total Price"><strong className="profit-amount">{pesoFormatter.format(sale.totalPrice)}</strong></td>
            </tr>
          ))}</tbody>
        </table>
        {sales.length === 0 ? <p className="inventory-empty">No sales history records found.</p> : null}
      </div>

      {sales.length > pageSize ? <Pagination currentPage={currentPage} totalPages={totalPages} pageStart={pageStart} pageSize={pageSize} totalItems={sales.length} onPageChange={setSelectedPage} /> : null}

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
