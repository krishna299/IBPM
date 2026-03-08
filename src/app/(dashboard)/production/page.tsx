'use client';

import { useState, useEffect } from 'react';
import {
  Factory,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Package,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import CreatePlanModal from '@/components/modals/CreatePlanModal';

interface BOMRequirement {
  id: string;
  materialId: string;
  materialType: string;
  requiredQty: number;
  availableQty: number;
  shortfallQty: number;
  status: string;
}

interface ProductionPlan {
  id: string;
  planNumber: string;
  salesOrderId: string;
  salesOrder?: {
    id: string;
    orderNumber: string;
    customer: { contactName: string; companyName: string | null };
  };
  status: 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  plannedDate: string | null;
  notes?: string;
  bomRequirements?: BOMRequirement[];
  batches?: any[];
}

interface StatsCard {
  label: string;
  value: number;
  icon: React.ReactNode;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const statusBgColors: Record<string, string> = {
  DRAFT: 'bg-gray-50',
  CONFIRMED: 'bg-blue-50',
  IN_PROGRESS: 'bg-amber-50',
  COMPLETED: 'bg-green-50',
  CANCELLED: 'bg-red-50',
};

export default function ProductionPlanningPage() {
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [stats, setStats] = useState({
    totalPlans: 0,
    activePlans: 0,
    completedPlans: 0,
    pendingMaterials: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPlans = async (page: number, status: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      if (status) params.append('status', status);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/production?${params.toString()}`);
      const data = await response.json();

      const allPlans: ProductionPlan[] = data.data || [];
      setPlans(allPlans);
      setTotalPages(data.pagination?.totalPages || 1);

      setStats({
        totalPlans: data.pagination?.total || 0,
        activePlans: allPlans.filter((p) => p.status === 'IN_PROGRESS').length,
        completedPlans: allPlans.filter((p) => p.status === 'COMPLETED').length,
        pendingMaterials: allPlans.filter((p) =>
          p.bomRequirements?.some((item) => item.shortfallQty > 0)
        ).length,
      });
    } catch (error) {
      console.error('Failed to fetch production plans:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans(currentPage, filterStatus);
  }, [currentPage, filterStatus]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(e.target.value);
    setCurrentPage(1);
  };

  const toggleExpandRow = (planId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(planId)) {
      newExpanded.delete(planId);
    } else {
      newExpanded.add(planId);
    }
    setExpandedRows(newExpanded);
  };

  const handlePlanCreated = () => {
    setIsCreateModalOpen(false);
    setCurrentPage(1);
    fetchPlans(1, filterStatus);
  };

  const statCards: StatsCard[] = [
    {
      label: 'Total Plans',
      value: stats.totalPlans,
      icon: <Factory className="w-5 h-5 text-blue-600" />,
    },
    {
      label: 'Active/In Progress',
      value: stats.activePlans,
      icon: <Package className="w-5 h-5 text-amber-600" />,
    },
    {
      label: 'Completed',
      value: stats.completedPlans,
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
    },
    {
      label: 'Pending Materials',
      value: stats.pendingMaterials,
      icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Factory className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-gray-900">Production Planning</h1>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Plan
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">{stat.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filter Row */}
      <Card className="p-4">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Sales Order #..."
                value={searchQuery}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="min-w-48">
            <select
              value={filterStatus}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Plans Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading production plans...</div>
        ) : plans.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No production plans found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Plan #
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Sales Order
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Planned Date
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      BOM Items
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <>
                      <tr key={plan.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          {plan.planNumber}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <a
                            href={`/orders/${plan.salesOrderId}`}
                            className="text-purple-600 hover:text-purple-700 font-medium"
                          >
                            {plan.salesOrder?.orderNumber || plan.salesOrderId}
                          </a>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {plan.salesOrder?.customer?.companyName ||
                            plan.salesOrder?.customer?.contactName ||
                            '-'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              statusColors[plan.status]
                            }`}
                          >
                            {plan.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {plan.plannedDate
                            ? format(new Date(plan.plannedDate), 'MMM dd, yyyy')
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {plan.bomRequirements?.length || 0}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => toggleExpandRow(plan.id)}
                            className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-2"
                          >
                            View
                            {expandedRows.has(plan.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Row Detail */}
                      {expandedRows.has(plan.id) && (
                        <tr key={`${plan.id}-detail`} className={statusBgColors[plan.status]}>
                          <td colSpan={7} className="px-6 py-4">
                            <div className="space-y-4">
                              {plan.notes && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                    Notes
                                  </h4>
                                  <p className="text-sm text-gray-700">{plan.notes}</p>
                                </div>
                              )}

                              {plan.bomRequirements && plan.bomRequirements.length > 0 ? (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                                    BOM Requirements
                                  </h4>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b border-gray-300">
                                          <th className="text-left text-xs font-semibold text-gray-700 pb-2">
                                            Material Type
                                          </th>
                                          <th className="text-left text-xs font-semibold text-gray-700 pb-2">
                                            Required Qty
                                          </th>
                                          <th className="text-left text-xs font-semibold text-gray-700 pb-2">
                                            Available Qty
                                          </th>
                                          <th className="text-left text-xs font-semibold text-gray-700 pb-2">
                                            Shortfall
                                          </th>
                                          <th className="text-left text-xs font-semibold text-gray-700 pb-2">
                                            Status
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {plan.bomRequirements.map((item) => (
                                          <tr key={item.id} className="border-b border-gray-200">
                                            <td className="py-2 text-gray-900">
                                              {item.materialType}
                                            </td>
                                            <td className="py-2 text-gray-700">
                                              {item.requiredQty}
                                            </td>
                                            <td className="py-2 text-gray-700">
                                              {item.availableQty}
                                            </td>
                                            <td className="py-2">
                                              {item.shortfallQty > 0 ? (
                                                <span className="text-red-600 font-medium">
                                                  {item.shortfallQty}
                                                </span>
                                              ) : (
                                                <span className="text-gray-500">-</span>
                                              )}
                                            </td>
                                            <td className="py-2">
                                              <span
                                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                                  item.shortfallQty > 0
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-green-100 text-green-800'
                                                }`}
                                              >
                                                {item.shortfallQty > 0 ? (
                                                  <>
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Shortage
                                                  </>
                                                ) : (
                                                  <>
                                                    <CheckCircle className="w-3 h-3" />
                                                    In Stock
                                                  </>
                                                )}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">No BOM requirements found</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Create Plan Modal */}
      <CreatePlanModal
        open={isCreateModalOpen}
        onOpenChange={(open: boolean) => {
          setIsCreateModalOpen(open);
          if (!open) handlePlanCreated();
        }}
      />
    </div>
  );
}
