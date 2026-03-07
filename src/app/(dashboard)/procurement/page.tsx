'use client';

import { useState, useEffect } from 'react';
import { Truck, Package, Plus, Search, FileText, CheckCircle, Clock, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface Vendor {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  itemType: string;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  date: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: 'DRAFT' | 'SENT' | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED' | 'CANCELLED';
  grnCount: number;
  paymentTermsDays: number;
  notes?: string;
}

interface PurchaseOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  expectedDeliveryDate: string;
}

interface GRN {
  id: string;
  grnNumber: string;
  poId: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  warehouse: string;
  receivedDate: string;
  items: GRNItem[];
  status: string;
  receivedBy: string;
}

interface GRNItem {
  productId: string;
  productName: string;
  quantity: number;
}

type TabType = 'po' | 'grn';

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  SENT: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  PARTIALLY_RECEIVED: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  FULLY_RECEIVED: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
};

const statusIcons: Record<string, React.ReactNode> = {
  DRAFT: <Clock className="w-4 h-4" />,
  SENT: <FileText className="w-4 h-4" />,
  PARTIALLY_RECEIVED: <Package className="w-4 h-4" />,
  FULLY_RECEIVED: <CheckCircle className="w-4 h-4" />,
  CANCELLED: <X className="w-4 h-4" />,
};

