'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Package,
  Clock,
  User,
  MapPin,
  FileText,
  Truck,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Calendar,
  DollarSign,
  History,
  Layers,
  Edit2,
  Printer,
} from 'lucide-react';

interface OrderData {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    gstNumber: string;
    billingAddress: string;
  };
  items: Array<{
    id: string;
    product: {
      id: string;
      name: string;
      sku: string;
    };
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    taxPercent: number;
  }>;
  statusLogs: Array<{
    id: string;
    status: string;
    changedAt: string;
    changedBy: {
      id: string;
      name: string;
      email: string;
    };
    remarks: string;
  }>;
  productionPlans: Array<{
    id: string;
    status: string;
    startDate: string;
    endDate: string;
  }>;
  shipments: Array<{
    id: string;
    trackingNumber: string;
    carrier: string;
    status: string;
    estimatedDelivery: string;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    amount: number;
    paymentStatus: string;
    invoiceDate: string;
  }>;
  orderDate: string;
  expectedDeliveryDate: string;
  paymentTerms: string;
  shippingMethod: string;
  notes: string;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
}

interface StatusTransition {
  status: string;
  label: string;
  color: string;
}

const STATUS_COLORS: Record<string, string> = {
  ORDER_RECEIVED: 'bg-blue-100 text-blue-800 border-blue-300',
  ORDER_CONFIRMED: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  PRODUCTION_PLANNED: 'bg-purple-100 text-purple-800 border-purple-300',
  IN_PRODUCTION: 'bg-amber-100 text-amber-800 border-amber-300',
  PRODUCTION_COMPLETE: 'bg-lime-100 text-lime-800 border-lime-300',
  QC_PENDING: 'bg-orange-100 text-orange-800 border-orange-300',
  QC_APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  QC_REJECTED: 'bg-red-100 text-red-800 border-red-300',
  PACKAGING: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  READY_TO_SHIP: 'bg-teal-100 text-teal-800 border-teal-300',
  SHIPPED: 'bg-sky-100 text-sky-800 border-sky-300',
  DELIVERED: 'bg-green-100 text-green-800 border-green-300',
  INVOICED: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  PAYMENT_PENDING: 'bg-amber-100 text-amber-800 border-amber-300',
  PAYMENT_RECEIVED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  COMPLETED: 'bg-green-100 text-green-800 border-green-300',
  CANCELLED: 'bg-red-100 text-red-800 border-red-300',
  ON_HOLD: 'bg-gray-100 text-gray-800 border-gray-300',
};

const STATUS_PROGRESS_STEPS = [
  'ORDER_RECEIVED',
  'ORDER_CONFIRMED',
  'PRODUCTION_PLANNED',
  'IN_PRODUCTION',
  'PRODUCTION_COMPLETE',
  'QC_APPROVED',
  'PACKAGING',
  'SHIPPED',
];

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    ORDER_RECEIVED: 'Order Received',
    ORDER_CONFIRMED: 'Order Confirmed',
    PRODUCTION_PLANNED: 'Production Planned',
    IN_PRODUCTION: 'In Production',
    PRODUCTION_COMPLETE: 'Production Complete',
    QC_PENDING: 'QC Pending',
    QC_APPROVED: 'QC Approved',
    QC_REJECTED: 'QC Rejected',
    PACKAGING: 'Packaging',
    READY_TO_SHIP: 'Ready to Ship',
    SHIPPED: 'Shipped',
    DELIVERED: 'Delivered',
    INVOICED: 'Invoiced',
    PAYMENT_PENDING: 'Payment Pending',
    PAYMENT_RECEIVED: 'Payment Received',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    ON_HOLD: 'On Hold',
  };
  return labels[status] || status;
};

