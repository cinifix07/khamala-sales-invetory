import brandLogo from '../assets/logo.png?inline'

const money = (amount) => `PHP ${Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const sumCents = (items, amountOf) => items.reduce((sum, item) => sum + Math.round(amountOf(item) * 100), 0) / 100
const dateLabel = (timestamp) => new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila', dateStyle: 'medium',
}).format(timestamp)

export async function downloadFinancialReport({ type, startDate, endDate, earnings, investments, generatedAt = Date.now() }) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const reportLabels = {
    earnings: 'Earnings Report',
    investment: 'Profit Investment Report',
    combined: 'Combined Financial Report',
  }
  const selectedEarnings = type === 'investment' ? [] : earnings
  const selectedInvestments = type === 'earnings' ? [] : investments
  const totalEarnings = sumCents(selectedEarnings, (item) => Number.isInteger(item.amountCents) ? item.amountCents / 100 : item.amount)
  const totalInvestments = sumCents(selectedInvestments, (item) => item.totalProfit)
  const totalTransactions = selectedEarnings.length + selectedInvestments.length
  const generatedLabel = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short',
  }).format(generatedAt)

  doc.addImage(brandLogo, 'PNG', 14, 12, 25, 25)
  doc.setTextColor(52, 35, 24)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('KHAMALA SALES INVENTORY', 45, 19)
  doc.setFontSize(10)
  doc.setTextColor(153, 113, 28)
  doc.text('FINANCIAL TRANSACTION REPORT', 45, 26)
  doc.setDrawColor(185, 143, 53)
  doc.setLineWidth(0.7)
  doc.line(14, 41, 196, 41)
  doc.setTextColor(52, 35, 24)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(reportLabels[type], 14, 51)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Reporting Period: ${dateLabel(new Date(`${startDate}T00:00:00+08:00`).getTime())} - ${dateLabel(new Date(`${endDate}T00:00:00+08:00`).getTime())}`, 14, 58)
  doc.text(`Date Generated: ${generatedLabel}`, 14, 64)

  const summary = type === 'earnings'
    ? [['Total Earnings', money(totalEarnings)], ['Total Earnings Transactions', String(selectedEarnings.length)]]
    : type === 'investment'
      ? [['Total Profit Invested', money(totalInvestments)], ['Total Investment Transactions', String(selectedInvestments.length)]]
      : [['Total Earnings', money(totalEarnings)], ['Total Profit Invested', money(totalInvestments)], ['Total Transactions', String(totalTransactions)], ['Net Difference (comparison)', money(totalEarnings - totalInvestments)]]
  autoTable(doc, {
    startY: 71,
    head: [['Report Summary', 'Value']],
    body: summary,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [57, 38, 27], textColor: [255, 248, 232] },
    alternateRowStyles: { fillColor: [250, 246, 239] },
    columnStyles: { 1: { halign: 'right', cellWidth: 55 } },
    margin: { left: 14, right: 14 },
  })

  let y = doc.lastAutoTable.finalY + 10
  const addSection = (title, rows, head, body) => {
    if (y > 250) { doc.addPage(); y = 18 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(52, 35, 24)
    doc.text(title, 14, y)
    autoTable(doc, {
      startY: y + 3,
      head: [head],
      body,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.6, overflow: 'linebreak', valign: 'top' },
      headStyles: { fillColor: [77, 53, 38], textColor: [255, 248, 232] },
      alternateRowStyles: { fillColor: [250, 246, 239] },
      columnStyles: { [head.length - 1]: { halign: 'right' } },
      margin: { left: 14, right: 14, bottom: 18 },
      showHead: 'everyPage',
    })
    y = doc.lastAutoTable.finalY + 10
  }

  if (type !== 'investment') addSection('Earnings Transactions', selectedEarnings,
    ['Date', 'Transaction ID', 'Description', 'Amount'], selectedEarnings.map((item) => [
      dateLabel(item.date), item.transactionId ?? String(item._id), item.notes || 'Daily earnings', money(Number.isInteger(item.amountCents) ? item.amountCents / 100 : item.amount),
    ]))
  if (type !== 'earnings') addSection('Profit Investment Transactions', selectedInvestments,
    ['Date', 'Transaction ID', 'Description', 'Amount'], selectedInvestments.map((item) => [
      dateLabel(item._creationTime), String(item._id), 'Profit investment', money(item.totalProfit),
    ]))

  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setDrawColor(224, 216, 204)
    doc.line(14, 282, 196, 282)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(110, 98, 87)
    doc.text('Generated by Khamala Sales Inventory System', 14, 288)
    doc.text(`Page ${page} of ${pageCount}`, 196, 288, { align: 'right' })
  }
  const safeType = { earnings: 'Earnings', investment: 'Profit_Investment', combined: 'Combined_Financial' }[type]
  doc.save(`Khamala_${safeType}_Report_${startDate}_to_${endDate}.pdf`)
  return { totalEarnings, totalInvestments, totalTransactions }
}
