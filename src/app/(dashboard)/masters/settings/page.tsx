'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Receipt,
  Ruler,
  Package,
  DollarSign,
  Plus,
  X,
} from 'lucide-react';

type Tab = 'tax-config' | 'uom' | 'packaging' | 'price-lists';

interface TaxConfig {
  id: string;
  name: string;
  hsnCode: string;
  cgstPercent: number;
  sgstPercent: number;
  igstPercent: number;
  cessPercent: number;
  productsCount: number;
}

interface UOM {
  id: string;
  name: string;
  abbreviation: string;
  productsCount: number;
}

interface Packaging {
  id: string;
  name: string;
  description: string;
  materialType: string;
  size: string;
  costPerUnit: number;
  linkedProducts: number;
}

interface PriceList {
  id: string;
  name: string;
  description: string;
  currency: string;
  validFrom: string;
  validTo: string;
  itemsCount: number;
}

interface TaxConfigForm {
  name: string;
  hsnCode: string;
  cgstPercent: number;
  sgstPercent: number;
  igstPercent: number;
  cessPercent: number;
}

interface UOMForm {
  name: string;
  abbreviation: string;
}

interface PackagingForm {
  name: string;
  description: string;
  materialType: string;
  size: string;
  costPerUnit: number;
}

interface PriceListForm {
  name: string;
  description: string;
  currency: string;
  validFrom: string;
  validTo: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('tax-config');
  const [loading, setLoading] = useState(false);

  // Tax Config State
  const [taxConfigs, setTaxConfigs] = useState<TaxConfig[]>([]);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [taxForm, setTaxForm] = useState<TaxConfigForm>({
    name: '',
    hsnCode: '',
    cgstPercent: 0,
    sgstPercent: 0,
    igstPercent: 0,
    cessPercent: 0,
  });

  // UOM State
  const [uoms, setUoms] = useState<UOM[]>([]);
  const [showUOMModal, setShowUOMModal] = useState(false);
  const [uomForm, setUomForm] = useState<UOMForm>({
    name: '',
    abbreviation: '',
  });

  // Packaging State
  const [packagings, setPackagings] = useState<Packaging[]>([]);
  const [showPackagingModal, setShowPackagingModal] = useState(false);
  const [packagingForm, setPackagingForm] = useState<PackagingForm>({
    name: '',
    description: '',
    materialType: '',
    size: '',
    costPerUnit: 0,
  });

  // Price List State
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [showPriceListModal, setShowPriceListModal] = useState(false);
  const [priceListForm, setPriceListForm] = useState<PriceListForm>({
    name: '',
    description: '',
    currency: 'INR',
    validFrom: '',
    validTo: '',
  });

