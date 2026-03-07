'use client';

import { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Beaker,
} from 'lucide-react';
import { format } from 'date-fns';

interface QCReport {
  id: string;
  reportNumber: string;
  productId: string;
  productName: string;
  productSKU: string;
  batchNumber: string;
  salesOrderId?: string;
  salesOrderNumber?: string;
  inspectedQuantity: number;
  passedQuantity: number;
  failedQuantity: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'ON_HOLD' | 'REJECTED';
  inspector: string;
  date: string;
  remarks?: string;
  parameters?: Record<string, string>;
}

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface SalesOrder {
  id: string;
  orderNumber: string;
}

const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <Clock size={16} /> },
  IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <Beaker size={16} /> },
  APPROVED: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle size={16} /> },
  ON_HOLD: { bg: 'bg-amber-100', text: 'text-amber-800', icon: <AlertCircle size={16} /> },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle size={16} /> },
};

const getPassRateColor = (passRate: number) => {
  if (passRate >= 95) return 'text-green-600 font-semibold';
  if (passRate >= 80) return 'text-yellow-600 font-semibold';
  return 'text-red-600 font-semibold';
};

export default function QCPage() {
  const [reports, setReports] = useState<QCReport[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const itemsPerPage = 10;

  // Fetch QC Reports
  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/qc?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
        setStats({
          total: data.total || 0,
          pending: data.pending || 0,
          approved: data.approved || 0,
          rejected: data.rejected || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching QC reports:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Products
  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/masters/products?limit=200');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Fetch Sales Orders
  const fetchSalesOrders = async () => {
    try {
      const response = await fetch('/api/orders?limit=50');
      if (response.ok) {
        const data = await response.json();
        setSalesOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching sales orders:', error);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter, searchTerm, currentPage]);

  useEffect(() => {
    if (showCreateModal) {
      fetchProducts();
      fetchSalesOrders();
    }
  }, [showCreateModal]);

  // Filtered reports based on search
  const filteredReports = reports.filter((report) =>
    report.reportNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  const stats_percentage = {
    pending: stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0,
    approved: stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0,
    rejected: stats.total > 0 ? Math.round((stats.rejected / stats.total) * 100) : 0,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <ClipboardCheck className="text-blue-600" size={28} />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Quality Control</h1>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition"
            >
              <Plus size={20} />
              New QC Report
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Reports"
            value={stats.total}
            percentage={null}
            color="blue"
          />
          <StatCard
            title="Pending"
            value={stats.pending}
            percentage={stats_percentage.pending}
            color="yellow"
          />
          <StatCard
            title="Approved"
            value={stats.approved}
            percentage={stats_percentage.approved}
            color="green"
          />
          <StatCard
            title="Rejected"
            value={stats.rejected}
            percentage={stats_percentage.rejected}
            color="red"
          />
        </div>

        {/* Filter and Search */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search by Report #, Product, Batch #..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent outline-none flex-1 text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="APPROVED">Approved</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* QC Reports Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Report #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Batch #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Sales Order #
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">
                    Inspected
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">
                    Passed
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">
                    Failed
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">
                    Pass Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Inspector
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Date
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} className="px-6 py-8 text-center text-gray-500">
                      Loading QC reports...
                    </td>
                  </tr>
                ) : paginatedReports.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-6 py-8 text-center text-gray-500">
                      No QC reports found
                    </td>
                  </tr>
                ) : (
                  paginatedReports.map((report) => {
                    const passRate =
                      report.inspectedQuantity > 0
                        ? Math.round((report.passedQuantity / report.inspectedQuantity) * 100)
                        : 0;
                    const statusColor = statusColors[report.status];

                    return (
                      <tr key={report.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-blue-600">
                          {report.reportNumber}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="font-medium text-gray-900">{report.productName}</div>
                          <div className="text-xs text-gray-500">{report.productSKU}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{report.batchNumber}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {report.salesOrderNumber || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-center font-medium text-gray-900">
                          {report.inspectedQuantity}
                        </td>
                        <td className="px-6 py-4 text-sm text-center font-medium text-green-600">
                          {report.passedQuantity}
                        </td>
                        <td className="px-6 py-4 text-sm text-center font-medium text-red-600">
                          {report.failedQuantity}
                        </td>
                        <td className={`px-6 py-4 text-sm text-center ${getPassRateColor(passRate)}`}>
                          {passRate}%
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div
                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${statusColor.bg} ${statusColor.text}`}
                          >
                            {statusColor.icon}
                            {report.status}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{report.inspector}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {format(new Date(report.date), 'dd MMM yyyy')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, filteredReports.length)} of{' '}
                {filteredReports.length} reports
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => Math.abs(p - currentPage) <= 1 || p === 1 || p === totalPages)
                    .map((page, idx, arr) => (
                      <div key={page}>
                        {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-2">...</span>}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      </div>
                    ))}
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create QC Modal */}
      {showCreateModal && (
        <CreateQCModal
          onClose={() => setShowCreateModal(false)}
          products={products}
          salesOrders={salesOrders}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchReports();
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  percentage,
  color,
}: {
  title: string;
  value: number;
  percentage: number | null;
  color: 'blue' | 'yellow' | 'green' | 'red';
}) {
  const colorMap = {
    blue: 'bg-blue-50 border-blue-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
  };

  const textColorMap = {
    blue: 'text-blue-700',
    yellow: 'text-yellow-700',
    green: 'text-green-700',
    red: 'text-red-700',
  };

  return (
    <div className={`rounded-lg border p-6 ${colorMap[color]}`}>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className={`text-3xl font-bold mt-2 ${textColorMap[color]}`}>{value}</p>
      {percentage !== null && (
        <p className="text-xs text-gray-500 mt-2">{percentage}% of total</p>
      )}
    </div>
  );
}

interface CreateQCModalProps {
  onClose: () => void;
  products: Product[];
  salesOrders: SalesOrder[];
  onSuccess: () => void;
}

function CreateQCModal({ onClose, products, salesOrders, onSuccess }: CreateQCModalProps) {
  const [formData, setFormData] = useState({
    salesOrderId: '',
    productId: '',
    batchNumber: '',
    inspectedQuantity: '',
    passedQuantity: '',
    failedQuantity: '',
    status: 'PENDING',
    remarks: '',
    parameters: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field: string, value: string | number) => {
    const updatedData = { ...formData, [field]: value };

    // Auto-calculate failedQuantity
    if (field === 'inspectedQuantity' || field === 'passedQuantity') {
      const inspected = parseFloat(
        field === 'inspectedQuantity' ? String(value) : updatedData.inspectedQuantity
      );
      const passed = parseFloat(
        field === 'passedQuantity' ? String(value) : updatedData.passedQuantity
      );

      if (!isNaN(inspected) && !isNaN(passed)) {
        updatedData.failedQuantity = String(Math.max(0, inspected - passed));
      }
    }

    setFormData(updatedData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.productId) {
      setError('Product is required');
      return;
    }

    if (!formData.batchNumber) {
      setError('Batch Number is required');
      return;
    }

    if (!formData.inspectedQuantity || parseFloat(formData.inspectedQuantity) < 0) {
      setError('Valid Inspected Quantity is required');
      return;
    }

    if (!formData.passedQuantity || parseFloat(formData.passedQuantity) < 0) {
      setError('Valid Passed Quantity is required');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        inspectedQuantity: parseFloat(formData.inspectedQuantity),
        passedQuantity: parseFloat(formData.passedQuantity),
        failedQuantity: parseFloat(formData.failedQuantity),
        salesOrderId: formData.salesOrderId || null,
        parameters: formData.parameters ? JSON.parse(formData.parameters) : null,
      };

      const response = await fetch('/api/qc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create QC report');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Create QC Report</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-light"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Sales Order (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sales Order (Optional)
            </label>
            <select
              value={formData.salesOrderId}
              onChange={(e) => handleInputChange('salesOrderId', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Sales Order</option>
              {salesOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.orderNumber}
                </option>
              ))}
            </select>
          </div>

          {/* Product (Required) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.productId}
              onChange={(e) => handleInputChange('productId', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
          </div>

          {/* Batch Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Batch Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.batchNumber}
              onChange={(e) => handleInputChange('batchNumber', e.target.value)}
              placeholder="e.g., BATCH-001"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Quantity Section */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Inspected Qty <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.inspectedQuantity}
                onChange={(e) => handleInputChange('inspectedQuantity', e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passed Qty <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.passedQuantity}
                onChange={(e) => handleInputChange('passedQuantity', e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Failed Qty (Auto)
              </label>
              <input
                type="number"
                value={formData.failedQuantity}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="APPROVED">Approved</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Parameters (JSON) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Parameters (JSON)
            </label>
            <textarea
              value={formData.parameters}
              onChange={(e) => handleInputChange('parameters', e.target.value)}
              placeholder='{"viscosity": "100 cP", "pH": "6.5", "color": "clear"}'
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">Enter JSON format for test parameters</p>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => handleInputChange('remarks', e.target.value)}
              placeholder="Additional notes or comments..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
