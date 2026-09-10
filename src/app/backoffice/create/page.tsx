"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { generateTrackingId, type Order } from "@/lib/storage"
import { createOrder, getOrderWithHistory, updateOrder } from "@/app/actions/orders"
import { getInventory, getClientOrganizations } from "@/app/actions/operations"
import { type LogisticsSubType } from "@/app/actions/org-metadata"
import { initiateMomoCharge } from "@/app/actions/paystack"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { detectGhanaNetworkProvider, cn } from "@/lib/utils"
import Link from "next/link"
import { OrganizationSwitcher, useOrganization } from "@clerk/nextjs"
import { Package, ArrowLeft, Loader2, AlertCircle, Plus, Trash2, Search, Boxes, ShoppingBag, Tag, ChevronRight, MapPin, Navigation, UtensilsCrossed, Sparkles, Truck, Ship, Box, Layers, Globe, Scale, Store, X } from "lucide-react"
import { RenewalBanner } from "@/components/renewal-banner"
import { BackofficeHeader } from "@/components/backoffice-header"
import { toast } from "sonner"
import { useSearchParams, useRouter } from "next/navigation"
import { getBusinessConfig } from "@/lib/business-configs"
import { DatePicker } from "@/components/ui/date-picker"
import { format, parse } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { PhoneInputWithCountry } from "@/components/ui/phone-input"
import { parsePhoneInput, formatFullPhone } from "@/constants/countries"

function resolveUnitPrice(quantity: number, inventoryItem: any, clientId?: string): number {
    if (!inventoryItem) return 0;
    
    // 1. Look for client-specific pricing override tiers first
    let tiers = inventoryItem.pricingTiers;
    if (clientId && Array.isArray(inventoryItem.clientOverrides)) {
        const clientOverride = inventoryItem.clientOverrides.find((o: any) => o.clientId === clientId);
        if (clientOverride && Array.isArray(clientOverride.pricingTiers)) {
            tiers = clientOverride.pricingTiers;
        }
    }
    
    // 2. If sellingPrice is 0 or unset, fall back to unitCost
    const basePrice = parseFloat(inventoryItem.sellingPrice || "0") || parseFloat(inventoryItem.unitCost || "0");
    
    // 3. If no overrides, fall back to standard tiers
    if (!Array.isArray(tiers) || tiers.length === 0) {
        return basePrice;
    }
    
    const matchedTier = tiers.find((tier: any) => {
        const minMatch = quantity >= tier.minQty;
        const maxMatch = tier.maxQty === null || quantity <= tier.maxQty;
        return minMatch && maxMatch;
    });
    
    return matchedTier ? parseFloat(matchedTier.price) : basePrice;
}

function CreateOrderContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [editingId, setEditingId] = useState<string | null>(null)

    // Form state
    const [orderNumber, setOrderNumber] = useState("")
    const [customerName, setCustomerName] = useState("")
    const [customerEmail, setCustomerEmail] = useState("")
    const [customerPhone, setCustomerPhone] = useState("")
    const [pickupCountryCode, setPickupCountryCode] = useState("+233")
    const [pickupPhoneLocal, setPickupPhoneLocal] = useState("")
    
    const [itemType, setItemType] = useState("")
    const [pickupDate, setPickupDate] = useState<Date | undefined>(undefined)
    const [measurements, setMeasurements] = useState("")
    const [metadata, setMetadata] = useState<Record<string, unknown>>({})
    // Logistics location state
    const [pickupLocation, setPickupLocation] = useState("")
    const [deliveryLocation, setDeliveryLocation] = useState("")
    const [recipientName, setRecipientName] = useState("")
    const [recipientPhone, setRecipientPhone] = useState("")
    const [dropoffCountryCode, setDropoffCountryCode] = useState("+233")
    const [dropoffPhoneLocal, setDropoffPhoneLocal] = useState("")
    const [quantity, setQuantity] = useState("1")
    const [isSaving, setIsSaving] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState<"online" | "cash">("online")
    
    // Direct Momo Prompt state
    const [triggerMomoPrompt, setTriggerMomoPrompt] = useState(false)
    const [momoPhone, setMomoPhone] = useState("")
    const [momoProvider, setMomoProvider] = useState<'mtn' | 'vod' | 'atl'>("mtn")
    
    // B2B Customer Pricing
    const [clients, setClients] = useState<any[]>([])
    const [selectedClientId, setSelectedClientId] = useState<string>("none")
    const [orderMode, setOrderMode] = useState<"unit" | "wholesale">("unit")

    // Inventory state
    const [allInventory, setAllInventory] = useState<any[]>([])
    const [selectedInventory, setSelectedInventory] = useState<{ id: string, name: string, quantity: string, max: number }[]>([])
    const [inventorySearch, setInventorySearch] = useState("")
    const [isSearchFocused, setIsSearchFocused] = useState(false)


    // Unit Modal state
    const [isUnitModalOpen, setIsUnitModalOpen] = useState(false)
    const [selectedItemForUnitModal, setSelectedItemForUnitModal] = useState<any>(null)
    const [modalQuantity, setModalQuantity] = useState("1")
    const [selectedTierIndex, setSelectedTierIndex] = useState<number | null>(null)
    
    // Invoice defaults state
    const [tax, setTax] = useState(0)
    const [deliveryFee, setDeliveryFee] = useState(0)
    const [discount, setDiscount] = useState(0)

    // Logistics Operation Mode (Determined by Administrative Defaults)
    const [logisticsMode, setLogisticsMode] = useState<LogisticsSubType>(() => {
        if (typeof window !== "undefined") {
            return (localStorage.getItem("logisticsType") as LogisticsSubType) || "restaurant"
        }
        return "restaurant"
    })
    const [cargoWeight, setCargoWeight] = useState("")
    const [cargoDimensions, setCargoDimensions] = useState("")
    const [waybillNumber, setWaybillNumber] = useState("")
    const [freightRatePerKg, setFreightRatePerKg] = useState(15)
    const [handlingFee, setHandlingFee] = useState(50)

    // Administrative Menu Items state
    const [orderMenuItems, setOrderMenuItems] = useState<{ id: string; name: string; price: number; quantity: number }[]>([])
    const [menuSearchQuery, setMenuSearchQuery] = useState("")
    const [courierCategorySearch, setCourierCategorySearch] = useState("")
    const [customItemName, setCustomItemName] = useState("")
    const [customItemPrice, setCustomItemPrice] = useState("")
    const [isMenuDropdownOpen, setIsMenuDropdownOpen] = useState(false)
    const menuContainerRef = useRef<HTMLDivElement>(null)

    // Close menu dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
                setIsMenuDropdownOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Business Config
    const { organization } = useOrganization()
    const [businessType, setBusinessType] = useState<string | null>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("businessType")
        }
        return null
    })
    const effectiveBusinessType = (organization?.publicMetadata?.businessType as string) || 
                                  businessType || 
                                  (typeof window !== "undefined" ? localStorage.getItem("businessType") : null) || 
                                  "tailoring"
    const effectiveLogisticsMode = (organization?.publicMetadata?.logisticsType as LogisticsSubType) || 
                                  (organization?.publicMetadata?.logisticsSubType as LogisticsSubType) || 
                                  (typeof window !== "undefined" ? (localStorage.getItem("logisticsType") as LogisticsSubType) : null) ||
                                  logisticsMode || 
                                  "restaurant"
    const config = getBusinessConfig(effectiveBusinessType, effectiveLogisticsMode)

    // Menu Presets & Package Categories from organization public metadata
    const menuPresets: any[] = Array.isArray(organization?.publicMetadata?.menuPresets)
        ? (organization?.publicMetadata?.menuPresets as any[])
        : []

    const packageCategories: string[] = (() => {
        const raw = Array.isArray(organization?.publicMetadata?.packageCategories)
            ? (organization?.publicMetadata?.packageCategories as string[])
            : []
        const legacy = ["Documents", "Small Parcel", "Food/Cake Box", "Electronics", "Fragile"]
        const isLegacy = raw.length === legacy.length && legacy.every(item => raw.includes(item))
        return isLegacy ? [] : raw
    })()

    // Helper to switch logistics mode and load the corresponding administrative defaults
    const handleSwitchLogisticsMode = (mode: LogisticsSubType) => {
        setLogisticsMode(mode)
        if (typeof window !== "undefined") {
            localStorage.setItem("logisticsType", mode)
        }
        if (!organization) return
        const meta = organization.publicMetadata as any || {}

        if (mode === 'restaurant') {
            if (meta.defaultPickupLocation) setPickupLocation(meta.defaultPickupLocation as string)
            if (meta.defaultPickupContact) {
                const parsed = parsePhoneInput(meta.defaultPickupContact as string, "+233")
                setPickupCountryCode(parsed.countryCode)
                setPickupPhoneLocal(parsed.phoneLocal)
                setCustomerPhone(formatFullPhone(parsed.countryCode, parsed.phoneLocal))
            }
            const fee = parseFloat(meta.defaultDeliveryFee || "0")
            setDeliveryFee(fee)
            if (meta.defaultPaymentNumber) setMomoPhone(meta.defaultPaymentNumber as string)
            if (meta.defaultPaymentProvider) {
                const p = (meta.defaultPaymentProvider as string).toLowerCase()
                if (p === "mtn") setMomoProvider("mtn")
                else if (p === "telecel" || p === "vodafone" || p === "vod") setMomoProvider("vod")
                else if (p === "airteltigo" || p === "atl") setMomoProvider("atl")
            }
        } else if (mode === 'delivery') {
            if (meta.defaultDispatchHub) setPickupLocation(meta.defaultDispatchHub as string)
            if (meta.defaultSenderContact) {
                const parsed = parsePhoneInput(meta.defaultSenderContact as string, "+233")
                setPickupCountryCode(parsed.countryCode)
                setPickupPhoneLocal(parsed.phoneLocal)
                setCustomerPhone(formatFullPhone(parsed.countryCode, parsed.phoneLocal))
            }
            const fee = parseFloat(meta.defaultCourierFee || "0")
            setDeliveryFee(fee)
            if (meta.defaultCourierMoMoNumber) setMomoPhone(meta.defaultCourierMoMoNumber as string)
            if (meta.defaultCourierPaymentProvider) {
                const p = (meta.defaultCourierPaymentProvider as string).toLowerCase()
                if (p === "mtn") setMomoProvider("mtn")
                else if (p === "telecel" || p === "vodafone" || p === "vod") setMomoProvider("vod")
                else if (p === "airteltigo" || p === "atl") setMomoProvider("atl")
            }
        } else if (mode === 'shipping') {
            if (meta.defaultOriginPort) setPickupLocation(meta.defaultOriginPort as string)
            if (meta.defaultDestinationHub) setDeliveryLocation(meta.defaultDestinationHub as string)
            if (meta.defaultOriginContact) {
                const parsed = parsePhoneInput(meta.defaultOriginContact as string, "+233")
                setPickupCountryCode(parsed.countryCode)
                setPickupPhoneLocal(parsed.phoneLocal)
                setCustomerPhone(formatFullPhone(parsed.countryCode, parsed.phoneLocal))
            }
            const rate = parseFloat(meta.defaultFreightRatePerKg || "15")
            const handling = parseFloat(meta.defaultHandlingFee || "50")
            setFreightRatePerKg(rate)
            setHandlingFee(handling)
            setDeliveryFee(handling)
            const prefix = meta.defaultWaybillPrefix || "SHP"
            setWaybillNumber(`${prefix}-${generateTrackingId()}`)
            if (meta.defaultShippingMoMoNumber) setMomoPhone(meta.defaultShippingMoMoNumber as string)
            if (meta.defaultShippingPaymentProvider) {
                const p = (meta.defaultShippingPaymentProvider as string).toLowerCase()
                if (p === "mtn") setMomoProvider("mtn")
                else if (p === "telecel" || p === "vodafone" || p === "vod") setMomoProvider("vod")
                else if (p === "airteltigo" || p === "atl") setMomoProvider("atl")
            }
        }
    }

    // Helper functions for Menu Presets
    const handleAddMenuItem = (preset: { id?: string; name: string; price: number }) => {
        setOrderMenuItems(prev => {
            const existingIndex = prev.findIndex(p => p.name.toLowerCase() === preset.name.toLowerCase())
            let next
            if (existingIndex >= 0) {
                next = [...prev]
                next[existingIndex] = {
                    ...next[existingIndex],
                    quantity: next[existingIndex].quantity + 1
                }
            } else {
                next = [...prev, { id: preset.id || `menu_${Date.now()}_${Math.random()}`, name: preset.name, price: Number(preset.price), quantity: 1 }]
            }
            const itemSummaries = next.map(m => `${m.quantity}x ${m.name}`).join(", ")
            setItemType(itemSummaries)
            return next
        })
        toast.success(`Added "${preset.name}" (GH₵ ${Number(preset.price).toFixed(2)})`)
    }

    const handleAddCustomMenuItem = (name: string, price: number) => {
        if (!name.trim()) return
        handleAddMenuItem({ name: name.trim(), price: price || 0 })
        setMenuSearchQuery("")
        setCustomItemPrice("")
        setIsMenuDropdownOpen(false)
    }

    const handleUpdateMenuItemQty = (index: number, newQty: number) => {
        setOrderMenuItems(prev => {
            let next: typeof prev
            if (newQty <= 0) {
                next = prev.filter((_, i) => i !== index)
            } else {
                next = [...prev]
                next[index] = { ...next[index], quantity: newQty }
            }
            const itemSummaries = next.map(m => `${m.quantity}x ${m.name}`).join(", ")
            setItemType(itemSummaries)
            return next
        })
    }

    const handleRemoveMenuItem = (index: number) => {
        setOrderMenuItems(prev => {
            const next = prev.filter((_, i) => i !== index)
            const itemSummaries = next.map(m => `${m.quantity}x ${m.name}`).join(", ")
            setItemType(itemSummaries)
            return next
        })
    }

    const handleTogglePackageCategory = (cat: string) => {
        if (!cat) return
        handleAddMenuItem({ name: cat, price: 0 })
    }

    const handleCargoWeightChange = (newWeight: string) => {
        setCargoWeight(newWeight)
        const weightNum = parseFloat(newWeight) || 0
        if (weightNum > 0) {
            const calculated = (weightNum * freightRatePerKg) + handlingFee
            setDeliveryFee(Number(calculated.toFixed(2)))
        } else {
            setDeliveryFee(handlingFee)
        }
    }

    // Initialize defaults from organization settings
    useEffect(() => {
        if (!organization) return
        const metadata = organization.publicMetadata as any || {}
        const configuredLogisticsType: LogisticsSubType = metadata.logisticsType || 
                                                          metadata.logisticsSubType || 
                                                          (typeof window !== "undefined" ? (localStorage.getItem("logisticsType") as LogisticsSubType) : null) || 
                                                          "restaurant"
        setLogisticsMode(configuredLogisticsType)
        if (typeof window !== "undefined") {
            localStorage.setItem("logisticsType", configuredLogisticsType)
        }

        const defaultDelivery = parseFloat(metadata.defaultDeliveryFee || "0")
        const defaultDisc = parseFloat(metadata.defaultDiscount || "0")
        
        setDeliveryFee(defaultDelivery)
        setDiscount(defaultDisc)

        // Set default country code from organization registered contact
        if (metadata.contact) {
            const parsedOrgContact = parsePhoneInput(metadata.contact, "+233")
            setPickupCountryCode(parsedOrgContact.countryCode)
            setDropoffCountryCode(parsedOrgContact.countryCode)
        }

        // Auto-populate administrative defaults if not editing an existing order
        const isEditing = Boolean(searchParams.get("edit"))
        if (!isEditing) {
            handleSwitchLogisticsMode(configuredLogisticsType)
        }
    }, [organization, searchParams])

    // Calculate subtotal from selected inventory AND quick menu items
    const inventorySubtotal = selectedInventory.reduce((sum, item) => {
        const invItem = allInventory.find(inv => inv.id === item.id);
        const qty = parseFloat(item.quantity) || 1;
        const clientId = selectedClientId === "none" ? "" : selectedClientId;
        const unitPrice = resolveUnitPrice(qty, invItem, clientId);
        return sum + (qty * unitPrice);
    }, 0);

    const menuSubtotal = orderMenuItems.reduce((sum, item) => {
        return sum + (item.quantity * item.price);
    }, 0);

    const subtotal = inventorySubtotal + menuSubtotal;

    // Auto-calculate tax based on defaultTaxRate percent and subtotal
    useEffect(() => {
        if (!organization) return
        const metadata = organization.publicMetadata as any || {}
        const defaultTaxRatePercent = parseFloat(metadata.defaultTaxRate || "0")
        if (defaultTaxRatePercent > 0) {
            const computedTax = (subtotal * defaultTaxRatePercent) / 100
            setTax(Number(computedTax.toFixed(2)))
        } else {
            setTax(0)
        }
    }, [subtotal, organization])

    useEffect(() => {
        // 1. Initial load from localStorage for immediate UI consistency
        const storedType = localStorage.getItem("businessType")
        if (storedType) {
            setBusinessType(storedType)
        }

        // 2. Sync from organization metadata IF AND ONLY IF we don't have a local selection
        const orgBusinessType = organization?.publicMetadata?.businessType as string
        if (orgBusinessType && !storedType) {
            setBusinessType(orgBusinessType)
            localStorage.setItem("businessType", orgBusinessType)
        }

        const editId = searchParams.get("edit")
        if (editId) {
            getOrderWithHistory(editId).then(orderToEdit => {
                if (orderToEdit) {
                    setEditingId(orderToEdit.id)
                    setOrderNumber(orderToEdit.orderNumber)
                    setCustomerName(orderToEdit.customerName)
                    setCustomerEmail(orderToEdit.customerEmail || "")
                    setCustomerPhone(orderToEdit.customerPhone)
                    const parsedPickup = parsePhoneInput(orderToEdit.customerPhone, "+233")
                    setPickupCountryCode(parsedPickup.countryCode)
                    setPickupPhoneLocal(parsedPickup.phoneLocal)

                    setItemType(orderToEdit.itemType)
                    if (orderToEdit.pickupDate) {
                        try {
                            // Try parsing standard format or ISO
                            const parsedDate = new Date(orderToEdit.pickupDate)
                            if (!isNaN(parsedDate.getTime())) {
                                setPickupDate(parsedDate)
                            }
                        } catch (e) {
                            console.error("Failed to parse date", e)
                        }
                    }
                    setMeasurements(orderToEdit.measurements || "")
                    const editMeta = orderToEdit.metadata as Record<string, unknown> || {}
                    setMetadata(editMeta)
                    // Restore logistics locations and recipient from metadata
                    if (editMeta.pickupLocation) setPickupLocation(editMeta.pickupLocation as string)
                    if (editMeta.deliveryLocation) setDeliveryLocation(editMeta.deliveryLocation as string)
                    if (editMeta.recipientName) setRecipientName(editMeta.recipientName as string)
                    if (editMeta.recipientPhone) {
                        setRecipientPhone(editMeta.recipientPhone as string)
                        const parsedDropoff = parsePhoneInput(editMeta.recipientPhone as string, "+233")
                        setDropoffCountryCode(parsedDropoff.countryCode)
                        setDropoffPhoneLocal(parsedDropoff.phoneLocal)
                    }
                    setQuantity(String(editMeta.quantity || "1"))

                    // Load inventory links
                    if ((orderToEdit as any).inventoryLinks) {
                        const mappedInventory = (orderToEdit as any).inventoryLinks.map((link: any) => ({
                            id: link.inventoryId,
                            name: link.inventoryItem.name,
                            quantity: link.quantity,
                            max: parseFloat(link.inventoryItem.quantity) + parseFloat(link.quantity) - parseFloat(link.inventoryItem.reserved || "0")
                        }))
                        setSelectedInventory(mappedInventory)
                    }
                }
            })
        }

        // Fetch B2B Clients
        getClientOrganizations().then(clientsList => {
            setClients(clientsList || []);
        });

        // Fetch inventory
        getInventory().then(items => {
            const errorItem = items.find(o => (o as any).__isError);
            if (errorItem) {
                toast.error(`Failed to load inventory: ${(errorItem as any).message}`);
                setAllInventory([]);
            } else {
                setAllInventory(items);
            }
        })
    }, [searchParams, organization])

    // Bidirectional sync for quantity (only if 1 item is linked)
    useEffect(() => {
        const inputQty = String(quantity || "");
        if (selectedInventory.length === 1 && inputQty) {
            const invQty = selectedInventory[0].quantity;
            if (inputQty !== invQty) {
                setSelectedInventory(prev => {
                    const next = [...prev];
                    next[0].quantity = inputQty;
                    return next;
                });
            }
        }
    }, [quantity]);

    useEffect(() => {
        if (selectedInventory.length === 1) {
            const invQty = selectedInventory[0].quantity;
            const inputQty = String(quantity || "");
            if (invQty !== inputQty) {
                setQuantity(invQty);
            }
        }
    }, [selectedInventory]);

    // Auto-match inventory logic (disabled to favor deliberate autocomplete and unit-modal selection)
    useEffect(() => {
        // Deliberate linking is managed via autocomplete and stock usage search
    }, [itemType, allInventory, editingId]);

    // Auto-detect Momo network provider from phone number
    useEffect(() => {
        if (momoPhone) {
            const detected = detectGhanaNetworkProvider(momoPhone);
            if (detected) {
                setMomoProvider(detected);
            }
        }
    }, [momoPhone]);

    const isSubscriptionActive = 
        organization?.publicMetadata?.subscriptionStatus === "active" || 
        organization?.publicMetadata?.subscriptionStatus === "trialing"
    
    const subscriptionExpiry = organization?.publicMetadata?.subscriptionExpiry as string
    const expiryDate = subscriptionExpiry ? new Date(subscriptionExpiry) : null
    const isExpired = expiryDate ? new Date() > expiryDate : false
    const canCreateOrder = isSubscriptionActive && !isExpired
    const isRetailBusiness = effectiveBusinessType ? ["hair-retail", "online-business"].includes(effectiveBusinessType) : false

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!canCreateOrder) {
            toast.error("Your subscription has expired. Please renew to continue.")
            router.push("/onboarding/subscription")
            return
        }

        // Prevent extremely rapid double-clicks
        if (isSaving) return

        // Validate pickup date is not in the past
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (pickupDate && pickupDate < today) {
            toast.error("Delivery date cannot be in the past.")
            setIsSaving(false)
            return
        }

        setIsSaving(true)

        const finalItemType = (orderMenuItems.length > 0)
            ? orderMenuItems.map(m => `${m.quantity}x ${m.name}`).join(", ")
            : ((selectedInventory.length > 1)
            ? selectedInventory.map(s => s.name).join(", ")
            : (itemType.trim() !== "" 
            ? itemType 
            : selectedInventory.map(s => s.name).join(", ")));

        const totalQty = (orderMenuItems.length > 0)
            ? orderMenuItems.reduce((sum, item) => sum + item.quantity, 0)
            : (selectedInventory.length > 0
            ? selectedInventory.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)
            : (parseInt(quantity) || 1));

        const finalCustomerName = (effectiveBusinessType === "logistics")
            ? (recipientName.trim() || customerName.trim() || "Customer")
            : customerName.trim();

        const finalCustomerPhone = (effectiveBusinessType === "logistics")
            ? (recipientPhone.trim() || customerPhone.trim() || "")
            : customerPhone.trim();

        try {
            let res;
            if (editingId) {
                res = await updateOrder(editingId, {
                    orderNumber,
                    customerName: finalCustomerName,
                    customerEmail,
                    customerPhone: finalCustomerPhone,
                    itemType: finalItemType,
                    pickupDate: pickupDate ? format(pickupDate, "yyyy-MM-dd") : "",
                    measurements: effectiveBusinessType === "logistics" && deliveryLocation ? deliveryLocation : measurements,
                    metadata: { 
                        ...metadata, 
                        quantity: totalQty, 
                        ...(effectiveBusinessType === "logistics" ? { 
                            pickupLocation, 
                            deliveryLocation, 
                            recipientName: recipientName.trim() || customerName.trim(), 
                            recipientPhone: recipientPhone.trim() || customerPhone.trim(),
                            senderName: customerName.trim() || undefined,
                            senderPhone: customerPhone.trim() || undefined,
                            logisticsMode: effectiveLogisticsMode,
                            cargoWeight: cargoWeight || undefined,
                            cargoDimensions: cargoDimensions || undefined,
                            waybillNumber: waybillNumber || undefined,
                        } : {}) 
                    },
                    inventoryItems: selectedInventory.map(item => ({ id: item.id, quantity: item.quantity })),
                })
                if (res?.error) {
                    toast.error(res.error)
                    setIsSaving(false)
                    return
                }
                toast.success("Order details updated")
            } else {
                const invInvoiceItems = selectedInventory.map(item => {
                    const inv = allInventory.find(i => i.id === item.id)
                    const qty = parseInt(item.quantity) || 1
                    const price = inv ? resolveUnitPrice(qty, inv, selectedClientId !== "none" ? selectedClientId : undefined) : 0
                    
                    let displayName = item.name;
                    if (inv) {
                        const parts = [];
                        if (inv.sku) parts.push(inv.sku);
                        if (inv.unit) parts.push(inv.unit);
                        if (parts.length > 0) {
                            displayName = `${item.name} (${parts.join(" | ")})`;
                        }
                    }
                    
                    return { name: displayName, quantity: qty, price }
                })

                const menuInvoiceItems = orderMenuItems.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price
                }))

                const invoiceItems = [...invInvoiceItems, ...menuInvoiceItems]

                res = await createOrder({
                    orderNumber,
                    customerName: finalCustomerName,
                    customerEmail,
                    customerPhone: finalCustomerPhone,
                    itemType: finalItemType,
                    pickupDate: pickupDate ? format(pickupDate, "yyyy-MM-dd") : "",
                    measurements: effectiveBusinessType === "logistics" && deliveryLocation ? deliveryLocation : measurements,
                    metadata: { 
                        ...metadata, 
                        quantity: totalQty, 
                        ...(effectiveBusinessType === "logistics" ? { 
                            pickupLocation, 
                            deliveryLocation, 
                            recipientName: recipientName.trim() || customerName.trim() || "Customer", 
                            recipientPhone: recipientPhone.trim() || customerPhone.trim(),
                            senderName: customerName.trim() || undefined,
                            senderPhone: customerPhone.trim() || undefined,
                            logisticsMode: effectiveLogisticsMode,
                            cargoWeight: cargoWeight || undefined,
                            cargoDimensions: cargoDimensions || undefined,
                            waybillNumber: waybillNumber || undefined,
                        } : {}) 
                    },
                    businessType: effectiveBusinessType,
                    currentStatus: config.defaultStatus,
                    inventoryItems: selectedInventory.map(item => ({ id: item.id, quantity: item.quantity })),
                    paymentMethod,
                    invoiceItems,
                    tax,
                    deliveryFee,
                    discount,
                })
                if (res?.error) {
                    toast.error(res.error)
                    setIsSaving(false)
                    return
                }

                if (paymentMethod === "cash") {
                    toast.success("Order created & marked as paid (Cash)")
                } else {
                    if (triggerMomoPrompt && res.orderId) {
                        const chargePhone = momoPhone || customerPhone
                        toast.loading("Initiating Instant Mobile Money Prompt...", { id: "momo-charge" })
                        
                        // Primary Gateway: BulkClix Instant MoMo Collection
                        const { initiateBulkClixMomoCollection } = await import("@/app/actions/bulkclix-payment")
                        let chargeRes: any = await initiateBulkClixMomoCollection(res.orderId, chargePhone, momoProvider)
                        
                        // Fallback Gateway: Paystack MoMo Collection if BulkClix encounters an error
                        if (!chargeRes.success) {
                            console.warn("BulkClix MoMo prompt failed, attempting Paystack fallback:", chargeRes.error)
                            const { initiateMomoCharge } = await import("@/app/actions/paystack")
                            chargeRes = await initiateMomoCharge(res.orderId, chargePhone, momoProvider)
                        }

                        if (chargeRes.success) {
                            toast.success("Mobile Money Prompt sent successfully to customer!", { id: "momo-charge" })
                        } else {
                            toast.error(`Could not trigger prompt: ${chargeRes.error}`, { id: "momo-charge" })
                        }
                    } else {
                        toast.success("New order created")
                    }
                }
            }
            // Do NOT setIsSaving(false) on success to prevent double-clicks during route transition
            router.push("/backoffice")
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to save order"
            toast.error(message)
            setIsSaving(false)
        }
    }

    const getCardHeader = () => {
        if (editingId) {
            if (effectiveBusinessType === "logistics") {
                if (effectiveLogisticsMode === "delivery") {
                    return {
                        title: "Edit Courier Delivery Order",
                        description: "Update package details, recipient, and delivery route."
                    }
                }
                if (effectiveLogisticsMode === "shipping") {
                    return {
                        title: "Edit Cargo Shipment Details",
                        description: "Update cargo specs, consignee details, and destination port."
                    }
                }
                return {
                    title: "Edit Restaurant Order Details",
                    description: "Update order details, kitchen items, and customer destination."
                }
            }
            return {
                title: "Edit Order Details",
                description: "Update order details and customer destination."
            }
        }
        if (effectiveBusinessType === "logistics") {
            if (effectiveLogisticsMode === "delivery") {
                return {
                    title: "Package Delivery & Recipient Route",
                    description: "Enter recipient contact, delivery address, and package details to generate a tracking link."
                }
            }
            if (effectiveLogisticsMode === "shipping") {
                return {
                    title: "Cargo Shipment & Consignee Destination",
                    description: "Enter consignee details, destination port, cargo specs, and generate a shipping waybill tracking link."
                }
            }
            return {
                title: "Restaurant Pickup and Customer Dropoff Route",
                description: "Enter order details, food items, and customer dropoff route to generate a tracking link."
            }
        }
        if (effectiveBusinessType === "tailoring") {
            return {
                title: "New Tailoring Order",
                description: "Enter client measurements and garment details to verify and generate a tracking link."
            }
        }
        if (effectiveBusinessType === "hair-retail") {
            return {
                title: "New Hair Retail Order",
                description: "Enter hair specifications and customer details to verify and generate a tracking link."
            }
        }
        if (effectiveBusinessType === "online-business") {
            return {
                title: "New Retail Order",
                description: "Enter product specifications and customer details to verify and generate a tracking link."
            }
        }
        return {
            title: config.title ? `New ${config.title} Order` : "New Order Details",
            description: "Enter order details to verify and generate a tracking link."
        }
    }
    const cardHeader = getCardHeader()

    const hasRequiredFields = effectiveBusinessType === "logistics"
        ? (
            deliveryLocation.trim() !== "" &&
            (effectiveLogisticsMode === "restaurant" 
                ? ((dropoffPhoneLocal.trim() !== "" || recipientPhone.trim() !== "") && (orderMenuItems.length > 0 || itemType.trim() !== ""))
                : (
                    recipientName.trim() !== "" &&
                    (dropoffPhoneLocal.trim() !== "" || recipientPhone.trim() !== "") &&
                    (itemType.trim() !== "" || orderMenuItems.length > 0 || (effectiveLogisticsMode === "shipping" && cargoWeight.trim() !== ""))
                )
            )
        )
        : (
            customerName.trim() !== "" &&
            (selectedInventory.length > 0 || orderMenuItems.length > 0 || (!isRetailBusiness && itemType.trim() !== "")) &&
            (selectedInventory.length > 0 || orderMenuItems.length > 0 || (!isRetailBusiness && quantity.trim() !== "" && parseInt(quantity) > 0))
        );

    return (
        <div className="min-h-screen bg-background font-sans selection:bg-primary/20">
            {/* Header */}
            <BackofficeHeader config={config} />

            {/* Renewal Banner */}
            {!canCreateOrder && (
                <RenewalBanner 
                    status={isExpired ? 'expired' : (organization?.publicMetadata?.subscriptionStatus === 'trialing' ? 'trial_ended' : 'inactive')} 
                />
            )}

            <div className="container mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-8 sm:pb-12 max-w-[1400px] space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                    <Button
                        asChild
                        variant="outline"
                        className="gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all duration-300 rounded-full shadow-xs hover:shadow-sm text-xs sm:text-sm h-9 sm:h-10 px-4 sm:px-5 font-bold"
                    >
                        <Link href="/backoffice">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Dashboard
                        </Link>
                    </Button>
                </div>

                <Card className="border-white/60 bg-white/70 backdrop-blur-md shadow-xl rounded-2xl sm:rounded-3xl overflow-hidden mb-4">
                    <CardHeader className="bg-primary/5 pb-4 sm:pb-6 pt-4 sm:pt-6 px-4 sm:px-8">
                        <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">{cardHeader.title}</CardTitle>
                        <CardDescription className="text-sm sm:text-base text-slate-600 font-medium mt-1">{cardHeader.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-8 pt-4 sm:pt-6">
                        {/* sliding tab switcher */}
                        {effectiveBusinessType !== "logistics" && (
                        <div className="mb-5 sm:mb-6 flex justify-start">
                            <div className="bg-slate-100/80 backdrop-blur-md p-1 rounded-full flex flex-wrap items-center gap-1 shadow-inner border border-slate-200/50">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOrderMode("unit");
                                        setSelectedClientId("none");
                                        setSelectedInventory([]);
                                    }}
                                    className={`px-4 sm:px-6 py-2 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                                        orderMode === "unit"
                                            ? "bg-white text-[#191A43] shadow-xs font-bold"
                                            : "text-slate-400 hover:text-slate-600 font-medium"
                                    }`}
                                >
                                    Retail Sales Mode (Unit)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setOrderMode("wholesale")}
                                    className={`px-4 sm:px-6 py-2 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                                        orderMode === "wholesale"
                                            ? "bg-white text-[#191A43] shadow-xs font-bold"
                                            : "text-slate-400 hover:text-slate-600 font-medium"
                                    }`}
                                >
                                    Wholesale Sales Mode
                                </button>
                            </div>
                        </div>
                        )}
                        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                            {/* B2B Client Account Selector (Non-Logistics Wholesale) */}
                            {effectiveBusinessType !== "logistics" && orderMode === "wholesale" && (
                                <div className="p-3.5 sm:p-5 bg-slate-50/70 border border-slate-100 rounded-2xl sm:rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
                                    <div className="space-y-0.5 text-left">
                                        <Label className="text-[10px] font-bold text-[#191A43] uppercase tracking-wider">B2B Customer Pricing Account</Label>
                                        <p className="text-[11px] text-slate-500 font-normal leading-normal">Select a registered client organization to apply their custom pricing overrides sheet automatically.</p>
                                    </div>
                                    <div className="w-full lg:w-80">
                                        <Select
                                            value={selectedClientId}
                                            onValueChange={setSelectedClientId}
                                        >
                                            <SelectTrigger className="h-10 sm:h-12 rounded-xl sm:rounded-2xl border-slate-200 bg-white font-semibold text-xs text-left">
                                                <SelectValue placeholder="Standard Catalog Prices (Default)" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-slate-100 bg-white">
                                                <SelectItem value="none" className="text-xs font-semibold">Standard Catalog Prices (Default)</SelectItem>
                                                {clients.map((client) => (
                                                    <SelectItem key={client.id} value={client.id} className="text-xs font-semibold">
                                                        {client.name} (Custom overrides)
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            {/* LOGISTICS OPERATIONAL SYSTEM — Displayed Directly at Top for Logistics Businesses */}
                            {effectiveBusinessType === "logistics" && (
                                <div className="space-y-4 sm:space-y-6">
                                    {/* 1. RESTAURANT DELIVERY VIEW */}
                                    {effectiveLogisticsMode === "restaurant" && (
                                        <div className="space-y-4">
                                            {/* Restaurant Branch (Pickup) & Customer Dropoff Contact Details */}
                                            <div className="grid sm:grid-cols-1 gap-4 sm:gap-6">
                                                {/* Restaurant Branch Details — Hidden (registered in backend settings) */}

                                                {/* 2. Customer Drop Off Details */}
                                                <div className="p-4 sm:p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80 shadow-2xs space-y-4">
                                                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                                                        <span className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-slate-700" />
                                                            Customer Dropoff Details
                                                        </span>
                                                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">Recipient</span>
                                                    </div>
                                                    <div className="space-y-3.5 sm:space-y-4">
                                                        <div className="space-y-1.5 max-w-sm">
                                                            <Label htmlFor="restaurantCustomerPhone" className="ml-0.5 text-xs sm:text-sm font-bold text-slate-700">
                                                                Customer Contact <span className="text-red-500">*</span>
                                                            </Label>
                                                            <PhoneInputWithCountry
                                                                id="restaurantCustomerPhone"
                                                                countryCode={dropoffCountryCode}
                                                                phoneLocal={dropoffPhoneLocal}
                                                                onCountryCodeChange={(code) => {
                                                                    setDropoffCountryCode(code)
                                                                    const formatted = formatFullPhone(code, dropoffPhoneLocal)
                                                                    setRecipientPhone(formatted)
                                                                }}
                                                                onPhoneLocalChange={(local) => {
                                                                    setDropoffPhoneLocal(local)
                                                                    const formatted = formatFullPhone(dropoffCountryCode, local)
                                                                    setRecipientPhone(formatted)
                                                                }}
                                                                placeholder="24 400 0000"
                                                                required
                                                                disabled={!canCreateOrder}
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label htmlFor="restaurantDeliveryLocation" className="ml-0.5 text-xs sm:text-sm font-bold text-slate-700">
                                                                Customer Drop Off Address / Location <span className="text-red-500">*</span>
                                                            </Label>
                                                            <Input
                                                                id="restaurantDeliveryLocation"
                                                                value={deliveryLocation}
                                                                onChange={(e) => setDeliveryLocation(e.target.value)}
                                                                placeholder="e.g. East Legon, near Shell / Accra Mall"
                                                                required
                                                                disabled={!canCreateOrder}
                                                                className="h-11 sm:h-12 rounded-xl px-4 bg-white border-zinc-200 focus-visible:border-[#6B1028] text-sm sm:text-base font-medium"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Live Google Maps Preview */}
                                            {(pickupLocation || deliveryLocation) && (
                                                <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
                                                    {pickupLocation && (
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Restaurant Branch</span>
                                                            </div>
                                                            <div className="w-full h-36 sm:h-44 rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
                                                                <iframe
                                                                    title="Restaurant Branch Map"
                                                                    width="100%"
                                                                    height="100%"
                                                                    loading="lazy"
                                                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(pickupLocation)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                                                                    className="w-full h-full border-0"
                                                                />
                                                            </div>
                                                            <a
                                                                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pickupLocation)}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-[#6B1028] hover:bg-slate-50 text-xs font-bold shadow-xs transition-all"
                                                            >
                                                                <Navigation className="w-3.5 h-3.5" />
                                                                Open in Google Maps
                                                            </a>
                                                        </div>
                                                    )}

                                                    {deliveryLocation && (
                                                        <div className={cn("space-y-1.5", !pickupLocation && "sm:col-start-2")}>
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-700 animate-pulse" />
                                                                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Drop Off</span>
                                                            </div>
                                                            <div className="w-full h-36 sm:h-44 rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
                                                                <iframe
                                                                    title="Customer Drop Off Map"
                                                                    width="100%"
                                                                    height="100%"
                                                                    loading="lazy"
                                                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(deliveryLocation)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                                                                    className="w-full h-full border-0"
                                                                />
                                                            </div>
                                                            <a
                                                                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(deliveryLocation)}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-xs font-bold shadow-xs transition-all"
                                                            >
                                                                <Navigation className="w-3.5 h-3.5" />
                                                                Open in Google Maps
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Quick Menu & Item Presets (Clean, Neutral Modern Container) */}
                                            <div className="bg-slate-50/60 p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/80 space-y-4 sm:space-y-5 shadow-2xs">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
                                                        <Label className="text-sm sm:text-base lg:text-lg font-black text-slate-900 tracking-tight">
                                                            MENU
                                                        </Label>
                                                    </div>
                                                    <span className="text-[10px] sm:text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wider">
                                                        Administrative Defaults
                                                    </span>
                                                </div>

                                                {/* Search Form Input & Dynamic Results */}
                                                <div ref={menuContainerRef} className="space-y-2 relative">
                                                    <div className="relative">
                                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                        <Input
                                                            type="text"
                                                            value={menuSearchQuery}
                                                            onChange={(e) => {
                                                                setMenuSearchQuery(e.target.value)
                                                                setIsMenuDropdownOpen(true)
                                                            }}
                                                            onFocus={() => setIsMenuDropdownOpen(true)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Tab" || e.key === "Escape") {
                                                                    setIsMenuDropdownOpen(false)
                                                                }
                                                            }}
                                                            placeholder="Search menu items (e.g. Assorted Fried Rice, Chicken Shawarma, Jollof, Drinks)..."
                                                            disabled={!canCreateOrder}
                                                            className="h-14 sm:h-16 pl-12 pr-12 rounded-full bg-white border-zinc-200 focus-visible:border-slate-400 focus-visible:ring-[4px] focus-visible:ring-slate-100/80 text-sm sm:text-base font-medium shadow-2xs"
                                                        />
                                                        {menuSearchQuery && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setMenuSearchQuery("")
                                                                    setIsMenuDropdownOpen(false)
                                                                }}
                                                                className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                                                            >
                                                                ✕
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Dropdown / Search Results */}
                                                    {isMenuDropdownOpen && (
                                                        <div 
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-100 z-20"
                                                        >
                                                            {(() => {
                                                                const query = menuSearchQuery.toLowerCase().trim()
                                                                const filteredPresets = menuPresets.filter((preset: any) =>
                                                                    preset.name?.toLowerCase().includes(query)
                                                                )
                                                                const exactMatch = menuPresets.some((preset: any) =>
                                                                    preset.name?.toLowerCase() === query
                                                                )

                                                                return (
                                                                    <>
                                                                        {filteredPresets.length > 0 ? (
                                                                            filteredPresets.map((preset: any) => {
                                                                                const currentCount = orderMenuItems.find(m => m.name.toLowerCase() === preset.name.toLowerCase())?.quantity || 0

                                                                                const handleSelect = (e: React.MouseEvent) => {
                                                                                    e.preventDefault()
                                                                                    e.stopPropagation()
                                                                                    handleAddMenuItem(preset)
                                                                                    setMenuSearchQuery("")
                                                                                    setIsMenuDropdownOpen(false)
                                                                                }

                                                                                return (
                                                                                    <div
                                                                                        key={preset.id || preset.name}
                                                                                        className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                                                                                        onMouseDown={handleSelect}
                                                                                        onClick={handleSelect}
                                                                                    >
                                                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 font-bold text-xs">
                                                                                                <UtensilsCrossed className="w-3.5 h-3.5" />
                                                                                            </div>
                                                                                            <div className="min-w-0">
                                                                                                <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                                                                                                    {preset.name}
                                                                                                </p>
                                                                                                <p className="text-[10px] text-slate-400 font-medium">
                                                                                                    Preset Menu Item
                                                                                                </p>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2.5 shrink-0">
                                                                                            <span className="text-xs sm:text-sm font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                                                                                                GH₵ {Number(preset.price).toFixed(2)}
                                                                                            </span>
                                                                                            {currentCount > 0 && (
                                                                                                <span className="w-6 h-6 rounded-full bg-[#191A43] text-white text-[11px] font-black flex items-center justify-center">
                                                                                                    {currentCount}
                                                                                                </span>
                                                                                            )}
                                                                                            <button
                                                                                                type="button"
                                                                                                title="Add to order"
                                                                                                onMouseDown={handleSelect}
                                                                                                onClick={handleSelect}
                                                                                                className="w-10 h-10 rounded-full bg-[#191A43] hover:bg-[#25275e] text-white flex items-center justify-center shadow-xs transition-colors shrink-0 cursor-pointer"
                                                                                            >
                                                                                                <Plus className="w-5 h-5 stroke-[2.5]" />
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                )
                                                                            })
                                                                        ) : query ? (
                                                                            <div className="p-4 text-center text-xs sm:text-sm text-slate-500">
                                                                                No preset matching &ldquo;<span className="font-semibold text-slate-700">{menuSearchQuery}</span>&rdquo;
                                                                            </div>
                                                                        ) : (
                                                                            <div className="p-4 text-center text-xs sm:text-sm text-slate-500">
                                                                                No menu presets found in Settings.
                                                                            </div>
                                                                        )}

                                                                        {/* Add custom / unlisted dish if query is typed */}
                                                                        {query && !exactMatch && (
                                                                            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                                                                                <div className="text-xs sm:text-sm">
                                                                                    <span className="font-bold text-slate-800">Add custom item: </span>
                                                                                    <span className="text-slate-900 font-black">&ldquo;{menuSearchQuery}&rdquo;</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="relative w-28">
                                                                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">GH₵</span>
                                                                                        <Input
                                                                                            type="number"
                                                                                            step="0.01"
                                                                                            placeholder="0.00"
                                                                                            value={customItemPrice}
                                                                                            onChange={(e) => setCustomItemPrice(e.target.value)}
                                                                                            className="h-9 pl-8 pr-2.5 text-xs sm:text-sm rounded-full bg-white border-zinc-200"
                                                                                        />
                                                                                    </div>
                                                                                    <button
                                                                                        type="button"
                                                                                        onMouseDown={(e) => {
                                                                                            e.preventDefault()
                                                                                            e.stopPropagation()
                                                                                            const p = parseFloat(customItemPrice) || 0
                                                                                            handleAddCustomMenuItem(menuSearchQuery, p)
                                                                                        }}
                                                                                        onClick={(e) => {
                                                                                            e.preventDefault()
                                                                                            e.stopPropagation()
                                                                                            const p = parseFloat(customItemPrice) || 0
                                                                                            handleAddCustomMenuItem(menuSearchQuery, p)
                                                                                        }}
                                                                                        title="Add custom item"
                                                                                        className="w-10 h-10 rounded-full bg-[#191A43] hover:bg-[#25275e] text-white flex items-center justify-center shrink-0 shadow-xs cursor-pointer transition-colors"
                                                                                    >
                                                                                        <Plus className="w-5 h-5 stroke-[2.5]" />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Direct Add Custom Dish / Order Item Row */}
                                                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
                                                    <span className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider block">
                                                        Add Custom Dish / Unlisted Item
                                                    </span>
                                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                                                        <div className="sm:col-span-6 space-y-1">
                                                            <Label htmlFor="restaurantCustomDishName" className="text-xs sm:text-sm font-semibold text-slate-600">
                                                                Dish / Item Name
                                                            </Label>
                                                            <Input
                                                                id="restaurantCustomDishName"
                                                                placeholder="e.g. Special Jollof Rice + Chicken, Extra Sauce"
                                                                value={customItemName}
                                                                onChange={(e) => setCustomItemName(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter") {
                                                                        e.preventDefault()
                                                                        if (customItemName.trim()) {
                                                                            handleAddCustomMenuItem(customItemName.trim(), parseFloat(customItemPrice) || 0)
                                                                            setCustomItemName("")
                                                                            setCustomItemPrice("")
                                                                        }
                                                                    }
                                                                }}
                                                                className="h-11 sm:h-12 rounded-xl bg-slate-50/50 border-zinc-200 focus-visible:border-slate-400 text-sm sm:text-base font-medium"
                                                            />
                                                        </div>
                                                        <div className="sm:col-span-3 space-y-1">
                                                            <Label htmlFor="restaurantCustomDishPrice" className="text-xs sm:text-sm font-semibold text-slate-600">
                                                                Price (GH₵)
                                                            </Label>
                                                            <div className="relative">
                                                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">GH₵</span>
                                                                <Input
                                                                    id="restaurantCustomDishPrice"
                                                                    type="number"
                                                                    step="0.01"
                                                                    placeholder="0.00"
                                                                    value={customItemPrice}
                                                                    onChange={(e) => setCustomItemPrice(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter") {
                                                                            e.preventDefault()
                                                                            if (customItemName.trim()) {
                                                                            handleAddCustomMenuItem(customItemName.trim(), parseFloat(customItemPrice) || 0)
                                                                            setCustomItemName("")
                                                                            setCustomItemPrice("")
                                                                        }
                                                                    }
                                                                }}
                                                                className="h-11 sm:h-12 pl-12 rounded-xl bg-slate-50/50 border-zinc-200 focus-visible:border-slate-400 text-sm sm:text-base font-medium"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="sm:col-span-3">
                                                        <Button
                                                            type="button"
                                                            onClick={() => {
                                                                if (customItemName.trim()) {
                                                                    handleAddCustomMenuItem(customItemName.trim(), parseFloat(customItemPrice) || 0)
                                                                    setCustomItemName("")
                                                                    setCustomItemPrice("")
                                                                }
                                                            }}
                                                            disabled={!customItemName.trim()}
                                                            className="w-full h-11 sm:h-12 rounded-xl bg-[#191A43] hover:bg-[#25275e] text-white text-sm sm:text-base font-bold shadow-xs cursor-pointer"
                                                        >
                                                            <Plus className="w-4 h-4 mr-1.5" />
                                                            Add Item
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Selected Menu Items Table */}
                                            {orderMenuItems.length > 0 && (
                                                <div className="space-y-2.5 pt-2 border-t border-slate-200">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">
                                                            Selected Order Items ({orderMenuItems.reduce((s, i) => s + i.quantity, 0)})
                                                        </p>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setOrderMenuItems([])
                                                                setItemType("")
                                                            }}
                                                            className="px-3.5 py-1 rounded-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/60 text-xs font-bold transition-colors cursor-pointer"
                                                        >
                                                            Clear All
                                                        </button>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {orderMenuItems.map((item, idx) => (
                                                            <div key={item.id || idx} className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-sm sm:text-base font-bold text-slate-800 truncate">{item.name}</p>
                                                                    <p className="text-xs text-slate-500 font-medium">GH₵ {item.price.toFixed(2)} / each</p>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex items-center border border-slate-200 rounded-full overflow-hidden bg-slate-50 p-0.5">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleUpdateMenuItemQty(idx, item.quantity - 1)}
                                                                            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 text-sm font-bold cursor-pointer transition-colors"
                                                                        >
                                                                            -
                                                                        </button>
                                                                        <span className="w-9 text-center text-sm sm:text-base font-bold text-slate-800">{item.quantity}</span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleUpdateMenuItemQty(idx, item.quantity + 1)}
                                                                            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 text-sm font-bold cursor-pointer transition-colors"
                                                                        >
                                                                            +
                                                                        </button>
                                                                    </div>
                                                                    <div className="text-right min-w-[80px]">
                                                                        <span className="text-sm sm:text-base font-black text-slate-900">GH₵ {(item.quantity * item.price).toFixed(2)}</span>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveMenuItem(idx)}
                                                                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="p-3.5 sm:p-4 bg-slate-100 rounded-2xl flex items-center justify-between text-sm sm:text-base font-bold text-slate-900">
                                                        <span>Menu Subtotal:</span>
                                                        <span className="text-base sm:text-lg font-black text-slate-900">
                                                            GH₵ {orderMenuItems.reduce((s, i) => s + (i.quantity * i.price), 0).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {effectiveLogisticsMode === "delivery" && (
                                    <div className="space-y-4">
                                            <div className="bg-slate-50/60 p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/80 space-y-4 sm:space-y-5 shadow-xs">
                                                {/* Recipient Details */}
                                                <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
                                                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                                        <span className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-slate-700" />
                                                            Recipient Delivery Details
                                                        </span>
                                                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">Recipient</span>
                                                    </div>
                                                    <div className="space-y-3 sm:space-y-4">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                            <div className="space-y-1.5">
                                                                <Label htmlFor="courierRecipientName" className="ml-0.5 text-xs sm:text-sm font-bold text-slate-700">
                                                                    Recipient Name <span className="text-red-500">*</span>
                                                                </Label>
                                                                <Input
                                                                    id="courierRecipientName"
                                                                    value={recipientName}
                                                                    onChange={(e) => setRecipientName(e.target.value)}
                                                                    placeholder="e.g. Kofi Boateng"
                                                                    required
                                                                    disabled={!canCreateOrder}
                                                                    className="h-11 sm:h-12 rounded-xl bg-slate-50/50 border-zinc-200 focus-visible:border-slate-400 text-sm sm:text-base font-medium"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label htmlFor="courierRecipientPhone" className="ml-0.5 text-xs sm:text-sm font-bold text-slate-700">
                                                                    Recipient Phone <span className="text-red-500">*</span>
                                                                </Label>
                                                                <PhoneInputWithCountry
                                                                    id="courierRecipientPhone"
                                                                    countryCode={dropoffCountryCode}
                                                                    phoneLocal={dropoffPhoneLocal}
                                                                    onCountryCodeChange={(code) => {
                                                                        setDropoffCountryCode(code)
                                                                        const formatted = formatFullPhone(code, dropoffPhoneLocal)
                                                                        setRecipientPhone(formatted)
                                                                    }}
                                                                    onPhoneLocalChange={(local) => {
                                                                        setDropoffPhoneLocal(local)
                                                                        const formatted = formatFullPhone(dropoffCountryCode, local)
                                                                        setRecipientPhone(formatted)
                                                                    }}
                                                                    placeholder="24 400 0000"
                                                                    required
                                                                    disabled={!canCreateOrder}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label htmlFor="courierDeliveryLocation" className="ml-0.5 text-xs sm:text-sm font-bold text-slate-700">
                                                                Recipient Delivery Address <span className="text-red-500">*</span>
                                                            </Label>
                                                            <Input
                                                                id="courierDeliveryLocation"
                                                                value={deliveryLocation}
                                                                onChange={(e) => setDeliveryLocation(e.target.value)}
                                                                placeholder="e.g. Airport Residential, 5th Avenue"
                                                                required
                                                                disabled={!canCreateOrder}
                                                                className="h-11 sm:h-12 rounded-xl bg-slate-50/50 border-zinc-200 focus-visible:border-slate-400 text-sm sm:text-base font-medium"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Live Google Maps Preview */}
                                                {(pickupLocation || deliveryLocation) && (
                                                    <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
                                                        {pickupLocation && (
                                                             <div className="space-y-1.5">
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                    <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Dispatch Hub (Default)</span>
                                                                </div>
                                                                <div className="w-full h-40 sm:h-48 rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
                                                                    <iframe
                                                                        title="Hub Location Map"
                                                                        width="100%"
                                                                        height="100%"
                                                                        loading="lazy"
                                                                        src={`https://maps.google.com/maps?q=${encodeURIComponent(pickupLocation)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                                                                        className="w-full h-full border-0"
                                                                    />
                                                                </div>
                                                                <a
                                                                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pickupLocation)}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors"
                                                                >
                                                                    <Navigation className="w-3.5 h-3.5" />
                                                                    Open in Google Maps
                                                                </a>
                                                            </div>
                                                        )}

                                                        {deliveryLocation && (
                                                            <div className={cn("space-y-1.5", !pickupLocation && "sm:col-start-2")}>
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700 animate-pulse" />
                                                                    <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Drop Off Location</span>
                                                                </div>
                                                                <div className="w-full h-40 sm:h-48 rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
                                                                    <iframe
                                                                        title="Drop Off Location Map"
                                                                        width="100%"
                                                                        height="100%"
                                                                        loading="lazy"
                                                                        src={`https://maps.google.com/maps?q=${encodeURIComponent(deliveryLocation)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                                                                        className="w-full h-full border-0"
                                                                    />
                                                                </div>
                                                                <a
                                                                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(deliveryLocation)}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors"
                                                                >
                                                                    <Navigation className="w-3.5 h-3.5" />
                                                                    Open in Google Maps
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Package Categories & Custom Order Items Entry */}
                                            <div className="bg-slate-50/60 p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/80 space-y-4 sm:space-y-5 shadow-xs">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Box className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
                                                        <Label className="text-sm sm:text-base lg:text-lg font-black text-slate-900 tracking-tight">
                                                            Package &amp; Order Items
                                                        </Label>
                                                    </div>
                                                    <span className="text-[10px] sm:text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wider">
                                                        Courier Service
                                                    </span>
                                                </div>

                                                {/* 1-Click Package Category Presets with Live Search */}
                                                {packageCategories.length > 0 && (
                                                    <div className="space-y-3">
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-xs sm:text-sm font-bold text-slate-700">Quick-Add Category Presets:</p>
                                                                <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                                                                    {packageCategories.length} available
                                                                </span>
                                                            </div>

                                                            {packageCategories.length > 3 && (
                                                                <div className="relative w-full sm:w-64">
                                                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                                    <Input
                                                                        value={courierCategorySearch}
                                                                        onChange={(e) => setCourierCategorySearch(e.target.value)}
                                                                        placeholder="Search categories (e.g. Box, Food)..."
                                                                        className="h-8.5 pl-8 pr-7 rounded-xl bg-white border-slate-200 text-xs font-medium focus-visible:border-slate-400"
                                                                    />
                                                                    {courierCategorySearch && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setCourierCategorySearch("")}
                                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {(() => {
                                                            const query = courierCategorySearch.toLowerCase().trim()
                                                            const filteredCats = packageCategories.filter(cat => cat.toLowerCase().includes(query))

                                                            if (filteredCats.length === 0) {
                                                                return (
                                                                    <div className="p-3.5 bg-white rounded-xl border border-dashed border-slate-200 text-center flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                                                                        <span className="text-slate-600 font-medium">
                                                                            No category matching <strong className="text-slate-900">"{courierCategorySearch}"</strong>
                                                                        </span>
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                const val = courierCategorySearch.trim()
                                                                                if (!val) return
                                                                                handleTogglePackageCategory(val)
                                                                                setCourierCategorySearch("")
                                                                            }}
                                                                            className="h-7.5 px-3 rounded-lg bg-[#191A43] hover:bg-[#25275e] text-white font-bold text-xs shadow-2xs cursor-pointer"
                                                                        >
                                                                            <Plus className="w-3.5 h-3.5 mr-1" />
                                                                            Add "{courierCategorySearch}" to Order
                                                                        </Button>
                                                                    </div>
                                                                )
                                                            }

                                                            return (
                                                                <div className="flex flex-wrap gap-2.5">
                                                                    {filteredCats.map((cat: string) => {
                                                                        const existingItem = orderMenuItems.find(m => m.name.toLowerCase() === cat.toLowerCase())
                                                                        const isSelected = Boolean(existingItem) || itemType.includes(cat)
                                                                        return (
                                                                            <button
                                                                                key={cat}
                                                                                type="button"
                                                                                onClick={() => handleTogglePackageCategory(cat)}
                                                                                className={cn(
                                                                                    "px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 border shadow-2xs cursor-pointer",
                                                                                    isSelected
                                                                                        ? "bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-slate-400/30"
                                                                                        : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                                                                )}
                                                                            >
                                                                                <Tag className={cn("w-3.5 h-3.5", isSelected ? "text-white" : "text-slate-500")} />
                                                                                <span>{cat}</span>
                                                                                {existingItem && (
                                                                                    <span className="ml-1 px-2 py-0.5 bg-white/25 rounded-full text-xs font-bold">
                                                                                        {existingItem.quantity}
                                                                                    </span>
                                                                                )}
                                                                            </button>
                                                                        )
                                                                    })}
                                                                </div>
                                                            )
                                                        })()}
                                                    </div>
                                                )}

                                                {/* Direct Custom Package / Order Item Entry */}
                                                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
                                                            <Plus className="w-4 h-4 text-slate-700" />
                                                            Add Custom Package / Order Item
                                                        </span>
                                                        <span className="text-xs text-slate-500 font-medium">Add parcels, goods or items to deliver</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                                                        <div className="sm:col-span-6">
                                                            <Input
                                                                placeholder="e.g. 2x Designer Sneakers, Birthday Cake, iPhone..."
                                                                value={customItemName}
                                                                onChange={(e) => setCustomItemName(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter") {
                                                                        e.preventDefault()
                                                                        if (customItemName.trim()) {
                                                                            handleAddCustomMenuItem(customItemName.trim(), parseFloat(customItemPrice) || 0)
                                                                            setCustomItemName("")
                                                                            setCustomItemPrice("")
                                                                        }
                                                                    }
                                                                }}
                                                                className="h-11 sm:h-12 rounded-xl bg-slate-50/50 border-zinc-200 focus-visible:border-slate-400 text-sm sm:text-base font-medium"
                                                            />
                                                        </div>
                                                        <div className="sm:col-span-3">
                                                            <div className="relative">
                                                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">GH₵</span>
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    placeholder="Price / Val (Opt)"
                                                                    value={customItemPrice}
                                                                    onChange={(e) => setCustomItemPrice(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter") {
                                                                            e.preventDefault()
                                                                            if (customItemName.trim()) {
                                                                                handleAddCustomMenuItem(customItemName.trim(), parseFloat(customItemPrice) || 0)
                                                                                setCustomItemName("")
                                                                                setCustomItemPrice("")
                                                                            }
                                                                        }
                                                                    }}
                                                                    className="h-11 sm:h-12 pl-12 rounded-xl bg-slate-50/50 border-zinc-200 focus-visible:border-slate-400 text-sm sm:text-base font-medium"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="sm:col-span-3">
                                                            <Button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (customItemName.trim()) {
                                                                        handleAddCustomMenuItem(customItemName.trim(), parseFloat(customItemPrice) || 0)
                                                                        setCustomItemName("")
                                                                        setCustomItemPrice("")
                                                                    }
                                                                }}
                                                                disabled={!customItemName.trim()}
                                                                className="w-full h-11 sm:h-12 rounded-xl bg-[#191A43] hover:bg-[#25275e] text-white text-sm sm:text-base font-bold shadow-xs cursor-pointer"
                                                            >
                                                                <Plus className="w-4 h-4 mr-1.5" />
                                                                Add Item
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Selected Package / Order Items Table */}
                                                {orderMenuItems.length > 0 && (
                                                    <div className="space-y-2.5 pt-2 border-t border-slate-200">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">
                                                                Selected Order Items ({orderMenuItems.reduce((s, i) => s + i.quantity, 0)})
                                                            </p>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setOrderMenuItems([])
                                                                    setItemType("")
                                                                }}
                                                                className="px-3.5 py-1 rounded-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/60 text-xs font-bold transition-colors cursor-pointer"
                                                            >
                                                                Clear All
                                                            </button>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {orderMenuItems.map((item, idx) => (
                                                                <div key={item.id || idx} className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs">
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-sm sm:text-base font-bold text-slate-900 truncate">{item.name}</p>
                                                                        <p className="text-xs text-slate-500 font-medium">
                                                                            {item.price > 0 ? `GH₵ ${item.price.toFixed(2)} / each` : "Delivery Item"}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="flex items-center border border-slate-200 rounded-full overflow-hidden bg-slate-50 p-0.5">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleUpdateMenuItemQty(idx, item.quantity - 1)}
                                                                                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 text-sm font-bold cursor-pointer transition-colors"
                                                                            >
                                                                                -
                                                                            </button>
                                                                            <span className="w-9 text-center text-sm sm:text-base font-bold text-slate-800">{item.quantity}</span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleUpdateMenuItemQty(idx, item.quantity + 1)}
                                                                                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 text-sm font-bold cursor-pointer transition-colors"
                                                                            >
                                                                                +
                                                                            </button>
                                                                        </div>
                                                                        {item.price > 0 && (
                                                                            <div className="text-right min-w-[80px]">
                                                                                <span className="text-sm sm:text-base font-black text-slate-900">GH₵ {(item.quantity * item.price).toFixed(2)}</span>
                                                                            </div>
                                                                        )}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleRemoveMenuItem(idx)}
                                                                            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {orderMenuItems.some(i => i.price > 0) && (
                                                            <div className="p-3.5 sm:p-4 bg-slate-100 rounded-2xl flex items-center justify-between text-sm sm:text-base font-bold text-slate-900">
                                                                <span>Items Subtotal:</span>
                                                                <span className="text-base sm:text-lg font-black text-slate-900">
                                                                    GH₵ {orderMenuItems.reduce((s, i) => s + (i.quantity * i.price), 0).toFixed(2)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Package Description / Items Summary */}
                                                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                                                    <Label htmlFor="courierItemType" className="text-xs sm:text-sm font-bold text-slate-700">
                                                        Package Description / Additional Notes
                                                    </Label>
                                                    <Input
                                                        id="courierItemType"
                                                        placeholder="e.g. Documents, Cake Box, Electronics..."
                                                        value={itemType}
                                                        onChange={(e) => setItemType(e.target.value)}
                                                        className="h-11 sm:h-12 rounded-xl bg-white border-zinc-200 focus-visible:border-slate-400 text-sm sm:text-base font-medium"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 3. SHIPPING / FREIGHT & CARGO VIEW */}
                                    {effectiveLogisticsMode === "shipping" && (
                                        <div className="space-y-4">
                                            {/* Shipping Terminal & Consignee Route Card */}
                                            <div className="bg-slate-50/60 p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/80 space-y-4 sm:space-y-5">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-sm sm:text-base lg:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                                                        <Ship className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
                                                        Cargo Shipment &amp; Consignee Destination
                                                    </h3>
                                                    <span className="text-[10px] sm:text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wider">
                                                        Cargo Shipping
                                                    </span>
                                                </div>

                                                {/* Consignee / Receiver Details */}
                                                <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
                                                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                                        <span className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-slate-700" />
                                                            Consignee / Receiver Details
                                                        </span>
                                                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">Consignee</span>
                                                    </div>
                                                    <div className="space-y-3.5 sm:space-y-4">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                            <div className="space-y-1.5">
                                                                <Label htmlFor="shippingConsigneeName" className="ml-0.5 text-xs sm:text-sm font-bold text-slate-700">
                                                                    Consignee Name <span className="text-red-500">*</span>
                                                                </Label>
                                                                <Input
                                                                    id="shippingConsigneeName"
                                                                    value={recipientName}
                                                                    onChange={(e) => setRecipientName(e.target.value)}
                                                                    placeholder="e.g. Kwame Mensah"
                                                                    required
                                                                    disabled={!canCreateOrder}
                                                                    className="h-11 sm:h-12 rounded-xl bg-slate-50/50 border-zinc-200 focus-visible:border-slate-400 text-sm sm:text-base font-medium"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label htmlFor="shippingConsigneePhone" className="ml-0.5 text-xs sm:text-sm font-bold text-slate-700">
                                                                    Consignee Phone <span className="text-red-500">*</span>
                                                                </Label>
                                                                <PhoneInputWithCountry
                                                                    id="shippingConsigneePhone"
                                                                    countryCode={dropoffCountryCode}
                                                                    phoneLocal={dropoffPhoneLocal}
                                                                    onCountryCodeChange={(code) => {
                                                                        setDropoffCountryCode(code)
                                                                        const formatted = formatFullPhone(code, dropoffPhoneLocal)
                                                                        setRecipientPhone(formatted)
                                                                    }}
                                                                    onPhoneLocalChange={(local) => {
                                                                        setDropoffPhoneLocal(local)
                                                                        const formatted = formatFullPhone(dropoffCountryCode, local)
                                                                        setRecipientPhone(formatted)
                                                                    }}
                                                                    placeholder="24 400 0000"
                                                                    required
                                                                    disabled={!canCreateOrder}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label htmlFor="shippingDestinationPort" className="ml-0.5 text-xs sm:text-sm font-bold text-slate-700">
                                                                Destination Port / Inland Terminal <span className="text-red-500">*</span>
                                                            </Label>
                                                            <Input
                                                                id="shippingDestinationPort"
                                                                value={deliveryLocation}
                                                                onChange={(e) => setDeliveryLocation(e.target.value)}
                                                                placeholder="e.g. Kumasi Inland Freight Hub"
                                                                required
                                                                disabled={!canCreateOrder}
                                                                className="h-11 sm:h-12 rounded-xl bg-slate-50/50 border-zinc-200 focus-visible:border-slate-400 text-sm sm:text-base font-medium"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Live Google Maps Preview */}
                                                {(pickupLocation || deliveryLocation) && (
                                                    <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
                                                        {pickupLocation && (
                                                            <div className="space-y-1.5">
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                    <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Origin Port (Default)</span>
                                                                </div>
                                                                <div className="w-full h-36 sm:h-44 rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
                                                                    <iframe
                                                                        title="Origin Port Map"
                                                                        width="100%"
                                                                        height="100%"
                                                                        loading="lazy"
                                                                        src={`https://maps.google.com/maps?q=${encodeURIComponent(pickupLocation)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                                                                        className="w-full h-full border-0"
                                                                    />
                                                                </div>
                                                                <a
                                                                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pickupLocation)}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors"
                                                                >
                                                                    <Navigation className="w-3.5 h-3.5" />
                                                                    Open in Google Maps
                                                                </a>
                                                            </div>
                                                        )}

                                                        {deliveryLocation && (
                                                            <div className={cn("space-y-1.5", !pickupLocation && "sm:col-start-2")}>
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700 animate-pulse" />
                                                                    <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Destination Hub</span>
                                                                </div>
                                                                <div className="w-full h-36 sm:h-44 rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
                                                                    <iframe
                                                                        title="Destination Hub Map"
                                                                        width="100%"
                                                                        height="100%"
                                                                        loading="lazy"
                                                                        src={`https://maps.google.com/maps?q=${encodeURIComponent(deliveryLocation)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                                                                        className="w-full h-full border-0"
                                                                    />
                                                                </div>
                                                                <a
                                                                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(deliveryLocation)}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors"
                                                                >
                                                                    <Navigation className="w-3.5 h-3.5" />
                                                                    Open in Google Maps
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Cargo Specifications & Dynamic Freight Calculator */}
                                            <div className="bg-slate-50/60 p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl border border-slate-200/80 space-y-4 sm:space-y-5 shadow-xs">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
                                                        <Label className="text-sm sm:text-base lg:text-lg font-black text-slate-900 tracking-tight">
                                                            Cargo Specifications &amp; Live Freight Calculation
                                                        </Label>
                                                    </div>
                                                    <span className="text-[10px] sm:text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wider">
                                                        Administrative Defaults
                                                    </span>
                                                </div>

                                                <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="waybillRef" className="text-xs sm:text-sm font-bold text-slate-700">
                                                            Waybill Reference / Bill of Lading
                                                        </Label>
                                                        <Input
                                                            id="waybillRef"
                                                            placeholder="SHP-ABC123XYZ"
                                                            value={waybillNumber}
                                                            onChange={(e) => setWaybillNumber(e.target.value)}
                                                            className="h-11 sm:h-12 rounded-xl bg-white border-zinc-200 text-sm sm:text-base font-mono font-bold"
                                                        />
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="shippingWeight" className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1">
                                                            <Scale className="w-4 h-4 text-slate-700" />
                                                            Gross Cargo Weight (kg)
                                                        </Label>
                                                        <Input
                                                            id="shippingWeight"
                                                            type="number"
                                                            step="0.1"
                                                            placeholder="e.g. 50"
                                                            value={cargoWeight}
                                                            onChange={(e) => handleCargoWeightChange(e.target.value)}
                                                            className="h-11 sm:h-12 rounded-xl bg-white border-zinc-200 text-sm sm:text-base font-bold"
                                                        />
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="shippingVolume" className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1">
                                                            <Layers className="w-4 h-4 text-slate-700" />
                                                            Volume / CBM (Optional)
                                                        </Label>
                                                        <Input
                                                            id="shippingVolume"
                                                            placeholder="e.g. 1.2 CBM / Pallet"
                                                            value={cargoDimensions}
                                                            onChange={(e) => setCargoDimensions(e.target.value)}
                                                            className="h-11 sm:h-12 rounded-xl bg-white border-zinc-200 text-sm sm:text-base font-medium"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Live Freight Rate Breakdown Card */}
                                                <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-slate-800 text-sm sm:text-base">Automated Freight Cost:</span>
                                                            <span className="text-xs sm:text-sm text-slate-500 font-mono">
                                                                ({parseFloat(cargoWeight) || 0} kg × GH₵ {freightRatePerKg}/kg) + GH₵ {handlingFee} handling
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 font-medium">Applied automatically to the order delivery &amp; freight fee.</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-base sm:text-lg font-black text-slate-900 font-mono">
                                                            GH₵ {(((parseFloat(cargoWeight) || 0) * freightRatePerKg) + handlingFee).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Customer Information (Retail / Fashion / Non-Logistics Only) */}
                            {effectiveBusinessType !== "logistics" && (
                                <div className="bg-slate-50/60 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/70 space-y-4">
                                    <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                        Customer Information
                                    </h3>
                                    <div className="grid sm:grid-cols-2 gap-3.5 sm:gap-6">
                                        <div className="space-y-1.5 sm:space-y-2">
                                            <Label htmlFor={`${effectiveBusinessType}-customerName`} className="ml-0.5 text-xs sm:text-sm font-bold text-slate-700">Customer Name <span className="text-red-500">*</span></Label>
                                            <Input
                                                id={`${effectiveBusinessType}-customerName`}
                                                value={customerName}
                                                onChange={(e) => setCustomerName(e.target.value)}
                                                placeholder="Naa"
                                                required
                                                disabled={!canCreateOrder}
                                                className="h-11 sm:h-12 rounded-xl bg-white border-zinc-200 focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80 text-sm sm:text-base font-medium"
                                            />
                                        </div>

                                        <div className="space-y-1.5 sm:space-y-2">
                                            <Label htmlFor={`${effectiveBusinessType}-customerPhone`} className="ml-0.5 text-xs sm:text-sm font-bold text-slate-700">Customer Contact</Label>
                                            <PhoneInputWithCountry
                                                id={`${effectiveBusinessType}-customerPhone`}
                                                countryCode={pickupCountryCode}
                                                phoneLocal={pickupPhoneLocal}
                                                onCountryCodeChange={(code) => {
                                                    setPickupCountryCode(code)
                                                    const formatted = formatFullPhone(code, pickupPhoneLocal)
                                                    setCustomerPhone(formatted)
                                                }}
                                                onPhoneLocalChange={(local) => {
                                                    setPickupPhoneLocal(local)
                                                    const formatted = formatFullPhone(pickupCountryCode, local)
                                                    setCustomerPhone(formatted)
                                                }}
                                                disabled={!canCreateOrder}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Payment Method Selector (Common to all businesses) */}
                            <div className="bg-slate-50/60 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/70 space-y-4">
                                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                    Expected Payment Method
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div 
                                        onClick={() => setPaymentMethod("online")}
                                        className={`border rounded-xl sm:rounded-2xl p-4 sm:p-5 cursor-pointer flex flex-col gap-1.5 transition-all ${paymentMethod === "online" ? "bg-white border-slate-900 ring-2 ring-slate-900/10 shadow-xs" : "bg-white border-slate-200 hover:bg-slate-50"}`}
                                    >
                                        <span className={`text-sm sm:text-base font-bold ${paymentMethod === "online" ? "text-slate-900" : "text-slate-800"}`}>Online Payment</span>
                                        <span className="text-xs sm:text-sm text-slate-500 leading-snug">Customer receives payment link via SMS</span>
                                    </div>
                                    <div 
                                        onClick={() => setPaymentMethod("cash")}
                                        className={`border rounded-xl sm:rounded-2xl p-4 sm:p-5 cursor-pointer flex flex-col gap-1.5 transition-all ${paymentMethod === "cash" ? "bg-slate-100 border-slate-400 ring-2 ring-slate-400/20 shadow-xs" : "bg-white border-slate-200 hover:bg-slate-50"}`}
                                    >
                                        <span className={`text-sm sm:text-base font-bold ${paymentMethod === "cash" ? "text-slate-900" : "text-slate-800"}`}>Cash / Manual Payment</span>
                                        <span className="text-xs sm:text-sm text-slate-500 leading-snug">Order marked paid immediately. No link.</span>
                                    </div>
                                </div>

                                {paymentMethod === "online" && (
                                    <div className="mt-3.5 sm:mt-4 p-4 sm:p-6 bg-slate-50/80 rounded-xl sm:rounded-2xl border border-slate-200/80 space-y-3.5 sm:space-y-4">
                                        <div className="flex items-center gap-3">
                                            <Checkbox
                                                id="triggerMomoPrompt"
                                                checked={triggerMomoPrompt}
                                                onCheckedChange={(checked) => {
                                                    setTriggerMomoPrompt(!!checked)
                                                    if (checked && !momoPhone) {
                                                        setMomoPhone(recipientPhone || customerPhone)
                                                    }
                                                }}
                                                className="w-5 h-5 rounded-md border-slate-300 text-[#191A43] focus:ring-slate-900/10 data-[state=checked]:bg-[#191A43] data-[state=checked]:border-[#191A43]"
                                            />
                                            <Label htmlFor="triggerMomoPrompt" className="text-xs sm:text-sm font-bold text-slate-800 cursor-pointer">
                                                Trigger instant Mobile Money PIN Prompt on customer's phone
                                            </Label>
                                        </div>

                                        {triggerMomoPrompt && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 pt-1 sm:pt-2">
                                                <div className="space-y-1.5 sm:space-y-2">
                                                    <Label htmlFor="momoPhone" className="ml-0.5 text-xs sm:text-sm font-bold text-slate-700">Momo Phone Number</Label>
                                                    <Input
                                                        id="momoPhone"
                                                        type="tel"
                                                        placeholder="e.g. 0244000000"
                                                        value={momoPhone}
                                                        onChange={(e) => setMomoPhone(e.target.value)}
                                                        className="h-11 sm:h-12 rounded-xl bg-white border-zinc-200 focus-visible:border-slate-400 text-sm sm:text-base font-medium"
                                                    />
                                                </div>
                                                <div className="space-y-1.5 sm:space-y-2">
                                                    <Label htmlFor="momoProvider" className="ml-0.5 text-xs sm:text-sm font-bold text-slate-700">Network Provider</Label>
                                                    <Select 
                                                        value={momoProvider} 
                                                        onValueChange={(val: 'mtn' | 'vod' | 'atl') => setMomoProvider(val)}
                                                        disabled={!!detectGhanaNetworkProvider(momoPhone)}
                                                    >
                                                        <SelectTrigger id="momoProvider" className="h-11 sm:h-12 rounded-xl bg-white border-zinc-200 focus:border-slate-400 text-sm sm:text-base font-medium">
                                                            <SelectValue placeholder="Select provider" />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl border-zinc-100 shadow-xl">
                                                            <SelectItem value="mtn" className="rounded-lg text-sm sm:text-base font-medium">MTN Ghana</SelectItem>
                                                            <SelectItem value="vod" className="rounded-lg text-sm sm:text-base font-medium">Telecel (Vodafone)</SelectItem>
                                                            <SelectItem value="atl" className="rounded-lg text-sm sm:text-base font-medium">AT (AirtelTigo)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Stock Usage & Product Selection (Non-Logistics Only) */}
                            {effectiveBusinessType !== "logistics" && (
                            <div className="bg-slate-50/50 p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/70 space-y-3.5 sm:space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="ml-0.5 text-xs sm:text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                        <Boxes className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        Stock Usage / Product Selection {isRetailBusiness && <span className="text-red-500">*</span>}
                                    </Label>
                                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inventory</span>
                                </div>

                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input 
                                        placeholder="Search inventory to add items..."
                                        value={inventorySearch}
                                        onChange={(e) => setInventorySearch(e.target.value)}
                                        onFocus={() => setIsSearchFocused(true)}
                                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                        className="pl-9 sm:pl-10 rounded-xl bg-white border-slate-200 h-10 sm:h-12 text-xs sm:text-sm"
                                    />
                                    {(inventorySearch || isSearchFocused) && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-50 max-h-48 overflow-auto">
                                            {(() => {
                                                const filtered = allInventory.filter(item => 
                                                    (item.saleType || "unit") === orderMode &&
                                                    item.name.toLowerCase().includes(inventorySearch.toLowerCase()) && 
                                                    !selectedInventory.some(s => s.id === item.id)
                                                );
                                                if (filtered.length === 0) {
                                                    return (
                                                        <div className="p-4 text-center text-xs text-slate-400 font-medium">
                                                            No available items in inventory
                                                        </div>
                                                    );
                                                }
                                                return filtered.map(item => (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault(); // Prevents input blur from closing dropdown before action completes
                                                            if (effectiveBusinessType === "hair-retail") {
                                                                if (!selectedInventory.find(s => s.id === item.id)) {
                                                                    setSelectedInventory([...selectedInventory, { 
                                                                        id: item.id, 
                                                                        name: item.name, 
                                                                        quantity: "1",
                                                                        max: parseFloat(item.quantity) - parseFloat(item.reserved || "0")
                                                                    }]);
                                                                    setItemType(item.name);
                                                                    setMetadata(prev => ({
                                                                        ...prev,
                                                                        length: item.unit || "",
                                                                        color: item.sku || ""
                                                                    }));
                                                                    toast.success(`Linked "${item.name}"`);
                                                                }
                                                            } else if (orderMode === "unit") {
                                                                if (!selectedInventory.find(s => s.id === item.id)) {
                                                                    setSelectedInventory([...selectedInventory, { 
                                                                        id: item.id, 
                                                                        name: item.name, 
                                                                        quantity: "1",
                                                                        max: parseFloat(item.quantity) - parseFloat(item.reserved || "0")
                                                                    }]);
                                                                    setItemType(item.name);
                                                                    toast.success(`Linked "${item.name}"`);
                                                                }
                                                            } else {
                                                                setSelectedItemForUnitModal(item);
                                                                setModalQuantity("1");
                                                                setIsUnitModalOpen(true);
                                                            }
                                                            setInventorySearch("");
                                                            setIsSearchFocused(false);
                                                        }}
                                                        className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between border-b border-slate-50 last:border-0"
                                                    >
                                                        <div>
                                                            <p className="text-sm font-black text-slate-700">{item.name}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{item.sku || "No SKU"}</p>
                                                        </div>
                                                        <p className="text-[10px] font-black text-emerald-500 uppercase">{parseFloat(item.quantity) - parseFloat(item.reserved || "0")} Available</p>
                                                    </button>
                                                ));
                                            })()}
                                        </div>
                                    )}
                                </div>

                                {selectedInventory.length > 0 && (
                                    <div className="space-y-2">
                                        {selectedInventory.map((item, index) => (
                                            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-xs">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">{item.name}</p>
                                                    {effectiveBusinessType === "hair-retail" && (Boolean(metadata.length) || Boolean(metadata.color)) && (
                                                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[9px] sm:text-[10px] font-medium text-slate-500">
                                                            {Boolean(metadata.length) && <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100">Length: {String(metadata.length)}</span>}
                                                            {Boolean(metadata.color) && <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100">Color: {String(metadata.color)}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 sm:gap-4 border-t border-slate-50 pt-2 sm:border-0 sm:pt-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <Label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">Qty:</Label>
                                                        <Input 
                                                            type="number"
                                                            value={item.quantity}
                                                            max={item.max}
                                                            onChange={(e) => {
                                                                const newItems = [...selectedInventory];
                                                                newItems[index].quantity = e.target.value;
                                                                setSelectedInventory(newItems);
                                                            }}
                                                            className="w-14 sm:w-16 h-7 sm:h-8 rounded-lg bg-slate-50 border-slate-100 text-xs font-bold text-center"
                                                        />
                                                    </div>
                                                    <div className="text-right flex flex-col justify-center min-w-[100px]">
                                                         {(() => {
                                                             const invItem = allInventory.find(inv => inv.id === item.id);
                                                             const qty = parseFloat(item.quantity) || 1;
                                                             const clientId = selectedClientId === "none" ? "" : selectedClientId;
                                                             const unitPrice = resolveUnitPrice(qty, invItem, clientId);
                                                             const standardCost = parseFloat(invItem?.unitCost || "0");
                                                             
                                                             // Check if this uses client-specific pricing overrides
                                                             let isClientSpecific = false;
                                                             if (clientId && invItem && Array.isArray(invItem.clientOverrides)) {
                                                                 isClientSpecific = invItem.clientOverrides.some((o: any) => o.clientId === clientId);
                                                             }
                                                             const isDiscounted = unitPrice < standardCost;
                                                             
                                                             return (
                                                                 <>
                                                                     <p className="text-xs font-black text-[#191A43]">
                                                                         GH₵ {(qty * unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                     </p>
                                                                     <p className="text-[9px] text-slate-400 font-bold uppercase flex items-center justify-end gap-1 mt-0.5">
                                                                         {isClientSpecific && <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100/50">Custom</span>}
                                                                         {!isClientSpecific && isDiscounted && <span className="text-[8px] font-extrabold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100/50">Wholesale</span>}
                                                                         GH₵ {unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/ea
                                                                     </p>
                                                                </>
                                                             );
                                                         })()}
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            const remaining = selectedInventory.filter((_, i) => i !== index);
                                                            setSelectedInventory(remaining);
                                                            if (remaining.length === 0) {
                                                                setItemType("");
                                                                if (effectiveBusinessType === "hair-retail") {
                                                                    setMetadata(prev => {
                                                                        const copy = { ...prev };
                                                                        delete copy.length;
                                                                        delete copy.color;
                                                                        return copy;
                                                                    });
                                                                }
                                                            }
                                                        }}
                                                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all shrink-0"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Order Total Summary */}
                                {(selectedInventory.length > 0 || orderMenuItems.length > 0) && (
                                    <div className="mt-3 sm:mt-4 bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
                                        <div className="px-4 sm:px-5 py-2.5 sm:py-3 bg-slate-50/80 border-b border-slate-100">
                                            <h4 className="text-[10px] font-bold text-[#191A43] uppercase tracking-wider">Order Summary</h4>
                                        </div>
                                        <div className="px-4 sm:px-5 py-2.5 sm:py-3 space-y-1.5 sm:space-y-2 border-b border-slate-100/50">
                                            {selectedInventory.map((item) => {
                                                const invItem = allInventory.find(inv => inv.id === item.id);
                                                const qty = parseFloat(item.quantity) || 1;
                                                const clientId = selectedClientId === "none" ? "" : selectedClientId;
                                                const unitPrice = resolveUnitPrice(qty, invItem, clientId);
                                                const lineTotal = qty * unitPrice;
                                                return (
                                                    <div key={item.id} className="flex items-center justify-between text-xs">
                                                        <span className="text-slate-600 font-medium truncate mr-3 sm:mr-4">
                                                            {item.name} <span className="text-slate-400">× {qty}</span>
                                                        </span>
                                                        <span className="font-bold text-slate-700 whitespace-nowrap">
                                                            GH₵ {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                            {orderMenuItems.map((item) => {
                                                const lineTotal = item.quantity * item.price;
                                                return (
                                                    <div key={item.id} className="flex items-center justify-between text-xs">
                                                        <span className="text-slate-600 font-medium truncate mr-3 sm:mr-4">
                                                            {item.name} <span className="text-slate-400">× {item.quantity}</span>
                                                        </span>
                                                        <span className="font-bold text-slate-700 whitespace-nowrap">
                                                            GH₵ {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="px-4 sm:px-5 py-2.5 sm:py-3 space-y-1 text-xs border-b border-slate-100/35">
                                            <div className="flex justify-between items-center text-slate-500">
                                                <span>Subtotal</span>
                                                <span className="font-semibold text-slate-700">GH₵ {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                            {tax > 0 && (
                                                <div className="flex justify-between items-center text-slate-500">
                                                    <span>Tax</span>
                                                    <span className="font-semibold text-slate-700">GH₵ {tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                            {deliveryFee > 0 && (
                                                <div className="flex justify-between items-center text-slate-500">
                                                    <span>Delivery Fee</span>
                                                    <span className="font-semibold text-slate-700">GH₵ {deliveryFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                            {discount > 0 && (
                                                <div className="flex justify-between items-center text-red-500">
                                                    <span>Discount</span>
                                                    <span className="font-semibold">-GH₵ {discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="px-4 sm:px-5 py-3 sm:py-3.5 bg-slate-900 flex items-center justify-between">
                                            <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Order Total</span>
                                            <span className="text-base sm:text-lg font-bold text-white">
                                                GH₵ {(subtotal + tax + deliveryFee - discount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            )}

                            {/* Additional Specifications / Details */}
                            {effectiveBusinessType !== "logistics" ? (
                                <div className="bg-slate-50/50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/70 space-y-4">
                                    <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                                        {selectedInventory.length > 0 ? "Specifications & Delivery" : "Product Specifications & Delivery"}
                                    </h3>
                                    <div className="grid sm:grid-cols-2 gap-3.5 sm:gap-6">
                                        {/* Manual fields: only rendered if NO inventory is linked and it is NOT a retail business */}
                                        {selectedInventory.length === 0 && !isRetailBusiness && (
                                            <>
                                                <div className="space-y-1.5 sm:space-y-2 relative">
                                                    <Label htmlFor={`${effectiveBusinessType}-itemType`} className="ml-0.5 text-xs sm:text-sm font-bold text-slate-700">{config.itemLabel} <span className="text-red-500">*</span></Label>
                                                    <div className="relative">
                                                        <Input
                                                            name="order-item-type-search"
                                                            id={`${effectiveBusinessType}-itemType`}
                                                            value={itemType}
                                                            onChange={(e) => setItemType(e.target.value)}
                                                            placeholder={config.itemPlaceholder}
                                                            required={selectedInventory.length === 0 && !isRetailBusiness}
                                                            autoComplete="off"
                                                            spellCheck="false"
                                                            disabled={!canCreateOrder}
                                                            className="h-11 sm:h-12 rounded-xl bg-white border-zinc-200 focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80 text-sm sm:text-base font-medium"
                                                        />
                                                    </div>
                                                </div>

                                                {!config.extraFields?.some(f => f.id === "quantity") && (
                                                    <div className="space-y-1.5 sm:space-y-2">
                                                        <Label htmlFor={`${effectiveBusinessType}-quantity`} className="ml-0.5 text-xs sm:text-sm font-bold text-slate-700">Quantity <span className="text-red-500">*</span></Label>
                                                        <Input
                                                            id={`${effectiveBusinessType}-quantity`} type="number" min="1"
                                                            value={quantity}
                                                            disabled={!canCreateOrder} onChange={(e) => setQuantity(e.target.value)} required
                                                            placeholder="1"
                                                            className="h-11 sm:h-12 rounded-xl bg-white border-zinc-200 focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80 text-sm sm:text-base font-medium"
                                                        />
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Pickup/Delivery Date — hidden for logistics (restaurant delivery) */}
                                        {effectiveBusinessType !== "logistics" && (
                                        <div className="space-y-1.5 sm:space-y-2">
                                            <Label htmlFor={`${effectiveBusinessType}-pickupDate`} className="ml-0.5 text-xs sm:text-sm font-bold text-slate-700">{config.orderLabel === "Tracking Number" ? "Date" : "Delivery Date"}</Label>
                                            <DatePicker
                                                date={pickupDate}
                                                setDate={setPickupDate}
                                                placeholder="Select a date"
                                                disabled={!canCreateOrder}
                                                fromDate={new Date(new Date().setHours(0, 0, 0, 0))}
                                            />
                                        </div>
                                        )}

                                        {/* Delivery Fee Input */}
                                        <div className="space-y-1.5 sm:space-y-2">
                                            <Label htmlFor="deliveryFee" className="ml-0.5 text-xs sm:text-sm font-bold text-slate-700">Delivery Fee (GH₵)</Label>
                                            <Input 
                                                type="number" 
                                                id="deliveryFee" 
                                                step="0.01"
                                                value={deliveryFee || ""}
                                                onChange={(e) => setDeliveryFee(Number(e.target.value) || 0)}
                                                placeholder="0.00"
                                                disabled={!canCreateOrder}
                                                className="h-11 sm:h-12 rounded-xl bg-white border-zinc-200 focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80 text-sm sm:text-base font-medium"
                                            />
                                        </div>

                                        {/* Custom metadata fields */}
                                        {config.extraFields
                                            ?.filter(field => {
                                                // Hide 'quantity' and 'sku' when inventory item is linked OR if it's a retail business
                                                if (selectedInventory.length > 0 || isRetailBusiness) {
                                                    if (effectiveBusinessType === "hair-retail" && selectedInventory.length > 0) {
                                                        return field.id !== "quantity" && field.id !== "sku" && field.id !== "length" && field.id !== "color";
                                                    }
                                                    return field.id !== "quantity" && field.id !== "sku";
                                                }
                                                return true;
                                            })
                                            .map((field) => (
                                                <div key={field.id} className="space-y-1.5 sm:space-y-2">
                                                    <Label htmlFor={`${effectiveBusinessType}-${field.id}`} className="ml-0.5 text-xs sm:text-sm font-bold text-slate-700">{field.label}</Label>
                                                    <Input
                                                        id={`${effectiveBusinessType}-${field.id}`}
                                                        type={field.type === "number" ? "number" : "text"}
                                                        value={field.id === "quantity" ? quantity : ((metadata[field.id] as string) || "")}
                                                        onChange={(e) => {
                                                            if (field.id === "quantity") {
                                                                setQuantity(e.target.value);
                                                            } else {
                                                                setMetadata({ ...metadata, [field.id]: e.target.value });
                                                            }
                                                        }}
                                                        placeholder={field.placeholder}
                                                        disabled={!canCreateOrder}
                                                        className="h-11 sm:h-12 rounded-xl bg-white border-zinc-200 focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80 text-sm sm:text-base font-medium"
                                                    />
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-50/50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/70 space-y-4">
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <Label htmlFor="deliveryFee" className="ml-0.5 text-xs sm:text-sm font-bold text-slate-700">
                                            {effectiveLogisticsMode === "shipping" ? "Freight & Handling Fee (GH₵)" : "Delivery Fee (GH₵)"}
                                        </Label>
                                        <Input 
                                            type="number" 
                                            id="deliveryFee" 
                                            step="0.01"
                                            value={deliveryFee || ""}
                                            onChange={(e) => setDeliveryFee(Number(e.target.value) || 0)}
                                            placeholder="0.00"
                                            disabled={!canCreateOrder}
                                            className="h-11 sm:h-12 rounded-xl bg-white border-zinc-200 focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80 text-sm sm:text-base font-medium"
                                        />
                                    </div>
                                </div>
                            )}

                            {effectiveBusinessType !== "logistics" && (
                                <div className="space-y-2">
                                    <Label htmlFor="measurements" className="ml-1 text-xs sm:text-sm font-bold text-slate-700">
                                        {config.id === "tailoring" ? "Notes / Measurements" : "Notes"}
                                    </Label>
                                    <Textarea
                                        id="measurements"
                                        value={measurements}
                                        onChange={(e) => setMeasurements(e.target.value)}
                                        placeholder={config.id === "tailoring" ? "Details, measurements or special instructions..." : "Additional notes or special instructions..."}
                                        rows={3}
                                        disabled={!canCreateOrder}
                                        className="rounded-xl bg-white border-zinc-200 focus-visible:border-slate-300 focus-visible:ring-[4px] focus-visible:ring-slate-100/80 resize-none p-4 text-sm sm:text-base font-medium"
                                    />
                                </div>
                            )}

                            <div className="pt-2 flex flex-col items-end gap-3">
                                <Button
                                    type="submit"
                                    size="lg"
                                    disabled={(!editingId && !hasRequiredFields) || isSaving || !canCreateOrder}
                                    className={`w-full sm:w-auto min-w-[220px] h-14 rounded-full px-8 text-base font-bold transition-all duration-300 border-0 text-white hover:brightness-95 shadow-[0_4px_20px_rgb(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.15)] hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer`}
                                    style={{
                                        backgroundColor: !canCreateOrder || isSaving
                                            ? '#94a3b8'
                                            : (!editingId
                                                ? (hasRequiredFields ? config.theme.secondary : '#cbd5e1')
                                                : config.theme.primary)
                                    }}
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        !canCreateOrder ? "Subscription Expired" : (editingId ? "Update Order" : "Create Order")
                                    )}
                                </Button>
                                
                                {!canCreateOrder && (
                                    <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                                        Upgrade your plan to continue creating orders. 
                                        <Link href="/onboarding/subscription" className="text-[#CE0003] hover:underline font-bold">Renew Now</Link>
                                    </p>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>

            {/* Unit Pricing / Wholesale Selection Modal */}
            <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
                <DialogContent className="sm:max-w-md border-0 bg-white shadow-2xl rounded-3xl p-6 overflow-hidden">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-2 bg-slate-50 rounded-xl">
                                <ShoppingBag className="w-5 h-5 text-slate-700" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-black text-slate-800 tracking-tight">Select Units Sold</DialogTitle>
                                <DialogDescription className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                    {selectedItemForUnitModal?.name}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {selectedItemForUnitModal && (
                        <div className="space-y-5 pt-2">
                            {/* Product Info Mini-Card */}
                            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-center text-xs">
                                <div>
                                    <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Available Stock</p>
                                    <p className="font-black text-slate-700 mt-0.5 text-sm">
                                        {parseFloat(selectedItemForUnitModal.quantity) - parseFloat(selectedItemForUnitModal.reserved || "0")} units left
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">SKU</p>
                                    <p className="font-black text-slate-700 mt-0.5">{selectedItemForUnitModal.sku || "N/A"}</p>
                                </div>
                            </div>

                            {/* Pricing Tiers & Unit Brackets */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block ml-1">
                                    Select Package Bracket / Tier
                                </Label>
                                <div className="grid grid-cols-1 gap-2 max-h-[180px] overflow-y-auto pr-1">
                                     {/* Standard/Retail Tier option */}
                                     {(() => {
                                         const qty = parseFloat(modalQuantity) || 1;
                                         
                                         let tiers = selectedItemForUnitModal.pricingTiers;
                                         if (selectedClientId && selectedClientId !== "none" && Array.isArray(selectedItemForUnitModal.clientOverrides)) {
                                             const clientOverride = selectedItemForUnitModal.clientOverrides.find((o: any) => o.clientId === selectedClientId);
                                             if (clientOverride && Array.isArray(clientOverride.pricingTiers)) {
                                                 tiers = clientOverride.pricingTiers;
                                             }
                                         }

                                         const isTiers = Array.isArray(tiers) && tiers.length > 0;
                                         const retailMax = isTiers ? parseFloat(tiers[0].minQty) - 1 : null;
                                         const isRetailActive = !isTiers || qty <= (retailMax || Infinity);
                                         const retailPrice = parseFloat(selectedItemForUnitModal.unitCost || "0");
                                         
                                         return (
                                             <button
                                                 type="button"
                                                 onClick={() => {
                                                     setModalQuantity("1");
                                                 }}
                                                 style={{ borderColor: isRetailActive ? config.theme.primary : undefined }}
                                                 className={`w-full p-3.5 text-left border rounded-2xl flex justify-between items-center transition-all duration-300 ${isRetailActive ? 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)] border-2' : 'bg-white border-slate-100 hover:bg-slate-50/50'}`}
                                             >
                                                 <div>
                                                     <p className="text-xs font-black text-slate-700">
                                                         Retail Unit {retailMax ? `(1-${retailMax} units)` : '(1+ units)'}
                                                     </p>
                                                     <p className="text-[10px] text-slate-400 font-bold mt-0.5">Standard purchase price</p>
                                                 </div>
                                                 <div className="text-right">
                                                     <p className="text-sm font-black text-[#191A43]">
                                                         GH₵ {retailPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                     </p>
                                                     <p className="text-[9px] text-slate-400 font-bold mt-0.5">per unit</p>
                                                 </div>
                                             </button>
                                         );
                                     })()}

                                     {/* Wholesale/Volume Tiers */}
                                     {(() => {
                                         let tiers = selectedItemForUnitModal.pricingTiers;
                                         if (selectedClientId && selectedClientId !== "none" && Array.isArray(selectedItemForUnitModal.clientOverrides)) {
                                             const clientOverride = selectedItemForUnitModal.clientOverrides.find((o: any) => o.clientId === selectedClientId);
                                             if (clientOverride && Array.isArray(clientOverride.pricingTiers)) {
                                                 tiers = clientOverride.pricingTiers;
                                             }
                                         }
                                         
                                         if (!Array.isArray(tiers)) return null;
                                         
                                         return tiers.map((tier: any, idx: number) => {
                                             const qty = parseFloat(modalQuantity) || 1;
                                             const min = parseFloat(tier.minQty);
                                             const max = tier.maxQty ? parseFloat(tier.maxQty) : Infinity;
                                             const isMatched = qty >= min && qty <= max;
                                             const price = parseFloat(tier.price);
                                             
                                             return (
                                                 <button
                                                     key={idx}
                                                     type="button"
                                                     onClick={() => {
                                                         setModalQuantity(String(min));
                                                     }}
                                                     style={{ borderColor: isMatched ? config.theme.primary : undefined }}
                                                     className={`w-full p-3.5 text-left border rounded-2xl flex justify-between items-center transition-all duration-300 ${isMatched ? 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)] border-2' : 'bg-white border-slate-100 hover:bg-slate-50/50'}`}
                                                 >
                                                     <div>
                                                         <div className="flex items-center gap-1.5">
                                                             <p className="text-xs font-black text-slate-700">
                                                                 Wholesale {tier.minQty}{tier.maxQty ? `-${tier.maxQty}` : '+'} Units
                                                             </p>
                                                             {isMatched && (
                                                                 <span className="text-[8px] font-black text-[#191A43] bg-indigo-50 border border-indigo-100/50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                                     Matched B2B Tier
                                                                 </span>
                                                             )}
                                                         </div>
                                                         <p className="text-[10px] text-slate-400 font-bold mt-0.5">Bulk discount applied</p>
                                                     </div>
                                                     <div className="text-right">
                                                         <p className="text-sm font-black text-[#191A43]">
                                                             GH₵ {price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                         </p>
                                                         <p className="text-[9px] text-slate-400 font-bold mt-0.5">per unit</p>
                                                     </div>
                                                 </button>
                                             );
                                         });
                                     })()}
                                </div>
                            </div>

                            {/* Quantity Adjuster */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                        Units Sold
                                    </Label>
                                    {(() => {
                                        const qty = parseFloat(modalQuantity) || 1;
                                        const limit = parseFloat(selectedItemForUnitModal.quantity) - parseFloat(selectedItemForUnitModal.reserved || "0");
                                        const activeLink = selectedInventory.find(s => s.id === selectedItemForUnitModal.id);
                                        const allowedMax = limit + (activeLink ? parseFloat(activeLink.quantity) : 0);
                                        
                                        if (qty > allowedMax) {
                                            return (
                                                <span className="text-[9px] font-extrabold text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100/50 uppercase tracking-wide">
                                                    Exceeds stock left ({allowedMax} units)
                                                </span>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            const val = Math.max(1, (parseFloat(modalQuantity) || 1) - 1);
                                            setModalQuantity(String(val));
                                        }}
                                        className="w-12 h-12 rounded-xl bg-slate-50 border-slate-100 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-600"
                                    >
                                        -
                                    </Button>
                                    <Input
                                        type="number"
                                        value={modalQuantity}
                                        onChange={(e) => setModalQuantity(e.target.value)}
                                        className="h-12 rounded-xl bg-white border-zinc-200 text-center font-black text-slate-800 text-lg focus-visible:ring-slate-100/80"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            const limit = parseFloat(selectedItemForUnitModal.quantity) - parseFloat(selectedItemForUnitModal.reserved || "0");
                                            const activeLink = selectedInventory.find(s => s.id === selectedItemForUnitModal.id);
                                            const allowedMax = limit + (activeLink ? parseFloat(activeLink.quantity) : 0);
                                            const current = parseFloat(modalQuantity) || 1;
                                            if (current < allowedMax) {
                                                setModalQuantity(String(current + 1));
                                            } else {
                                                toast.error("Cannot exceed available physical stock.");
                                            }
                                        }}
                                        className="w-12 h-12 rounded-xl bg-slate-50 border-slate-100 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-600"
                                    >
                                        +
                                    </Button>
                                </div>
                            </div>

                            {/* Subtotal Display */}
                            {(() => {
                                 const qty = parseFloat(modalQuantity) || 1;
                                 const clientId = selectedClientId === "none" ? "" : selectedClientId;
                                 const unitPrice = resolveUnitPrice(qty, selectedItemForUnitModal, clientId);
                                 const retailPrice = parseFloat(selectedItemForUnitModal.unitCost || "0");
                                 const savings = retailPrice > unitPrice ? (retailPrice - unitPrice) * qty : 0;
                                 
                                 return (
                                     <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex justify-between items-center">
                                         <div>
                                             <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Pricing Subtotal</p>
                                             <p className="text-2xl font-black text-[#191A43] mt-0.5">
                                                 GH₵ {(qty * unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                             </p>
                                         </div>
                                         <div className="text-right">
                                             <p className="text-[10px] text-slate-500 font-bold">
                                                 GH₵ {unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/ea
                                             </p>
                                             {savings > 0 && (
                                                 <p className="text-[9px] text-emerald-600 font-extrabold mt-0.5">
                                                     Saved GH₵ {savings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                 </p>
                                             )}
                                         </div>
                                     </div>
                                 );
                             })()}
                        </div>
                    )}

                    <DialogFooter className="mt-6 flex flex-col gap-2">
                        <Button
                            type="button"
                            onClick={() => {
                                if (!selectedItemForUnitModal) return;
                                
                                const qty = parseFloat(modalQuantity) || 1;
                                const limit = parseFloat(selectedItemForUnitModal.quantity) - parseFloat(selectedItemForUnitModal.reserved || "0");
                                const activeLink = selectedInventory.find(s => s.id === selectedItemForUnitModal.id);
                                const allowedMax = limit + (activeLink ? parseFloat(activeLink.quantity) : 0);
                                
                                if (qty > allowedMax) {
                                    toast.error(`Insufficient stock! Maximum allowed is ${allowedMax} units.`);
                                    return;
                                }

                                setSelectedInventory(prev => {
                                    const existingIdx = prev.findIndex(s => s.id === selectedItemForUnitModal.id);
                                    let next = [...prev];
                                    if (existingIdx > -1) {
                                        next[existingIdx].quantity = modalQuantity;
                                    } else {
                                        next.push({
                                            id: selectedItemForUnitModal.id,
                                            name: selectedItemForUnitModal.name,
                                            quantity: modalQuantity,
                                            max: allowedMax
                                        });
                                    }
                                    return next;
                                });

                                setItemType("");
                                setIsUnitModalOpen(false);
                                toast.success(`Linked ${modalQuantity} units of "${selectedItemForUnitModal.name}"`);
                            }}
                            className="w-full text-white rounded-xl h-12 font-bold shadow-md hover:brightness-95 border-0"
                            style={{ backgroundColor: config.theme.secondary }}
                        >
                            Confirm & Link to Order
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default function CreateOrderPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground">Loading form...</p>
            </div>
        }>
            <CreateOrderContent />
        </Suspense>
    )
}
