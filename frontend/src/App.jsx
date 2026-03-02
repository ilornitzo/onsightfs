import { useEffect, useMemo, useRef, useState } from 'react'

function App() {
  const FILTER_FIELDS = [
    { label: 'Contractor', param: 'contractor' },
    { label: 'Client', param: 'client' },
    { label: 'County', param: 'county' },
    { label: 'City', param: 'city' },
    { label: 'State', param: 'state' },
    { label: 'Address', param: 'q' },
    { label: 'Zip', param: 'q' },
    { label: 'Order Number', param: 'q' },
  ]

  const [orders, setOrders] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterRows, setFilterRows] = useState([{ field: 'contractor', value: '' }])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [missingRateOnly, setMissingRateOnly] = useState(false)
  const [payrollResult, setPayrollResult] = useState(null)
  const [creatingPayroll, setCreatingPayroll] = useState(false)
  const [confirmingPayroll, setConfirmingPayroll] = useState(false)
  const [payrollMessage, setPayrollMessage] = useState('')
  const [selectedOrderIds, setSelectedOrderIds] = useState([])
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null)
  const [focusOnSelected, setFocusOnSelected] = useState(false)
  const [topSectionHeight, setTopSectionHeight] = useState(() =>
    typeof window !== 'undefined' ? Math.max(200, Math.round(window.innerHeight * 0.4)) : 320
  )
  const [leftPanelWidth, setLeftPanelWidth] = useState(() =>
    typeof window !== 'undefined' ? Math.max(300, Math.round(window.innerWidth * 0.5)) : 480
  )
  const containerRef = useRef(null)
  const topSectionRef = useRef(null)

  const buildFilters = () => {
    const params = {}
    const qParts = []

    for (const row of filterRows) {
      const value = row.value.trim()
      if (!value) continue
      const selected = FILTER_FIELDS.find((f) => f.param === row.field || f.label === row.field)
      const param = selected?.param ?? row.field
      if (param === 'q') {
        qParts.push(value)
      } else {
        params[param] = value
      }
    }

    if (qParts.length > 0) {
      params.q = qParts.join(' ')
    }
    if (fromDate) {
      params.submitted_from = fromDate
    }
    if (toDate) {
      params.submitted_to = toDate
    }

    return params
  }

  const buildFilterParams = () => {
    const params = new URLSearchParams()
    const filters = buildFilters()
    Object.entries(filters).forEach(([key, value]) => {
      params.set(key, String(value))
    })
    return params
  }

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const params = buildFilterParams()
      const ordersParams = new URLSearchParams(params)
      ordersParams.set('limit', '100')
      const summaryParams = new URLSearchParams(params)
      const [ordersRes, summaryRes] = await Promise.all([
        fetch(`http://localhost:5090/api/orders?${ordersParams.toString()}`),
        fetch(`http://localhost:5090/api/orders/summary?${summaryParams.toString()}`),
      ])

      if (!ordersRes.ok || !summaryRes.ok) {
        throw new Error('Failed to load accounting data')
      }

      const ordersJson = await ordersRes.json()
      const summaryJson = await summaryRes.json()
      setOrders(Array.isArray(ordersJson.results) ? ordersJson.results : [])
      setSummary(summaryJson)
      setFocusOnSelected(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }),
    []
  )

  const formatMoney = (value) => {
    const num = Number(value ?? 0)
    return Number.isFinite(num) ? formatter.format(num) : '$0.00'
  }

  const formatDate = (value) => {
    if (!value) return ''
    const dt = new Date(value)
    return Number.isNaN(dt.getTime()) ? String(value) : dt.toLocaleDateString()
  }

  const visibleOrders = useMemo(() => {
    if (!missingRateOnly) return orders
    return orders.filter((order) => order.missing_paid_out_rate === true)
  }, [orders, missingRateOnly])

  const selectedIdSet = useMemo(() => new Set(selectedOrderIds), [selectedOrderIds])

  const displayedOrders = useMemo(() => {
    if (!focusOnSelected) return visibleOrders
    return visibleOrders.filter((order) => selectedIdSet.has(order.id))
  }, [visibleOrders, focusOnSelected, selectedIdSet])

  const focusedSummary = useMemo(() => {
    const paidIn = displayedOrders.reduce((sum, order) => sum + Number(order.client_pay_amount ?? 0), 0)
    const paidOut = displayedOrders.reduce((sum, order) => sum + Number(order.contractor_pay_amount ?? 0), 0)
    return {
      count: displayedOrders.length,
      paid_in_total: paidIn,
      paid_out_total: paidOut,
      margin_total: paidIn - paidOut,
    }
  }, [displayedOrders])

  const summaryToDisplay = focusOnSelected ? focusedSummary : summary
  const displayedMetrics = useMemo(() => {
    const totalOrders = displayedOrders.length
    const paidIn = displayedOrders.reduce((sum, order) => sum + Number(order.client_pay_amount ?? 0), 0)
    const paidOut = displayedOrders.reduce((sum, order) => sum + Number(order.contractor_pay_amount ?? 0), 0)
    const paidOrders = displayedOrders.filter((order) => order.paid_out_status === 'paid').length
    const contractorUnpaid = totalOrders - paidOrders
    const missingContractorPay = displayedOrders.filter(
      (order) =>
        order.contractor_pay_amount === null ||
        order.contractor_pay_amount === undefined ||
        Number(order.contractor_pay_amount) === 0
    ).length
    const missingClientPay = displayedOrders.filter(
      (order) =>
        order.client_pay_amount === null || order.client_pay_amount === undefined || Number(order.client_pay_amount) === 0
    ).length
    const unpaidNeedsAction = displayedOrders.filter(
      (order) =>
        order.paid_out_status !== 'paid' ||
        order.client_pay_amount === null ||
        order.client_pay_amount === undefined ||
        Number(order.client_pay_amount) === 0
    ).length

    return {
      totalOrders,
      paidIn,
      paidOut,
      margin: paidIn - paidOut,
      paidOrders,
      contractorUnpaid,
      unpaidNeedsAction,
      missingContractorPay,
      missingClientPay,
    }
  }, [displayedOrders])

  const handleRowCheckbox = (index, orderId, checked, shiftKey) => {
    if (shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index)
      const end = Math.max(lastSelectedIndex, index)
      const rangeIds = displayedOrders.slice(start, end + 1).map((order) => order.id)
      setSelectedOrderIds((prev) => {
        const next = new Set(prev)
        if (checked) {
          rangeIds.forEach((id) => next.add(id))
        } else {
          rangeIds.forEach((id) => next.delete(id))
        }
        return Array.from(next)
      })
    } else {
      setSelectedOrderIds((prev) => {
        const next = new Set(prev)
        if (checked) {
          next.add(orderId)
        } else {
          next.delete(orderId)
        }
        return Array.from(next)
      })
    }
    setLastSelectedIndex(index)
  }

  const createPayrollBatch = async () => {
    setCreatingPayroll(true)
    setError('')
    setPayrollMessage('')
    try {
      const body = buildFilters()

      const res = await fetch('http://localhost:5090/api/payroll/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        throw new Error('Failed to create payroll batch')
      }

      const json = await res.json()
      setPayrollResult(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setCreatingPayroll(false)
    }
  }

  const confirmPayroll = async () => {
    const batchId = payrollResult?.batch_ids?.[0]
    if (!batchId) return

    setConfirmingPayroll(true)
    setError('')
    setPayrollMessage('')
    try {
      const res = await fetch(`http://localhost:5090/api/payroll/batches/${batchId}/confirm`, {
        method: 'POST',
      })
      if (!res.ok) {
        throw new Error('Failed to confirm payroll')
      }
      setPayrollMessage('Payroll confirmed.')
      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setConfirmingPayroll(false)
    }
  }

  const startVerticalResize = (event) => {
    event.preventDefault()
    const topRect = topSectionRef.current?.getBoundingClientRect()
    if (!topRect) return

    document.onmousemove = (moveEvent) => {
      const nextWidth = moveEvent.clientX - topRect.left
      const maxWidth = Math.max(300, topRect.width - 300)
      setLeftPanelWidth(Math.min(Math.max(300, nextWidth), maxWidth))
    }
    document.onmouseup = () => {
      document.onmousemove = null
      document.onmouseup = null
    }
  }

  const startHorizontalResize = (event) => {
    event.preventDefault()
    const containerRect = containerRef.current?.getBoundingClientRect()
    const topRect = topSectionRef.current?.getBoundingClientRect()
    if (!containerRect || !topRect) return
    const topOffset = topRect.top - containerRect.top

    document.onmousemove = (moveEvent) => {
      const nextHeight = moveEvent.clientY - containerRect.top - topOffset
      const maxHeight = Math.max(200, containerRect.height - topOffset - 200)
      setTopSectionHeight(Math.min(Math.max(200, nextHeight), maxHeight))
    }
    document.onmouseup = () => {
      document.onmousemove = null
      document.onmouseup = null
    }
  }

  const togglePaidInStatus = async (orderId, paid) => {
    setError('')
    try {
      const res = await fetch(`http://localhost:5090/api/orders/${orderId}/paid_in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid }),
      })
      if (!res.ok) {
        throw new Error('Failed to update client paid status')
      }
      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    }
  }

  const togglePaidOutStatus = async (orderId, paid) => {
    setError('')
    try {
      const res = await fetch(`http://localhost:5090/api/orders/${orderId}/paid_out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paid }),
      })
      if (!res.ok) {
        throw new Error('Failed to update contractor paid status')
      }
      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    }
  }

  return (
    <>
      <style>{`
        html, body, #root {
          width: 100%;
          height: 100%;
          margin: 0;
        }
        body { overflow: hidden; }
      `}</style>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100vh',
          overflow: 'hidden',
          padding: 16,
          fontFamily: 'sans-serif',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          gap: 12,
          backgroundColor: '#2f343c',
        }}
      >
      <div
        style={{
          height: 52,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          color: '#f3f4f6',
          flex: '0 0 auto',
          gap: 10,
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          aria-hidden="true"
          style={{ flex: '0 0 auto' }}
        >
          <polygon
            points="16,2 24.6,6.4 29.5,15 27.2,24.3 19.5,29.8 10.5,29.8 2.8,24.3 0.5,15 5.4,6.4"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="16" r="4.2" fill="#e5e7eb" />
        </svg>
        <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: 0.6 }}>SOLTRAE BUSINEZZ</span>
      </div>

      <div ref={topSectionRef} style={{ height: topSectionHeight, display: 'flex', gap: 12, minHeight: 0 }}>
        <div
          style={{
            width: leftPanelWidth,
            minWidth: 300,
            flex: '0 0 auto',
            border: '1px solid #5b6270',
            borderRadius: 12,
            padding: 12,
            overflowY: 'auto',
            minHeight: 0,
            backgroundColor: '#3a414b',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            color: '#f3f4f6',
          }}
        >
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                aria-label="From date"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                aria-label="To date"
              />
              <button
                type="button"
                onClick={() => setFilterRows((prev) => [...prev, { field: 'contractor', value: '' }])}
              >
                Add filter
              </button>
              <button type="button" onClick={loadData}>
                Apply
              </button>
              <button type="button" onClick={createPayrollBatch} disabled={creatingPayroll}>
                {creatingPayroll ? 'Creating...' : 'Create Payroll Batch'}
              </button>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={missingRateOnly}
                  onChange={(e) => setMissingRateOnly(e.target.checked)}
                />
                Missing rate only
              </label>
            </div>

            {filterRows.map((row, index) => (
              <div key={index} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select
                  value={row.field}
                  onChange={(e) =>
                    setFilterRows((prev) =>
                      prev.map((r, i) => (i === index ? { ...r, field: e.target.value } : r))
                    )
                  }
                >
                  {FILTER_FIELDS.map((field) => (
                    <option key={field.label} value={field.param}>
                      {field.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Search value"
                  value={row.value}
                  onChange={(e) =>
                    setFilterRows((prev) =>
                      prev.map((r, i) => (i === index ? { ...r, value: e.target.value } : r))
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') loadData()
                  }}
                />
                <button
                  type="button"
                  onClick={() =>
                    setFilterRows((prev) => {
                      if (prev.length <= 1) return [{ field: 'contractor', value: '' }]
                      return prev.filter((_, i) => i !== index)
                    })
                  }
                  aria-label="Delete filter"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <div
          onMouseDown={startVerticalResize}
          style={{
            width: 6,
            cursor: 'col-resize',
            backgroundColor: '#6a7281',
            borderRadius: 6,
            alignSelf: 'stretch',
            flex: '0 0 auto',
          }}
        />

        <div
          style={{
            flex: 1,
            border: '1px solid #5b6270',
            borderRadius: 12,
            padding: 12,
            overflowY: 'auto',
            minHeight: 0,
            backgroundColor: '#3a414b',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            color: '#f3f4f6',
          }}
        >
          {loading && <p>Loading...</p>}
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {payrollMessage && <p style={{ color: 'green' }}>{payrollMessage}</p>}

          {summary && (
            <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span>Orders</span>
                <span style={{ fontSize: 20, fontWeight: 600 }}>{displayedMetrics.totalOrders}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span>Paid In</span>
                <span style={{ fontSize: 20, fontWeight: 600 }}>{formatMoney(displayedMetrics.paidIn)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span>Paid Out</span>
                <span style={{ fontSize: 20, fontWeight: 600 }}>{formatMoney(displayedMetrics.paidOut)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span>Margin</span>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: Number(displayedMetrics.margin ?? 0) >= 0 ? '#1f8a3b' : '#b42318',
                  }}
                >
                  {formatMoney(displayedMetrics.margin)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span>Paid Orders</span>
                <span style={{ fontSize: 20, fontWeight: 600 }}>{displayedMetrics.paidOrders}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span>Contractor Unpaid</span>
                <span style={{ fontSize: 20, fontWeight: 600 }}>{displayedMetrics.contractorUnpaid}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span>Unpaid (Needs Action)</span>
                <span style={{ fontSize: 20, fontWeight: 600 }}>{displayedMetrics.unpaidNeedsAction}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span>Missing Contractor Pay</span>
                <span style={{ fontSize: 20, fontWeight: 600 }}>{displayedMetrics.missingContractorPay}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span>Missing Client Pay</span>
                <span style={{ fontSize: 20, fontWeight: 600 }}>{displayedMetrics.missingClientPay}</span>
              </div>
            </div>
          )}

          {payrollResult && (
            <div>
              {payrollResult.total_orders === 0 ? (
                <div>No payable orders.</div>
              ) : (
                <div>
                  <div style={{ marginBottom: 8 }}>
                    Payroll Batches Created: {payrollResult.batches_created ?? 0}
                  </div>
                  {Array.isArray(payrollResult.batch_ids) && payrollResult.batch_ids.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <button type="button" onClick={confirmPayroll} disabled={confirmingPayroll}>
                        {confirmingPayroll ? 'Confirming...' : 'Confirm Payroll'}
                      </button>
                    </div>
                  )}
                  {(payrollResult.contractors ?? []).map((c) => (
                    <div key={c.contractor_id}>
                      {c.contractor_name}: {c.order_count} orders, {formatMoney(c.total_pay)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        onMouseDown={startHorizontalResize}
        style={{
          height: 6,
          cursor: 'row-resize',
          backgroundColor: '#6a7281',
          borderRadius: 6,
          flex: '0 0 auto',
        }}
      />

      <div
        style={{
          flex: 1,
          border: '1px solid #5b6270',
          borderRadius: 12,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          backgroundColor: '#3a414b',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          color: '#f3f4f6',
        }}
      >
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setFocusOnSelected(true)} disabled={selectedOrderIds.length === 0}>
            Focus on selected
          </button>
          <button type="button" onClick={() => setSelectedOrderIds([])}>
            Clear selection
          </button>
          <button type="button" onClick={() => setFocusOnSelected(false)}>
            Reset focus
          </button>
        </div>

        <div style={{ overflowX: 'auto', overflowY: 'auto', minHeight: 0, flex: 1 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
            <thead>
              <tr style={{ backgroundColor: '#323843' }}>
                <th style={{ border: '1px solid #5b6270', padding: '5px 10px', fontWeight: 600 }} />
                <th style={{ border: '1px solid #5b6270', padding: '5px 10px', fontWeight: 600 }}>Contractor</th>
                <th style={{ border: '1px solid #5b6270', padding: '5px 10px', fontWeight: 600 }}>Client</th>
                <th style={{ border: '1px solid #5b6270', padding: '5px 10px', fontWeight: 600 }}>County</th>
                <th style={{ border: '1px solid #5b6270', padding: '5px 10px', fontWeight: 600 }}>City</th>
                <th style={{ border: '1px solid #5b6270', padding: '5px 10px', fontWeight: 600 }}>Address</th>
                <th style={{ border: '1px solid #5b6270', padding: '5px 10px', fontWeight: 600 }}>Zip</th>
                <th style={{ border: '1px solid #5b6270', padding: '5px 10px', fontWeight: 600 }}>Client Pay</th>
                <th style={{ border: '1px solid #5b6270', padding: '5px 10px', fontWeight: 600 }}>Contractor Pay</th>
                <th style={{ border: '1px solid #5b6270', padding: '5px 10px', fontWeight: 600 }}>Submitted To Client</th>
                <th style={{ border: '1px solid #5b6270', padding: '5px 10px', fontWeight: 600 }}>Client Paid</th>
                <th style={{ border: '1px solid #5b6270', padding: '5px 10px', fontWeight: 600 }}>Contractor Paid</th>
              </tr>
            </thead>
            <tbody>
              {displayedOrders.map((order, index) => {
                const bothPaid = order.paid_in_status === 'paid' && order.paid_out_status === 'paid'
                const needsAction = !bothPaid
                const isSelected = selectedIdSet.has(order.id)
                return (
                <tr
                  key={order.id}
                  style={{
                    backgroundColor:
                      isSelected
                        ? 'rgba(80,160,255,0.22)'
                        : bothPaid
                          ? '#e9ffe9'
                          : needsAction
                            ? '#ffe9e9'
                            : 'transparent',
                    color: isSelected || bothPaid || needsAction ? '#111' : undefined,
                  }}
                >
                  <td style={{ border: '1px solid #5b6270', padding: '5px 10px' }}>
                    <input
                      type="checkbox"
                      checked={selectedIdSet.has(order.id)}
                      onChange={(e) =>
                        handleRowCheckbox(index, order.id, e.target.checked, e.nativeEvent.shiftKey)
                      }
                    />
                  </td>
                  <td style={{ border: '1px solid #5b6270', padding: '5px 10px' }}>
                    {order.contractor_name_raw ?? ''}
                  </td>
                  <td style={{ border: '1px solid #5b6270', padding: '5px 10px' }}>
                    {order.client_name_raw ?? ''}
                  </td>
                  <td style={{ border: '1px solid #5b6270', padding: '5px 10px' }}>{order.county ?? ''}</td>
                  <td style={{ border: '1px solid #5b6270', padding: '5px 10px' }}>{order.city ?? ''}</td>
                  <td style={{ border: '1px solid #5b6270', padding: '5px 10px' }}>{order.address ?? ''}</td>
                  <td style={{ border: '1px solid #5b6270', padding: '5px 10px' }}>{order.zip ?? ''}</td>
                  <td style={{ border: '1px solid #5b6270', padding: '5px 10px' }}>
                    {formatMoney(order.client_pay_amount)}
                  </td>
                  <td style={{ border: '1px solid #5b6270', padding: '5px 10px' }}>
                    {formatMoney(order.contractor_pay_amount)}
                  </td>
                  <td style={{ border: '1px solid #5b6270', padding: '5px 10px' }}>
                    {formatDate(order.submitted_to_client_at)}
                  </td>
                  <td style={{ border: '1px solid #5b6270', padding: '5px 10px' }}>
                    <button
                      type="button"
                      onClick={() => togglePaidInStatus(order.id, order.paid_in_status !== 'paid')}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: order.paid_in_status === 'paid' ? '#1f8a3b' : '#b42318',
                        padding: 0,
                      }}
                    >
                      {order.paid_in_status === 'paid' ? '✅ Paid' : '❌ Unpaid'}
                    </button>
                  </td>
                  <td style={{ border: '1px solid #5b6270', padding: '5px 10px' }}>
                    <button
                      type="button"
                      onClick={() => togglePaidOutStatus(order.id, order.paid_out_status !== 'paid')}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: order.paid_out_status === 'paid' ? '#1f8a3b' : '#b42318',
                        padding: 0,
                      }}
                    >
                      {order.paid_out_status === 'paid' ? '✅ Paid' : '❌ Unpaid'}
                    </button>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </>
  )
}

export default App
