import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import React, { useEffect, useState } from "react";
import { productApi } from "../../services/api/productApi";
import variantApi from "../../services/api/variantApi";
import type { Variant } from "../../types/variant";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

interface Product {
  id: string;
  name: string;
  category: string;
  images: { main: string };
}

const OutOfStockPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [variantsMap, setVariantsMap] = useState<Record<string, Variant[]>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchProductsAndVariants = async () => {
    setLoading(true);
    try {
      const allProducts: Product[] = await productApi.getAllProducts();
      setProducts(allProducts);
      const variantsPromises = allProducts.map((product) =>
        variantApi.getVariantsByProductId(product.id)
      );
      const allVariants = await Promise.all(variantsPromises);
      const map: Record<string, Variant[]> = {};
      allProducts.forEach((product, idx) => {
        // Accept any shape for variants, as long as units_in_stock exists
        map[product.id] = (allVariants[idx] as Variant[]);
      });
      setVariantsMap(map);
      
      // Debug: Log the first product's variants to see the structure
      if (allProducts.length > 0 && allVariants.length > 0) {
        console.log('Sample variant data:', allVariants[0]);
        console.log('Sample product:', allProducts[0]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsAndVariants();
  }, []);

  // Refresh data when location changes (e.g., returning from variant edit page)
  useEffect(() => {
    if (location.state?.refreshVariants) {
      fetchProductsAndVariants();
      // Clear the refresh flag to prevent unnecessary refreshes
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // Filter products with out of stock or low stock variants
  const filtered = products
    .map((product) => {
      const variants = variantsMap[product.id] || [];
      const outOfStock = variants.filter((v) => v.units_in_stock <= 0);
      const lowStock = variants.filter(
        (v) => v.units_in_stock > 0 && v.units_in_stock < 5
      );
      return {
        ...product,
        outOfStock,
        lowStock,
      };
    })
    .filter((p) => (p.outOfStock?.length ?? 0) > 0 || (p.lowStock?.length ?? 0) > 0);

  // Create a flat list of all problematic variants for easier table rendering
  const allProblemVariants = filtered.flatMap((product) => [
    ...product.outOfStock.map(variant => ({
      ...variant,
      product,
      issueType: 'outOfStock' as const
    })),
    ...product.lowStock.map(variant => ({
      ...variant,
      product,
      issueType: 'lowStock' as const
    }))
  ]);


  // Sort: out of stock first, then low stock
  allProblemVariants.sort((a, b) => {
    if (a.issueType === 'outOfStock' && b.issueType === 'lowStock') return -1;
    if (a.issueType === 'lowStock' && b.issueType === 'outOfStock') return 1;
    return 0;
  });

  // Export to Excel function (must be after allProblemVariants is defined)
  const handleExportExcel = () => {
    if (allProblemVariants.length === 0) {
      alert('No data to export');
      return;
    }
    const exportData = allProblemVariants.map((variant: any) => ({
      Product: variant.product.name,
      Category: variant.product.category,
      Variant: variant.weight || 'Unnamed Variant',
      'Stock Status': variant.issueType === 'outOfStock' ? 'Out of Stock' : 'Low Stock',
      'Current Stock': variant.issueType === 'outOfStock' ? 0 : variant.units_in_stock
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Out of Stock");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    const fileName = `out_of_stock_${new Date().toISOString().slice(0, 10)}.xlsx`;
    saveAs(data, fileName);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span
            onClick={() => navigate('/admin/products')}
            className="text-blue-600 hover:text-blue-800 cursor-pointer transition-colors"
          >
            ← Back to Products
          </span>
          <button
            onClick={fetchProductsAndVariants}
            disabled={loading}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        <h1 className="text-2xl font-bold">Out of Stock & Low Stock Products</h1>
      </div>
      {loading ? (
        <div className="flex justify-center items-center h-40">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-500">All products are sufficiently stocked.</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="flex justify-end p-4">
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center gap-2 cursor-pointer"
            >
              Export to Excel
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Stock
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allProblemVariants.map((variant, variantIdx) => {
                  // Debug: Log variant data for each row
                  console.log('Rendering variant:', variant);
                  return (
                    <tr 
                      key={`${variant.id || variantIdx}-${variant.issueType}`} 
                      className={variant.issueType === 'outOfStock' ? 'hover:bg-red-50' : 'hover:bg-yellow-50'}
                    >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          src={variant.product.images.main}
                          alt={variant.product.name}
                          className="w-10 h-10 object-cover rounded mr-3 border"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{variant.product.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">{variant.product.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <span className="text-sm text-gray-900">
                            {variant.weight || 'Unnamed Variant'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        variant.issueType === 'outOfStock' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {variant.issueType === 'outOfStock' ? 'Out of Stock' : 'Low Stock'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {variant.issueType === 'outOfStock' ? 0 : variant.units_in_stock}
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutOfStockPage;
