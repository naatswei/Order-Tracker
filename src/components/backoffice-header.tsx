"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Package, Mail, Menu, X } from "lucide-react"
import { OrganizationSwitcher, UserButton, useOrganization } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { getUnreadCount } from "@/app/actions/messages"

interface BackofficeHeaderProps {
    config: {
        theme: {
            primary: string
        }
    }
}

export function BackofficeHeader({ config }: BackofficeHeaderProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const { organization } = useOrganization()

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen)

    useEffect(() => {
        if (!organization?.id) return

        const checkMessages = async () => {
            try {
                const count = await getUnreadCount(organization.id)

                // Play sound if count increased
                if (count > unreadCount && unreadCount !== 0) {
                    const { notificationSound } = await import("@/lib/notifications")
                    notificationSound.play()
                }

                setUnreadCount(count)
            } catch (error) {
                console.error("Error polling messages:", error)
            }
        }

        checkMessages()

        // Poll every 30 seconds for new messages
        const interval = setInterval(checkMessages, 30000)
        return () => clearInterval(interval)
    }, [organization?.id, unreadCount])

    return (
        <header className="sticky top-0 z-50 bg-white/60 backdrop-blur-xl border-b border-white/20 shadow-sm">
            <div className="w-full px-4 sm:px-8 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/backoffice" className="flex items-center gap-2 group">
                        <Package className="w-6 h-6 transition-transform group-hover:scale-110" style={{ color: config.theme.primary }} />
                        <div className="hidden xs:block">
                            <h1 className="text-xl font-bold tracking-tight">
                                <span className="text-[#CE0003]">O</span>
                                <span className="text-[#191A43]">Tracker</span>
                            </h1>
                            <p className="text-[10px] text-muted-foreground leading-none font-medium">Backoffice Dashboard</p>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-4">
                        <Link href="/backoffice/inbox">
                            <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full bg-slate-100/50 hover:bg-slate-200/50 border border-slate-200 shadow-sm transition-all grayscale hover:grayscale-0">
                                <Mail className="w-4 h-4 text-slate-600" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full border border-white animate-pulse" />
                                )}
                            </Button>
                        </Link>
                        <OrganizationSwitcher
                            hidePersonal={true}
                            afterCreateOrganizationUrl="/backoffice"
                            appearance={{
                                elements: {
                                    rootBox: "flex items-center",
                                    organizationSwitcherTrigger: "h-9 px-3 rounded-full border border-input bg-transparent hover:bg-accent hover:text-accent-foreground transition-all"
                                }
                            }}
                        />
                        <UserButton
                            appearance={{
                                elements: {
                                    userButtonAvatarBox: "w-9 h-9 border border-slate-200 shadow-sm hover:ring-2 ring-primary/10 transition-all"
                                }
                            }}
                        />
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center gap-2">
                        <Link href="/backoffice/inbox">
                            <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full bg-slate-100/50 hover:bg-slate-200/50 border border-slate-200 shadow-sm transition-colors">
                                <Mail className="w-4 h-4 text-slate-600" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full border border-white animate-pulse" />
                                )}
                            </Button>
                        </Link>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleMenu}
                            className="h-9 w-9 rounded-full bg-slate-200/50 hover:bg-slate-200 border border-slate-200 shadow-sm transition-colors"
                        >
                            {isMenuOpen ? <X className="w-5 h-5 text-slate-600" /> : <Menu className="w-5 h-5 text-slate-600" />}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation Overlay */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="md:hidden border-t border-slate-100 bg-white/95 backdrop-blur-xl overflow-hidden shadow-xl"
                    >
                        <div className="px-4 py-6 space-y-6">
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Switch Organization</p>
                                <div className="w-full">
                                    <OrganizationSwitcher
                                        hidePersonal={true}
                                        afterCreateOrganizationUrl="/backoffice"
                                        appearance={{
                                            elements: {
                                                rootBox: "flex w-full",
                                                organizationSwitcherTrigger: "h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 w-full justify-between"
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex items-center justify-between px-1">
                                <div className="flex items-center gap-3">
                                    <UserButton
                                        appearance={{
                                            elements: {
                                                userButtonAvatarBox: "w-10 h-10 border-2 border-white shadow-md"
                                            }
                                        }}
                                    />
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">Manage Account</p>
                                        <p className="text-[11px] text-slate-500">Settings & Security</p>
                                    </div>
                                </div>
                                <Link href="/backoffice/profile" onClick={() => setIsMenuOpen(false)}>
                                    <Button variant="ghost" size="sm" className="text-[#191A43] hover:bg-slate-100 font-bold transition-colors">
                                        View Profile
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    )
}
