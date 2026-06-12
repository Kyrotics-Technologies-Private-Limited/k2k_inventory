import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import type { Product } from "../../types/index";
import type { Variant } from "../../types/variant";
import { productApi } from "../../services/api/productApi";
import variantApi from "../../services/api/variantApi";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import Loader from "../../components/common/Loader";
import PageHeader from "../../components/common/PageHeader";
import VariantListTable from "../../components/admin/variants/VariantListTable";
import AddVariantForm from "../../components/admin/variants/AddVariantForm";
import EditVariantModal from "../../components/admin/variants/EditVariantModal";

// Helper to sort variants by numeric weight (ascending)
function sortVariantsByWeight(variants: Variant[]): Variant[] {
  return [...variants].sort((a, b) => {
    const parseWeight = (w: string) => {
      const [num, unit] = w.split(/\s+/);
      let n = parseFloat(num);
      if (isNaN(n)) return 0;
      if (unit === "kg" || unit === "l") n *= 1000;
      return n;
    };
    return parseWeight(a.weight) - parseWeight(b.weight);
  });
}

const VariantDetailsPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState({
    product: true,
    variants: true,
  });
  const [error, setError] = useState({
    product: "",
    variants: "",
  });
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [variantToDelete, setVariantToDelete] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Helper function to check if a weight already exists
  const isWeightDuplicate = (weight: string, excludeId?: string) => {
    if (!weight || weight.trim() === "") return false;
    
    // Parse the input weight to get number only
    const [inputNumber] = weight.trim().split(/\s+/);
    const inputNum = parseFloat(inputNumber);
    
    if (isNaN(inputNum)) return false;
    
    const isDuplicate = variants.some((v) => {
      if (v.id === excludeId || !v.weight) return false;
      
      // Parse existing variant weight to get number only
      const [existingNumber] = v.weight.trim().split(/\s+/);
      const existingNum = parseFloat(existingNumber);
      
      if (isNaN(existingNum)) return false;
      
      // Check if the numeric values match (ignore units)
      return inputNum === existingNum;
    });
    
    return isDuplicate;
  };

  const fetchData = async () => {
    try {
      setLoading({ product: true, variants: true });
      setError({ product: "", variants: "" });

      // Fetch product data
      const productData = await productApi.getProductById(productId!);
      setProduct(productData);
      setLoading((prev) => ({ ...prev, product: false }));

      // Fetch variants data
      const variantsData = await variantApi.getVariantsByProductId(productId!);
      setVariants(sortVariantsByWeight(variantsData));
      setLoading((prev) => ({ ...prev, variants: false }));
    } catch (err) {
      console.error("Fetch error:", err);
      setError({
        product: "Failed to load product information",
        variants: "Failed to load variants",
      });
      setLoading({ product: false, variants: false });
    }
  };

  useEffect(() => {
    fetchData();
  }, [productId]);

  // Refresh variants data when location changes (e.g., returning from edit page)
  useEffect(() => {
    const refreshVariants = async () => {
      if (productId) {
        try {
          setLoading((prev) => ({ ...prev, variants: true }));
          const variantsData = await variantApi.getVariantsByProductId(productId!);
          setVariants(sortVariantsByWeight(variantsData));
          setLoading((prev) => ({ ...prev, variants: false }));
        } catch (err) {
          console.error("Refresh error:", err);
          setLoading((prev) => ({ ...prev, variants: false }));
        }
      }
    };

    // Refresh when location changes (but not on initial load)
    if (location.state?.refreshVariants) {
      refreshVariants();
      // Clear the refresh flag to prevent unnecessary refreshes
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, productId, navigate]);

  // Add a manual refresh function that can be called when needed
  const refreshVariantsData = async () => {
    if (productId) {
      try {
        setLoading((prev) => ({ ...prev, variants: true }));
        const variantsData = await variantApi.getVariantsByProductId(productId!);
        setVariants(sortVariantsByWeight(variantsData));
        setLoading((prev) => ({ ...prev, variants: false }));
      } catch (err) {
        console.error("Refresh error:", err);
        setLoading((prev) => ({ ...prev, variants: false }));
      }
    }
  };

  // Also refresh data when the page becomes visible (fallback mechanism)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && productId) {
        // Only refresh if the page has been hidden for more than 1 second
        // This prevents unnecessary refreshes when just switching tabs quickly
        setTimeout(() => {
          if (!document.hidden) {
            refreshVariantsData();
          }
        }, 1000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    // Also refresh when the window regains focus (for cases where visibilitychange doesn't fire)
    const handleFocus = () => {
      if (productId) {
        setTimeout(() => {
          refreshVariantsData();
        }, 500);
      }
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [productId]);

  const handleDeleteVariant = async (variantId: string) => {
    try {
      if (!productId) {
        console.error("Product ID is undefined");
        setError((prev) => ({
          ...prev,
          variants: "Failed to delete variant due to missing product ID",
        }));
        return;
      }

      await variantApi.deleteVariant(productId, variantId);
      setVariants((prev) => sortVariantsByWeight(prev.filter((v) => v.id !== variantId)));
    } catch (err) {
      console.error("Delete error:", err);
      setError((prev) => ({
        ...prev,
        variants: "Failed to delete variant. Please try again.",
      }));
    }
  };

  const handleEditSuccess = (updatedVariant: Variant) => {
    setVariants((prev) =>
      sortVariantsByWeight(
        prev.map((v) => (v.id === updatedVariant.id ? updatedVariant : v))
      )
    );
    setEditingVariant(null);
    setError((prev) => ({ ...prev, variants: "" }));
    
    setTimeout(() => {
      refreshVariantsData();
    }, 500);
  };

  const handleAddSuccess = (newVariant: Variant) => {
    setVariants((prev) => sortVariantsByWeight([...prev, newVariant]));
    setShowAddForm(false);
    setError((prev) => ({ ...prev, variants: "" }));
    
    setTimeout(() => {
      refreshVariantsData();
    }, 500);
  };

  const handleRetryVariants = async () => {
    try {
      setLoading((prev) => ({ ...prev, variants: true }));
      setError((prev) => ({ ...prev, variants: "" }));
      const variantsData = await variantApi.getVariantsByProductId(productId!);
      setVariants(sortVariantsByWeight(variantsData));
      setLoading((prev) => ({ ...prev, variants: false }));
    } catch (err) {
      console.error("Retry error:", err);
      setError((prev) => ({ ...prev, variants: "Failed to load variants" }));
      setLoading((prev) => ({ ...prev, variants: false }));
    }
  };

  if (loading.product) {
    return <Loader fullscreen text="Loading product details..." />;
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="p-6 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center">
          <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
          {error.product || "Product not found"}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back to Products
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      {/* Header */}
      <PageHeader
        title={product.name}
        description={`Manage variants for this ${product.category || "product"}`}
        onBack={() => navigate(-1)}
        backText="Back to Products"
        actions={
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors cursor-pointer text-sm font-medium shadow-sm"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            {showAddForm ? "Close" : "Add New Variant"}
          </button>
        }
      />

      {showAddForm && (
        <AddVariantForm
          productId={productId!}
          onSuccess={handleAddSuccess}
          isWeightDuplicate={isWeightDuplicate}
        />
      )}

      {/* Product Info */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8 border border-gray-200">
        <div className="p-6">
          <div className="flex items-center">
            {product.images?.main && (
              <img
                src={product.images.main}
                alt={product.name}
                className="h-20 w-20 object-cover rounded-md mr-4 border border-gray-200"
              />
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-800">{product.name}</h2>
              <p className="text-gray-500 text-sm capitalize mt-1">{product.category}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Errors */}
      {error.variants && (
        <div className="mb-6 p-4 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 mr-2 text-yellow-500" />
            <span>{error.variants}</span>
          </div>
          <button
            onClick={handleRetryVariants}
            className="flex items-center text-yellow-700 hover:text-yellow-800 font-semibold"
          >
            <ArrowPathIcon className="w-4 h-4 mr-1" />
            Retry
          </button>
        </div>
      )}

      {/* Variants Table */}
      <VariantListTable
        variants={variants}
        loadingVariants={loading.variants}
        onEdit={(v) => setEditingVariant(v)}
        onDelete={(id) => setVariantToDelete(id)}
      />

      {/* Delete Confirmation Modal */}
      {variantToDelete && (
        <div className="fixed inset-0 bg-gray-900/60 bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn animate-duration-200">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-gray-200">
            <div className="p-6">
              <div className="flex items-center space-x-3 text-red-600 mb-4">
                <ExclamationTriangleIcon className="w-8 h-8" />
                <h3 className="text-xl font-bold text-gray-950">Confirm Deletion</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this variant? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setVariantToDelete(null)}
                  className="button px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const id = variantToDelete;
                    setVariantToDelete(null);
                    await handleDeleteVariant(id);
                  }}
                  className="button px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingVariant && (
        <EditVariantModal
          variant={editingVariant}
          productId={productId!}
          onClose={() => setEditingVariant(null)}
          onSuccess={handleEditSuccess}
          isWeightDuplicate={isWeightDuplicate}
        />
      )}
    </div>
  );
};

export default VariantDetailsPage;
