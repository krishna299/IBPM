"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
  Package,
  Users,
  Truck,
  ShoppingCart,
  Factory,
  FileText,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight,
  RefreshCw,
  BarChart3,
  Loader,
} from "lucide-react";

interface DashboardData {
  products: { total: number; fg: number; rm: number; pm: number };
  contacts: { customers: number; vendors: number };
  orders: {
    total: number; pending: number; inProduction: number;
    readyToShip: number; completed: number; totalRevenue: number;
  };
  finance: { totalInvoiced: number; totalPaid: number; outstanding: number };
  lowStockItems: any[];
  recentOrders: any[];
  recentActivity: any[];
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount: number) =>
    "₹" + (amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: "Total Products", value: data?.products.total || 0, sub: `FG: ${data?.products.fg || 0} | RM: ${data?.products.rm || 0} | PM: ${data?.products.pm || 0}`, icon: Package, color: "bg-blue-500", href: "/masters/products" },
    { label: "Customers", value: data?.contacts.customers || 0, icon: Users, color: "bg-green-500", href: "/masters/customers" },
    { label: "Vendors", value: data?.contacts.vendors || 0, icon: Truck, color: "bg-purple-500", href: "/masters/vendors" },
    { label: "Total Orders", value: data?.orders.total || 0, icon: ShoppingCart, color: "bg-orange-500", href: "/orders" },
    { label: "Pending Orders", value: data?.orders.pending || 0, icon: Clock, color: "bg-amber-500", href: "/orders?status=ORDER_RECEIVED" },
    { label: "In Production", value: data?.orders.inProduction || 0, icon: Factory, color: "bg-cyan-500", href: "/production" },
    { label: "Ready to Ship", value: data?.orders.readyToShip || 0, icon: Truck, color: "bg-teal-500", href: "/shipping" },
    { label: "Completed", value: data?.orders.completed || 0, icon: CheckCircle, color: "bg-emerald-500", href: "/orders?status=COMPLETED" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {session?.user?.name?.split(" ")[0] || "User"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Here&apos;s what&apos;s happening with your business today.
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href || "#"}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {card.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                  {card.sub && (
                    <p className="text-[10px] text-gray-400 mt-1">{card.sub}</p>
                  )}
                </div>
                <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Revenue + Outstanding Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 opacity-80" />
            <span className="text-xs font-medium opacity-80">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(data?.orders.totalRevenue || 0)}</p>
        </div>
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 opacity-80" />
            <span className="text-xs font-medium opacity-80">Total Paid</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(data?.finance.totalPaid || 0)}</p>
        </div>
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 opacity-80" />
            <span className="text-xs font-medium opacity-80">Outstanding</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(data?.finance.outstanding || 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Recent Orders</h2>
            <Link href="/orders" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {data?.recentOrders && data.recentOrders.length > 0 ? (
            <div className="space-y-3">
              {data.recentOrders.map((order: any) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                    <p className="text-xs text-gray-500">{order.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(order.amount)}</p>
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">No orders yet</p>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Low Stock Alerts
            </h2>
            <Link href="/masters/products" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {data?.lowStockItems && data.lowStockItems.length > 0 ? (
            <div className="space-y-2">
              {data.lowStockItems.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">SKU: {item.sku} | {item.itemType}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">{Number(item.currentStock)}</p>
                    <p className="text-[10px] text-gray-500">Reorder: {item.reorderLevel}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">No low stock alerts</p>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-500" />
          Recent Activity
        </h2>
        {data?.recentActivity && data.recentActivity.length > 0 ? (
          <div className="space-y-2">
            {data.recentActivity.map((activity: any) => (
              <div key={activity.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                  {activity.user?.charAt(0) || "S"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{activity.user}</span>
                    {" "}
                    <span className="text-gray-500">{activity.action.toLowerCase()}d</span>
                    {" "}
                    <span className="font-medium">{activity.entityType}</span>
                    {" in "}
                    <span className="text-blue-600">{activity.module}</span>
                  </p>
                </div>
                <p className="text-xs text-gray-400 flex-shrink-0">
                  {format(new Date(activity.date), "dd MMM, HH:mm")}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">No recent activity</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "New Order", icon: ShoppingCart, color: "blue", href: "/orders/new" },
            { label: "Add Product", icon: Package, color: "green", href: "/masters/products" },
            { label: "Add Customer", icon: Users, color: "purple", href: "/masters/customers" },
            { label: "Create PO", icon: Truck, color: "teal", href: "/procurement" },
            { label: "QC Report", icon: FileText, color: "orange", href: "/qc" },
            { label: "Settings", icon: RefreshCw, color: "gray", href: "/settings" },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-${action.color}-300 hover:bg-${action.color}-50 transition-all text-center`}
              >
                <Icon className={`w-5 h-5 text-${action.color}-600`} />
                <span className="text-xs font-medium text-gray-700">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
