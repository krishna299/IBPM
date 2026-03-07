"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  Warehouse,
  Tags,
  Box,
  DollarSign,
  ShoppingCart,
  Factory,
  ClipboardCheck,
  FileText,
  BarChart3,
  Settings,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  module?: string;
  children?: { label: string; href: string; module?: string }[];
}

const navigation: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Masters",
    href: "/masters",
    icon: Package,
    children: [
      { label: "Products (FG/RM/PM)", href: "/masters/products", module: "products" },
      { label: "Customers", href: "/masters/customers", module: "customers" },
      { label: "Vendors", href: "/masters/vendors", module: "vendors" },
      { label: "Warehouses", href: "/masters/warehouses", module: "warehouses" },
      { label: "Categories", href: "/masters/categories", module: "categories" },
      { label: "Bill of Materials", href: "/masters/bom", module: "bom" },
      { label: "Tax / UOM / Packaging", href: "/masters/settings", module: "settings" },
    ],
  },
  { label: "Orders", href: "/orders", icon: ShoppingCart, module: "orders" },
  { label: "Production", href: "/production", icon: Factory, module: "production" },
  { label: "Procurement", href: "/procurement", icon: Truck, module: "procurement" },
  { label: "QC / QA", href: "/qc", icon: ClipboardCheck, module: "qc" },
  { label: "Shipping", href: "/shipping", icon: Box, module: "shipping" },
  { label: "Invoices", href: "/invoices", icon: FileText, module: "invoices" },
  { label: "Reports", href: "/reports", icon: BarChart3, module: "reports" },
  { label: "Settings", href: "/settings", icon: Settings, module: "settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [expandedItems, setExpandedItems] = useState<string[]>(["Masters"]);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    );
  };

  const hasPermission = (moduleName?: string) => {
    if (!moduleName) return true;
    if (session?.user?.role === "Admin") return true;
    return session?.user?.permissions?.some(
      (p) => p.module === moduleName && p.canView
    );
  };

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="p-4 border-b border-slate-700">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="font-bold text-sm">IB</span>
          </div>
          <div>
            <h1 className="font-bold text-sm">IBPM</h1>
            <p className="text-[10px] text-slate-400">Esthetic Insights</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navigation.map((item) => {
          if (!hasPermission(item.module)) return null;

          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const isExpanded = expandedItems.includes(item.label);
          const Icon = item.icon;

          if (item.children) {
            return (
              <div key={item.label} className="mb-0.5">
                <button
                  onClick={() => toggleExpand(item.label)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>
                {isExpanded && (
                  <div className="ml-4 mt-0.5 space-y-0.5">
                    {item.children.map((child) => {
                      if (!hasPermission(child.module)) return null;
                      const childActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "block px-3 py-1.5 rounded-md text-xs transition-colors",
                            childActive
                              ? "bg-blue-600 text-white"
                              : "text-slate-400 hover:bg-slate-800 hover:text-white"
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-slate-700">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
            {session?.user?.name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">
              {session?.user?.name || "User"}
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              {session?.user?.role || ""}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-slate-400 hover:text-white transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