const getStatusBgColor = (status: string): string => {
  const bgColors: Record<string, string> = {
    ORDER_RECEIVED: 'bg-blue-500',
    ORDER_CONFIRMED: 'bg-indigo-500',
    PRODUCTION_PLANNED: 'bg-purple-500',
    IN_PRODUCTION: 'bg-amber-500',
    PRODUCTION_COMPLETE: 'bg-lime-500',
    QC_PENDING: 'bg-orange-500',
    QC_APPROVED: 'bg-emerald-500',
    QC_REJECTED: 'bg-red-500',
    PACKAGING: 'bg-cyan-500',
    READY_TO_SHIP: 'bg-teal-500',
    SHIPPED: 'bg-sky-500',
    DELIVERED: 'bg-green-500',
    INVOICED: 'bg-indigo-500',
    PAYMENT_PENDING: 'bg-amber-500',
    PAYMENT_RECEIVED: 'bg-emerald-500',
    COMPLETED: 'bg-green-500',
    CANCELLED: 'bg-red-500',
    ON_HOLD: 'bg-gray-500',
  };
  return bgColors[status] || 'bg-gray-500';
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [statusTransitions, setStatusTransitions] = useState<StatusTransition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [statusRemarks, setStatusRemarks] = useState('');
  const [activeTab, setActiveTab] = useState<'production' | 'shipments' | 'invoices'>('production');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/orders/${orderId}`);
        if (!response.ok) throw new Error('Failed to fetch order');
        const data = await response.json();
        setOrder(data);

        const statusResponse = await fetch(`/api/orders/${orderId}/status`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          setStatusTransitions(statusData.availableTransitions || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const handleStatusChange = async () => {
    if (!selectedStatus || !order) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: selectedStatus,
          remarks: statusRemarks,
        }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      const updatedOrder = await response.json();
      setOrder(updatedOrder);
      setShowStatusModal(false);
      setSelectedStatus(null);
      setStatusRemarks('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const getStepStatus = (step: string): 'completed' | 'current' | 'future' => {
    if (!order) return 'future';

    const currentIndex = STATUS_PROGRESS_STEPS.indexOf(order.status);
    const stepIndex = STATUS_PROGRESS_STEPS.indexOf(step);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'future';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-500">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error || 'Order not found'}</p>
          <Link href="/orders" className="text-blue-600 hover:underline">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const calculateLineTotal = (item: OrderData['items'][0]): number => {
    const discountedPrice = item.unitPrice * (1 - item.discountPercent / 100);
    const beforeTax = discountedPrice * item.quantity;
    const tax = beforeTax * (item.taxPercent / 100);
    return beforeTax + tax;
  };

  const canEdit = ['ORDER_RECEIVED', 'ORDER_CONFIRMED'].includes(order.status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/orders"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Order #{order.orderNumber}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Created {format(new Date(order.createdAt), 'MMM d, yyyy')} by{' '}
                  {order.createdBy?.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`px-4 py-2 rounded-lg font-semibold border-2 ${STATUS_COLORS[order.status]}`}
              >
                {getStatusLabel(order.status)}
              </div>
              <div className="flex gap-2">
                {canEdit && (
                  <Link
                    href={`/orders/${orderId}/edit`}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Edit</span>
                  </Link>
                )}
                <button className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  <Printer className="w-4 h-4" />
                  <span className="text-sm font-medium">Print</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Progress Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-6">Order Progress</h3>
          <div className="flex items-center justify-between">
            {STATUS_PROGRESS_STEPS.map((step, index) => {
              const status = getStepStatus(step);
              const isLast = index === STATUS_PROGRESS_STEPS.length - 1;

              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-2 font-semibold text-sm transition-all ${
                        status === 'completed'
                          ? 'bg-green-500 border-green-500 text-white'
                          : status === 'current'
                            ? `${getStatusBgColor(step)} border-current text-white`
                            : 'bg-gray-100 border-gray-300 text-gray-400'
                      }`}
                    >
                      {status === 'completed' ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-2 text-center w-16">
                      {getStatusLabel(step)}
                    </p>
                  </div>
                  {!isLast && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        status === 'completed' || getStepStatus(STATUS_PROGRESS_STEPS[index + 1]) !== 'future'
                          ? 'bg-green-500'
                          : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Actions Card */}
        {statusTransitions.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {statusTransitions.map((transition) => (
                <button
                  key={transition.status}
                  onClick={() => {
                    setSelectedStatus(transition.status);
                    setShowStatusModal(true);
                  }}
                  className={`p-3 rounded-lg font-medium text-sm transition-all border-2 ${STATUS_COLORS[transition.status]} hover:shadow-md`}
                >
                  {getStatusLabel(transition.status)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Status Modal */}
        {showStatusModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Update Order Status
              </h3>
              <p className="text-gray-600 mb-4">
                Change status to{' '}
                <span className="font-semibold">{getStatusLabel(selectedStatus || '')}</span>
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks (optional)
                </label>
                <textarea
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add any remarks about this status change..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setSelectedStatus(null);
                    setStatusRemarks('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusChange}
                  disabled={updating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Order Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Customer Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-600" />
              Customer Details
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Name
                </p>
                <p className="text-gray-900 font-medium">{order.customer.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Email
                </p>
                <p className="text-gray-900">{order.customer.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Phone
                </p>
                <p className="text-gray-900">{order.customer.phone}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  GST Number
                </p>
                <p className="text-gray-900 font-mono">{order.customer.gstNumber}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Billing Address
                </p>
                <p className="text-gray-900">{order.customer.billingAddress}</p>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-600" />
              Order Details
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Order Date
                </p>
                <p className="text-gray-900 font-medium">
                  {format(new Date(order.orderDate), 'MMM d, yyyy')}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Expected Delivery
                </p>
                <p className="text-gray-900">
                  {format(new Date(order.expectedDeliveryDate), 'MMM d, yyyy')}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Payment Terms
                </p>
                <p className="text-gray-900">{order.paymentTerms}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Shipping Method
                </p>
                <p className="text-gray-900">{order.shippingMethod}</p>
              </div>
              {order.notes && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Notes
                  </p>
                  <p className="text-gray-900">{order.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order Items Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Order Items</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Discount %
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Tax %
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Line Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {order.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{item.product.name}</p>
                        <p className="text-sm text-gray-500 font-mono">{item.product.sku}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900 font-medium">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900">
                      {item.discountPercent}%
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900">{item.taxPercent}%</td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                      {formatCurrency(calculateLineTotal(item))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex justify-end gap-8">
              <div>
                <p className="text-sm text-gray-600 mb-1">Subtotal</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(order.subtotal)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Tax Total</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(order.taxTotal)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Grand Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(order.grandTotal)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-600" />
            Activity Timeline
          </h3>
          <div className="space-y-6">
            {order.statusLogs && order.statusLogs.length > 0 ? (
              order.statusLogs
                .sort(
                  (a, b) =>
                    new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
                )
                .map((log, index) => (
                  <div key={log.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${getStatusBgColor(log.status)} border-current text-white`}
                      >
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      {index < order.statusLogs!.length - 1 && (
                        <div className="w-0.5 h-12 bg-gray-200 my-2" />
                      )}
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[log.status]}`}
                        >
                          {getStatusLabel(log.status)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(log.changedAt), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        Changed by <span className="font-medium">{log.changedBy?.name}</span>
                      </p>
                      {log.remarks && (
                        <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded border border-gray-200 italic">
                          "{log.remarks}"
                        </p>
                      )}
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-gray-500 text-center py-8">No activity yet</p>
            )}
          </div>
        </div>

        {/* Related Records Tabs */}
        {(order.productionPlans.length > 0 ||
          order.shipments.length > 0 ||
          order.invoices.length > 0) && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200">
              {order.productionPlans.length > 0 && (
                <button
                  onClick={() => setActiveTab('production')}
                  className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'production'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Layers className="w-4 h-4" />
                    Production Plans
                  </div>
                </button>
              )}
              {order.shipments.length > 0 && (
                <button
                  onClick={() => setActiveTab('shipments')}
                  className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'shipments'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Truck className="w-4 h-4" />
                    Shipments
                  </div>
                </button>
              )}
              {order.invoices.length > 0 && (
                <button
                  onClick={() => setActiveTab('invoices')}
                  className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'invoices'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" />
                    Invoices
                  </div>
                </button>
              )}
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Production Plans Tab */}
              {activeTab === 'production' && order.productionPlans.length > 0 && (
                <div className="space-y-4">
                  {order.productionPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">Production Plan</p>
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Status:</span>{' '}
                            {getStatusLabel(plan.status)}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Start:</span>{' '}
                            {format(new Date(plan.startDate), 'MMM d, yyyy')}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">End:</span>{' '}
                            {format(new Date(plan.endDate), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[plan.status]}`}
                        >
                          {getStatusLabel(plan.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Shipments Tab */}
              {activeTab === 'shipments' && order.shipments.length > 0 && (
                <div className="space-y-4">
                  {order.shipments.map((shipment) => (
                    <div
                      key={shipment.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 flex items-center gap-2">
                            <Truck className="w-4 h-4 text-gray-600" />
                            {shipment.carrier}
                          </p>
                          <p className="text-sm text-gray-600 mt-2 font-mono">
                            Tracking: {shipment.trackingNumber}
                          </p>
                          <p className="text-sm text-gray-600">
                            Est. Delivery:{' '}
                            {format(new Date(shipment.estimatedDelivery), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[shipment.status]}`}
                        >
                          {getStatusLabel(shipment.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Invoices Tab */}
              {activeTab === 'invoices' && order.invoices.length > 0 && (
                <div className="space-y-4">
                  {order.invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-600" />
                            {invoice.invoiceNumber}
                          </p>
                          <p className="text-sm text-gray-600 mt-2">
                            <span className="font-medium">Amount:</span>{' '}
                            {formatCurrency(invoice.amount)}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Date:</span>{' '}
                            {format(new Date(invoice.invoiceDate), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[invoice.paymentStatus]}`}
                        >
                          {getStatusLabel(invoice.paymentStatus)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
