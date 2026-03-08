'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  MoreHorizontal,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Customer {
  id: string;
  contactName: string;
  companyName?: string | null;
  email: string;
  phone: string;
  altPhone?: string | null;
  gstNumber?: string | null;
  panNumber?: string | null;
  billingAddress?: any;
  creditLimit?: number;
  paymentTermsDays: number;
  isActive: boolean;
  _count?: {
    salesOrders: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  data: Customer[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface CustomerFormData {
  contactName: string;
  companyName: string;
  email: string;
  phone: string;
  alternatePhone: string;
  gstNumber: string;
  panNumber: string;
  billingAddress: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  creditLimit: number | string;
  paymentTermsDays: number | string;
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

function CustomerFormModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState<CustomerFormData>({
    contactName: '',
    companyName: '',
    email: '',
    phone: '',
    alternatePhone: '',
    gstNumber: '',
    panNumber: '',
    billingAddress: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    creditLimit: '',
    paymentTermsDays: 30,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.contactName.trim()) {
      newErrors.contactName = 'Customer name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        ...formData,
        creditLimit: formData.creditLimit ? parseInt(String(formData.creditLimit)) : null,
        paymentTermsDays: parseInt(String(formData.paymentTermsDays)),
      };

      const response = await fetch('/api/masters/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.message || 'Failed to create customer');
        return;
      }

      setFormData({
        contactName: '',
        companyName: '',
        email: '',
        phone: '',
        alternatePhone: '',
        gstNumber: '',
        panNumber: '',
        billingAddress: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        creditLimit: '',
        paymentTermsDays: 30,
      });
      onSuccess();
      onClose();
    } catch (error) {
      alert('Error creating customer. Please try again.');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Add New Customer</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name *
              </label>
              <Input
                type="text"
                name="contactName"
                value={formData.contactName}
                onChange={handleInputChange}
                placeholder="Enter contact name"
                className={errors.contactName ? 'border-red-500' : ''}
              />
              {errors.contactName && (
                <p className="text-red-500 text-xs mt-1">{errors.contactName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="customer@example.com"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone *
              </label>
              <Input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="10-digit phone number"
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
              )}
            </div>

            {/* Alternate Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alternate Phone
              </label>
              <Input
                type="tel"
                name="alternatePhone"
                value={formData.alternatePhone}
                onChange={handleInputChange}
                placeholder="Alternate phone (optional)"
              />
            </div>

            {/* GST Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GST Number
              </label>
              <Input
                type="text"
                name="gstNumber"
                value={formData.gstNumber}
                onChange={handleInputChange}
                placeholder="GST number"
              />
            </div>

            {/* PAN Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PAN Number
              </label>
              <Input
                type="text"
                name="panNumber"
                value={formData.panNumber}
                onChange={handleInputChange}
                placeholder="PAN number"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <Input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="City"
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <select
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select state</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            {/* Pincode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pincode
              </label>
              <Input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleInputChange}
                placeholder="Pincode"
              />
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <Input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                disabled
                className="bg-gray-100"
              />
            </div>

            {/* Credit Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Credit Limit
              </label>
              <Input
                type="number"
                name="creditLimit"
                value={formData.creditLimit}
                onChange={handleInputChange}
                placeholder="Credit limit amount"
              />
            </div>

            {/* Payment Terms Days */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Terms (Days)
              </label>
              <Input
                type="number"
                name="paymentTermsDays"
                value={formData.paymentTermsDays}
                onChange={handleInputChange}
                placeholder="Payment terms in days"
              />
            </div>
          </div>

          {/* Billing Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Billing Address
            </label>
            <textarea
              name="billingAddress"
              value={formData.billingAddress}
              onChange={handleInputChange}
              placeholder="Enter billing address"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Creating...' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchCustomers = async (pageNum: number = 1, searchQuery: string = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20',
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await fetch(`/api/masters/customers?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }

      const data: ApiResponse = await response.json();
      setCustomers(data.data);
      setPage(data.pagination.page);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (error) {
      console.error('Error fetching customers:', error);
      alert('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(1, search);
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearch(query);
    setPage(1);
    fetchCustomers(1, query);
  };

  const handlePrevious = () => {
    if (page > 1) {
      fetchCustomers(page - 1, search);
    }
  };

  const handleNext = () => {
    if (page < totalPages) {
      fetchCustomers(page + 1, search);
    }
  };

  const handleCreateSuccess = () => {
    fetchCustomers(1, search);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
            <p className="text-gray-600 text-sm">Manage your customer information</p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </Button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by name, email, phone, or GST number..."
            value={search}
            onChange={handleSearch}
            className="pl-10"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <AlertCircle className="w-12 h-12 text-gray-300" />
            <p className="text-gray-500">No customers found</p>
            <p className="text-gray-400 text-sm">
              {search ? 'Try adjusting your search criteria' : 'Start by adding a new customer'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      GST Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      City/State
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Orders
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
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {customer.companyName || customer.contactName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {customer.email || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {customer.phone}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {customer.gstNumber || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {customer.billingAddress?.city && customer.billingAddress?.state
                          ? `${customer.billingAddress.city}, ${customer.billingAddress.state}`
                          : customer.billingAddress?.city || customer.billingAddress?.state || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {customer._count?.salesOrders || 0}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            customer.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {customer.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <button className="p-1 hover:bg-gray-200 rounded transition">
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                          <button className="p-1 hover:bg-gray-200 rounded transition">
                            <Edit className="w-4 h-4 text-gray-600" />
                          </button>
                          <button className="p-1 hover:bg-gray-200 rounded transition">
                            <MoreHorizontal className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <p className="text-sm text-gray-600">
                Showing {customers.length > 0 ? (page - 1) * 20 + 1 : 0} to{' '}
                {Math.min(page * 20, total)} of {total} customers
              </p>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePrevious}
                  disabled={page === 1}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <Button
                  onClick={handleNext}
                  disabled={page === totalPages}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create Customer Modal */}
      <CustomerFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