export default function ProcurementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('po');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [grns, setGRNs] = useState<GRN[]>([]);
  const [loading, setLoading] = useState(false);

  // PO Filters
  const [poSearch, setPoSearch] = useState('');
  const [poStatusFilter, setPoStatusFilter] = useState('');
  const [poVendorFilter, setPoVendorFilter] = useState('');
  const [poPage, setPoPage] = useState(1);
  const poItemsPerPage = 10;

  // GRN Filters
  const [grnPage, setGrnPage] = useState(1);
  const grnItemsPerPage = 10;

  // Create PO Form State
  const [formData, setFormData] = useState({
    vendorId: '',
    items: [{ productId: '', quantity: 1, unitPrice: 0, expectedDeliveryDate: '' }],
    paymentTermsDays: 0,
    notes: '',
  });

  // Fetch Vendors
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await fetch('/api/masters/vendors?limit=100');
        if (response.ok) {
          const data = await response.json();
          setVendors(data.vendors || []);
        }
      } catch (error) {
        console.error('Failed to fetch vendors:', error);
      }
    };
    fetchVendors();
  }, []);

  // Fetch Products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/masters/products?itemType=RAW_MATERIAL,PACKAGING_MATERIAL&limit=200');
        if (response.ok) {
          const data = await response.json();
          setProducts(data.products || []);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      }
    };
    fetchProducts();
  }, []);

  // Fetch Purchase Orders
  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      setLoading(true);
      try {
        let url = '/api/procurement?limit=100';
        if (poSearch) url += `&search=${encodeURIComponent(poSearch)}`;
        if (poStatusFilter) url += `&status=${poStatusFilter}`;
        if (poVendorFilter) url += `&vendorId=${poVendorFilter}`;

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setPurchaseOrders(data.purchaseOrders || []);
        }
      } catch (error) {
        console.error('Failed to fetch purchase orders:', error);
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === 'po') {
      fetchPurchaseOrders();
    }
  }, [activeTab, poSearch, poStatusFilter, poVendorFilter]);

  // Fetch GRNs
  useEffect(() => {
    const fetchGRNs = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/procurement/grn?limit=100');
        if (response.ok) {
          const data = await response.json();
          setGRNs(data.grns || []);
        }
      } catch (error) {
        console.error('Failed to fetch GRNs:', error);
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === 'grn') {
      fetchGRNs();
    }
  }, [activeTab]);

  const handleCreatePO = async () => {
    try {
      const payload = {
        vendorId: formData.vendorId,
        items: formData.items,
        paymentTermsDays: formData.paymentTermsDays,
        notes: formData.notes,
      };

      const response = await fetch('/api/procurement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setFormData({
          vendorId: '',
          items: [{ productId: '', quantity: 1, unitPrice: 0, expectedDeliveryDate: '' }],
          paymentTermsDays: 0,
          notes: '',
        });
        // Refetch POs
        const poResponse = await fetch('/api/procurement?limit=100');
        if (poResponse.ok) {
          const data = await poResponse.json();
          setPurchaseOrders(data.purchaseOrders || []);
        }
      }
    } catch (error) {
      console.error('Failed to create PO:', error);
    }
  };

  const addItemRow = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', quantity: 1, unitPrice: 0, expectedDeliveryDate: '' }],
    });
  };

  const removeItemRow = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateItemRow = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Pagination calculations
  const filteredPOs = purchaseOrders;
  const totalPOPages = Math.ceil(filteredPOs.length / poItemsPerPage);
  const paginatedPOs = filteredPOs.slice((poPage - 1) * poItemsPerPage, poPage * poItemsPerPage);

  const totalGRNPages = Math.ceil(grns.length / grnItemsPerPage);
  const paginatedGRNs = grns.slice((grnPage - 1) * grnItemsPerPage, grnPage * grnItemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <Truck className="w-8 h-8 text-teal-600" />
            <h1 className="text-3xl font-bold text-gray-900">Procurement</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-200">
          <button
            onClick={() => {
              setActiveTab('po');
              setPoPage(1);
            }}
            className={`pb-3 px-4 font-semibold text-sm transition-colors ${
              activeTab === 'po'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Purchase Orders
          </button>
          <button
            onClick={() => {
              setActiveTab('grn');
              setGrnPage(1);
            }}
            className={`pb-3 px-4 font-semibold text-sm transition-colors ${
              activeTab === 'grn'
                ? 'text-teal-600 border-b-2 border-teal-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            GRN (Goods Received)
          </button>
        </div>

        {/* Purchase Orders Tab */}
        {activeTab === 'po' && (
          <div className="space-y-6">
            {/* Header and Create Button */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Purchase Orders</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Create PO
              </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search PO number..."
                    value={poSearch}
                    onChange={(e) => {
                      setPoSearch(e.target.value);
                      setPoPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={poStatusFilter}
                  onChange={(e) => {
                    setPoStatusFilter(e.target.value);
                    setPoPage(1);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SENT">Sent</option>
                  <option value="PARTIALLY_RECEIVED">Partially Received</option>
                  <option value="FULLY_RECEIVED">Fully Received</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>

                {/* Vendor Filter */}
                <select
                  value={poVendorFilter}
                  onChange={(e) => {
                    setPoVendorFilter(e.target.value);
                    setPoPage(1);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">All Vendors</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">PO #</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Vendor</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Items</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Total Amount</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">GRN Count</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                          Loading...
                        </td>
                      </tr>
                    ) : paginatedPOs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                          No purchase orders found
                        </td>
                      </tr>
                    ) : (
                      paginatedPOs.map((po) => (
                        <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{po.poNumber}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{po.vendorName}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {format(new Date(po.date), 'dd MMM yyyy')}
                          </td>
                          <td className="px-6 py-4 text-sm text-center text-gray-700">{po.items.length}</td>
                          <td className="px-6 py-4 text-sm text-right text-gray-900 font-medium">
                            {formatCurrency(po.totalAmount)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
                                statusColors[po.status].bg
                              } ${statusColors[po.status].text} ${statusColors[po.status].border}`}
                            >
                              {statusIcons[po.status]}
                              {po.status}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-gray-700">{po.grnCount}</td>
                          <td className="px-6 py-4 text-center">
                            <button className="text-teal-600 hover:text-teal-700 text-sm font-medium transition-colors">
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPOPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                  <p className="text-sm text-gray-600">
                    Page {poPage} of {totalPOPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPoPage(Math.max(1, poPage - 1))}
                      disabled={poPage === 1}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPoPage(Math.min(totalPOPages, poPage + 1))}
                      disabled={poPage === totalPOPages}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GRN Tab */}
        {activeTab === 'grn' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Goods Received Notes</h2>

            {/* Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">GRN #</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">PO #</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Vendor</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Warehouse</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Received Date</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Items</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Received By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                          Loading...
                        </td>
                      </tr>
                    ) : paginatedGRNs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                          No GRNs found
                        </td>
                      </tr>
                    ) : (
                      paginatedGRNs.map((grn) => (
                        <tr key={grn.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{grn.grnNumber}</td>
                          <td className="px-6 py-4 text-sm text-teal-600 hover:text-teal-700 cursor-pointer font-medium">
                            {grn.poNumber}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">{grn.vendorName}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{grn.warehouse}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {format(new Date(grn.receivedDate), 'dd MMM yyyy')}
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-gray-700">{grn.items.length}</td>
                          <td className="px-6 py-4 text-center">
                            <div
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
                                statusColors[grn.status]?.bg || 'bg-gray-100'
                              } ${statusColors[grn.status]?.text || 'text-gray-700'} ${
                                statusColors[grn.status]?.border || 'border-gray-300'
                              }`}
                            >
                              {statusIcons[grn.status] || <Package className="w-4 h-4" />}
                              {grn.status}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">{grn.receivedBy}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalGRNPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                  <p className="text-sm text-gray-600">
                    Page {grnPage} of {totalGRNPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setGrnPage(Math.max(1, grnPage - 1))}
                      disabled={grnPage === 1}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setGrnPage(Math.min(totalGRNPages, grnPage + 1))}
                      disabled={grnPage === totalGRNPages}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create PO Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 bg-white">
              <h3 className="text-xl font-semibold text-gray-900">Create Purchase Order</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Vendor Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Vendor <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.vendorId}
                  onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="">Select a vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Items Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-semibold text-gray-900">
                    Items <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="flex items-center gap-1 text-teal-600 hover:text-teal-700 text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {formData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 border border-gray-200 rounded-lg">
                      {/* Product */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Product</label>
                        <select
                          value={item.productId}
                          onChange={(e) => updateItemRow(index, 'productId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                        >
                          <option value="">Select product</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItemRow(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                        />
                      </div>

                      {/* Unit Price */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Unit Price (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateItemRow(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                        />
                      </div>

                      {/* Expected Delivery Date */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Expected Delivery</label>
                        <input
                          type="date"
                          value={item.expectedDeliveryDate}
                          onChange={(e) => updateItemRow(index, 'expectedDeliveryDate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                        />
                      </div>

                      {/* Remove Button */}
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          className="w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg border border-red-200 text-sm font-medium transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Terms */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Payment Terms (Days)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.paymentTermsDays}
                  onChange={(e) => setFormData({ ...formData, paymentTermsDays: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Additional notes for this PO..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePO}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
              >
                Create PO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
