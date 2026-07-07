import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import logo from '../assets/logo.png'
import './staff.css'

const productCatalog = [
  {
    id: 1,
    name: 'Midnight Truffle',
    description: '75% Dark Cacao',
    price: 4.5,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDXNBJBkeTCg_vg9adffCE9kKaactW38Wkfa3B_LMGKCQjsSW5vwNkR_h5QwWZgUz_12rTERjxRnizf3nbcpuPV2pyJ8nG5b8uje4h84OiFIHfVRTGp6MfcV7I55sVj3m-9ZT2rKfy3M8qz09SP61cDKOsUYaapZb_Pirp5aGHcp8A8vP587JOirdzC2C0modF2n4cXrPwXhA-1F-Yf8IkLYE-J8bRv8Pnk7H7ahnahm6oqbMvEWaDj',
  },
  {
    id: 2,
    name: 'Gold Leaf Praline',
    description: 'Hazelnut Crème',
    price: 6.2,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxiT1y4V9gZFlozzEl8md0IXrCgFkwqAKSxgZKw8VAJXNDnZRupK5ZgLs8iIWMjCgCEFHJ5bhYOibbXp4HxpiDgYC2WvFd6jZJ2HeG-paJjp4nSjS2OD_vf9uflYOpzHC4ECHavUYPSJZvFQ0HL6KM-NV99koGsO-iJXSlVoBFZEtnzs4nvLOgwDhglRDZlWXgIaC8RrvDWrO6w5xLEB5K2Vs0igxMkophObPSDfwE0MHf3krJfRu-',
  },
  {
    id: 3,
    name: 'Champagne Ganache',
    description: 'Vintage Reserve',
    price: 5.8,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9X0_P0pZHlgFOS8FqUT2DpNdHabgX5cr3OM_bdJ1q6O7vHnu7b7s3bUBYhYRmjSoXBMNItdunYiqnst9afPqoQxRjfYqXzjSxb78XhN26vqmQAGrtSAiC-Mbcb-HMzR_9jEIf_ueLhFfgTQnydhzRoTGjWXw24_iirK0LqnX8uCNr7ZqephIWXLCeY6VKXmrNkCiHLopGeCZO6duXdHwdHuPH7H_Uz6_qdK5aysnS7_IK37o2Y4X0',
  },
  {
    id: 4,
    name: 'Fleur de Sel',
    description: 'Salted Caramel',
    price: 4.2,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAM01teUPudH2kWInH9RPdVvrWsi42S2S9xKhdqIDjn_KoxJG8VtnWSlV1APJCzlo8hK3FZYHuzVPGVlj4LZISYeiFTbAvYEgoCAQBJ7th19j8K0xKlhnGGHYorkUaXCBcBnC_2TRtdChFBykZ80bTIe6-YeWevPchPVFWg4zjrw1dQ230wAocIBEI9eMEg_4kC_ICh8VMwZKBnN5u0HVSBZFWwLfeav4xk8_vPM21B1x17E-_8VJs-',
  },
  {
    id: 5,
    name: 'Pistachio Royale',
    description: 'Sicilian Nut',
    price: 5.5,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCI79_oWzITNZGtSsKuDxnn4vUQAxkgkCUFlwhdXz0NHMW91hl-3-snzQHYdGuaii79QZIr86uJUub2MDOPnnl8BR1T1gFLAy4uWTeFgWz904uBCCcqdFUwIJbCF3OarOXuIJwdheRb8EvfjZQ_TUHQrhCrMhCrxaSOGYi-3-Ks4uXZFCprsFeFzjBMl258lgEHXU-nJHxs-rS6TgAExyg8s1qUUFG3TQfehRqCWbonyhEAY4lggCzF',
  },
  {
    id: 6,
    name: 'Framboise Noir',
    description: 'Wild Berry',
    price: 4.8,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBSN4-z3usyFHVqME9PGRIx5Yd46x69zW84io4BivW569w_FqEYtquuhF1lxYSy0BwueUqZRFTrRkipgJ1H-kxxrVxdpGT8hzrPk33D-om0JymgrCTvB6fZB6CZiP9qcKmYPHdOZgbdiyWOuIB0Gb9z-JG89Obocg3BQc9ikdTpBx7MUOUp4d8eYTzEhYKPllPeQ-oYve6lMVZ3q9qvt-6qm86JAGHwz9fpQJQ4gSEtL8tRCf5SEcm1',
  },
]

