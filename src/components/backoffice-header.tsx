"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Package, Mail, Menu, X, LayoutDashboard, ClipboardList, Settings, ChevronRight } from "lucide-react"
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
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b-[0.5px] border-slate-100 shadow-[0_2px_20px_rgb(0,0,0,0.02)]">
            <div className="w-full px-4 sm:px-8 py-4 flex items-center justify-between">
                {/* Logo */}
                <Link href="/backoffice" className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                        <Package className="w-4 h-4 text-slate-800 transition-transform group-hover:scale-110" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold tracking-tight flex items-center">
                            <span className="text-[#CE0003]">O</span><span className="text-[#191A43]">Tracker</span>
                        </h1>
                        <p className="text-[11px] text-slate-500 font-medium mt-[2px]">Backoffice Dashboard</p>
                    </div>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-3 lg:gap-5">
                    {/* Action Items */}
                    <div className="flex items-center gap-2">
                        <Link href="/backoffice/inbox">
                            <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full bg-white hover:bg-slate-50 border border-slate-200 shadow-sm transition-all text-slate-600 hover:text-slate-900" title="Inbox">
                                <Mail className="w-4 h-4" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-[5px] right-[5px] w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse" />
                                )}
                            </Button>
                        </Link>
                        <Link href="/backoffice/profile">
                            <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full bg-white hover:bg-slate-50 border border-slate-200 shadow-sm transition-all text-slate-600 hover:text-slate-900" title="Settings">
                                <Settings className="w-4 h-4" />
                            </Button>
                        </Link>
                    </div>

                    {/* Divider */}
                    <div className="w-[1px] h-6 bg-slate-200" />

                    {/* Identity & Workspace */}
                    <div className="flex items-center gap-3 bg-white border border-slate-200 shadow-sm rounded-full py-1 pr-1 pl-3 transition-colors hover:border-slate-300">
                        <OrganizationSwitcher
                            hidePersonal={true}
                            afterCreateOrganizationUrl="/backoffice"
                            afterSelectOrganizationUrl="/backoffice"
                            afterLeaveOrganizationUrl="/backoffice"
                            appearance={{
                                elements: {
                                    rootBox: "flex items-center",
                                    organizationSwitcherTrigger: "h-7 px-2 rounded-md bg-transparent hover:bg-slate-100 transition-all border-none shadow-none text-slate-700 focus:ring-0",
                                    organizationSwitcherPopoverCard: "z-[60]"
                                }
                            }}
                        />
                        <UserButton
                            afterSignOutUrl="/"
                            appearance={{
                                elements: {
                                    userButtonAvatarBox: "w-7 h-7 shadow-sm hover:scale-105 transition-all"
                                }
                            }}
                        />
                    </div>
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

            {/* Mobile Navigation Overlay */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="md:hidden absolute top-full left-0 right-0 bg-white border-t border-slate-100 shadow-[0_20px_60px_rgb(0,0,0,0.08)] overflow-visible z-50"
                    >
                        <div className="px-5 py-5 space-y-4">
                            {/* Quick Navigation Links */}
                            <nav className="space-y-1">
                                <Link
                                    href="/backoffice"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors group"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-[#191A43]/10 transition-colors">
                                        <LayoutDashboard className="w-4 h-4 text-slate-500 group-hover:text-[#191A43] transition-colors" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-slate-800">Dashboard</p>
                                        <p className="text-[11px] text-slate-400">Overview & analytics</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-300" />
                                </Link>

                                <Link
                                    href="/backoffice/inbox"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors group"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-[#191A43]/10 transition-colors relative">
                                        <Mail className="w-4 h-4 text-slate-500 group-hover:text-[#191A43] transition-colors" />
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#CE0003] rounded-full text-[9px] text-white font-bold flex items-center justify-center border-2 border-white">
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-slate-800">Messages</p>
                                        <p className="text-[11px] text-slate-400">
                                            {unreadCount > 0 ? `${unreadCount} unread` : 'Customer inquiries'}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-300" />
                                </Link>

                                <Link
                                    href="/backoffice/profile"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-700 hover:bg-slate-50 transition-colors group"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-[#191A43]/10 transition-colors">
                                        <Settings className="w-4 h-4 text-slate-500 group-hover:text-[#191A43] transition-colors" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-slate-800">Profile</p>
                                        <p className="text-[11px] text-slate-400">Settings & preferences</p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-300" />
                                </Link>
                            </nav>

                            {/* Divider */}
                            <div className="border-t border-slate-100" />

                            {/* User Account Section */}
                            <div className="flex items-center gap-3 px-1">
                                <UserButton
                                    afterSignOutUrl="/"
                                    appearance={{
                                        elements: {
                                            userButtonAvatarBox: "w-10 h-10 border-2 border-slate-200 shadow-sm"
                                        }
                                    }}
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">Account</p>
                                    <p className="text-[11px] text-slate-400">Manage & security</p>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-slate-100" />

                            {/* Organization Section */}
                            <div className="space-y-2.5">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">Workspace</p>
                                <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                                    <OrganizationSwitcher
                                        hidePersonal={true}
                                        afterCreateOrganizationUrl="/backoffice"
                                        afterSelectOrganizationUrl="/backoffice"
                                        afterLeaveOrganizationUrl="/backoffice"
                                        appearance={{
                                            elements: {
                                                rootBox: "flex w-full",
                                                organizationSwitcherTrigger: "h-10 px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 w-full justify-between shadow-sm text-sm font-medium",
                                                organizationSwitcherPopoverCard: "z-[60]"
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header >
    )
}
