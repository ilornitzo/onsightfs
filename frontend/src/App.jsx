import { useEffect, useMemo, useRef, useState } from 'react'

function App() {
  const ZONES_STORAGE_KEY = 'onsight_zones_v1'
  const LAYOUT_STORAGE_KEY = 'onsight_layout_v1'
  const ORDERS_PAGE_LIMIT = 100
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
  const TABS = ['ACCOUNTING', 'ZONES', 'CONTRACTORS', 'CLIENTS', 'COMPANY']
  const makeZoneRow = () => ({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    zip: '',
    county: '',
    city: '',
    clientPrice: '',
    contractorPrice: '',
  })
  const loadZonesFromStorage = () => {
    if (typeof window === 'undefined') return []
    try {
      const raw = window.localStorage.getItem(ZONES_STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed.map((row) => ({
        id: row?.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        zip: row?.zip ?? '',
        county: row?.county ?? '',
        city: row?.city ?? '',
        clientPrice: row?.clientPrice ?? '',
        contractorPrice: row?.contractorPrice ?? '',
      }))
    } catch {
      return []
    }
  }
  const getDefaultLayout = () => ({
    topSectionHeight:
      typeof window !== 'undefined' ? Math.max(200, Math.round(window.innerHeight * 0.32)) : 280,
    leftPanelWidth:
      typeof window !== 'undefined' ? Math.max(300, Math.round(window.innerWidth * 0.5)) : 480,
  })
  const loadLayoutFromStorage = () => {
    const defaults = getDefaultLayout()
    if (typeof window === 'undefined') return defaults
    try {
      const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY)
      if (!raw) return defaults
      const parsed = JSON.parse(raw)
      const topSectionHeight = Number(parsed?.topSectionHeight)
      const leftPanelWidth = Number(parsed?.leftPanelWidth)
      return {
        topSectionHeight: Number.isFinite(topSectionHeight)
          ? Math.max(200, Math.round(topSectionHeight))
          : defaults.topSectionHeight,
        leftPanelWidth: Number.isFinite(leftPanelWidth)
          ? Math.max(300, Math.round(leftPanelWidth))
          : defaults.leftPanelWidth,
      }
    } catch {
      return defaults
    }
  }

  const [orders, setOrders] = useState([])
  const [ordersTotalCount, setOrdersTotalCount] = useState(0)
  const [ordersOffset, setOrdersOffset] = useState(0)
  const [hasMoreOrders, setHasMoreOrders] = useState(true)
  const [loadingMoreOrders, setLoadingMoreOrders] = useState(false)
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
  const [importMessage, setImportMessage] = useState('')
  const [importing, setImporting] = useState(false)
  const [bulkUpdateMessage, setBulkUpdateMessage] = useState('')
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [editingCell, setEditingCell] = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const [editingError, setEditingError] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [showInvoicePreview, setShowInvoicePreview] = useState(false)
  const [activeTab, setActiveTab] = useState('ACCOUNTING')
  const [zones, setZones] = useState(loadZonesFromStorage)
  const [zonesSortConfig, setZonesSortConfig] = useState({ key: null, direction: 'asc' })
  const [zonesEditingCell, setZonesEditingCell] = useState(null)
  const [zonesEditingValue, setZonesEditingValue] = useState('')
  const [contractors, setContractors] = useState([])
  const [contractorsLoading, setContractorsLoading] = useState(false)
  const [contractorsError, setContractorsError] = useState('')
  const [contractorSearch, setContractorSearch] = useState('')
  const [selectedContractorId, setSelectedContractorId] = useState(null)
  const [showNewContractorForm, setShowNewContractorForm] = useState(false)
  const [savingContractor, setSavingContractor] = useState(false)
  const [parsingOnboarding, setParsingOnboarding] = useState(false)
  const [onboardingParseMessage, setOnboardingParseMessage] = useState('')
  const [showOnboardingParseDetails, setShowOnboardingParseDetails] = useState(false)
  const [parsedOnboardingData, setParsedOnboardingData] = useState(null)
  const [newContractorError, setNewContractorError] = useState('')
  const [newContractorForm, setNewContractorForm] = useState({
    name: '',
    business_name: '',
    email: '',
    phone: '',
    address: '',
    dob: '',
    ein_or_ssn: '',
    aspen_grove_abc_number: '',
    bank_name: '',
    bank_routing: '',
    bank_account: '',
    notes: '',
    active: true,
  })
  const [contractorProfileLoading, setContractorProfileLoading] = useState(false)
  const [contractorProfileSaving, setContractorProfileSaving] = useState(false)
  const [contractorProfileMessage, setContractorProfileMessage] = useState('')
  const [contractorProfileError, setContractorProfileError] = useState('')
  const [contractorDocuments, setContractorDocuments] = useState([])
  const [contractorDocumentsLoading, setContractorDocumentsLoading] = useState(false)
  const [contractorDocumentsMessage, setContractorDocumentsMessage] = useState('')
  const [contractorDocumentsError, setContractorDocumentsError] = useState('')
  const [uploadingDocumentType, setUploadingDocumentType] = useState('')
  const [contractorProfileForm, setContractorProfileForm] = useState({
    full_legal_name: '',
    dob: '',
    ssn_or_ein: '',
    address: '',
    phone: '',
    email: '',
    aspen_grove_abc_number: '',
    bank_name: '',
    bank_account_type: 'checking',
    bank_routing_number: '',
    bank_account_number: '',
    counties_text: '',
    expected_pay_per_inspection: '',
    min_daily_volume: '',
    ic_acknowledged: false,
    signature_name: '',
    signature_date: '',
  })
  const [selectedOrderIds, setSelectedOrderIds] = useState([])
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null)
  const [focusOnSelected, setFocusOnSelected] = useState(false)
  const [topSectionHeight, setTopSectionHeight] = useState(() => loadLayoutFromStorage().topSectionHeight)
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => loadLayoutFromStorage().leftPanelWidth)
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const gridActionButtonStyle = { padding: '4px 8px', fontSize: 12, lineHeight: 1.2 }
  const containerRef = useRef(null)
  const topSectionRef = useRef(null)
  const ordersGridRef = useRef(null)
  const focusReloadInitializedRef = useRef(false)
  const importInputRef = useRef(null)
  const onboardingInputRef = useRef(null)
  const photoIdInputRef = useRef(null)
  const w9InputRef = useRef(null)

  const buildFilters = () => {
    const rows = filterRows
    const from = fromDate
    const to = toDate
    const params = {}
    const qParts = []

    for (const row of rows) {
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
    if (from) {
      params.submitted_from = from
    }
    if (to) {
      params.submitted_to = to
    }

    return params
  }

  const buildFilterParams = (overrides = null) => {
    const rows = overrides?.filterRows ?? filterRows
    const from = overrides?.fromDate ?? fromDate
    const to = overrides?.toDate ?? toDate
    const params = new URLSearchParams()
    const filters = (() => {
      const built = {}
      const qParts = []
      for (const row of rows) {
        const value = row.value.trim()
        if (!value) continue
        const selected = FILTER_FIELDS.find((f) => f.param === row.field || f.label === row.field)
        const param = selected?.param ?? row.field
        if (param === 'q') {
          qParts.push(value)
        } else {
          built[param] = value
        }
      }
      if (qParts.length > 0) {
        built.q = qParts.join(' ')
      }
      if (from) {
        built.submitted_from = from
      }
      if (to) {
        built.submitted_to = to
      }
      return built
    })()
    Object.entries(filters).forEach(([key, value]) => {
      params.set(key, String(value))
    })
    return params
  }

  const loadData = async (overrides = null) => {
    setLoading(true)
    setLoadingMoreOrders(true)
    setError('')
    setOrders([])
    setOrdersOffset(0)
    setOrdersTotalCount(0)
    setHasMoreOrders(true)
    try {
      const params = buildFilterParams(overrides)
      const ordersParams = new URLSearchParams(params)
      ordersParams.set('limit', String(ORDERS_PAGE_LIMIT))
      ordersParams.set('offset', '0')
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
      const rows = Array.isArray(ordersJson.results) ? ordersJson.results : []
      const total = Number(ordersJson.count ?? rows.length)
      const nextOffset = rows.length
      setOrders(rows)
      setOrdersTotalCount(total)
      setOrdersOffset(nextOffset)
      setHasMoreOrders(rows.length > 0 && nextOffset < total)
      setSummary(summaryJson)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
      setLoadingMoreOrders(false)
    }
  }

  const loadMoreOrders = async () => {
    if (loadingMoreOrders || loading || !hasMoreOrders) return

    setLoadingMoreOrders(true)
    setError('')
    try {
      const params = buildFilterParams()
      const ordersParams = new URLSearchParams(params)
      ordersParams.set('limit', String(ORDERS_PAGE_LIMIT))
      ordersParams.set('offset', String(ordersOffset))

      const response = await fetch(`http://localhost:5090/api/orders?${ordersParams.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to load more orders')
      }

      const json = await response.json()
      const rows = Array.isArray(json.results) ? json.results : []
      const total = Number(json.count ?? ordersTotalCount)
      const nextOffset = ordersOffset + rows.length

      if (rows.length > 0) {
        setOrders((prev) => [...prev, ...rows])
      }
      setOrdersTotalCount(total)
      setOrdersOffset(nextOffset)
      if (rows.length === 0 || nextOffset >= total) {
        setHasMoreOrders(false)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoadingMoreOrders(false)
    }
  }

  const handleOrdersGridScroll = (event) => {
    const container = event.currentTarget
    const remaining = container.scrollHeight - container.scrollTop - container.clientHeight
    if (remaining <= 200) {
      loadMoreOrders()
    }
  }

  const handleRefresh = async () => {
    const defaultFilters = [{ field: 'contractor', value: '' }]
    setFilterRows(defaultFilters)
    setFromDate('')
    setToDate('')
    setSelectedOrderIds([])
    setLastSelectedIndex(null)
    setFocusOnSelected(false)
    setMissingRateOnly(false)
    await loadData({ filterRows: defaultFilters, fromDate: '', toDate: '' })
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!focusReloadInitializedRef.current) {
      focusReloadInitializedRef.current = true
      return
    }
    if (activeTab === 'ACCOUNTING') {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusOnSelected, activeTab])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(ZONES_STORAGE_KEY, JSON.stringify(zones))
  }, [zones])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({
        topSectionHeight,
        leftPanelWidth,
      })
    )
  }, [topSectionHeight, leftPanelWidth])

  const loadContractors = async (preferredId = null) => {
    setContractorsLoading(true)
    setContractorsError('')
    try {
      const response = await fetch('http://localhost:5090/api/contractors')
      if (!response.ok) {
        throw new Error('Failed to load contractors')
      }
      const data = await response.json()
      const list = Array.isArray(data) ? data : []
      setContractors(list)
      if (preferredId && list.some((c) => c.id === preferredId)) {
        setSelectedContractorId(preferredId)
      } else if (list.some((c) => c.id === selectedContractorId)) {
        // keep current selection
      } else if (list.length > 0) {
        setSelectedContractorId(list[0].id)
      } else {
        setSelectedContractorId(null)
      }
    } catch (e) {
      setContractorsError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setContractorsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'CONTRACTORS') {
      loadContractors()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

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

  const filteredContractors = useMemo(() => {
    const needle = contractorSearch.trim().toLowerCase()
    if (!needle) return contractors
    return contractors.filter((contractor) => String(contractor.name ?? '').toLowerCase().includes(needle))
  }, [contractors, contractorSearch])

  const selectedContractor = useMemo(
    () => contractors.find((contractor) => contractor.id === selectedContractorId) ?? null,
    [contractors, selectedContractorId]
  )

  const applyProfileToForm = (contractor, profile) => {
    const base = {
      full_legal_name: contractor?.name || '',
      dob: profile?.dob || '',
      ssn_or_ein: profile?.ssn_or_ein || '',
      address: profile?.address || '',
      phone: contractor?.phone || '',
      email: contractor?.email || '',
      aspen_grove_abc_number: profile?.aspen_grove_abc_number || '',
      bank_name: profile?.bank_name || '',
      bank_account_type: (profile?.bank_account_type || 'checking').toLowerCase() === 'savings' ? 'savings' : 'checking',
      bank_routing_number: profile?.bank_routing_number || '',
      bank_account_number: profile?.bank_account_number || '',
      counties_text: Array.isArray(profile?.counties) ? profile.counties.join(', ') : '',
      expected_pay_per_inspection:
        profile?.expected_pay_per_inspection !== null && profile?.expected_pay_per_inspection !== undefined
          ? String(profile.expected_pay_per_inspection)
          : '',
      min_daily_volume:
        profile?.min_daily_volume !== null && profile?.min_daily_volume !== undefined
          ? String(profile.min_daily_volume)
          : '',
      ic_acknowledged: Boolean(profile?.ic_acknowledged),
      signature_name: profile?.signature_name || '',
      signature_date: profile?.signature_date || '',
    }

    const shouldApplyParsed =
      parsedOnboardingData &&
      (!parsedOnboardingData.targetContractorId || parsedOnboardingData.targetContractorId === contractor?.id)

    if (!shouldApplyParsed) {
      setContractorProfileForm(base)
      return
    }

    const parsed = parsedOnboardingData.data || {}
    setContractorProfileForm({
      ...base,
      full_legal_name: base.full_legal_name || parsed.name || parsed.business_name || '',
      phone: base.phone || parsed.phone || '',
      email: base.email || parsed.email || '',
      dob: base.dob || parsed.dob || '',
      ssn_or_ein: base.ssn_or_ein || parsed.ssn_or_ein || parsed.ein_or_ssn || '',
      address: base.address || parsed.address || '',
      aspen_grove_abc_number: base.aspen_grove_abc_number || parsed.aspen_grove_abc_number || '',
      bank_name: base.bank_name || parsed.bank_name || '',
      bank_routing_number: base.bank_routing_number || parsed.bank_routing || '',
      bank_account_number: base.bank_account_number || parsed.bank_account || '',
      signature_name: base.signature_name || parsed.name || parsed.business_name || '',
    })
  }

  const loadContractorProfile = async (contractorId) => {
    if (!contractorId) return
    const contractor = contractors.find((c) => c.id === contractorId) || null
    setContractorProfileLoading(true)
    setContractorProfileError('')
    setContractorProfileMessage('')
    try {
      const response = await fetch(`http://localhost:5090/api/contractors/${contractorId}/profile`)
      if (!response.ok) {
        throw new Error('Failed to load contractor profile')
      }
      const profile = await response.json()
      applyProfileToForm(contractor, profile)
    } catch (e) {
      setContractorProfileError(e instanceof Error ? e.message : 'Failed to load contractor profile')
    } finally {
      setContractorProfileLoading(false)
    }
  }

  const loadContractorDocuments = async (contractorId) => {
    if (!contractorId) {
      setContractorDocuments([])
      return
    }
    setContractorDocumentsLoading(true)
    setContractorDocumentsMessage('')
    setContractorDocumentsError('')
    try {
      const response = await fetch(`http://localhost:5090/api/contractors/${contractorId}/documents`)
      if (!response.ok) {
        throw new Error('Failed to load contractor documents')
      }
      const data = await response.json()
      setContractorDocuments(Array.isArray(data) ? data : [])
    } catch (e) {
      setContractorDocumentsError(e instanceof Error ? e.message : 'Failed to load contractor documents')
    } finally {
      setContractorDocumentsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'CONTRACTORS' && selectedContractorId) {
      loadContractorProfile(selectedContractorId)
      loadContractorDocuments(selectedContractorId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedContractorId, contractors])

  const uploadContractorDocument = async (contractorId, documentType, file) => {
    if (!contractorId || !file) return
    setUploadingDocumentType(documentType)
    setContractorDocumentsError('')
    setContractorDocumentsMessage('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('document_type', documentType)
      const response = await fetch(`http://localhost:5090/api/contractors/${contractorId}/documents`, {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        let message = 'Failed to upload document'
        try {
          const data = await response.json()
          message = data?.detail || data?.error?.message || message
        } catch {
          // ignore non-json
        }
        throw new Error(message)
      }
      const saved = await response.json()
      setContractorDocumentsMessage(`Uploaded ${saved?.file_name || file.name}`)
      await loadContractorDocuments(contractorId)
    } catch (e) {
      setContractorDocumentsError(e instanceof Error ? e.message : 'Failed to upload document')
    } finally {
      setUploadingDocumentType('')
    }
  }

  const handlePhotoIdUpload = () => {
    photoIdInputRef.current?.click()
  }

  const handleW9Upload = () => {
    w9InputRef.current?.click()
  }

  const handleDocumentFileChange = async (event, documentType) => {
    const file = event.target.files?.[0]
    if (!file || !selectedContractorId) {
      event.target.value = ''
      return
    }
    await uploadContractorDocument(selectedContractorId, documentType, file)
    event.target.value = ''
  }

  const selectedIdSet = useMemo(() => new Set(selectedOrderIds), [selectedOrderIds])

  const sortedZones = useMemo(() => {
    const rows = [...zones]
    if (!zonesSortConfig.key) return rows
    const numericKeys = new Set(['clientPrice', 'contractorPrice'])
    rows.sort((a, b) => {
      const key = zonesSortConfig.key
      if (numericKeys.has(key)) {
        const av = Number.parseFloat(a[key] ?? '')
        const bv = Number.parseFloat(b[key] ?? '')
        const aNum = Number.isFinite(av) ? av : Number.NEGATIVE_INFINITY
        const bNum = Number.isFinite(bv) ? bv : Number.NEGATIVE_INFINITY
        if (aNum < bNum) return zonesSortConfig.direction === 'asc' ? -1 : 1
        if (aNum > bNum) return zonesSortConfig.direction === 'asc' ? 1 : -1
        return 0
      }
      const aVal = String(a[key] ?? '').toLowerCase()
      const bVal = String(b[key] ?? '').toLowerCase()
      if (aVal < bVal) return zonesSortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return zonesSortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    return rows
  }, [zones, zonesSortConfig])

  const sortZonesBy = (key) => {
    setZonesSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  const zonesSortIndicator = (key) => {
    if (zonesSortConfig.key !== key) return ''
    return zonesSortConfig.direction === 'asc' ? ' ▲' : ' ▼'
  }

  const startZoneEdit = (rowId, key, currentValue) => {
    setZonesEditingCell({ rowId, key })
    setZonesEditingValue(String(currentValue ?? ''))
  }

  const cancelZoneEdit = () => {
    setZonesEditingCell(null)
    setZonesEditingValue('')
  }

  const saveZoneEdit = () => {
    if (!zonesEditingCell) return
    setZones((prev) => {
      const next = prev.map((row) =>
        row.id === zonesEditingCell.rowId
          ? {
              ...row,
              [zonesEditingCell.key]: zonesEditingValue,
            }
          : row
      )
      return next
    })
    setZonesEditingCell(null)
    setZonesEditingValue('')
  }

  const handleZoneCellKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      saveZoneEdit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancelZoneEdit()
    }
  }

  const addZoneRow = () => {
    setZones((prev) => {
      const next = [...prev, makeZoneRow()]
      return next
    })
  }

  const deleteZoneRow = (rowId) => {
    setZones((prev) => {
      const next = prev.filter((row) => row.id !== rowId)
      return next
    })
    if (zonesEditingCell?.rowId === rowId) {
      cancelZoneEdit()
    }
  }

  const normalizeZoneText = (value) => String(value ?? '').trim().toLowerCase()

  const toCents = (value) => {
    const parsed = Number.parseFloat(String(value ?? '').trim())
    if (!Number.isFinite(parsed)) return null
    return Math.round(parsed * 100)
  }

  const centsToAmountString = (value) => {
    if (value === null || value === undefined) return null
    return (value / 100).toFixed(2)
  }

  const getExpectedZonePricing = (order) => {
    const city = normalizeZoneText(order.city)
    const county = normalizeZoneText(order.county)
    const zip = normalizeZoneText(order.zip)

    const byCity = city
      ? zones.find((zone) => normalizeZoneText(zone.city) && normalizeZoneText(zone.city) === city)
      : null
    if (byCity) return byCity

    const byCounty = county
      ? zones.find((zone) => normalizeZoneText(zone.county) && normalizeZoneText(zone.county) === county)
      : null
    if (byCounty) return byCounty

    const byZip = zip
      ? zones.find((zone) => normalizeZoneText(zone.zip) && normalizeZoneText(zone.zip) === zip)
      : null
    return byZip || null
  }

  const getPriceMismatchFlags = (order) => {
    const expected = getExpectedZonePricing(order)
    if (!expected) {
      return {
        clientPriceMismatch: false,
        contractorPriceMismatch: false,
      }
    }

    const expectedClient = toCents(expected.clientPrice)
    const expectedContractor = toCents(expected.contractorPrice)
    const actualClient = toCents(order.client_pay_amount)
    const actualContractor = toCents(order.contractor_pay_amount)

    return {
      clientPriceMismatch: expectedClient !== null && actualClient !== expectedClient,
      contractorPriceMismatch: expectedContractor !== null && actualContractor !== expectedContractor,
    }
  }

  const autoAdjustPayFromZones = async (target) => {
    const rows = sortedDisplayedOrders
    let skipped = 0
    const updates = []

    for (const order of rows) {
      const expected = getExpectedZonePricing(order)
      if (!expected) {
        skipped += 1
        continue
      }

      if (target === 'client') {
        const expectedCents = toCents(expected.clientPrice)
        if (expectedCents === null) {
          skipped += 1
          continue
        }
        const actualCents = toCents(order.client_pay_amount)
        if (actualCents !== expectedCents) {
          updates.push({
            orderId: order.id,
            payload: { client_pay_amount: centsToAmountString(expectedCents) },
          })
        } else {
          skipped += 1
        }
      } else {
        const expectedCents = toCents(expected.contractorPrice)
        if (expectedCents === null) {
          skipped += 1
          continue
        }
        const actualCents = toCents(order.contractor_pay_amount)
        if (actualCents !== expectedCents) {
          updates.push({
            orderId: order.id,
            payload: { contractor_pay_amount: centsToAmountString(expectedCents) },
          })
        } else {
          skipped += 1
        }
      }
    }

    const actionLabel = target === 'client' ? 'Auto-adjust Client' : 'Auto-adjust Contractor'
    if (updates.length === 0) {
      setBulkUpdateMessage(`${actionLabel}: updated=0 skipped=${skipped} failed=0`)
      return
    }

    setBulkUpdating(true)
    setBulkUpdateMessage('')
    setError('')
    try {
      const results = await Promise.allSettled(
        updates.map(async (item) => {
          const res = await fetch(`http://localhost:5090/api/orders/${item.orderId}/amounts`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload),
          })
          if (!res.ok) {
            let message = 'Failed to update order amount'
            try {
              const data = await res.json()
              message = data?.detail || data?.error?.message || message
            } catch {
              // ignore non-json response
            }
            throw new Error(message)
          }
        })
      )

      const failed = results.filter((r) => r.status === 'rejected').length
      const updated = results.length - failed
      setBulkUpdateMessage(`${actionLabel}: updated=${updated} skipped=${skipped} failed=${failed}`)
      if (updated > 0) {
        await loadData()
      }
    } catch (e) {
      setBulkUpdateMessage(e instanceof Error ? e.message : 'Auto-adjust failed')
    } finally {
      setBulkUpdating(false)
    }
  }

  const displayedOrders = useMemo(() => {
    if (!focusOnSelected) return visibleOrders
    return visibleOrders.filter((order) => selectedIdSet.has(order.id))
  }, [visibleOrders, focusOnSelected, selectedIdSet])

  const sortedDisplayedOrders = useMemo(() => {
    const rows = [...displayedOrders]
    if (!sortConfig.key) return rows

    const getSortValue = (order, key) => {
      if (key === 'client_pay_amount' || key === 'contractor_pay_amount') {
        const value = Number(order[key] ?? 0)
        return Number.isFinite(value) ? value : 0
      }
      if (key === 'submitted_to_client_at') {
        const ts = new Date(order.submitted_to_client_at ?? '').getTime()
        return Number.isNaN(ts) ? 0 : ts
      }
      return String(order[key] ?? '').toLowerCase()
    }

    rows.sort((a, b) => {
      const aValue = getSortValue(a, sortConfig.key)
      const bValue = getSortValue(b, sortConfig.key)
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    return rows
  }, [displayedOrders, sortConfig])

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return ''
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼'
  }

  const displayedOrderIds = useMemo(() => sortedDisplayedOrders.map((order) => order.id), [sortedDisplayedOrders])
  const selectedDisplayedCount = useMemo(
    () => displayedOrderIds.filter((id) => selectedIdSet.has(id)).length,
    [displayedOrderIds, selectedIdSet]
  )
  const allDisplayedSelected = displayedOrderIds.length > 0 && selectedDisplayedCount === displayedOrderIds.length
  const someDisplayedSelected = selectedDisplayedCount > 0 && !allDisplayedSelected

  const toggleSelectAllDisplayed = () => {
    setSelectedOrderIds((prev) => {
      const prevSet = new Set(prev)
      if (displayedOrderIds.some((id) => !prevSet.has(id))) {
        displayedOrderIds.forEach((id) => prevSet.add(id))
      } else {
        displayedOrderIds.forEach((id) => prevSet.delete(id))
      }
      return Array.from(prevSet)
    })
  }

  const invoicePreview = useMemo(() => {
    const clients = Array.from(
      new Set(
        displayedOrders
          .map((order) => String(order.client_name_raw ?? '').trim())
          .filter((name) => name.length > 0)
      )
    )
    const validDates = displayedOrders
      .map((order) => new Date(order.submitted_to_client_at))
      .filter((dt) => !Number.isNaN(dt.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())

    return {
      clients,
      singleClient: clients.length === 1 ? clients[0] : '',
      hasMultipleClients: clients.length > 1,
      minDate: validDates.length > 0 ? validDates[0] : null,
      maxDate: validDates.length > 0 ? validDates[validDates.length - 1] : null,
      orderCount: displayedOrders.length,
      totalAmount: displayedOrders.reduce((sum, order) => sum + Number(order.client_pay_amount ?? 0), 0),
    }
  }, [displayedOrders])

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
      const rangeIds = sortedDisplayedOrders.slice(start, end + 1).map((order) => order.id)
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

  const csvEscape = (value) => {
    const text = value === null || value === undefined ? '' : String(value)
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }

  const downloadCsv = (filename, headers, rows) => {
    const content = [headers.join(','), ...rows.map((row) => row.map((cell) => csvEscape(cell)).join(','))].join('\n')
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const exportDisplayedOrdersCsv = () => {
    const headers = [
      'Contractor',
      'Client',
      'County',
      'City',
      'Address',
      'Zip',
      'Client Pay',
      'Contractor Pay',
      'SubmittedToClient',
      'Client Paid',
      'Contractor Paid',
    ]
    const rows = displayedOrders.map((order) => [
      order.contractor_name_raw ?? '',
      order.client_name_raw ?? '',
      order.county ?? '',
      order.city ?? '',
      order.address ?? '',
      order.zip ?? '',
      Number(order.client_pay_amount ?? 0).toFixed(2),
      Number(order.contractor_pay_amount ?? 0).toFixed(2),
      formatDate(order.submitted_to_client_at),
      order.paid_in_status === 'paid' ? 'Paid' : 'Unpaid',
      order.paid_out_status === 'paid' ? 'Paid' : 'Unpaid',
    ])
    downloadCsv('orders_export.csv', headers, rows)
  }

  const exportInvoiceCsv = () => {
    if (invoicePreview.hasMultipleClients || !invoicePreview.singleClient) return
    const headers = ['InvoiceDate', 'Client', 'SubmittedToClient', 'Address', 'City', 'County', 'State', 'Zip', 'Amount']
    const invoiceDate = new Date().toISOString().slice(0, 10)
    const rows = displayedOrders.map((order) => [
      invoiceDate,
      invoicePreview.singleClient,
      formatDate(order.submitted_to_client_at),
      order.address ?? '',
      order.city ?? '',
      order.county ?? '',
      order.state ?? '',
      order.zip ?? '',
      Number(order.client_pay_amount ?? 0).toFixed(2),
    ])
    downloadCsv('invoice_export.csv', headers, rows)
  }

  const handleImportButtonClick = () => {
    importInputRef.current?.click()
  }

  const handleImportFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportMessage('')
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('http://localhost:5090/api/import/orders', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        throw new Error('Import failed')
      }
      const result = await response.json()
      const errorCount = Number(result.error_count ?? 0)
      if (errorCount > 0) {
        const firstMessage = result.errors?.[0]?.message ?? 'Unknown error'
        setImportMessage(`Import had errors (first: ${firstMessage})`)
      } else {
        setImportMessage(
          `Imported: inserted=${result.inserted_count ?? 0}, duplicates=${result.duplicate_count ?? 0}, errors=${errorCount}`
        )
      }
      await loadData()
    } catch (e) {
      setImportMessage(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
      event.target.value = ''
    }
  }

  const bulkUpdateStatus = async (statusType, paid) => {
    if (selectedOrderIds.length === 0) return
    setBulkUpdating(true)
    setBulkUpdateMessage('')
    setError('')
    try {
      await Promise.all(
        selectedOrderIds.map(async (orderId) => {
          const endpoint = statusType === 'paid_out' ? 'paid_out' : 'paid_in'
          const res = await fetch(`http://localhost:5090/api/orders/${orderId}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paid }),
          })
          if (!res.ok) {
            throw new Error('Failed to update some selected orders')
          }
        })
      )
      const updatedCount = selectedOrderIds.length
      setBulkUpdateMessage(`Updated ${updatedCount} orders`)
      setSelectedOrderIds([])
      await loadData()
    } catch (e) {
      setBulkUpdateMessage(e instanceof Error ? e.message : 'Bulk update failed')
    } finally {
      setBulkUpdating(false)
    }
  }

  const sanitizePdfNamePart = (value) => {
    const upper = String(value ?? '').toUpperCase().trim().replace(/\s+/g, '-')
    const cleaned = upper.replace(/[^A-Z0-9_-]/g, '')
    return cleaned || 'UNKNOWN'
  }

  const mostCommonRawValue = (rows, key) => {
    const counts = new Map()
    for (const row of rows) {
      const raw = String(row?.[key] ?? '').trim()
      if (!raw) continue
      counts.set(raw, (counts.get(raw) ?? 0) + 1)
    }
    let best = ''
    let bestCount = -1
    for (const [name, count] of counts.entries()) {
      if (count > bestCount) {
        best = name
        bestCount = count
      }
    }
    return best
  }

  const buildPdfFilename = (endpoint, selectedRows) => {
    const datePart = new Date().toISOString().slice(0, 10)
    if (endpoint === '/api/exports/contractor_pay.pdf') {
      const contractor = sanitizePdfNamePart(mostCommonRawValue(selectedRows, 'contractor_name_raw'))
      return `${contractor}_${datePart}_contractor-pay.pdf`
    }
    const client = sanitizePdfNamePart(mostCommonRawValue(selectedRows, 'client_name_raw'))
    return `${client}_${datePart}_invoice.pdf`
  }

  const exportPdf = async (endpoint) => {
    const orderIds = selectedOrderIds.length > 0 ? selectedOrderIds : sortedDisplayedOrders.map((order) => order.id)
    if (orderIds.length === 0) {
      setBulkUpdateMessage('No orders to export.')
      return
    }
    const selectedSet = new Set(orderIds)
    const selectedRows = sortedDisplayedOrders.filter((order) => selectedSet.has(order.id))
    const filename = buildPdfFilename(endpoint, selectedRows)

    setBulkUpdateMessage('')
    setError('')
    try {
      const response = await fetch(`http://localhost:5090${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_ids: orderIds }),
      })

      if (!response.ok) {
        let message = 'Failed to export PDF'
        try {
          const data = await response.json()
          message = data?.detail || data?.error?.message || message
        } catch {
          // ignore non-json responses
        }
        setBulkUpdateMessage(message)
        return
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (e) {
      setBulkUpdateMessage(e instanceof Error ? e.message : 'Failed to export PDF')
    }
  }

  const resetNewContractorForm = () => {
    setNewContractorForm({
      name: '',
      business_name: '',
      email: '',
      phone: '',
      address: '',
      dob: '',
      ein_or_ssn: '',
      aspen_grove_abc_number: '',
      bank_name: '',
      bank_routing: '',
      bank_account: '',
      notes: '',
      active: true,
    })
    setNewContractorError('')
    setOnboardingParseMessage('')
    setShowOnboardingParseDetails(false)
  }

  const saveNewContractor = async () => {
    const name = (newContractorForm.name || '').trim() || (newContractorForm.business_name || '').trim()
    if (!name) {
      setNewContractorError('Name is required')
      return
    }

    setSavingContractor(true)
    setNewContractorError('')
    try {
      const payload = {
        name,
        email: newContractorForm.email.trim() || null,
        phone: newContractorForm.phone.trim() || null,
        external_user_id: null,
        active: newContractorForm.active,
      }
      const response = await fetch('http://localhost:5090/api/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        throw new Error('Failed to create contractor')
      }
      const created = await response.json()
      if (parsedOnboardingData?.data) {
        setParsedOnboardingData({
          ...parsedOnboardingData,
          targetContractorId: created?.id || null,
        })
      }
      setShowNewContractorForm(false)
      resetNewContractorForm()
      await loadContractors(created?.id ?? null)
    } catch (e) {
      setNewContractorError(e instanceof Error ? e.message : 'Failed to create contractor')
    } finally {
      setSavingContractor(false)
    }
  }

  const handleOnboardingPick = () => {
    onboardingInputRef.current?.click()
  }

  const handleOnboardingFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setParsingOnboarding(true)
    setNewContractorError('')
    setOnboardingParseMessage('')
    setShowOnboardingParseDetails(false)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('http://localhost:5090/api/contractors/onboarding/parse', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        let message = 'Failed to parse onboarding PDF'
        try {
          const data = await response.json()
          message = data?.detail || data?.error?.message || message
        } catch {
          // ignore
        }
        throw new Error(message)
      }

      const parsed = await response.json()
      setNewContractorForm((prev) => ({
        ...prev,
        name: parsed?.name ?? '',
        business_name: parsed?.business_name ?? '',
        email: parsed?.email ?? '',
        phone: parsed?.phone ?? '',
        address: parsed?.address ?? '',
        dob: parsed?.dob ?? '',
        ein_or_ssn: parsed?.ein_or_ssn ?? parsed?.ssn_or_ein ?? '',
        aspen_grove_abc_number: parsed?.aspen_grove_abc_number ?? '',
        bank_name: parsed?.bank_name ?? '',
        bank_routing: parsed?.bank_routing ?? '',
        bank_account: parsed?.bank_account ?? '',
        notes: parsed?.notes ?? '',
      }))
      setParsedOnboardingData({
        data: parsed,
        targetContractorId: null,
      })
      setOnboardingParseMessage('Parsed onboarding file successfully.')
      setShowNewContractorForm(true)
    } catch (e) {
      setNewContractorError(e instanceof Error ? e.message : 'Failed to parse onboarding PDF')
    } finally {
      setParsingOnboarding(false)
      event.target.value = ''
    }
  }

  const saveContractorProfile = async () => {
    if (!selectedContractorId) return

    const payload = {
      full_legal_name: contractorProfileForm.full_legal_name || null,
      dob: contractorProfileForm.dob || null,
      ssn_or_ein: contractorProfileForm.ssn_or_ein || null,
      address: contractorProfileForm.address || null,
      phone: contractorProfileForm.phone || null,
      email: contractorProfileForm.email || null,
      aspen_grove_abc_number: contractorProfileForm.aspen_grove_abc_number || null,
      bank_name: contractorProfileForm.bank_name || null,
      bank_account_type: contractorProfileForm.bank_account_type || null,
      bank_routing_number: contractorProfileForm.bank_routing_number || null,
      bank_account_number: contractorProfileForm.bank_account_number || null,
      counties: contractorProfileForm.counties_text
        ? contractorProfileForm.counties_text
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        : null,
      expected_pay_per_inspection: contractorProfileForm.expected_pay_per_inspection
        ? contractorProfileForm.expected_pay_per_inspection
        : null,
      min_daily_volume: contractorProfileForm.min_daily_volume
        ? Number.parseInt(contractorProfileForm.min_daily_volume, 10)
        : null,
      ic_acknowledged: contractorProfileForm.ic_acknowledged,
      signature_name: contractorProfileForm.signature_name || null,
      signature_date: contractorProfileForm.signature_date || null,
    }

    setContractorProfileSaving(true)
    setContractorProfileError('')
    setContractorProfileMessage('')
    try {
      const response = await fetch(`http://localhost:5090/api/contractors/${selectedContractorId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        let message = 'Failed to save contractor profile'
        try {
          const data = await response.json()
          message = data?.detail || data?.error?.message || message
        } catch {
          // ignore
        }
        throw new Error(message)
      }

      setContractorProfileMessage('Profile saved.')
      setParsedOnboardingData((prev) =>
        prev && prev.targetContractorId === selectedContractorId ? null : prev
      )
      await loadContractorProfile(selectedContractorId)
    } catch (e) {
      setContractorProfileError(e instanceof Error ? e.message : 'Failed to save contractor profile')
    } finally {
      setContractorProfileSaving(false)
    }
  }

  const startAmountEdit = (order, field) => {
    const currentValue = order[field]
    setEditingCell({ orderId: order.id, field })
    setEditingValue(currentValue === null || currentValue === undefined ? '' : String(currentValue))
    setEditingError('')
  }

  const cancelAmountEdit = () => {
    setEditingCell(null)
    setEditingValue('')
    setEditingError('')
    setSavingEdit(false)
  }

  const saveAmountEdit = async ({ allowBulk = false } = {}) => {
    if (!editingCell || savingEdit) return
    const trimmed = editingValue.trim()
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
      setEditingError('Enter a valid number')
      return
    }

    const numeric = Number(trimmed)
    if (!Number.isFinite(numeric)) {
      setEditingError('Enter a valid number')
      return
    }

    const payload = {
      [editingCell.field]: numeric.toFixed(2),
    }
    const shouldBulkApply =
      allowBulk && selectedOrderIds.length > 1 && selectedIdSet.has(editingCell.orderId)

    setSavingEdit(true)
    setEditingError('')
    setError('')
    try {
      if (shouldBulkApply) {
        const results = await Promise.allSettled(
          selectedOrderIds.map(async (orderId) => {
            const response = await fetch(`http://localhost:5090/api/orders/${orderId}/amounts`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
            if (!response.ok) {
              throw new Error('Failed to update amount')
            }
          })
        )
        const okCount = results.filter((r) => r.status === 'fulfilled').length
        setBulkUpdateMessage(`Updated ${okCount} orders`)
      } else {
        const response = await fetch(`http://localhost:5090/api/orders/${editingCell.orderId}/amounts`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!response.ok) {
          throw new Error('Failed to update amount')
        }
      }
      cancelAmountEdit()
      await loadData()
    } catch (e) {
      setEditingError(e instanceof Error ? e.message : 'Failed to update amount')
      setSavingEdit(false)
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
          width="28"
          height="28"
          viewBox="0 0 28 28"
          aria-hidden="true"
          style={{ flex: '0 0 auto' }}
        >
          <g stroke="#e5e7eb" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <line x1="14" y1="1.4" x2="14" y2="3.2" strokeWidth="1.2" />
            <line x1="20.8" y1="3.8" x2="20.0" y2="5.4" strokeWidth="1.2" />
            <line x1="25.3" y1="9.4" x2="23.6" y2="10.1" strokeWidth="1.2" />
            <line x1="25.2" y1="16.0" x2="23.5" y2="15.4" strokeWidth="1.2" />
            <line x1="20.6" y1="21.8" x2="19.8" y2="20.2" strokeWidth="1.2" />
            <line x1="7.4" y1="21.8" x2="8.2" y2="20.2" strokeWidth="1.2" />
            <line x1="2.8" y1="16.0" x2="4.5" y2="15.4" strokeWidth="1.2" />
            <line x1="2.7" y1="9.4" x2="4.4" y2="10.1" strokeWidth="1.2" />
            <line x1="7.2" y1="3.8" x2="8.0" y2="5.4" strokeWidth="1.2" />

            <polygon
              points="14,4 20,6.8 22.4,13.1 19.5,19 12.8,20.5 7.4,16.4 7,9.6"
              strokeWidth="1.6"
            />
            <circle cx="14" cy="13" r="2.8" strokeWidth="1.4" />
          </g>
        </svg>
        <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: 0.6 }}>SOLTRAE BUSINEZZ</span>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '0 12px', flex: '0 0 auto' }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                border: '1px solid #5b6270',
                borderRadius: 8,
                padding: '6px 12px',
                cursor: 'pointer',
                backgroundColor: isActive ? '#4a5361' : '#3a414b',
                color: '#f3f4f6',
                fontWeight: isActive ? 600 : 500,
              }}
            >
              {tab}
            </button>
          )
        })}
      </div>

      {activeTab === 'ACCOUNTING' ? (
        <>
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
                  <button type="button" onClick={handleRefresh}>
                    REFRESH
                  </button>
                </div>

                {filterRows.map((row, index) => (
                  <div key={index} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <select
                      value={row.field}
                      onChange={(e) =>
                        setFilterRows((prev) =>
                          prev.map((r, i) => (i === index ? { ...r, field: e.target.value } : r))
                        )
                      }
                      style={{ width: 190, height: 35, fontSize: 14 }}
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
                      style={{ width: 270, height: 35, fontSize: 14 }}
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

              {showInvoicePreview && (
                <div
                  style={{
                    borderTop: '1px solid #5b6270',
                    paddingTop: 12,
                    marginTop: 8,
                    display: 'grid',
                    gap: 8,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>Invoice Preview</div>
                  {invoicePreview.orderCount === 0 ? (
                    <div>No orders in current view.</div>
                  ) : invoicePreview.hasMultipleClients ? (
                    <div>Multiple clients selected; filter to one client for invoicing.</div>
                  ) : (
                    <>
                      <div>Bill To: {invoicePreview.singleClient}</div>
                      <div>
                        Date range:{' '}
                        {invoicePreview.minDate && invoicePreview.maxDate
                          ? `${invoicePreview.minDate.toLocaleDateString()} - ${invoicePreview.maxDate.toLocaleDateString()}`
                          : 'N/A'}
                      </div>
                      <div>Order count: {invoicePreview.orderCount}</div>
                      <div>Total Amount: {formatMoney(invoicePreview.totalAmount)}</div>
                      <button type="button" onClick={exportInvoiceCsv} style={{ width: 'fit-content' }}>
                        Export Invoice CSV
                      </button>
                      <div
                        style={{
                          maxHeight: 180,
                          overflowY: 'auto',
                          border: '1px solid #5b6270',
                          borderRadius: 8,
                          padding: 8,
                          display: 'grid',
                          gap: 6,
                        }}
                      >
                        {displayedOrders.map((order) => (
                          <div key={`invoice-${order.id}`} style={{ fontSize: 12 }}>
                            {order.address ?? ''} {order.zip ?? ''} | {formatDate(order.submitted_to_client_at)} |{' '}
                            {formatMoney(order.client_pay_amount)}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
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
            <div
              style={{
                display: 'flex',
                gap: 6,
                marginBottom: 8,
                flexWrap: 'nowrap',
                alignItems: 'center',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
              }}
            >
              <button
                type="button"
                onClick={() => setFocusOnSelected(true)}
                disabled={selectedOrderIds.length === 0}
                style={gridActionButtonStyle}
              >
                Focus on selected
              </button>
              <button type="button" onClick={() => setSelectedOrderIds([])} style={gridActionButtonStyle}>
                Clear selection
              </button>
              <button type="button" onClick={() => setFocusOnSelected(false)} style={gridActionButtonStyle}>
                Reset focus
              </button>
              <button type="button" onClick={exportDisplayedOrdersCsv} style={gridActionButtonStyle}>
                Export CSV
              </button>
              <button type="button" onClick={() => setShowInvoicePreview(true)} style={gridActionButtonStyle}>
                Invoice Preview
              </button>
              <button
                type="button"
                onClick={() => exportPdf('/api/exports/invoice.pdf')}
                style={gridActionButtonStyle}
              >
                Invoice PDF
              </button>
              <button
                type="button"
                onClick={() => exportPdf('/api/exports/contractor_pay.pdf')}
                style={gridActionButtonStyle}
              >
                Pay PDF
              </button>
              <button
                type="button"
                onClick={handleImportButtonClick}
                disabled={importing}
                style={gridActionButtonStyle}
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
              <button
                type="button"
                onClick={() => bulkUpdateStatus('paid_in', true)}
                disabled={selectedOrderIds.length === 0 || bulkUpdating}
                style={gridActionButtonStyle}
              >
                Client Paid
              </button>
              <button
                type="button"
                onClick={() => bulkUpdateStatus('paid_in', false)}
                disabled={selectedOrderIds.length === 0 || bulkUpdating}
                style={gridActionButtonStyle}
              >
                Client Unpaid
              </button>
              <button
                type="button"
                onClick={() => bulkUpdateStatus('paid_out', true)}
                disabled={selectedOrderIds.length === 0 || bulkUpdating}
                style={gridActionButtonStyle}
              >
                Contractor Paid
              </button>
              <button
                type="button"
                onClick={() => bulkUpdateStatus('paid_out', false)}
                disabled={selectedOrderIds.length === 0 || bulkUpdating}
                style={gridActionButtonStyle}
              >
                Contractor Unpaid
              </button>
              <button
                type="button"
                onClick={() => autoAdjustPayFromZones('client')}
                disabled={bulkUpdating}
                style={gridActionButtonStyle}
              >
                Auto-adjust Client Pay
              </button>
              <button
                type="button"
                onClick={() => autoAdjustPayFromZones('contractor')}
                disabled={bulkUpdating}
                style={gridActionButtonStyle}
              >
                Auto-adjust Contractor Pay
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleImportFileChange}
              />
              {importMessage && <span>{importMessage}</span>}
              {bulkUpdateMessage && <span>{bulkUpdateMessage}</span>}
            </div>

            <div
              ref={ordersGridRef}
              onScroll={handleOrdersGridScroll}
              style={{ overflowX: 'auto', overflowY: 'auto', minHeight: 0, flex: 1 }}
            >
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                <thead>
                  <tr style={{ backgroundColor: '#323843' }}>
                    <th style={{ border: '1px solid #5b6270', padding: '5px 10px', fontWeight: 600, position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#323843' }}>
                      <input
                        type="checkbox"
                        checked={allDisplayedSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someDisplayedSelected
                        }}
                        onChange={toggleSelectAllDisplayed}
                      />
                    </th>
                    <th
                      style={{
                        border: '1px solid #5b6270',
                        padding: '5px 10px',
                        fontWeight: 600,
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                        backgroundColor: '#323843',
                      }}
                    >
                      #
                    </th>
                    <th
                      onClick={() => handleSort('contractor_name_raw')}
                      style={{ border: '1px solid #5b6270', padding: '5px 10px', fontWeight: 600, position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#323843', cursor: 'pointer', userSelect: 'none' }}
                    >
                      Contractor{getSortIndicator('contractor_name_raw')}
                    </th>
                    <th
                      onClick={() => handleSort('client_name_raw')}
                      style={{ border: '1px solid #5b6270', padding: '5px 10px', fontWeight: 600, position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#323843', cursor: 'pointer', userSelect: 'none' }}
                    >
                      Client{getSortIndicator('client_name_raw')}
                    </th>
                    <th
                      onClick={() => handleSort('county')}
                      style={{ border: '1px solid #5b6270', padding: '5px 10px', fontWeight: 600, position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#323843', cursor: 'pointer', userSelect: 'none' }}
                    >
                      County{getSortIndicator('county')}
                    </th>
                    <th
                      onClick={() => handleSort('city')}
                      style={{ border: '1px solid #5b6270', padding: '5px 10px', fontWeight: 600, position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#323843', cursor: 'pointer', userSelect: 'none' }}
                    >
                      City{getSortIndicator('city')}
                    </th>
                    <th
                      onClick={() => handleSort('address')}
                      style={{ border: '1px solid #5b6270', padding: '5px 10px', fontWeight: 600, position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#323843', cursor: 'pointer', userSelect: 'none' }}
                    >
                      Address{getSortIndicator('address')}
                    </th>
                    <th
                      onClick={() => handleSort('zip')}
                      style={{ border: '1px solid #5b6270', padding: '5px 10px', fontWeight: 600, position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#323843', cursor: 'pointer', userSelect: 'none' }}
                    >
                      Zip{getSortIndicator('zip')}
                    </th>
                    <th
                      onClick={() => handleSort('client_pay_amount')}
                      style={{ border: '1px solid #5b6270', padding: '5px 10px', fontWeight: 600, position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#323843', cursor: 'pointer', userSelect: 'none' }}
                    >
                      Client Pay{getSortIndicator('client_pay_amount')}
                    </th>
                    <th
                      onClick={() => handleSort('contractor_pay_amount')}
                      style={{ border: '1px solid #5b6270', padding: '5px 10px', fontWeight: 600, position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#323843', cursor: 'pointer', userSelect: 'none' }}
                    >
                      Contractor Pay{getSortIndicator('contractor_pay_amount')}
                    </th>
                    <th
                      onClick={() => handleSort('submitted_to_client_at')}
                      style={{ border: '1px solid #5b6270', padding: '5px 10px', fontWeight: 600, position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#323843', cursor: 'pointer', userSelect: 'none' }}
                    >
                      Submitted To Client{getSortIndicator('submitted_to_client_at')}
                    </th>
                    <th
                      onClick={() => handleSort('paid_in_status')}
                      style={{ border: '1px solid #5b6270', padding: '5px 10px', fontWeight: 600, position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#323843', cursor: 'pointer', userSelect: 'none' }}
                    >
                      Client Paid{getSortIndicator('paid_in_status')}
                    </th>
                    <th
                      onClick={() => handleSort('paid_out_status')}
                      style={{ border: '1px solid #5b6270', padding: '5px 10px', fontWeight: 600, position: 'sticky', top: 0, zIndex: 2, backgroundColor: '#323843', cursor: 'pointer', userSelect: 'none' }}
                    >
                      Contractor Paid{getSortIndicator('paid_out_status')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDisplayedOrders.map((order, index) => {
                    const bothPaid = order.paid_in_status === 'paid' && order.paid_out_status === 'paid'
                    const { clientPriceMismatch, contractorPriceMismatch } = getPriceMismatchFlags(order)
                    const isSelected = selectedIdSet.has(order.id)
                    return (
                      <tr
                        key={order.id}
                        style={{
                          backgroundColor: isSelected
                            ? 'rgba(80,160,255,0.22)'
                            : bothPaid
                              ? '#e9ffe9'
                              : '#ffe9e9',
                          color: '#111',
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
                        <td style={{ border: '1px solid #5b6270', padding: '5px 10px' }}>{index + 1}</td>
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
                        <td
                          style={{
                            border: '1px solid #5b6270',
                            padding: '5px 10px',
                            backgroundColor: clientPriceMismatch ? '#7f1d1d' : undefined,
                            color: clientPriceMismatch ? '#f8fafc' : undefined,
                          }}
                        >
                          {editingCell?.orderId === order.id && editingCell?.field === 'client_pay_amount' ? (
                            <div style={{ display: 'grid', gap: 4 }}>
                              <input
                                type="text"
                                value={editingValue}
                                autoFocus
                                onChange={(e) => {
                                  setEditingValue(e.target.value)
                                  if (editingError) setEditingError('')
                                }}
                                onBlur={() => saveAmountEdit({ allowBulk: false })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    saveAmountEdit({ allowBulk: true })
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault()
                                    cancelAmountEdit()
                                  }
                                }}
                                style={{
                                  width: 90,
                                  color: 'inherit',
                                  backgroundColor: 'transparent',
                                  border: '1px solid #cbd5e1',
                                }}
                              />
                              {editingError && <span style={{ fontSize: 10, color: '#b42318' }}>{editingError}</span>}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startAmountEdit(order, 'client_pay_amount')}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: 'inherit',
                                padding: 0,
                                textAlign: 'left',
                                cursor: 'text',
                                font: 'inherit',
                              }}
                            >
                              {formatMoney(order.client_pay_amount)}
                            </button>
                          )}
                        </td>
                        <td
                          style={{
                            border: '1px solid #5b6270',
                            padding: '5px 10px',
                            backgroundColor: contractorPriceMismatch ? '#7f1d1d' : undefined,
                            color: contractorPriceMismatch ? '#f8fafc' : undefined,
                          }}
                        >
                          {editingCell?.orderId === order.id && editingCell?.field === 'contractor_pay_amount' ? (
                            <div style={{ display: 'grid', gap: 4 }}>
                              <input
                                type="text"
                                value={editingValue}
                                autoFocus
                                onChange={(e) => {
                                  setEditingValue(e.target.value)
                                  if (editingError) setEditingError('')
                                }}
                                onBlur={() => saveAmountEdit({ allowBulk: false })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    saveAmountEdit({ allowBulk: true })
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault()
                                    cancelAmountEdit()
                                  }
                                }}
                                style={{
                                  width: 90,
                                  color: 'inherit',
                                  backgroundColor: 'transparent',
                                  border: '1px solid #cbd5e1',
                                }}
                              />
                              {editingError && <span style={{ fontSize: 10, color: '#b42318' }}>{editingError}</span>}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startAmountEdit(order, 'contractor_pay_amount')}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: 'inherit',
                                padding: 0,
                                textAlign: 'left',
                                cursor: 'text',
                                font: 'inherit',
                              }}
                            >
                              {formatMoney(order.contractor_pay_amount)}
                            </button>
                          )}
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
              {loadingMoreOrders && !loading && (
                <div style={{ padding: '8px 10px', fontSize: 12, color: '#cbd5e1' }}>Loading more...</div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div
          style={{
            flex: 1,
            border: '1px solid #5b6270',
            borderRadius: 12,
            padding: 16,
            backgroundColor: '#3a414b',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            color: '#f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {activeTab === 'CONTRACTORS' && (
            <div style={{ display: 'flex', gap: 12, width: '100%', height: '100%', minHeight: 0, overflow: 'hidden' }}>
              <div
                style={{
                  width: 360,
                  minWidth: 280,
                  height: '100%',
                  border: '1px solid #5b6270',
                  borderRadius: 10,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  backgroundColor: '#323843',
                  minHeight: 0,
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'grid', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Search contractors"
                    value={contractorSearch}
                    onChange={(e) => setContractorSearch(e.target.value)}
                    style={{ width: '100%', fontSize: 14, height: 35, boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button
                      type="button"
                      onClick={handleOnboardingPick}
                      disabled={parsingOnboarding}
                      style={{ width: '100%', whiteSpace: 'normal', lineHeight: 1.2 }}
                    >
                      {parsingOnboarding ? 'Parsing...' : 'Upload Onboarding'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewContractorForm(true)
                        resetNewContractorForm()
                      }}
                      style={{ width: '100%', whiteSpace: 'normal', lineHeight: 1.2 }}
                    >
                      New Contractor
                    </button>
                  </div>
                  <input
                    ref={onboardingInputRef}
                    type="file"
                    accept=".pdf,.csv,.xlsx,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    style={{ display: 'none' }}
                    onChange={handleOnboardingFileChange}
                  />
                </div>

                {showNewContractorForm && (
                  <div
                    style={{
                      border: '1px solid #5b6270',
                      borderRadius: 8,
                      padding: 10,
                      display: 'grid',
                      gap: 6,
                      backgroundColor: '#2f343c',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>Review & Create Contractor</div>
                    {onboardingParseMessage && (
                      <div style={{ display: 'grid', gap: 4 }}>
                        <div style={{ color: '#86efac', fontSize: 12 }}>{onboardingParseMessage}</div>
                        {parsedOnboardingData?.data?.notes ? (
                          <div>
                            <button
                              type="button"
                              onClick={() => setShowOnboardingParseDetails((prev) => !prev)}
                              style={{ fontSize: 12, padding: '2px 6px' }}
                            >
                              {showOnboardingParseDetails ? 'Hide Details' : 'Details'}
                            </button>
                            {showOnboardingParseDetails && (
                              <div style={{ marginTop: 4, fontSize: 12, color: '#cbd5e1' }}>
                                {parsedOnboardingData.data.notes}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}
                    <input
                      type="text"
                      placeholder="Name"
                      value={newContractorForm.name}
                      onChange={(e) =>
                        setNewContractorForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                    <input
                      type="text"
                      placeholder="Business Name"
                      value={newContractorForm.business_name}
                      onChange={(e) =>
                        setNewContractorForm((prev) => ({
                          ...prev,
                          business_name: e.target.value,
                        }))
                      }
                    />
                    <input
                      type="text"
                      placeholder="Email"
                      value={newContractorForm.email}
                      onChange={(e) =>
                        setNewContractorForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                    />
                    <input
                      type="text"
                      placeholder="Phone"
                      value={newContractorForm.phone}
                      onChange={(e) =>
                        setNewContractorForm((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                    />
                    <input
                      type="text"
                      placeholder="Address"
                      value={newContractorForm.address}
                      onChange={(e) =>
                        setNewContractorForm((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                    />
                    <input
                      type="text"
                      placeholder="DOB (MM/DD/YYYY)"
                      value={newContractorForm.dob}
                      onChange={(e) =>
                        setNewContractorForm((prev) => ({
                          ...prev,
                          dob: e.target.value,
                        }))
                      }
                    />
                    <input
                      type="text"
                      placeholder="EIN or SSN"
                      value={newContractorForm.ein_or_ssn}
                      onChange={(e) =>
                        setNewContractorForm((prev) => ({
                          ...prev,
                          ein_or_ssn: e.target.value,
                        }))
                      }
                    />
                    <input
                      type="text"
                      placeholder="Aspen Grove ABC Number"
                      value={newContractorForm.aspen_grove_abc_number}
                      onChange={(e) =>
                        setNewContractorForm((prev) => ({
                          ...prev,
                          aspen_grove_abc_number: e.target.value,
                        }))
                      }
                    />
                    <input
                      type="text"
                      placeholder="Bank Name"
                      value={newContractorForm.bank_name}
                      onChange={(e) =>
                        setNewContractorForm((prev) => ({
                          ...prev,
                          bank_name: e.target.value,
                        }))
                      }
                    />
                    <input
                      type="text"
                      placeholder="Bank Routing"
                      value={newContractorForm.bank_routing}
                      onChange={(e) =>
                        setNewContractorForm((prev) => ({
                          ...prev,
                          bank_routing: e.target.value,
                        }))
                      }
                    />
                    <input
                      type="text"
                      placeholder="Bank Account"
                      value={newContractorForm.bank_account}
                      onChange={(e) =>
                        setNewContractorForm((prev) => ({
                          ...prev,
                          bank_account: e.target.value,
                        }))
                      }
                    />
                    <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={newContractorForm.active}
                        onChange={(e) =>
                          setNewContractorForm((prev) => ({
                            ...prev,
                            active: e.target.checked,
                          }))
                        }
                      />
                      Active
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={saveNewContractor} disabled={savingContractor}>
                        {savingContractor ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewContractorForm(false)
                          resetNewContractorForm()
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                    {newContractorError && <div style={{ color: '#fda4af', fontSize: 12 }}>{newContractorError}</div>}
                  </div>
                )}

                {contractorsLoading && <div>Loading contractors...</div>}
                {contractorsError && <div style={{ color: '#fda4af' }}>{contractorsError}</div>}

                <div style={{ overflowY: 'auto', minHeight: 0, border: '1px solid #5b6270', borderRadius: 8 }}>
                  {filteredContractors.map((contractor) => {
                    const isSelected = contractor.id === selectedContractorId
                    return (
                      <button
                        key={contractor.id}
                        type="button"
                        onClick={() => setSelectedContractorId(contractor.id)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          border: 'none',
                          borderBottom: '1px solid #495161',
                          padding: '8px 10px',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? '#4a5361' : '#323843',
                          color: '#f3f4f6',
                        }}
                      >
                        {contractor.name || '(Unnamed Contractor)'}
                      </button>
                    )
                  })}
                  {filteredContractors.length === 0 && (
                    <div style={{ padding: 10, color: '#cbd5e1' }}>No contractors found</div>
                  )}
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  height: '100%',
                  minHeight: 0,
                  maxHeight: 'calc(100vh - 170px)',
                  overflowY: 'auto',
                  border: '1px solid #5b6270',
                  borderRadius: 10,
                  padding: 16,
                  backgroundColor: '#323843',
                }}
              >
                {selectedContractor ? (
                  <div style={{ display: 'grid', gap: 14 }}>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{selectedContractor.name || '(Unnamed Contractor)'}</div>
                    {contractorProfileLoading && <div>Loading profile...</div>}
                    {contractorProfileError && <div style={{ color: '#fda4af' }}>{contractorProfileError}</div>}
                    {contractorProfileMessage && <div style={{ color: '#86efac' }}>{contractorProfileMessage}</div>}

                    <div style={{ border: '1px solid #5b6270', borderRadius: 8, padding: 10, display: 'grid', gap: 8 }}>
                      <div style={{ fontWeight: 600 }}>Personal Information</div>
                      <label>
                        Full Legal Name
                        <input
                          type="text"
                          value={contractorProfileForm.full_legal_name}
                          onChange={(e) =>
                            setContractorProfileForm((prev) => ({ ...prev, full_legal_name: e.target.value }))
                          }
                          style={{ width: '100%' }}
                        />
                      </label>
                      <label>
                        Date of Birth
                        <input
                          type="date"
                          value={contractorProfileForm.dob}
                          onChange={(e) => setContractorProfileForm((prev) => ({ ...prev, dob: e.target.value }))}
                          style={{ width: '100%' }}
                        />
                      </label>
                      <label>
                        SSN / EIN
                        <input
                          type="text"
                          value={contractorProfileForm.ssn_or_ein}
                          onChange={(e) =>
                            setContractorProfileForm((prev) => ({ ...prev, ssn_or_ein: e.target.value }))
                          }
                          style={{ width: '100%' }}
                        />
                      </label>
                      <label>
                        Residential Address
                        <textarea
                          value={contractorProfileForm.address}
                          onChange={(e) =>
                            setContractorProfileForm((prev) => ({ ...prev, address: e.target.value }))
                          }
                          rows={2}
                          style={{ width: '100%' }}
                        />
                      </label>
                      <label>
                        Phone
                        <input
                          type="text"
                          value={contractorProfileForm.phone}
                          onChange={(e) => setContractorProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                          style={{ width: '100%' }}
                        />
                      </label>
                      <label>
                        Email
                        <input
                          type="text"
                          value={contractorProfileForm.email}
                          onChange={(e) => setContractorProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                          style={{ width: '100%' }}
                        />
                      </label>
                    </div>

                    <div style={{ border: '1px solid #5b6270', borderRadius: 8, padding: 10, display: 'grid', gap: 8 }}>
                      <div style={{ fontWeight: 600 }}>Aspen Grove</div>
                      <label>
                        Aspen Grove ABC Number
                        <input
                          type="text"
                          value={contractorProfileForm.aspen_grove_abc_number}
                          onChange={(e) =>
                            setContractorProfileForm((prev) => ({
                              ...prev,
                              aspen_grove_abc_number: e.target.value,
                            }))
                          }
                          style={{ width: '100%' }}
                        />
                      </label>
                    </div>

                    <div style={{ border: '1px solid #5b6270', borderRadius: 8, padding: 10, display: 'grid', gap: 8 }}>
                      <div style={{ fontWeight: 600 }}>Direct Deposit</div>
                      <label>
                        Bank Name
                        <input
                          type="text"
                          value={contractorProfileForm.bank_name}
                          onChange={(e) =>
                            setContractorProfileForm((prev) => ({ ...prev, bank_name: e.target.value }))
                          }
                          style={{ width: '100%' }}
                        />
                      </label>
                      <label>
                        Account Type
                        <select
                          value={contractorProfileForm.bank_account_type}
                          onChange={(e) =>
                            setContractorProfileForm((prev) => ({ ...prev, bank_account_type: e.target.value }))
                          }
                          style={{ width: '100%' }}
                        >
                          <option value="checking">Checking</option>
                          <option value="savings">Savings</option>
                        </select>
                      </label>
                      <label>
                        Routing Number
                        <input
                          type="text"
                          value={contractorProfileForm.bank_routing_number}
                          onChange={(e) =>
                            setContractorProfileForm((prev) => ({
                              ...prev,
                              bank_routing_number: e.target.value,
                            }))
                          }
                          style={{ width: '100%' }}
                        />
                      </label>
                      <label>
                        Account Number
                        <input
                          type="text"
                          value={contractorProfileForm.bank_account_number}
                          onChange={(e) =>
                            setContractorProfileForm((prev) => ({
                              ...prev,
                              bank_account_number: e.target.value,
                            }))
                          }
                          style={{ width: '100%' }}
                        />
                      </label>
                    </div>

                    <div style={{ border: '1px solid #5b6270', borderRadius: 8, padding: 10, display: 'grid', gap: 8 }}>
                      <div style={{ fontWeight: 600 }}>Service Area & Pay</div>
                      <label>
                        Counties Willing to Cover
                        <input
                          type="text"
                          value={contractorProfileForm.counties_text}
                          onChange={(e) =>
                            setContractorProfileForm((prev) => ({ ...prev, counties_text: e.target.value }))
                          }
                          placeholder="County A, County B"
                          style={{ width: '100%' }}
                        />
                      </label>
                      <label>
                        Expected Pay Per Inspection
                        <input
                          type="text"
                          value={contractorProfileForm.expected_pay_per_inspection}
                          onChange={(e) =>
                            setContractorProfileForm((prev) => ({
                              ...prev,
                              expected_pay_per_inspection: e.target.value,
                            }))
                          }
                          style={{ width: '100%' }}
                        />
                      </label>
                      <label>
                        Minimum Daily Volume
                        <input
                          type="number"
                          value={contractorProfileForm.min_daily_volume}
                          onChange={(e) =>
                            setContractorProfileForm((prev) => ({ ...prev, min_daily_volume: e.target.value }))
                          }
                          style={{ width: '100%' }}
                        />
                      </label>
                    </div>

                    <div style={{ border: '1px solid #5b6270', borderRadius: 8, padding: 10, display: 'grid', gap: 8 }}>
                      <div style={{ fontWeight: 600 }}>Legal</div>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={contractorProfileForm.ic_acknowledged}
                          onChange={(e) =>
                            setContractorProfileForm((prev) => ({ ...prev, ic_acknowledged: e.target.checked }))
                          }
                        />
                        Independent Contractor Acknowledgment
                      </label>
                    </div>

                    <div style={{ border: '1px solid #5b6270', borderRadius: 8, padding: 10, display: 'grid', gap: 8 }}>
                      <div style={{ fontWeight: 600 }}>Signature</div>
                      <label>
                        Digital Signature
                        <input
                          type="text"
                          value={contractorProfileForm.signature_name}
                          onChange={(e) =>
                            setContractorProfileForm((prev) => ({ ...prev, signature_name: e.target.value }))
                          }
                          style={{ width: '100%' }}
                        />
                      </label>
                      <label>
                        Date Signed
                        <input
                          type="date"
                          value={contractorProfileForm.signature_date}
                          onChange={(e) =>
                            setContractorProfileForm((prev) => ({ ...prev, signature_date: e.target.value }))
                          }
                          style={{ width: '100%' }}
                        />
                      </label>
                    </div>

                    <div style={{ border: '1px solid #5b6270', borderRadius: 8, padding: 10, display: 'grid', gap: 10 }}>
                      <div style={{ fontWeight: 600 }}>Documents</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={handlePhotoIdUpload}
                          disabled={uploadingDocumentType === 'id' || !selectedContractorId}
                        >
                          {uploadingDocumentType === 'id' ? 'Uploading...' : 'Upload Photo ID'}
                        </button>
                        <button
                          type="button"
                          onClick={handleW9Upload}
                          disabled={uploadingDocumentType === 'w9' || !selectedContractorId}
                        >
                          {uploadingDocumentType === 'w9' ? 'Uploading...' : 'Upload W-9'}
                        </button>
                        <input
                          ref={photoIdInputRef}
                          type="file"
                          style={{ display: 'none' }}
                          onChange={(event) => handleDocumentFileChange(event, 'id')}
                        />
                        <input
                          ref={w9InputRef}
                          type="file"
                          style={{ display: 'none' }}
                          onChange={(event) => handleDocumentFileChange(event, 'w9')}
                        />
                      </div>

                      {contractorDocumentsMessage && <div style={{ color: '#86efac', fontSize: 12 }}>{contractorDocumentsMessage}</div>}
                      {contractorDocumentsError && <div style={{ color: '#fda4af', fontSize: 12 }}>{contractorDocumentsError}</div>}
                      {contractorDocumentsLoading && <div style={{ fontSize: 12 }}>Loading documents...</div>}

                      {!contractorDocumentsLoading && contractorDocuments.length > 0 && (
                        <div style={{ border: '1px solid #5b6270', borderRadius: 6, overflow: 'hidden' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr>
                                <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #5b6270' }}>
                                  Type
                                </th>
                                <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #5b6270' }}>
                                  File Name
                                </th>
                                <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #5b6270' }}>
                                  Created
                                </th>
                                <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #5b6270' }}>
                                  Download
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {contractorDocuments.map((doc) => (
                                <tr key={doc.id}>
                                  <td style={{ padding: '6px 8px', borderBottom: '1px solid #4b5360' }}>{doc.document_type}</td>
                                  <td style={{ padding: '6px 8px', borderBottom: '1px solid #4b5360' }}>{doc.file_name}</td>
                                  <td style={{ padding: '6px 8px', borderBottom: '1px solid #4b5360' }}>
                                    {formatDate(doc.created_at)}
                                  </td>
                                  <td style={{ padding: '6px 8px', borderBottom: '1px solid #4b5360' }}>
                                    <a
                                      href={`http://localhost:5090/api/documents/${doc.id}/download`}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{ color: '#93c5fd' }}
                                    >
                                      Download
                                    </a>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {!contractorDocumentsLoading && contractorDocuments.length === 0 && (
                        <div style={{ fontSize: 12, color: '#cbd5e1' }}>No documents uploaded.</div>
                      )}
                    </div>

                    <div>
                      <button type="button" onClick={saveContractorProfile} disabled={contractorProfileSaving}>
                        {contractorProfileSaving ? 'Saving...' : 'Save Profile'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>Select a contractor</div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'ZONES' && (
            <div style={{ width: '100%', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600 }}>Zones</div>
                <button type="button" onClick={addZoneRow}>
                  Add Row
                </button>
              </div>
              <div style={{ overflowX: 'auto', overflowY: 'auto', minHeight: 0, flex: 1 }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                  <thead>
                    <tr style={{ backgroundColor: '#323843' }}>
                      <th
                        onClick={() => sortZonesBy('zip')}
                        style={{
                          border: '1px solid #5b6270',
                          padding: '5px 10px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        ZIP{zonesSortIndicator('zip')}
                      </th>
                      <th
                        onClick={() => sortZonesBy('county')}
                        style={{
                          border: '1px solid #5b6270',
                          padding: '5px 10px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        County{zonesSortIndicator('county')}
                      </th>
                      <th
                        onClick={() => sortZonesBy('city')}
                        style={{
                          border: '1px solid #5b6270',
                          padding: '5px 10px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        City{zonesSortIndicator('city')}
                      </th>
                      <th
                        onClick={() => sortZonesBy('clientPrice')}
                        style={{
                          border: '1px solid #5b6270',
                          padding: '5px 10px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        Client Price{zonesSortIndicator('clientPrice')}
                      </th>
                      <th
                        onClick={() => sortZonesBy('contractorPrice')}
                        style={{
                          border: '1px solid #5b6270',
                          padding: '5px 10px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        Contractor Price{zonesSortIndicator('contractorPrice')}
                      </th>
                      <th style={{ border: '1px solid #5b6270', padding: '5px 10px', fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedZones.map((row) => (
                      <tr key={row.id}>
                        {[
                          { key: 'zip', value: row.zip },
                          { key: 'county', value: row.county },
                          { key: 'city', value: row.city },
                          { key: 'clientPrice', value: row.clientPrice },
                          { key: 'contractorPrice', value: row.contractorPrice },
                        ].map((cell) => {
                          const isEditing =
                            zonesEditingCell?.rowId === row.id && zonesEditingCell?.key === cell.key
                          return (
                            <td
                              key={cell.key}
                              style={{ border: '1px solid #5b6270', padding: '4px 8px', cursor: 'text' }}
                              onClick={() => {
                                if (!isEditing) {
                                  startZoneEdit(row.id, cell.key, cell.value)
                                }
                              }}
                            >
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={zonesEditingValue}
                                  onChange={(e) => setZonesEditingValue(e.target.value)}
                                  onKeyDown={handleZoneCellKeyDown}
                                  onBlur={saveZoneEdit}
                                  autoFocus
                                  style={{ width: '100%' }}
                                />
                              ) : (
                                cell.value
                              )}
                            </td>
                          )
                        })}
                        <td style={{ border: '1px solid #5b6270', padding: '4px 8px' }}>
                          <button type="button" onClick={() => deleteZoneRow(row.id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {sortedZones.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ border: '1px solid #5b6270', padding: '8px 10px', color: '#cbd5e1' }}>
                          No zones yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeTab === 'CLIENTS' && <div>Clients Panel</div>}
          {activeTab === 'COMPANY' && <div>Company Panel</div>}
        </div>
      )}
      </div>
    </>
  )
}

export default App
