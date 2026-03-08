'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ShoppingCart,
  User,
  Calendar,
  Package,
  Calculator,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';

interface Customer {
  id: string;
  contactName: string;
  companyName: string | null;
  email: string;
  phone: string;
  gstNumber: string;
  billingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  shippingAddresses: Array<{
    id: string;
    name: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }>;
  paymentTermsDays?: number;
}

interface Product {
  id: string;
  name: string;
  itemType: string;
  sellingPrice: number;
  tax?: {
    taxType: string;
    taxPercent: number;
  };
}

interface OrderItem {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxAmount: number;
  lineTotal: number;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

const calculateLineTotal = (
  quantity: number,
  unitPrice: number,
  discountPercent: number,
  taxPercent: number
): { lineTotal: number; taxAmount: number } => {
  const subtotal = quantity * unitPrice;
  const discountAmount = subtotal * (discountPercent / 100);
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * (taxPercent / 100);
  const lineTotal = afterDiscount + taxAmount;

  return {
    lineTotal: parseFloat(lineTotal.toFixed(2)),
    taxAmount: parseFloat(taxAmount.toFixed(2)),
  };
};

export default function CreateSalesOrderPage() {
  const router = useRouter();

  // State Management
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedShippingAddressId, setSelectedShippingAddressId] = useState<string>('');