  // Fetch Tax Configs
  const fetchTaxConfigs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/masters/tax-configs');
      if (response.ok) {
        const data = await response.json();
        setTaxConfigs(data);
      }
    } catch (error) {
      console.error('Error fetching tax configs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch UOMs
  const fetchUOMs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/masters/uom');
      if (response.ok) {
        const data = await response.json();
        setUoms(data);
      }
    } catch (error) {
      console.error('Error fetching UOMs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Packaging
  const fetchPackaging = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/masters/packaging');
      if (response.ok) {
        const data = await response.json();
        setPackagings(data);
      }
    } catch (error) {
      console.error('Error fetching packaging:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Price Lists
  const fetchPriceLists = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/masters/price-lists');
      if (response.ok) {
        const data = await response.json();
        setPriceLists(data);
      }
    } catch (error) {
      console.error('Error fetching price lists:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'tax-config') {
      fetchTaxConfigs();
    } else if (tab === 'uom') {
      fetchUOMs();
    } else if (tab === 'packaging') {
      fetchPackaging();
    } else if (tab === 'price-lists') {
      fetchPriceLists();
    }
  };

  // Tax Config Handlers
  const handleTaxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/masters/tax-configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taxForm),
      });
      if (response.ok) {
        setShowTaxModal(false);
        setTaxForm({
          name: '',
          hsnCode: '',
          cgstPercent: 0,
          sgstPercent: 0,
          igstPercent: 0,
          cessPercent: 0,
        });
        fetchTaxConfigs();
      }
    } catch (error) {
      console.error('Error creating tax config:', error);
    }
  };

  // UOM Handlers
  const handleUOMSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/masters/uom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(uomForm),
      });
      if (response.ok) {
        setShowUOMModal(false);
        setUomForm({
          name: '',
          abbreviation: '',
        });
        fetchUOMs();
      }
    } catch (error) {
      console.error('Error creating UOM:', error);
    }
  };

  // Packaging Handlers
  const handlePackagingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/masters/packaging', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(packagingForm),
      });
      if (response.ok) {
        setShowPackagingModal(false);
        setPackagingForm({
          name: '',
          description: '',
          materialType: '',
          size: '',
          costPerUnit: 0,
        });
        fetchPackaging();
      }
    } catch (error) {
      console.error('Error creating packaging:', error);
    }
  };

  // Price List Handlers
  const handlePriceListSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/masters/price-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(priceListForm),
      });
      if (response.ok) {
        setShowPriceListModal(false);
        setPriceListForm({
          name: '',
          description: '',
          currency: 'INR',
          validFrom: '',
          validTo: '',
        });
        fetchPriceLists();
      }
    } catch (error) {
      console.error('Error creating price list:', error);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchTaxConfigs();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Masters & Settings</h1>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <div className="flex gap-8">
            <button
              onClick={() => handleTabChange('tax-config')}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'tax-config'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Receipt className="w-4 h-4" />
              Tax Config
            </button>
            <button
              onClick={() => handleTabChange('uom')}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'uom'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Ruler className="w-4 h-4" />
              UOM
            </button>
            <button
              onClick={() => handleTabChange('packaging')}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'packaging'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Package className="w-4 h-4" />
              Packaging
            </button>
            <button
              onClick={() => handleTabChange('price-lists')}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'price-lists'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Price Lists
            </button>
          </div>
        </div>

        {/* Tax Config Tab */}
        {activeTab === 'tax-config' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Tax Configurations</h2>
              <button
                onClick={() => setShowTaxModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Tax Config
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        HSN Code
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        CGST%
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        SGST%
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        IGST%
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Cess%
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Total Tax%
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Products
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {taxConfigs.map((config) => {
                      const totalTax =
                        config.cgstPercent +
                        config.sgstPercent +
                        config.igstPercent +
                        config.cessPercent;
                      return (
                        <tr key={config.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">{config.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{config.hsnCode}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {config.cgstPercent.toFixed(2)}%
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {config.sgstPercent.toFixed(2)}%
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {config.igstPercent.toFixed(2)}%
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {config.cessPercent.toFixed(2)}%
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {totalTax.toFixed(2)}%
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {config.productsCount}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tax Config Modal */}
            {showTaxModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
                  <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Add Tax Configuration</h3>
                    <button
                      onClick={() => setShowTaxModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={handleTaxSubmit} className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={taxForm.name}
                        onChange={(e) =>
                          setTaxForm({ ...taxForm, name: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        HSN Code
                      </label>
                      <input
                        type="text"
                        value={taxForm.hsnCode}
                        onChange={(e) =>
                          setTaxForm({ ...taxForm, hsnCode: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          CGST%
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={taxForm.cgstPercent}
                          onChange={(e) =>
                            setTaxForm({
                              ...taxForm,
                              cgstPercent: parseFloat(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          SGST%
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={taxForm.sgstPercent}
                          onChange={(e) =>
                            setTaxForm({
                              ...taxForm,
                              sgstPercent: parseFloat(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          IGST%
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={taxForm.igstPercent}
                          onChange={(e) =>
                            setTaxForm({
                              ...taxForm,
                              igstPercent: parseFloat(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          Cess%
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={taxForm.cessPercent}
                          onChange={(e) =>
                            setTaxForm({
                              ...taxForm,
                              cessPercent: parseFloat(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowTaxModal(false)}
                        className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* UOM Tab */}
        {activeTab === 'uom' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Units of Measure</h2>
              <button
                onClick={() => setShowUOMModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add UOM
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Abbreviation
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Products Count
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {uoms.map((uom) => (
                      <tr key={uom.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{uom.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{uom.abbreviation}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{uom.productsCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* UOM Modal */}
            {showUOMModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
                  <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Add Unit of Measure</h3>
                    <button
                      onClick={() => setShowUOMModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={handleUOMSubmit} className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={uomForm.name}
                        onChange={(e) => setUomForm({ ...uomForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Abbreviation
                      </label>
                      <input
                        type="text"
                        value={uomForm.abbreviation}
                        onChange={(e) =>
                          setUomForm({ ...uomForm, abbreviation: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowUOMModal(false)}
                        className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Packaging Tab */}
        {activeTab === 'packaging' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Packaging Options</h2>
              <button
                onClick={() => setShowPackagingModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Packaging
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Material Type
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Size
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Cost/Unit
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Linked Products
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {packagings.map((pkg) => (
                      <tr key={pkg.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{pkg.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{pkg.description}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{pkg.materialType}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{pkg.size}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          Rs. {pkg.costPerUnit.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{pkg.linkedProducts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Packaging Modal */}
            {showPackagingModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
                  <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Add Packaging Option</h3>
                    <button
                      onClick={() => setShowPackagingModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={handlePackagingSubmit} className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={packagingForm.name}
                        onChange={(e) =>
                          setPackagingForm({ ...packagingForm, name: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={packagingForm.description}
                        onChange={(e) =>
                          setPackagingForm({ ...packagingForm, description: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Material Type
                      </label>
                      <input
                        type="text"
                        value={packagingForm.materialType}
                        onChange={(e) =>
                          setPackagingForm({ ...packagingForm, materialType: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Size
                      </label>
                      <input
                        type="text"
                        value={packagingForm.size}
                        onChange={(e) =>
                          setPackagingForm({ ...packagingForm, size: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Cost Per Unit
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={packagingForm.costPerUnit}
                        onChange={(e) =>
                          setPackagingForm({
                            ...packagingForm,
                            costPerUnit: parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPackagingModal(false)}
                        className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Price Lists Tab */}
        {activeTab === 'price-lists' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Price Lists</h2>
              <button
                onClick={() => setShowPriceListModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Price List
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Currency
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Valid From
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Valid To
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        Items Count
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {priceLists.map((priceList) => (
                      <tr key={priceList.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{priceList.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {priceList.description}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{priceList.currency}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(priceList.validFrom).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(priceList.validTo).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{priceList.itemsCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Price List Modal */}
            {showPriceListModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
                  <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Add Price List</h3>
                    <button
                      onClick={() => setShowPriceListModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={handlePriceListSubmit} className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={priceListForm.name}
                        onChange={(e) =>
                          setPriceListForm({ ...priceListForm, name: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={priceListForm.description}
                        onChange={(e) =>
                          setPriceListForm({ ...priceListForm, description: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Currency
                      </label>
                      <select
                        value={priceListForm.currency}
                        onChange={(e) =>
                          setPriceListForm({ ...priceListForm, currency: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="INR">INR</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Valid From
                      </label>
                      <input
                        type="date"
                        value={priceListForm.validFrom}
                        onChange={(e) =>
                          setPriceListForm({ ...priceListForm, validFrom: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Valid To
                      </label>
                      <input
                        type="date"
                        value={priceListForm.validTo}
                        onChange={(e) =>
                          setPriceListForm({ ...priceListForm, validTo: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPriceListModal(false)}
                        className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
