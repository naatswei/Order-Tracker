export interface OrderStatus {
  id: string
  timestamp: Date
  status: string
  location: string
  message: string
}

export interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  garmentType: string
  measurements: string
  pickupDate?: string
  currentStatus: string
  createdAt: Date
  updatedAt: Date
  statusHistory: OrderStatus[]
  businessType?: string
  metadata?: Record<string, any>
}

// Generate unique tracking ID
export function generateTrackingId(): string {
  return Math.random().toString(36).substring(2, 9).toUpperCase()
}

// Get all orders from localStorage
export function getAllOrders(): Order[] {
  if (typeof window === "undefined") return []

  const currentBusinessType = localStorage.getItem("businessType") || "tailoring"
  const storageKey = currentBusinessType === "tailoring" ? "tailoring_orders" : `orders_${currentBusinessType}`

  const ordersJson = localStorage.getItem(storageKey)
  if (!ordersJson) return []
  const orders = JSON.parse(ordersJson)
  // Convert date strings back to Date objects
  return orders.map((order: any) => ({
    ...order,
    createdAt: new Date(order.createdAt),
    updatedAt: new Date(order.updatedAt),
    statusHistory: order.statusHistory.map((status: any) => ({
      ...status,
      timestamp: new Date(status.timestamp),
    })),
  }))
}

// Get single order by ID
export function getOrderById(id: string): Order | null {
  // First, try to find in current context
  const orders = getAllOrders()
  const found = orders.find((order) => order.id === id)
  if (found) return found

  // If not found (e.g., customer tracking or mismatched context), search all keys
  if (typeof window === "undefined") return null

  const allKeys = ["tailoring_orders", "orders_hair-retail", "orders_logistics", "orders_online-business"]
  for (const key of allKeys) {
    const ordersJson = localStorage.getItem(key)
    if (!ordersJson) continue

    const parsedOrders = JSON.parse(ordersJson)
    const order = parsedOrders.find((o: any) => o.id === id)
    if (order) {
      // Return with date conversion
      return {
        ...order,
        createdAt: new Date(order.createdAt),
        updatedAt: new Date(order.updatedAt),
        statusHistory: order.statusHistory.map((status: any) => ({
          ...status,
          timestamp: new Date(status.timestamp),
        })),
      }
    }
  }

  return null
}

// Save order to localStorage
export function saveOrder(order: Order): void {
  // Use the order's tagged business type if available, otherwise fallback to current session
  const businessType = order.businessType || localStorage.getItem("businessType") || "tailoring"
  const storageKey = businessType === "tailoring" ? "tailoring_orders" : `orders_${businessType}`

  const ordersJson = localStorage.getItem(storageKey)
  let orders: Order[] = []

  if (ordersJson) {
    orders = JSON.parse(ordersJson).map((o: any) => ({
      ...o,
      createdAt: new Date(o.createdAt),
      updatedAt: new Date(o.updatedAt),
      statusHistory: o.statusHistory.map((s: any) => ({
        ...s,
        timestamp: new Date(s.timestamp),
      })),
    }))
  }

  const existingIndex = orders.findIndex((o) => o.id === order.id)
  if (existingIndex >= 0) {
    orders[existingIndex] = order
  } else {
    orders.push(order)
  }

  localStorage.setItem(storageKey, JSON.stringify(orders))
}

// Delete order
export function deleteOrder(id: string): void {
  // We need to find which store this order belongs to
  const order = getOrderById(id)
  if (!order) return

  const businessType = order.businessType || "tailoring"
  const storageKey = businessType === "tailoring" ? "tailoring_orders" : `orders_${businessType}`

  const ordersJson = localStorage.getItem(storageKey)
  if (!ordersJson) return

  const orders = JSON.parse(ordersJson)
  const filtered = orders.filter((o: any) => o.id !== id)
  localStorage.setItem(storageKey, JSON.stringify(filtered))
}

// Add status update to order
export function addStatusUpdate(orderId: string, status: string, location: string, message: string): Order | null {
  const order = getOrderById(orderId)
  if (!order) return null

  const statusUpdate: OrderStatus = {
    id: generateTrackingId(),
    timestamp: new Date(),
    status,
    location,
    message,
  }

  order.statusHistory.unshift(statusUpdate)
  order.currentStatus = status
  order.updatedAt = new Date()

  saveOrder(order)
  return order
}
