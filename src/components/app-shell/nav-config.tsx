"use client";

import {
  LayoutDashboard,
  Users,
  UserCog,
  CreditCard,
  CalendarCheck,
  Dumbbell,
  Salad,
  Receipt,
  FileBarChart,
  Settings,
  Wallet,
  MessageSquareText,
  LineChart,
  Building2,
  Megaphone,
  Bell,
  QrCode,
  ScanLine,
  FileUp,
  BarChart3,
  Building,
} from "lucide-react";
import type { NavItem } from "@/components/app-shell/sidebar-nav";

// Icon components (forwardRef objects) can't cross the Server->Client props
// boundary — React Server Components only serializes plain data across that
// line. Every role's server layout.tsx used to build this array itself and
// pass it as a prop into the (client) AppShell, which silently broke nav
// rendering on every dashboard. Defining the config here, imported directly
// by the client AppShell, keeps the icon components entirely in client-land
// so there's no boundary for them to fail to cross.
export const NAV_CONFIG = {
  owner: [
    { href: "/owner", label: "Dashboard", icon: LayoutDashboard },
    { href: "/owner/members", label: "Members", icon: Users },
    { href: "/owner/import-members", label: "Import Members", icon: FileUp },
    { href: "/owner/staff", label: "Staff", icon: UserCog },
    { href: "/owner/trainer-workload", label: "Trainer Workload", icon: LineChart },
    { href: "/owner/memberships", label: "Membership Plans", icon: CreditCard },
    { href: "/owner/attendance", label: "Attendance", icon: CalendarCheck },
    { href: "/owner/workouts", label: "Workouts", icon: Dumbbell },
    { href: "/owner/diet", label: "Diet Plans", icon: Salad },
    { href: "/owner/expenses", label: "Expenses", icon: Receipt },
    { href: "/owner/payments", label: "Payments", icon: Wallet },
    { href: "/owner/reports", label: "Reports", icon: FileBarChart },
    { href: "/owner/notifications", label: "Notifications", icon: Bell },
    { href: "/owner/branches", label: "Branches", icon: Building },
    { href: "/owner/settings", label: "Settings", icon: Settings },
  ],
  reception: [
    { href: "/reception", label: "Today", icon: LayoutDashboard },
    { href: "/reception/members", label: "Members", icon: Users },
    { href: "/reception/import-members", label: "Import Members", icon: FileUp },
    { href: "/reception/attendance", label: "Attendance", icon: CalendarCheck },
    { href: "/reception/qr-checkin", label: "QR Check-in", icon: ScanLine },
    { href: "/reception/payments", label: "Payments", icon: Wallet },
    { href: "/reception/notifications", label: "Notifications", icon: Bell },
    { href: "/reception/settings", label: "Settings", icon: Settings },
  ],
  trainer: [
    { href: "/trainer", label: "Dashboard", icon: LayoutDashboard },
    { href: "/trainer/members", label: "My Members", icon: Users },
    { href: "/trainer/workouts", label: "Workouts", icon: Dumbbell },
    { href: "/trainer/diet", label: "Diet Plans", icon: Salad },
    { href: "/trainer/progress", label: "Progress", icon: LineChart },
    { href: "/trainer/messages", label: "Messages", icon: MessageSquareText },
    { href: "/trainer/notifications", label: "Notifications", icon: Bell },
  ],
  member: [
    { href: "/member", label: "Dashboard", icon: LayoutDashboard },
    { href: "/member/attendance", label: "Attendance", icon: CalendarCheck },
    { href: "/member/qr", label: "My QR Code", icon: QrCode },
    { href: "/member/workout", label: "Workout", icon: Dumbbell },
    { href: "/member/diet", label: "Diet", icon: Salad },
    { href: "/member/progress", label: "Progress", icon: LineChart },
    { href: "/member/payments", label: "Payments", icon: Wallet },
    { href: "/member/notifications", label: "Notifications", icon: Bell },
    { href: "/member/chat", label: "Chat", icon: MessageSquareText },
  ],
  admin: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/gyms", label: "Gyms", icon: Building2 },
    { href: "/admin/plans", label: "Plans", icon: CreditCard },
    { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
    { href: "/admin/notifications", label: "Notifications", icon: Bell },
  ],
} satisfies Record<string, NavItem[]>;

export type NavKey = keyof typeof NAV_CONFIG;
