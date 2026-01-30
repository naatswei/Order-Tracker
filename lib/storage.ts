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
}

// Generate unique tracking ID
export function generateTrackingId(): string {
  return Math.random().toString(36).substring(2, 9).toUpperCase()
}

// Get all orders from localStorage
export function getAllOrders(): Order[] {
  if (typeof window === "undefined") return []
  const ordersJson = localStorage.getItem("tailoring_orders")
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
  const orders = getAllOrders()
  return orders.find((order) => order.id === id) || null
}

// Save order to localStorage
export function saveOrder(order: Order): void {
  const orders = getAllOrders()
  const existingIndex = orders.findIndex((o) => o.id === order.id)

  if (existingIndex >= 0) {
    orders[existingIndex] = order
  } else {
    orders.push(order)
  }

  localStorage.setItem("tailoring_orders", JSON.stringify(orders))
}

// Delete order
export function deleteOrder(id: string): void {
  const orders = getAllOrders()
  const filtered = orders.filter((order) => order.id !== id)
  localStorage.setItem("tailoring_orders", JSON.stringify(filtered))
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
