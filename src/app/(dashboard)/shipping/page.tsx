'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Truck,
  Package,
  Plus,
  Search,
  MapPin,
  Clock,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import CreateShipmentModal from '@/components/shipping/CreateShipmentModal';

interface Shipment {
  id: string;
  shipmentNumber: string;
  salesOrderId: string;
  orderNumber: string;
  customerName: string;
  warehouseName: string;
  courierPartner: string;
  trackingNumber: string;
  status: 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED';
  estimatedDelivery: string;
  createdAt: string;
}

interface Stats {
  totalShipments: number;
  dispatched: number;
  inTransit: number;
  delivered: number;
}

const statusColors: Record<string, string> = {
  DISPATCHED: 'bg-blue-100 text-blue-800 border-blue-300',
  IN_TRANSIT: 'bg-amber-100 text-amber-800 border-amber-300',
  DELIVERED: 'bg-green-100 text-green-800 border-green-300',
  RETURNED: 'bg-red-100 text-red-800 border-red-300',
};

const statusIcons: Record<string, React.ReactNode> = {
  DISPATCHED: <Package className="w-4 h-4" />,
  IN_TRANSIT: <Truck className="w-4 h-4" />,
  DELIVERED: <CheckCircle className="w-4 h-4" />,
  RETURNED: <MapPin className="w-4 h-4" />,
};

export default function ShippingPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalShipments: 0,
    dispatched: 0,
    inTransit: 0,
    delivered: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchShipments();
  }, [statusFilter, searchTerm, currentPage]);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());

      const response = await fetch(`/api/shipping?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch shipments');

      const data = await response.json();
      setShipments(data.shipments || []);
      setTotalPages(data.totalPages || 1);
      setStats({
        totalShipments: data.stats?.totalShipments || 0,
        dispatched: data.stats?.dispatched || 0,
        inTransit: data.stats?.inTransit || 0,
        delivered: data.stats?.delivered || 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShipment = async () => {
    await fetchShipments();
    setShowCreateModal(false);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-sky-100 p-3 rounded-lg">
              <Truck className="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Shipping & Dispatch
              </h1>
              <p className="text-gray-500 text-sm">Manage shipments and track deliveries</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Create Shipment
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Shipments"
            value={stats.totalShipments}
            icon={<Package className="w-5 h-5" />}
            color="bg-blue-50 text-blue-600"
          />
          <StatCard
            title="Dispatched"
            value={stats.dispatched}
            icon={<Truck className="w-5 h-5" />}
            color="bg-amber-50 text-amber-600"
          />
          <StatCard
            title="In Transit"
            value={stats.inTransit}
            icon={<Clock className="w-5 h-5" />}
            color="bg-purple-50 text-purple-600"
          />
          <StatCard
            title="Delivered"
            value={stats.delivered}
            icon={<CheckCircle className="w-5 h-5" />}
            color="bg-green-50 text-green-600"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by shipment #, tracking #, or customer..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={handleStatusChange}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white"
            >
              <option value="">All Statuses</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="DELIVERED">Delivered</option>
              <option value="RETURNED">Returned</option>
            </select>
          </div>
        </div>

        {/* Shipments Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-gray-500">Loading shipments...</div>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-red-500">Error: {error}</div>
            </div>
          ) : shipments.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-gray-500">No shipments found</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Shipment #
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Order #
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Warehouse
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Courier
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Tracking #
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Est. Delivery
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {shipments.map((shipment) => (
                    <tr
                      key={shipment.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {shipment.shipmentNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <Link
                          href={`/orders/${shipment.salesOrderId}`}
                          className="text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1"
                        >
                          {shipment.orderNumber}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {shipment.customerName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {shipment.warehouseName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {shipment.courierPartner}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                        {shipment.trackingNumber}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${
                            statusColors[shipment.status]
                          }`}
                        >
                          {statusIcons[shipment.status]}
                          {shipment.status}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {format(
                          new Date(shipment.estimatedDelivery),
                          'MMM dd, yyyy'
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button className="text-sky-600 hover:text-sky-700 font-medium">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                    page === currentPage
                      ? 'bg-sky-500 text-white'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Create Shipment Modal */}
      {showCreateModal && (
        <CreateShipmentModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateShipment}
        />
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
      </div>
    </div>
  );
}
