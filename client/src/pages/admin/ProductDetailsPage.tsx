import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { productApi } from "../../services/api/productApi";
import type { Product } from "../../types";
import variantApi from "../../services/api/variantApi";
import type { Variant } from "../../types/variant";
// import {
//   TrashIcon,
//   ArrowTopRightOnSquareIcon,
// } from "@heroicons/react/24/solid";
// import { ArrowPathIcon } from "@heroicons/react/24/outline";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import VariantListTable from "../../components/admin/variants/VariantListTable";
import EditVariantModal from "../../components/admin/variants/EditVariantModal";

const ProductDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState("");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);

  const handleDeleteVariant = async (variantId: string) => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this variant?")) return;
    try {
      await variantApi.deleteVariant(id, variantId);
      const updated = await variantApi.getVariantsByProductId(id);
      setVariants(updated);
    } catch (err) {
      console.error("Delete variant error:", err);
    }
  };

  const fetchProductDetails = async () => {
    try {
      if (id) {
        const fetchedProduct = await productApi.getProductById(id);
        setProduct(fetchedProduct);
        setSelectedImage(fetchedProduct.images.main);
        // Fetch variants for this product
        const fetchedVariants = await variantApi.getVariantsByProductId(id);
        setVariants(fetchedVariants);
      }
    } catch (err) {
      setError("Failed to fetch product details. Please try again later.");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // const refreshVariants = async () => {
  //   if (id) {
  //     try {
  //       const fetchedVariants = await variantApi.getVariantsByProductId(id);
  //       setVariants(fetchedVariants);
  //     } catch (err) {
  //       console.error("Refresh variants error:", err);
  //     }
  //   }
  // };

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  // Refresh variants data when location changes (e.g., returning from variant edit page)
  useEffect(() => {
    const refreshVariantsLoc = async () => {
      if (id && location.state?.refreshVariants) {
        try {
          const fetchedVariants = await variantApi.getVariantsByProductId(id);
          setVariants(fetchedVariants);
          // Clear the refresh flag to prevent unnecessary refreshes
          navigate(location.pathname, { replace: true, state: {} });
        } catch (err) {
          console.error("Refresh variants error:", err);
        }
      }
    };

    refreshVariantsLoc();
  }, [location, id, navigate]);

  // const handleDelete = async () => {
  //   if (!id) return;

  //   try {
  //     setIsDeleting(true);
  //     await productApi.deleteProduct(id);
  //     navigate("/admin/products");
  //   } catch (err) {
  //     setError("Failed to delete product. Please try again.");
  //     console.error("Delete error:", err);
  //   } finally {
  //     setIsDeleting(false);
  //   }
  // };

  if (loading) {
    return <Loader fullscreen text="Loading product details..." />;
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="max-w-md p-6 bg-red-50 rounded-lg shadow">
          <p className="text-red-600 font-medium text-center">{error}</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="max-w-md p-6 bg-yellow-50 rounded-lg shadow">
          <p className="text-yellow-700 font-medium text-center">
            Product not found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-8 max-w-6xl">
      <PageHeader
        title="Product Details"
        description={product.isBestseller ? "🏆 Bestseller Product" : undefined}
        onBack={() => navigate('/admin/products')}
        backText="Back to Products"
        actions={
          <div className="flex space-x-3">
            {/* 
            <button
              onClick={refreshVariants}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm cursor-pointer"
            >
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              Refresh Variants
            </button>
            */}
            {/* <button
              onClick={handleDelete}
              disabled={isDeleting}
              className={`button flex items-center px-4 py-2 rounded-md transition font-medium text-sm cursor-pointer ${isDeleting
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700 text-white"
                }`}
            >
              <TrashIcon className="w-5 h-5 mr-2" />
              {isDeleting ? "Deleting..." : "Delete Product"}
            </button> */}
            {/* 
            <button className="button flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition font-medium text-sm cursor-pointer">
              <ArrowTopRightOnSquareIcon className="w-5 h-5 mr-2" />
              View on Site
            </button>
            */}
          </div>
        }
      />

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
          {/* Image Gallery */}
          <div>
            <div className="mb-4 bg-gray-50 rounded-lg overflow-hidden">
              <img
                src={selectedImage || product.images.main}
                alt={product.name}
                className="w-full h-96 object-contain mx-auto"
              />
            </div>
            <div className="flex space-x-2 overflow-x-auto py-2">
              {product.images.gallery?.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(img)}
                  className={`w-20 h-20 border rounded-md overflow-hidden ${selectedImage === img ? "ring-2 ring-blue-500" : ""
                    }`}
                >
                  <img
                    src={img}
                    alt={`${product.name} view ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div>
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">
                Basic Information
              </h2>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    Product ID:
                  </span>
                  <span className="ml-2 text-gray-900">{id}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    Name:
                  </span>
                  <span className="ml-2 text-gray-900">{product.name}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    Categories:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {product.categories && product.categories.length > 0 ? (
                      product.categories.map((cat, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                          {cat}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400 text-xs italic">No categories</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    Origin:
                  </span>
                  <span className="ml-2 text-gray-900">{product.origin}</span>
                </div>
              </div>
            </div>



      {/* Full Variant List Table */}
      <div className="p-6 border-t border-gray-200">
        <VariantListTable
          variants={variants}
          loadingVariants={loading}
          onEdit={(v) => setEditingVariant(v)}
          onDelete={handleDeleteVariant}
        />
      </div>

      {editingVariant && id && (
        <EditVariantModal
          variant={editingVariant}
          productId={id}
          onClose={() => setEditingVariant(null)}
          onSuccess={(updated) => {
            setVariants((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
            setEditingVariant(null);
          }}
          isWeightDuplicate={(weight, excludeId) =>
            variants.some((v) => v.id !== excludeId && v.weight.toLowerCase() === weight.toLowerCase())
          }
        />
      )}


          </div>
        </div>

        {/* Description Section*/}
        <div className="p-6 border-t border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Product Description
          </h2>
          <div className="prose max-w-none">
            <p className="text-gray-700">{product.description}</p>
          </div>
        </div>


      </div>
    </div>
  );
};

export default ProductDetailsPage;
