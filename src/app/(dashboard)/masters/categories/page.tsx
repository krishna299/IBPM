'use client';

import { useState, useEffect } from 'react';
import {
  FolderTree,
  Plus,
  ChevronDown,
  ChevronRight,
  Package,
  Loader2,
} from 'lucide-react';
import CategoryFormModal from '@/components/modals/CategoryFormModal';

interface CategoryCount {
  products: number;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  _count: CategoryCount;
  children?: Category[];
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/masters/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedIds(newExpanded);
  };

  const handleCategoryCreated = () => {
    setShowCreateModal(false);
    fetchCategories();
  };

  const CategoryCard = ({ category, level = 0 }: { category: Category; level?: number }) => {
    const isExpanded = expandedIds.has(category.id);
    const hasChildren = category.children && category.children.length > 0;

    return (
      <div key={category.id} className={`${level > 0 ? 'ml-4' : ''}`}>
        <div
          className={`
            bg-white border border-gray-200 rounded-lg p-4 mb-2
            hover:border-amber-300 hover:shadow-md transition-all
            ${level > 0 ? 'border-l-2 border-l-amber-200' : ''}
          `}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {hasChildren ? (
                  <button
                    onClick={() => toggleExpanded(category.id)}
                    className="p-1 hover:bg-amber-50 rounded transition-colors"
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-amber-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-amber-600" />
                    )}
                  </button>
                ) : (
                  <div className="w-6" />
                )}
                <h3 className="text-lg font-semibold text-gray-900">
                  {category.name}
                </h3>
              </div>

              {category.description && (
                <p className="text-sm text-gray-600 ml-7 mb-2">
                  {category.description}
                </p>
              )}

              <div className="flex items-center gap-2 ml-7 text-sm text-gray-500">
                <Package className="w-4 h-4 text-amber-600" />
                <span>{category._count.products} products</span>
              </div>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-2">
            {category.children!.map((child) => (
              <CategoryCard
                key={child.id}
                category={child}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
          <p className="text-gray-600">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2">
              <FolderTree className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Category Master
              </h1>
              <p className="text-gray-600">
                Manage product categories and hierarchies
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium
              bg-amber-500 text-white hover:bg-amber-600
              transition-colors active:scale-95
            `}
          >
            <Plus className="w-5 h-5" />
            Add Category
          </button>
        </div>

        {/* Content */}
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12">
            <FolderTree className="w-12 h-12 text-gray-400 mb-3" />
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              No categories yet
            </h2>
            <p className="text-gray-600 mb-6">
              Create your first category to get started
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium
                bg-amber-500 text-white hover:bg-amber-600
                transition-colors active:scale-95
              `}
            >
              <Plus className="w-5 h-5" />
              Create Category
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}
      </div>

      {/* Category Form Modal */}
      <CategoryFormModal
        open={showCreateModal}
        onOpenChange={(open: boolean) => {
          setShowCreateModal(open);
          if (!open) handleCategoryCreated();
        }}
      />
    </div>
  );
}
