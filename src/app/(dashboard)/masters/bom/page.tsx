'use client';

import { useEffect, useState } from 'react';
import {
  Layers,
  Plus,
  Search,
  Package,
  Beaker,
  X,
  AlertCircle,
  Trash2,
  Edit2,
} from 'lucide-react';

interface BOMItem {
  id: string;
  productId: string;
  rawMaterialId: string;
  quantityRequired: number;
  unitOfMeasure: string;
  wastagePercent: number;
  notes: string | null;
  product: {
    id: string;
    name: string;
    sku: string;
    itemType: 'FG' | 'RM' | 'PM' | 'CONSUMABLE';
  };
  rawMaterial: {
    id: string;
    name: string;
    sku: string;
    itemType: 'RM' | 'PM' | 'CONSUMABLE';
  };
}

interface Product {
  id: string;
  name: string;
  sku: string;
  itemType: 'FG' | 'RM' | 'PM' | 'CONSUMABLE';
}

interface SummaryStats {
  totalBOMEntries: number;
  fgProductsWithBOM: number;
  materialsUsed: number;
}

interface FormData {
  productId: string;
  rawMaterialId: string;
  quantityRequired: number;
  unitOfMeasure: string;
  wastagePercent: number;
  notes: string;
}

export default function BOMPage() {
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [fgProducts, setFgProducts] = useState<Product[]>([]);
  const [rmPmProducts, setRmPmProducts] = useState<Product[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    productId: '',
    rawMaterialId: '',
    quantityRequired: 0.001,
    unitOfMeasure: '',
    wastagePercent: 0,
    notes: '',
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    totalBOMEntries: 0,
    fgProductsWithBOM: 0,
    materialsUsed: 0,
  });

  // Fetch BOM entries
  const fetchBOM = async (productId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const url =
        productId && productId !== 'all'
          ? `/api/masters/bom?productId=${productId}`
          : '/api/masters/bom';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch BOM');
      const data = await res.json();
      setBomItems(data);

      // Calculate summary stats
      const uniqueFGProducts = new Set(data.map((item: BOMItem) => item.productId))
        .size;
      const uniqueMaterials = new Set(data.map((item: BOMItem) => item.rawMaterialId))
        .size;
      setSummaryStats({
        totalBOMEntries: data.length,
        fgProductsWithBOM: uniqueFGProducts,
        materialsUsed: uniqueMaterials,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Fetch FG products
  const fetchFGProducts = async () => {
    try {
      const res = await fetch('/api/masters/products?itemType=FG&limit=100');
      if (!res.ok) throw new Error('Failed to fetch FG products');
      const data = await res.json();
      setFgProducts(data);
    } catch (err) {
      console.error('Error fetching FG products:', err);
    }
  };

  // Fetch RM and PM products
  const fetchRMPMProducts = async () => {
    try {
      const [rmRes, pmRes] = await Promise.all([
        fetch('/api/masters/products?itemType=RM&limit=100'),
        fetch('/api/masters/products?itemType=PM&limit=100'),
      ]);

      if (!rmRes.ok || !pmRes.ok) {
        throw new Error('Failed to fetch materials');
      }

      const rmData = await rmRes.json();
      const pmData = await pmRes.json();
      setRmPmProducts([...rmData, ...pmData]);
    } catch (err) {
      console.error('Error fetching RM/PM products:', err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchBOM();
    fetchFGProducts();
    fetchRMPMProducts();
  }, []);

  // Refetch when filter changes
  useEffect(() => {
    fetchBOM(selectedProductId);
  }, [selectedProductId]);

  // Handle form input changes
  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'quantityRequired' || name === 'wastagePercent'
          ? parseFloat(value) || 0
          : value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.productId || !formData.rawMaterialId) {
      setError('Please select both FG product and material');
      return;
    }

    if (formData.quantityRequired <= 0) {
      setError('Quantity required must be greater than 0');
      return;
    }

    try {
      setSubmitLoading(true);
      const res = await fetch('/api/masters/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create BOM entry');
      }

      // Success - refresh data and close modal
      await fetchBOM(selectedProductId);
      setShowCreateModal(false);
      setFormData({
        productId: '',
        rawMaterialId: '',
        quantityRequired: 0.001,
        unitOfMeasure: '',
        wastagePercent: 0,
        notes: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Group BOM items by FG product
  const groupedBOM = bomItems.reduce(
    (acc, item) => {
      const productId = item.productId;
      if (!acc[productId]) {
        acc[productId] = {
          product: item.product,
          items: [],
        };
      }
      acc[productId].items.push(item);
      return acc;
    },
    {} as Record<
      string,
      {
        product: Product;
        items: BOMItem[];
      }
    >
  );

  const calculateEffectiveQty = (qty: number, wastage: number) => {
    return (qty * (1 + wastage / 100)).toFixed(3);
  };

  const getMaterialBadge = (itemType: string) => {
    if (itemType === 'RM') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <Beaker size={12} />
          RM
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
        <Package size={12} />
        PM
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Layers className="text-indigo-600" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Bill of Materials</h1>
              <p className="text-slate-600 mt-1">Manage FG product compositions</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus size={20} />
            Add BOM Entry
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Total BOM Entries</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {summaryStats.totalBOMEntries}
                </p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Layers className="text-indigo-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">FG Products with BOM</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {summaryStats.fgProductsWithBOM}
                </p>
              </div>
              <div className="p-3 bg-violet-100 rounded-lg">
                <Package className="text-violet-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium">Materials Used</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {summaryStats.materialsUsed}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Beaker className="text-green-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm mb-6">
          <div className="flex items-center gap-3">
            <Search size={20} className="text-slate-600" />
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Products</option>
              {fgProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <p className="font-medium text-red-900">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <div className="inline-block">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-slate-600 mt-4">Loading BOM data...</p>
          </div>
        ) : Object.keys(groupedBOM).length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <Package size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600 font-medium">No BOM entries found</p>
            <p className="text-slate-500 text-sm mt-1">
              Create your first BOM entry to get started
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                      FG Product
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                      Material
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900">
                      Type
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900">
                      Qty Required
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900">
                      UOM
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900">
                      Wastage %
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900">
                      Effective Qty
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                      Notes
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(groupedBOM).map(([fgProductId, group], groupIdx) => (
                    <tbody
                      key={fgProductId}
                      className={
                        groupIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                      }
                    >
                      {group.items.map((item, itemIdx) => (
                        <tr
                          key={item.id}
                          className={`border-b border-slate-200 hover:bg-slate-100 transition-colors ${
                            groupIdx % 2 !== 0 ? 'hover:bg-slate-200' : ''
                          }`}
                        >
                          {/* FG Product - show name only for first item in group */}
                          <td className="px-6 py-4 text-sm">
                            {itemIdx === 0 ? (
                              <div className="font-medium text-slate-900">
                                {item.product.name}
                                <p className="text-xs text-slate-500 font-normal mt-1">
                                  SKU: {item.product.sku}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          {/* Material */}
                          <td className="px-6 py-4 text-sm">
                            <div className="font-medium text-slate-900">
                              {item.rawMaterial.name}
                              <p className="text-xs text-slate-500 font-normal mt-1">
                                SKU: {item.rawMaterial.sku}
                              </p>
                            </div>
                          </td>

                          {/* Type Badge */}
                          <td className="px-6 py-4 text-center">
                            {getMaterialBadge(item.rawMaterial.itemType)}
                          </td>

                          {/* Qty Required */}
                          <td className="px-6 py-4 text-sm text-right text-slate-900 font-medium">
                            {item.quantityRequired.toFixed(3)}
                          </td>

                          {/* UOM */}
                          <td className="px-6 py-4 text-sm text-center text-slate-600">
                            {item.unitOfMeasure || '-'}
                          </td>

                          {/* Wastage % */}
                          <td className="px-6 py-4 text-sm text-right text-slate-900">
                            {item.wastagePercent.toFixed(2)}%
                          </td>

                          {/* Effective Qty */}
                          <td className="px-6 py-4 text-sm text-right font-medium text-indigo-600">
                            {calculateEffectiveQty(item.quantityRequired, item.wastagePercent)}
                          </td>

                          {/* Notes */}
                          <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">
                            {item.notes || '-'}
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* BOM Form Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 p-6 bg-white">
              <h2 className="text-xl font-bold text-slate-900">Add BOM Entry</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* FG Product Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  FG Product <span className="text-red-500">*</span>
                </label>
                <select
                  name="productId"
                  value={formData.productId}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select a FG product...</option>
                  {fgProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </select>
              </div>

              {/* Raw/Packaging Material Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Material (RM/PM) <span className="text-red-500">*</span>
                </label>
                <select
                  name="rawMaterialId"
                  value={formData.rawMaterialId}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select a material...</option>
                  {rmPmProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku}){' '}
                      {product.itemType === 'RM' ? '[RM]' : '[PM]'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity Required */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Quantity Required <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="quantityRequired"
                  value={formData.quantityRequired}
                  onChange={handleFormChange}
                  step="0.001"
                  min="0.001"
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="0.001"
                />
              </div>

              {/* Unit of Measure */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Unit of Measure
                </label>
                <input
                  type="text"
                  name="unitOfMeasure"
                  value={formData.unitOfMeasure}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., kg, ml, pcs"
                />
              </div>

              {/* Wastage Percent */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Wastage % (0-100)
                </label>
                <input
                  type="number"
                  name="wastagePercent"
                  value={formData.wastagePercent}
                  onChange={handleFormChange}
                  step="0.01"
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="Add any additional notes..."
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
                  <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" size={16} />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-900 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {submitLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={18} />
                      Create BOM Entry
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
