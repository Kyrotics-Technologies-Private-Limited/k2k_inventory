import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { productApi } from "../../services/api/productApi";
import type { Product } from "../../types";
import {
  StarIcon,
  PencilIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/solid";

const ProductDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        if (id) {
          const fetchedProduct = await productApi.getProductById(id);
          setProduct(fetchedProduct);
          setSelectedImage(fetchedProduct.images.main);
        }
      } catch (err) {
        setError("Failed to fetch product details. Please try again later.");
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;

    try {
      setIsDeleting(true);
      await productApi.deleteProduct(id);
      navigate("/admin/products");
    } catch (err) {
      setError("Failed to delete product. Please try again.");
      console.error("Delete error:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = () => {
    if (!id) return;
    navigate(`/admin/products/edit/${id}`);
  };

  const renderRatingStars = () => {
    if (!product) return null;

    const stars = [];
    const fullStars = Math.floor(product.ratings);
    const hasHalfStar = product.ratings % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <StarIcon key={`full-${i}`} className="w-5 h-5 text-yellow-400" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <StarIcon key="half" className="w-5 h-5 text-yellow-400 opacity-50" />
      );
    }

    const remainingStars = 5 - stars.length;
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <StarIcon key={`empty-${i}`} className="w-5 h-5 text-gray-300" />
      );
    }

    return stars;
  };

  const getStockStatusText = () => {
    if (!product) return "";

    switch (product.stockStatus) {
      case "in_stock":
        return "In Stock";
      case "low_stock":
        return "Low Stock";
      case "out_of_stock":
        return "Out of Stock";
      default:
        return product.stockStatus;
    }
  };

  const getStockStatusColor = () => {
    if (!product) return "";

    switch (product.stockStatus) {
      case "in_stock":
        return "text-green-600";
      case "low_stock":
        return "text-yellow-600";
      case "out_of_stock":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Product Details</h1>
        <div className="flex space-x-3">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={`button flex items-center px-4 py-2 rounded-md transition ${
              isDeleting
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
          >
            <TrashIcon className="w-5 h-5 mr-2" />
            {isDeleting ? "Deleting..." : "Delete Product"}
          </button>
          <button className="button flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition">
            <ArrowTopRightOnSquareIcon className="w-5 h-5 mr-2" />
            View on Site
          </button>
        </div>
      </div>

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
                  className={`w-20 h-20 border rounded-md overflow-hidden ${
                    selectedImage === img ? "ring-2 ring-blue-500" : ""
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
                    Category:
                  </span>
                  <span className="ml-2 text-gray-900 capitalize">
                    {product.category}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    Origin:
                  </span>
                  <span className="ml-2 text-gray-900">{product.origin}</span>
                </div>
              </div>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">
                Pricing
              </h2>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    Price:
                  </span>
                  <span className="ml-2 text-gray-900">
                    ₹{product.price.amount.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    Currency:
                  </span>
                  <span className="ml-2 text-gray-900">
                    {product.price.currency}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">
                Inventory
              </h2>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    Stock Status:
                  </span>
                  <span className={`ml-2 font-medium ${getStockStatusColor()}`}>
                    {getStockStatusText()}
                  </span>
                </div>
              </div>
            </div>

            {/* <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">
                Ratings & Reviews
              </h2>
              <div className="flex items-center">
                <div className="flex mr-2">{renderRatingStars()}</div>
                <span className="text-gray-600 text-sm">
                  {product.ratings.toFixed(1)} ({product.reviews} reviews)
                </span>
              </div>
            </div>

            {product.badges && product.badges.length > 0 && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h2 className="text-lg font-semibold text-gray-700 mb-2">
                  Badges
                </h2>
                <div className="flex flex-wrap gap-2">
                  {product.badges.map((badge, index) => (
                    <span
                      key={index}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        badge.type === "organic"
                          ? "bg-green-100 text-green-800"
                          : badge.type === "natural"
                          ? "bg-blue-100 text-blue-800"
                          : badge.type === "premium"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {badge.text}
                    </span>
                  ))}
                </div>
              </div>
            )}*/}
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

        {/* Benefits Section 
        // {product.benefits && product.benefits.length > 0 && (
        //   <div className="p-6 border-t border-gray-200 bg-gray-50">
        //     <h2 className="text-xl font-semibold text-gray-900 mb-6">
        //       Product Benefits
        //     </h2>
        //     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        //       {product.benefits.map((benefit, index) => (
        //         <div key={index} className="bg-white p-4 rounded-lg shadow-sm">
        //           <div className="flex items-center mb-3">
        //             {benefit.icon && (
        //               <img
        //                 src={benefit.icon}
        //                 alt={benefit.title}
        //                 className="w-8 h-8 mr-3"
        //               />
        //             )}
        //             <h3 className="text-lg font-medium text-gray-900">
        //               {benefit.title}
        //             </h3>
        //           </div>
        //           <p className="text-gray-600">{benefit.description}</p>
        //         </div>
        //       ))}
        //     </div>
        //   </div>
        // )} */}

        {/* Additional Images
        {product.images.banner && (
          <div className="p-6 border-t border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Banner Image
            </h2>
            <img
              src={product.images.banner}
              alt={`${product.name} banner`}
              className="w-full h-auto rounded-lg"
            />
          </div>
        )} */}
      </div>
    </div>
  );
};

export default ProductDetailsPage;
