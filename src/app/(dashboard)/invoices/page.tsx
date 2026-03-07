'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  CreditCard,
  Plus,
  Search,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Invoice {
  id: string;
  invoiceNumber: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  paidAmount: number;
  status: 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
}

interface Payment {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE' | 'RAZORPAY' | 'OTHER';
  referenceNumber: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED';
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
}

interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPercentage: number;
  cgstPercentage: number;
  sgstPercentage: number;
  igstPercentage: number;
}

interface Stats {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueCount: number;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  PARTIALLY_PAID: 'bg-amber-100 text-amber-800',
  PAID: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

const paymentStatusColors: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  FAILED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-purple-100 text-purple-800',
};

export default function InvoicesAndPaymentsPage() {
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalInvoiced: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    overdueCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Invoice filters
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('');
  const [invoicePage, setInvoicePage] = useState(1);

  // Payment filters
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentPage, setPaymentPage] = useState(1);

  // Modal states
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);

  // Form states
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState(format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);

  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invoiceRes, paymentRes, statsRes] = await Promise.all([
        fetch('/api/invoices'),
        fetch('/api/payments'),
        fetch('/api/invoices/stats'),
      ]);

      if (invoiceRes.ok) {
        const data = await invoiceRes.json();
        setInvoices(data.invoices || []);
      }

      if (paymentRes.ok) {
        const data = await paymentRes.json();
        setPayments(data.payments || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesOrders = async () => {
    try {
      const res = await fetch('/api/orders?status=DELIVERED&limit=50');
      if (res.ok) {
        const data = await res.json();
        setSalesOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching sales orders:', error);
    }
  };

  const fetchUnpaidInvoices = async () => {
    try {
      const res = await fetch('/api/invoices?status=SENT,PARTIALLY_PAID&limit=50');
      if (res.ok) {
        const data = await res.json();
        setUnpaidInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error('Error fetching unpaid invoices:', error);
    }
  };

  const handleCreateInvoiceOpen = async () => {
    await fetchSalesOrders();
    setShowCreateInvoiceModal(true);
  };

  const handleRecordPaymentOpen = async () => {
    await fetchUnpaidInvoices();
    setShowRecordPaymentModal(true);
  };

  const handleSelectOrder = (order: SalesOrder) => {
    setSelectedOrder(order);
    const items: InvoiceItem[] = order.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPercentage: 0,
      cgstPercentage: 9,
      sgstPercentage: 9,
      igstPercentage: 0,
    }));
    setInvoiceItems(items);
  };

  const handleSelectInvoiceForPayment = (invoice: Invoice) => {
    setSelectedInvoiceForPayment(invoice);
    setPaymentAmount((invoice.total - invoice.paidAmount).toString());
  };

  const handleSubmitInvoice = async () => {
    if (!selectedOrder) return;

    setInvoiceSubmitting(true);
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salesOrderId: selectedOrder.id,
          customerId: selectedOrder.customerId,
          invoiceDate,
          dueDate,
          items: invoiceItems,
          notes: invoiceNotes,
        }),
      });

      if (response.ok) {
        await fetchData();
        setShowCreateInvoiceModal(false);
        resetInvoiceForm();
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
    } finally {
      setInvoiceSubmitting(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (!selectedInvoiceForPayment) return;

    setPaymentSubmitting(true);
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedInvoiceForPayment.id,
          customerId: selectedInvoiceForPayment.customerId,
          amount: parseFloat(paymentAmount),
          paymentDate,
          paymentMethod,
          referenceNumber,
          notes: paymentNotes,
        }),
      });

      if (response.ok) {
        await fetchData();
        setShowRecordPaymentModal(false);
        resetPaymentForm();
      }
    } catch (error) {
      console.error('Error recording payment:', error);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const resetInvoiceForm = () => {
    setSelectedOrder(null);
    setInvoiceItems([]);
    setInvoiceDate(format(new Date(), 'yyyy-MM-dd'));
    setDueDate(format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
    setInvoiceNotes('');
  };

  const resetPaymentForm = () => {
    setSelectedInvoiceForPayment(null);
    setPaymentAmount('');
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    setPaymentMethod('CASH');
    setReferenceNumber('');
    setPaymentNotes('');
  };

  // Filter invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      inv.orderNumber.toLowerCase().includes(invoiceSearch.toLowerCase());
    const matchesStatus = !invoiceStatusFilter || inv.status === invoiceStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filter payments
  const filteredPayments = payments.filter((pmt) => {
    const matchesSearch =
      pmt.paymentNumber.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      pmt.customerName.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      pmt.invoiceNumber.toLowerCase().includes(paymentSearch.toLowerCase());
    return matchesSearch;
  });

  const ITEMS_PER_PAGE = 10;
  const paginatedInvoices = filteredInvoices.slice(
    (invoicePage - 1) * ITEMS_PER_PAGE,
    invoicePage * ITEMS_PER_PAGE
  );
  const paginatedPayments = filteredPayments.slice(
    (paymentPage - 1) * ITEMS_PER_PAGE,
    paymentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-indigo-600" />
          <h1 className="text-3xl font-bold text-gray-900">Invoices & Payments</h1>
        </div>
        <Button
          onClick={handleCreateInvoiceOpen}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Invoiced</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{stats.totalInvoiced.toLocaleString('en-IN')}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Paid</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{stats.totalPaid.toLocaleString('en-IN')}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Outstanding</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{stats.totalOutstanding.toLocaleString('en-IN')}
              </p>
            </div>
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-gray-900">{stats.overdueCount}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-6 py-4 font-medium text-sm ${
              activeTab === 'invoices'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-600'
            }`}
          >
            Invoices
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-6 py-4 font-medium text-sm ${
              activeTab === 'payments'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-600'
            }`}
          >
            Payments
          </button>
        </div>

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="p-6 space-y-4">
            {/* Filters */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search invoice #, customer, order..."
                  value={invoiceSearch}
                  onChange={(e) => {
                    setInvoiceSearch(e.target.value);
                    setInvoicePage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <Select value={invoiceStatusFilter} onValueChange={(value) => {
                setInvoiceStatusFilter(value);
                setInvoicePage(1);
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInvoices.length > 0 ? (
                    paginatedInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>
                          <Link
                            href={`/orders/${invoice.orderNumber}`}
                            className="text-indigo-600 hover:underline"
                          >
                            {invoice.orderNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{invoice.customerName}</TableCell>
                        <TableCell>{format(new Date(invoice.invoiceDate), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{format(new Date(invoice.dueDate), 'MMM dd, yyyy')}</TableCell>
                        <TableCell className="text-right">
                          ₹{invoice.subtotal.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{invoice.tax.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{invoice.total.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{invoice.paidAmount.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{(invoice.total - invoice.paidAmount).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[invoice.status]}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {filteredInvoices.length > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {Math.min((invoicePage - 1) * ITEMS_PER_PAGE + 1, filteredInvoices.length)} to{' '}
                  {Math.min(invoicePage * ITEMS_PER_PAGE, filteredInvoices.length)} of{' '}
                  {filteredInvoices.length}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setInvoicePage(Math.max(1, invoicePage - 1))}
                    disabled={invoicePage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setInvoicePage(
                        Math.min(
                          Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE),
                          invoicePage + 1
                        )
                      )
                    }
                    disabled={invoicePage * ITEMS_PER_PAGE >= filteredInvoices.length}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="p-6 space-y-4">
            {/* Search */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search payment #, invoice #, customer..."
                  value={paymentSearch}
                  onChange={(e) => {
                    setPaymentSearch(e.target.value);
                    setPaymentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={handleRecordPaymentOpen}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment #</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference #</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPayments.length > 0 ? (
                    paginatedPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.paymentNumber}</TableCell>
                        <TableCell>
                          <Link
                            href={`/invoices/${payment.invoiceId}`}
                            className="text-indigo-600 hover:underline"
                          >
                            {payment.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{payment.customerName}</TableCell>
                        <TableCell className="text-right">
                          ₹{payment.amount.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell>{format(new Date(payment.paymentDate), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{payment.paymentMethod}</TableCell>
                        <TableCell>{payment.referenceNumber || '-'}</TableCell>
                        <TableCell>
                          <Badge className={paymentStatusColors[payment.status]}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No payments found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {filteredPayments.length > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {Math.min((paymentPage - 1) * ITEMS_PER_PAGE + 1, filteredPayments.length)} to{' '}
                  {Math.min(paymentPage * ITEMS_PER_PAGE, filteredPayments.length)} of{' '}
                  {filteredPayments.length}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPaymentPage(Math.max(1, paymentPage - 1))}
                    disabled={paymentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setPaymentPage(
                        Math.min(
                          Math.ceil(filteredPayments.length / ITEMS_PER_PAGE),
                          paymentPage + 1
                        )
                      )
                    }
                    disabled={paymentPage * ITEMS_PER_PAGE >= filteredPayments.length}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      <Dialog open={showCreateInvoiceModal} onOpenChange={setShowCreateInvoiceModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>Create a new invoice from a delivered sales order</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Order Selection */}
            <div>
              <Label htmlFor="order-select" className="mb-2 block">
                Sales Order
              </Label>
              <Select value={selectedOrder?.id || ''} onValueChange={(orderId) => {
                const order = salesOrders.find((o) => o.id === orderId);
                if (order) handleSelectOrder(order);
              }}>
                <SelectTrigger id="order-select">
                  <SelectValue placeholder="Select a sales order" />
                </SelectTrigger>
                <SelectContent>
                  {salesOrders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.orderNumber} - {order.customerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedOrder && (
              <>
                {/* Customer (Auto-filled) */}
                <div>
                  <Label className="mb-2 block">Customer</Label>
                  <Input value={selectedOrder.customerName} disabled />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="invoice-date" className="mb-2 block">
                      Invoice Date
                    </Label>
                    <Input
                      id="invoice-date"
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="due-date" className="mb-2 block">
                      Due Date
                    </Label>
                    <Input
                      id="due-date"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Items Table */}
                <div>
                  <Label className="mb-2 block">Items</Label>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <Table className="text-sm">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Discount %</TableHead>
                          <TableHead className="text-right">CGST %</TableHead>
                          <TableHead className="text-right">SGST %</TableHead>
                          <TableHead className="text-right">IGST %</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceItems.map((item, index) => {
                          const discountedPrice = item.unitPrice * (1 - item.discountPercentage / 100);
                          const taxPercentage = item.cgstPercentage + item.sgstPercentage + item.igstPercentage;
                          const totalTax = discountedPrice * item.quantity * (taxPercentage / 100);
                          const itemTotal = discountedPrice * item.quantity + totalTax;

                          return (
                            <TableRow key={index}>
                              <TableCell>{item.productName}</TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  min="0"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const updated = [...invoiceItems];
                                    updated[index].quantity = parseInt(e.target.value) || 0;
                                    setInvoiceItems(updated);
                                  }}
                                  className="w-16"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) => {
                                    const updated = [...invoiceItems];
                                    updated[index].unitPrice = parseFloat(e.target.value) || 0;
                                    setInvoiceItems(updated);
                                  }}
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={item.discountPercentage}
                                  onChange={(e) => {
                                    const updated = [...invoiceItems];
                                    updated[index].discountPercentage = parseFloat(e.target.value) || 0;
                                    setInvoiceItems(updated);
                                  }}
                                  className="w-16"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={item.cgstPercentage}
                                  onChange={(e) => {
                                    const updated = [...invoiceItems];
                                    updated[index].cgstPercentage = parseFloat(e.target.value) || 0;
                                    setInvoiceItems(updated);
                                  }}
                                  className="w-16"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={item.sgstPercentage}
                                  onChange={(e) => {
                                    const updated = [...invoiceItems];
                                    updated[index].sgstPercentage = parseFloat(e.target.value) || 0;
                                    setInvoiceItems(updated);
                                  }}
                                  className="w-16"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={item.igstPercentage}
                                  onChange={(e) => {
                                    const updated = [...invoiceItems];
                                    updated[index].igstPercentage = parseFloat(e.target.value) || 0;
                                    setInvoiceItems(updated);
                                  }}
                                  className="w-16"
                                />
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                ₹{itemTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="invoice-notes" className="mb-2 block">
                    Notes
                  </Label>
                  <Textarea
                    id="invoice-notes"
                    placeholder="Add any additional notes for this invoice..."
                    value={invoiceNotes}
                    onChange={(e) => setInvoiceNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateInvoiceModal(false)}
                    disabled={invoiceSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitInvoice}
                    disabled={invoiceSubmitting}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {invoiceSubmitting ? 'Creating...' : 'Create Invoice'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Modal */}
      <Dialog open={showRecordPaymentModal} onOpenChange={setShowRecordPaymentModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Record a new payment for an invoice</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Invoice Selection */}
            <div>
              <Label htmlFor="invoice-select" className="mb-2 block">
                Invoice
              </Label>
              <Select value={selectedInvoiceForPayment?.id || ''} onValueChange={(invoiceId) => {
                const invoice = unpaidInvoices.find((i) => i.id === invoiceId);
                if (invoice) handleSelectInvoiceForPayment(invoice);
              }}>
                <SelectTrigger id="invoice-select">
                  <SelectValue placeholder="Select an invoice" />
                </SelectTrigger>
                <SelectContent>
                  {unpaidInvoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.invoiceNumber} - {invoice.customerName} (Balance: ₹
                      {(invoice.total - invoice.paidAmount).toLocaleString('en-IN')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedInvoiceForPayment && (
              <>
                {/* Customer (Auto-filled) */}
                <div>
                  <Label className="mb-2 block">Customer</Label>
                  <Input value={selectedInvoiceForPayment.customerName} disabled />
                </div>

                {/* Balance Due Info */}
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-sm text-blue-900">
                    Balance Due: ₹
                    {(selectedInvoiceForPayment.total - selectedInvoiceForPayment.paidAmount).toLocaleString(
                      'en-IN'
                    )}
                  </p>
                </div>

                {/* Amount */}
                <div>
                  <Label htmlFor="payment-amount" className="mb-2 block">
                    Amount
                  </Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter payment amount"
                  />
                </div>

                {/* Date and Method */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="payment-date" className="mb-2 block">
                      Payment Date
                    </Label>
                    <Input
                      id="payment-date"
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="payment-method" className="mb-2 block">
                      Payment Method
                    </Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger id="payment-method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                        <SelectItem value="RAZORPAY">Razorpay</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Reference Number */}
                <div>
                  <Label htmlFor="reference-number" className="mb-2 block">
                    Reference Number
                  </Label>
                  <Input
                    id="reference-number"
                    placeholder="e.g., Cheque #, UPI Reference, Transaction ID..."
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                  />
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="payment-notes" className="mb-2 block">
                    Notes
                  </Label>
                  <Textarea
                    id="payment-notes"
                    placeholder="Add any additional notes..."
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowRecordPaymentModal(false)}
                    disabled={paymentSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitPayment}
                    disabled={paymentSubmitting}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {paymentSubmitting ? 'Recording...' : 'Record Payment'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