  const [products, setProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>('');
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(30);
  const [shippingMethod, setShippingMethod] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Fetch Customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/masters/customers?limit=200');
        if (!response.ok) throw new Error('Failed to fetch customers');
        const data = await response.json();
        setCustomers(data.data || []);
      } catch (err) {
        setError('Failed to load customers');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Fetch Products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/masters/products?itemType=FG&limit=200');
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        setProducts(data.data || []);
      } catch (err) {
        setError('Failed to load products');
        console.error(err);
      }
    };

    fetchProducts();
  }, []);

  // Handle customer selection
  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
      setPaymentTermsDays(customer.paymentTermsDays || 30);
      // Set default shipping address to first one or billing
      if (customer.shippingAddresses.length > 0) {
        setSelectedShippingAddressId(customer.shippingAddresses[0].id);
      }
    }
  };

  // Handle add item
  const handleAddItem = () => {
    const newItem: OrderItem = {
      id: Date.now().toString(),
      productId: '',
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
      taxAmount: 0,
      lineTotal: 0,
    };
    setOrderItems([...orderItems, newItem]);
  };

  // Handle item change
  const handleItemChange = (
    id: string,
    field: string,
    value: string | number
  ) => {
    setOrderItems(
      orderItems.map((item) => {
        if (item.id !== id) return item;

        const updatedItem = { ...item, [field]: value };

        // When product is selected, auto-fill price
        if (field === 'productId') {
          const product = products.find((p) => p.id === value);
          if (product) {
            updatedItem.product = product;
            updatedItem.unitPrice = product.sellingPrice;
          }
        }

        // Recalculate line total when quantity, price, or discount changes
        if (
          field === 'quantity' ||
          field === 'unitPrice' ||
          field === 'discountPercent'
        ) {
          const taxPercent = updatedItem.product?.tax?.taxPercent || 0;
          const { lineTotal, taxAmount } = calculateLineTotal(
            updatedItem.quantity,
            updatedItem.unitPrice,
            updatedItem.discountPercent,
            taxPercent
          );
          updatedItem.lineTotal = lineTotal;
          updatedItem.taxAmount = taxAmount;
        }

        return updatedItem;
      })
    );
  };

  // Handle remove item
  const handleRemoveItem = (id: string) => {
    setOrderItems(orderItems.filter((item) => item.id !== id));
  };

  // Calculate totals
  const calculateTotals = useCallback(() => {
    const subtotal = orderItems.reduce((sum, item) => {
      return sum + item.quantity * item.unitPrice * (1 - item.discountPercent / 100);
    }, 0);

    const totalTax = orderItems.reduce((sum, item) => sum + item.taxAmount, 0);
    const grandTotal = subtotal + totalTax;

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      totalTax: parseFloat(totalTax.toFixed(2)),
      grandTotal: parseFloat(grandTotal.toFixed(2)),
    };
  }, [orderItems]);

  const { subtotal, totalTax, grandTotal } = calculateTotals();

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!selectedCustomer) {
      setError('Please select a customer');
      return;
    }

    if (orderItems.length === 0) {
      setError('Please add at least one item');
      return;
    }

    if (!expectedDeliveryDate) {
      setError('Please set expected delivery date');
      return;
    }

    // Find selected shipping address
    const shippingAddress =
      selectedCustomer.shippingAddresses.find((addr) => addr.id === selectedShippingAddressId) ||
      {
        name: 'Billing Address',
        street: selectedCustomer.billingAddress.street,
        city: selectedCustomer.billingAddress.city,
        state: selectedCustomer.billingAddress.state,
        postalCode: selectedCustomer.billingAddress.postalCode,
        country: selectedCustomer.billingAddress.country,
      };

    try {
      setIsSubmitting(true);

      const orderPayload = {
        customerId: selectedCustomer.id,
        orderDate,
        expectedDeliveryDate,
        paymentTermsDays,
        shippingMethod,
        notes,
        billingAddress: selectedCustomer.billingAddress,
        shippingAddress,
        items: orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
          taxAmount: item.taxAmount,
        })),
        subtotal,
        totalTax,
        grandTotal,
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create order');
      }

      const data = await response.json();
      router.push(`/orders/${data.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/orders">
            <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Create Sales Order</h1>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Selection Section */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Customer Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Customer *
                </label>
                <select
                  value={selectedCustomer?.id || ''}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">Choose a customer...</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.companyName || customer.contactName}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomer && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium text-gray-900">{selectedCustomer.companyName || selectedCustomer.contactName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-900">{selectedCustomer.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium text-gray-900">{selectedCustomer.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">GST Number</p>
                    <p className="font-medium text-gray-900">{selectedCustomer.gstNumber}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600">Billing Address</p>
                    <p className="font-medium text-gray-900">
                      {selectedCustomer.billingAddress.street}, {selectedCustomer.billingAddress.city},{' '}
                      {selectedCustomer.billingAddress.state} {selectedCustomer.billingAddress.postalCode}
                    </p>
                  </div>

                  {selectedCustomer.shippingAddresses.length > 0 && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Shipping Address
                      </label>
                      <select
                        value={selectedShippingAddressId}
                        onChange={(e) => setSelectedShippingAddressId(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        {selectedCustomer.shippingAddresses.map((addr) => (
                          <option key={addr.id} value={addr.id}>
                            {addr.name} - {addr.city}, {addr.state}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Order Details Section */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Date
                </label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Delivery Date *
                </label>
                <input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Terms (Days)
                </label>
                <input
                  type="number"
                  value={paymentTermsDays}
                  onChange={(e) => setPaymentTermsDays(parseInt(e.target.value) || 30)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shipping Method
                </label>
                <input
                  type="text"
                  value={shippingMethod}
                  onChange={(e) => setShippingMethod(e.target.value)}
                  placeholder="e.g., Road Transport, Air Cargo"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any special instructions or notes..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          </Card>

          {/* Order Items Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Order Items</h2>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            {orderItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No items added yet. Click "Add Item" to start.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                        Product
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        Qty
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        Unit Price (₹)
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        Discount %
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        Tax (₹)
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        Line Total (₹)
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderItems.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <select
                            value={item.productId}
                            onChange={(e) => handleItemChange(item.id, 'productId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                            required
                          >
                            <option value="">Select product...</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-4 px-4">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)
                            }
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-right"
                            min="1"
                            required
                          />
                        </td>
                        <td className="py-4 px-4">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                            }
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-right"
                            step="0.01"
                            min="0"
                            required
                          />
                        </td>
                        <td className="py-4 px-4">
                          <input
                            type="number"
                            value={item.discountPercent}
                            onChange={(e) =>
                              handleItemChange(item.id, 'discountPercent', parseFloat(e.target.value) || 0)
                            }
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-right"
                            step="0.01"
                            min="0"
                            max="100"
                          />
                        </td>
                        <td className="py-4 px-4 text-right text-sm text-gray-700">
                          {formatCurrency(item.taxAmount)}
                        </td>
                        <td className="py-4 px-4 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(item.lineTotal)}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Summary Section */}
          {orderItems.length > 0 && (
            <Card className="p-6 bg-gray-50">
              <div className="flex items-center gap-2 mb-6">
                <Calculator className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal:</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Total Tax:</span>
                  <span className="font-medium">{formatCurrency(totalTax)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold text-gray-900 pt-3 border-t border-gray-300">
                  <span>Grand Total:</span>
                  <span className="text-blue-600">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </Card>
          )}

          {/* Form Actions */}
          <div className="flex gap-4 sticky bottom-0 bg-white py-4 px-4 border-t border-gray-200 rounded-lg">
            <Link href="/orders" className="flex-1">
              <button
                type="button"
                className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || orderItems.length === 0 || !selectedCustomer}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              {isSubmitting ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