const productImages = new Map(productCatalog.map((product) => [product.name.toLowerCase(), product.image]))
const categoryFilters = [
  { value: 'all', label: 'All Products', icon: 'grid_view' },
  { value: 'Cake', label: 'Cake', icon: 'cake' },
  { value: 'Snacks', label: 'Snacks', icon: 'cookie' },
]
const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })
const receiptDateFormatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

function toDateKey(timestamp) {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const todayDateKey = toDateKey(Date.now())

export default function Staff({ onSignOut }) {
  const productRecords = useQuery(api.addproduct.list)
  const salesHistory = useQuery(api.historysale.list)
  const checkoutProducts = useMutation(api.addproduct.checkout)
  const [order, setOrder] = useState([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [checkoutMessage, setCheckoutMessage] = useState('')
  const [completedSale, setCompletedSale] = useState(null)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isReceiptsOpen, setIsReceiptsOpen] = useState(false)
  const [receiptDate, setReceiptDate] = useState(todayDateKey)
  const [receiptPage, setReceiptPage] = useState(1)

  const products = (productRecords ?? []).map((product) => ({
    id: product._id,
    name: product.name,
    description: `${product.stock} in stock`,
    price: product.price,
    stock: product.stock,
    category: product.category ?? 'Unassigned',
    image: productImages.get(product.name.toLowerCase()) ?? logo,
  }))

  const normalizedSearch = search.trim().toLowerCase()
  const visibleProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    const matchesSearch = `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(normalizedSearch)
    return matchesCategory && matchesSearch
  })
  const subtotal = order.reduce((total, item) => total + item.price * item.quantity, 0)
  const tax = 0
  const total = subtotal
  const dailyReceipts = (salesHistory ?? []).filter((sale) => toDateKey(sale.date) === receiptDate)
  const receiptPageSize = 5
  const receiptTotalPages = Math.max(1, Math.ceil(dailyReceipts.length / receiptPageSize))
  const currentReceiptPage = Math.min(receiptPage, receiptTotalPages)
  const receiptPageStart = (currentReceiptPage - 1) * receiptPageSize
  const visibleDailyReceipts = dailyReceipts.slice(receiptPageStart, receiptPageStart + receiptPageSize)
  const dailyQuantity = dailyReceipts.reduce((sum, sale) => sum + sale.totalQty, 0)
  const dailyTotal = dailyReceipts.reduce((sum, sale) => sum + sale.totalPrice, 0)

  const addToOrder = (product) => {
    const currentQuantity = order.find((item) => item.id === product.id)?.quantity ?? 0
    if (product.stock === 0 || currentQuantity >= product.stock) {
      setCheckoutMessage(`${product.name} has no more available stock.`)
      return
    }
    setOrder((current) => {
      const existing = current.find((item) => item.id === product.id)
      return existing
        ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { ...product, quantity: 1 }]
    })
    setCheckoutMessage(`${product.name} added to order`)
  }

  const removeFromOrder = (id) => {
    setOrder((current) => current.filter((item) => item.id !== id))
  }

  const checkout = async () => {
    if (order.length === 0) return
    const completedTotal = total
    const completedQuantity = order.reduce((sum, item) => sum + item.quantity, 0)
    setIsCheckingOut(true)
    setCheckoutMessage('Processing checkout…')
    try {
      await checkoutProducts({ items: order.map((item) => ({ productId: item.id, quantity: item.quantity })) })
      setOrder([])
      setCheckoutMessage('')
      setCompletedSale({ total: completedTotal, quantity: completedQuantity })
    } catch (error) {
      setCheckoutMessage(error instanceof Error ? error.message : 'Checkout failed. Please try again.')
    } finally {
      setIsCheckingOut(false)
    }
  }

  return (
    <div className="staff-pos bg-background text-on-background font-body-md selection:bg-secondary-container/30 overflow-hidden">
      <div className="staff-shell flex h-screen pt-16">
        <aside id="staff-sidebar" className={`staff-nav${isMenuOpen ? ' is-open' : ''} h-full fixed left-0 bg-primary-container shadow-lg flex flex-col z-40`}>
          <button className="staff-logo-button" type="button" aria-label={isMenuOpen ? 'Close staff menu' : 'Open staff menu'} aria-controls="staff-sidebar" aria-expanded={isMenuOpen} onClick={() => setIsMenuOpen((current) => !current)}>
            <img src={logo} alt="Khamala and Kshitija Cake and Pastries" />
            <span className="staff-menu-toggle material-symbols-outlined" aria-hidden="true">{isMenuOpen ? 'close' : 'menu'}</span>
          </button>
          <nav className="flex flex-col gap-8 w-full items-center" aria-label="Point of sale navigation">
            <button className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary-container/10 text-secondary-fixed-dim border-l-4 border-secondary-fixed" type="button" aria-label="Point of sale">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>point_of_sale</span>
              <span className="staff-nav-label">Point of Sale</span>
            </button>
            <button className="flex items-center justify-center w-12 h-12 text-on-primary/70 hover:bg-on-primary/5 transition-colors rounded-xl" type="button" aria-label="Receipts" onClick={() => { setReceiptDate(todayDateKey); setReceiptPage(1); setIsReceiptsOpen(true); setIsMenuOpen(false) }}>
              <span className="material-symbols-outlined">receipt_long</span>
              <span className="staff-nav-label">Receipts</span>
            </button>
          </nav>
          <div className="mt-auto flex flex-col gap-6 items-center">
            <button type="button" className="text-on-primary/70 hover:text-on-primary" aria-label="Help"><span className="material-symbols-outlined">help_outline</span><span className="staff-nav-label">Help</span></button>
            <button type="button" className="text-on-primary/70 hover:text-on-primary" aria-label="Log out" onClick={onSignOut}><span className="material-symbols-outlined">logout</span><span className="staff-nav-label">Sign Out</span></button>
          </div>
        </aside>
        {isMenuOpen ? <button className="staff-nav-backdrop" type="button" aria-label="Close staff menu" onClick={() => setIsMenuOpen(false)} /> : null}

        {isReceiptsOpen ? (
          <div className="receipts-backdrop" role="presentation" onMouseDown={() => setIsReceiptsOpen(false)}>
            <section className="receipts-modal" role="dialog" aria-modal="true" aria-labelledby="receipts-title" onMouseDown={(event) => event.stopPropagation()}>
              <header className="receipts-header">
                <div><p>DAILY SALES</p><h2 id="receipts-title">Receipts</h2><span>Only sales from the selected day are shown.</span></div>
                <button type="button" aria-label="Close receipts" onClick={() => setIsReceiptsOpen(false)}><span className="material-symbols-outlined">close</span></button>
              </header>
              <div className="receipts-toolbar">
                <label>Sales date<input type="date" value={receiptDate} max={todayDateKey} onChange={(event) => { setReceiptDate(event.target.value); setReceiptPage(1) }} /></label>
                <div><span>{dailyReceipts.length}</span><small>Sale lines</small></div>
                <div><span>{dailyQuantity}</span><small>Items sold</small></div>
              </div>
              <div className="receipts-table-wrap">
                <table className="receipts-table">
                  <thead><tr><th>Time</th><th>Product</th><th>Each Price</th><th>Qty</th><th>Total</th></tr></thead>
                  <tbody>{visibleDailyReceipts.map((sale) => (
                    <tr key={sale._id}>
                      <td data-label="Time">{receiptDateFormatter.format(sale.date)}</td>
                      <td data-label="Product"><strong>{sale.productName}</strong></td>
                      <td data-label="Each Price">{peso.format(sale.eachPrice)}</td>
                      <td data-label="Qty">{sale.totalQty}</td>
                      <td data-label="Total"><strong>{peso.format(sale.totalPrice)}</strong></td>
                    </tr>
                  ))}</tbody>
                </table>
                {salesHistory === undefined ? <p className="receipts-empty">Loading receipts…</p> : null}
                {salesHistory !== undefined && dailyReceipts.length === 0 ? <p className="receipts-empty">No sales recorded for this date.</p> : null}
              </div>
              {dailyReceipts.length > receiptPageSize ? (
                <nav className="receipts-pagination" aria-label="Receipts pagination">
                  <p>Showing {receiptPageStart + 1}–{Math.min(receiptPageStart + receiptPageSize, dailyReceipts.length)} of {dailyReceipts.length}</p>
                  <div>
                    <button type="button" aria-label="Previous receipts page" disabled={currentReceiptPage === 1} onClick={() => setReceiptPage(currentReceiptPage - 1)}><span className="material-symbols-outlined">chevron_left</span></button>
                    {Array.from({ length: receiptTotalPages }, (_, index) => index + 1).map((page) => <button key={page} className={page === currentReceiptPage ? 'active' : ''} type="button" aria-current={page === currentReceiptPage ? 'page' : undefined} onClick={() => setReceiptPage(page)}>{page}</button>)}
                    <button type="button" aria-label="Next receipts page" disabled={currentReceiptPage === receiptTotalPages} onClick={() => setReceiptPage(currentReceiptPage + 1)}><span className="material-symbols-outlined">chevron_right</span></button>
                  </div>
                </nav>
              ) : null}
              <footer className="receipts-total"><span>Daily Grand Total</span><strong>{peso.format(dailyTotal)}</strong></footer>
            </section>
          </div>
        ) : null}

        <main className="staff-main ml-20 flex-1 flex overflow-hidden">
          <section className="product-area flex-1 p-8 overflow-y-auto custom-scrollbar bg-surface">
            <div className="product-toolbar flex justify-between items-end mb-8">
              <div className="flex gap-4">
                <label className="staff-search bg-surface-container-highest flex items-center px-4 py-2 rounded-lg border border-outline-variant/20">
                  <span className="material-symbols-outlined text-on-surface-variant mr-2">search</span>
                  <span className="sr-only">Search menu</span>
                  <input className="bg-transparent border-none focus:ring-0 text-body-md w-48" placeholder="Search menu..." type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
                </label>
              </div>
            </div>

            <nav className="category-filters" aria-label="Filter products by category">
              {categoryFilters.map((category) => {
                const count = category.value === 'all' ? products.length : products.filter((product) => product.category === category.value).length
                const isActive = selectedCategory === category.value
                return (
                  <button key={category.value} className={isActive ? 'active' : ''} type="button" aria-pressed={isActive} onClick={() => setSelectedCategory(category.value)}>
                    <span className="category-filter-icon material-symbols-outlined" aria-hidden="true">{category.icon}</span>
                    <span><strong>{category.label}</strong><small>{count} {count === 1 ? 'item' : 'items'}</small></span>
                    <span className="category-filter-check material-symbols-outlined" aria-hidden="true">check_circle</span>
                  </button>
                )
              })}
            </nav>

            <div className="product-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {visibleProducts.map((product, index) => (
                <button key={product.id} className={`product-card bg-surface-container-lowest border border-outline-variant/10 rounded-xl p-4 cocoa-shadow hover:scale-[1.02] transition-transform cursor-pointer group animate-item text-left${product.stock === 0 ? ' out-of-stock' : ''}`} style={{ animationDelay: `${0.1 + index * 0.05}s` }} type="button" disabled={product.stock === 0} onClick={() => addToOrder(product)}>
                  <span className="product-card-content flex justify-between items-start">
                    <span><strong className="font-display-lg text-title-lg text-primary leading-tight block">{product.name}</strong><span className="text-label-md text-on-surface-variant/70 uppercase tracking-widest mt-1 block">{product.description}</span></span>
                    <span className="text-secondary font-bold text-body-lg">{peso.format(product.price)}</span>
                  </span>
                </button>
              ))}
              {productRecords === undefined ? <p className="product-state">Loading products…</p> : null}
              {productRecords !== undefined && visibleProducts.length === 0 ? <p className="product-state">No products found in this category.</p> : null}
            </div>
          </section>

          <section className="order-panel w-96 bg-surface-container border-l border-outline-variant/20 flex flex-col p-6 cocoa-shadow z-30" aria-label="Current order">
            <div className="order-heading flex items-center justify-between mb-8">
              <h2 className="font-display-lg text-title-lg text-primary">Current Order</h2>
              <span className="text-on-surface-variant/60 text-label-md bg-surface-container-high px-2 py-1 rounded">ID: #4092</span>
            </div>
            <div className="order-list flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
              {order.map((item, index) => (
                <div key={item.id} className="order-item flex gap-4 items-center animate-item" style={{ animationDelay: `${0.4 + index * 0.05}s` }}>
                  <div className="flex-1"><h3 className="font-title-lg text-body-md text-primary leading-tight">{item.name}</h3><p className="text-on-surface-variant text-label-md">Qty: {item.quantity} / {item.stock}</p></div>
                  <div className="text-right"><p className="text-primary font-bold text-body-md">{peso.format(item.price * item.quantity)}</p><button type="button" className="text-error/40 hover:text-error transition-colors" aria-label={`Remove ${item.name}`} onClick={() => removeFromOrder(item.id)}><span className="material-symbols-outlined text-sm">delete</span></button></div>
                </div>
              ))}
              {order.length === 0 ? <p className="text-center text-on-surface-variant py-10">Your order is empty.</p> : null}
            </div>

            <div className="order-summary mt-8 pt-6 border-t border-outline-variant/40 space-y-3">
              <div className="flex justify-between text-body-md"><span className="text-on-surface-variant">Subtotal</span><span className="text-primary">{peso.format(subtotal)}</span></div>
              <div className="flex justify-between text-body-md"><span className="text-on-surface-variant">Tax (0%)</span><span className="text-primary">{peso.format(tax)}</span></div>
              <div className="flex justify-between text-title-lg font-bold pt-2"><span className="text-primary">Total</span><span className="text-secondary font-display-lg">{peso.format(total)}</span></div>
              {checkoutMessage ? <p className="text-label-md text-secondary" role="status">{checkoutMessage}</p> : null}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button className="py-4 rounded-xl border border-primary text-primary font-bold hover:bg-primary/5 transition-colors uppercase tracking-widest text-label-md" type="button" onClick={() => { setOrder([]); setCheckoutMessage('Order voided.') }}>Void Order</button>
                <button className="py-4 rounded-xl bg-secondary-container text-on-secondary-container font-bold hover:brightness-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-label-md disabled:opacity-50" style={{ backgroundColor: '#D4AF37', color: 'white' }} type="button" disabled={order.length === 0 || isCheckingOut} onClick={checkout}>{isCheckingOut ? 'Processing…' : 'Checkout'}<span className="material-symbols-outlined">payments</span></button>
              </div>
            </div>
          </section>
        </main>
      </div>

      {completedSale ? (
        <div className="checkout-success-backdrop" role="presentation" onMouseDown={() => setCompletedSale(null)}>
          <section className="checkout-success-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-success-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="checkout-success-icon" aria-hidden="true"><span className="material-symbols-outlined">check</span></div>
            <p className="checkout-success-eyebrow">CHECKOUT COMPLETE</p>
            <h2 id="checkout-success-title">Sale successfully added</h2>
            <p><strong>{peso.format(completedSale.total)}</strong> for {completedSale.quantity} {completedSale.quantity === 1 ? 'item has' : 'items have'} been recorded in Sales History.</p>
            <button type="button" onClick={() => setCompletedSale(null)}>Done</button>
          </section>
        </div>
      ) : null}

    
    </div>
  )
}
