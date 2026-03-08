'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  MoreHorizontal,
  X,
  AlertCircle,
} from 'lucide-react';

interface Warehouse {
  id: string;
  name: string;
  code: string;
  warehouseType: 'MANUFACTURING' | 'STORAGE' | 'DISPATCH';
  address: string;
  city: string;
  state: string;
  pincode: string;
  managerName: string;
  managerPhone: string;
  status: 'ACTIVE' | 'INACTIVE';
  _count?: {
    inventory: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  page: number;
  totalPages: number;
  total: number;
}

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Jammu & Kashmir',
  'Ladakh',
];

const WAREHOUSE_TYPES = [
  { value: 'MANUFACTURING', label: 'Manufacturing' },
  { value: 'STORAGE', label: 'Storage' },
  { value: 'DISPATCH', label: 'Dispatch' },
];

function WarehouseFormModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Warehouse>) => Promise<void>;
  isLoading: boolean;
  initialData?: Warehouse;
}) {
  const [formData, setFormData] = useState<Partial<Warehouse>>({
    name: '',
    code: '',
    warehouseType: 'GENERAL',
    address: '',
    city: '',
    state: '',
    pincode: '',
    managerName: '',
    managerPhone: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        name: '',
        code: '',
        warehouseType: 'GENERAL',
        address: '',
        city: '',
        state: '',
        pincode: '',
        managerName: '',
        managerPhone: '',
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Warehouse name is required';
    }

    if (!formData.code?.trim()) {
      newErrors.code = 'Code is required';
    } else if (formData.code.length < 3) {
      newErrors.code = 'Code must be at least 3 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const submittedData = {
        ...formData,
        code: formData.code?.toUpperCase(),
      };
      await onSubmit(submittedData);
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {initialData ? 'Edit Warehouse' : 'Create New Warehouse'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isLoading}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name and Code Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Warehouse Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Mumbai Main Warehouse"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., MUM001"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                  errors.code ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
            </div>
          </div>

          {/* Warehouse Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Warehouse Type
            </label>
            <select
              value={formData.warehouseType || 'GENERAL'}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  warehouseType: e.target.value as Warehouse['warehouseType'],
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {WAREHOUSE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Enter warehouse address"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* City, State, Pincode */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g., Mumbai"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <select
                value={formData.state || ''}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Select State</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pincode
              </label>
              <input
                type="text"
                value={formData.pincode || ''}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                placeholder="e.g., 400001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Manager Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manager Name
              </label>
              <input
                type="text"
                value={formData.managerName || ''}
                onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                placeholder="e.g., John Doe"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manager Phone
              </label>
              <input
                type="tel"
                value={formData.managerPhone || ''}
                onChange={(e) => setFormData({ ...formData, managerPhone: e.target.value })}
                placeholder="e.g., 9876543210"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? 'Saving...' : initialData ? 'Update Warehouse' : 'Create Warehouse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WarehouseTypeStatus({ type }: { type: Warehouse['warehouseType'] }) {
  const typeConfig = {
    MANUFACTURING: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'MFG' },
    STORAGE: { bg: 'bg-green-100', text: 'text-green-800', label: 'STR' },
    DISPATCH: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'DSP' },
  };

  const config = typeConfig[type];

  return (
    <span className={`${config.bg} ${config.text} px-3 py-1 rounded-full text-xs font-medium`}>
      {config.label}
    </span>
  );
}

function StatusBadge({ status }: { status: 'ACTIVE' | 'INACTIVE' }) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${
        status === 'ACTIVE'
          ? 'bg-green-100 text-green-800'
          : 'bg-red-100 text-red-800'
      }`}
    >
      {status}
    </span>
  );
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | undefined>();

  const fetchWarehouses = useCallback(async (pageNum: number = 1, searchTerm: string = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(`/api/masters/warehouses?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch warehouses');
      }

      const data = await response.json();
      setWarehouses(data.data || []);
      setPagination({
        page: data.page || 1,
        totalPages: data.totalPages || 1,
        total: data.total || 0,
      });
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchWarehouses(1, search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, fetchWarehouses]);

  useEffect(() => {
    fetchWarehouses(page, search);
  }, [page, fetchWarehouses, search]);

  const handleCreateWarehouse = async (data: Partial<Warehouse>) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/masters/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create warehouse');
      }

      await fetchWarehouses(1, search);
      setShowCreateModal(false);
      setEditingWarehouse(undefined);
    } catch (error) {
      console.error('Error creating warehouse:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to create warehouse'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateWarehouse = async (data: Partial<Warehouse>) => {
    if (!editingWarehouse?.id) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/masters/warehouses/${editingWarehouse.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update warehouse');
      }

      await fetchWarehouses(page, search);
      setShowCreateModal(false);
      setEditingWarehouse(undefined);
    } catch (error) {
      console.error('Error updating warehouse:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to update warehouse'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setShowCreateModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-100 rounded-lg">
            <Building2 className="text-cyan-600" size={24} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Warehouses</h1>
        </div>
        <button
          onClick={() => {
            setEditingWarehouse(undefined);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition"
        >
          <Plus size={20} />
          Add Warehouse
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search by name, code, city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
            </div>
            <p className="text-gray-600 mt-4">Loading warehouses...</p>
          </div>
        ) : warehouses.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No warehouses found</h3>
            <p className="text-gray-600 mb-6">
              {search ? 'Try adjusting your search terms' : 'Get started by creating your first warehouse'}
            </p>
            {!search && (
              <button
                onClick={() => {
                  setEditingWarehouse(undefined);
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium"
              >
                <Plus size={20} />
                Create Warehouse
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Manager
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {warehouses.map((warehouse) => (
                  <tr key={warehouse.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{warehouse.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-700">
                        {warehouse.code}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <WarehouseTypeStatus type={warehouse.warehouseType} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {warehouse.city}, {warehouse.state}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{warehouse.managerName}</div>
                      <div className="text-xs text-gray-500">{warehouse.managerPhone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {warehouse._count?.inventory || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={warehouse.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(warehouse)}
                          className="p-2 text-gray-600 hover:text-cyan-600 hover:bg-cyan-50 rounded transition"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition"
                          title="More options"
                        >
                          <MoreHorizontal size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {warehouses.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {(pagination.page - 1) * 20 + 1} to{' '}
            {Math.min(pagination.page * 20, pagination.total)} of {pagination.total} warehouses
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={20} />
              Previous
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: pagination.totalPages }).map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setPage(i + 1)}
                  className={`px-3 py-2 rounded-lg font-medium transition ${
                    page === i + 1
                      ? 'bg-cyan-600 text-white'
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
              disabled={page === pagination.totalPages}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      <WarehouseFormModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingWarehouse(undefined);
        }}
        onSubmit={editingWarehouse ? handleUpdateWarehouse : handleCreateWarehouse}
        isLoading={isSubmitting}
        initialData={editingWarehouse}
      />
    </div>
  );
}
