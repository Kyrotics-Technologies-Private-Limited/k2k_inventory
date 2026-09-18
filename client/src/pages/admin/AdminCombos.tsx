import React, { useEffect, useState } from "react";
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  History,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Search,
  X,
  Layers,
  Gift,
} from "lucide-react";
import {
  getAllCombos,
  createCombo,
  updateCombo,
  deleteCombo,
  quickAdjustStock,
  getComboStockHistory,
  getProductsForPicker,
} from "../../services/adminComboService";
import type {
  ComboDocument,
  StockHistoryEntry,
  ProductSnapshot,
} from "../../services/adminComboService";
import { categoryApi, type Category } from "../../services/api/categoryApi";
import PageHeader from "../../components/common/PageHeader";
import ComboFormModal from "../../components/admin/combos/ComboFormModal";

export const AdminCombos: React.FC = () => {
  const [combos, setCombos] = useState<ComboDocument[]>([]);
  const [productsList, setProductsList] = useState<ProductSnapshot[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [formLoading, setFormLoading] = useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft" | "out_of_stock" | "sample">("all");

  // Modals & Drawers
  const [selectedCombo, setSelectedCombo] = useState<ComboDocument | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [historyDrawerCombo, setHistoryDrawerCombo] = useState<ComboDocument | null>(null);
  const [stockHistory, setStockHistory] = useState<StockHistoryEntry[]>([]);
  const [quickAdjustCombo, setQuickAdjustCombo] = useState<ComboDocument | null>(null);
  const [quickDelta, setQuickDelta] = useState<number>(5);
  const [quickReason, setQuickReason] = useState<string>("Restock batch");

  const loadData = async () => {
    try {
      setLoading(true);
      const [combosData, productsData, categoriesData] = await Promise.all([
        getAllCombos(),
        getProductsForPicker().catch(() => []),
        categoryApi.getAllCategories().catch(() => []),
      ]);
      setCombos(combosData);
      setProductsList(productsData);
      setCategories(categoriesData);
    } catch (err) {
      console.error("Error loading combo data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Stats Calculations (Standard Catalog Combos - excluding sample combos)
  const standardCombosList = combos.filter((c) => !c.isSample);
  const totalCombos = standardCombosList.length;
  const activeCombos = standardCombosList.filter((c) => c.status === "active").length;
  const outOfStockCount = standardCombosList.filter((c) => c.units_in_stock <= 0).length;
  const totalInventoryUnits = standardCombosList.reduce((acc, c) => acc + c.units_in_stock, 0);
  const sampleCombosCount = combos.filter((c) => Boolean(c.isSample)).length;

  const openModal = (combo?: ComboDocument) => {
    setSelectedCombo(combo || null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (payload: Omit<ComboDocument, "id">) => {
    setFormLoading(true);
    try {
      if (selectedCombo) {
        await updateCombo(selectedCombo.id, payload);
      } else {
        await createCombo(payload);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error("Error saving combo:", err);
      alert("Failed to save combo offer.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleQuickAdjustSubmit = async () => {
    if (!quickAdjustCombo) return;
    try {
      await quickAdjustStock(quickAdjustCombo.id, quickDelta, quickReason);
      setQuickAdjustCombo(null);
      loadData();
    } catch (err) {
      console.error("Error adjusting stock:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this combo?")) return;
    try {
      await deleteCombo(id);
      loadData();
    } catch (err) {
      console.error("Error deleting combo:", err);
    }
  };

  const openStockHistory = async (combo: ComboDocument) => {
    setHistoryDrawerCombo(combo);
    const history = await getComboStockHistory(combo.id);
    setStockHistory(history);
  };

  const filteredCombos = combos.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === "active") return matchesSearch && c.status === "active" && !c.isSample;
    if (statusFilter === "draft") return matchesSearch && c.status === "draft" && !c.isSample;
    if (statusFilter === "out_of_stock") return matchesSearch && c.units_in_stock <= 0 && !c.isSample;
    if (statusFilter === "sample") return matchesSearch && Boolean(c.isSample);
    return matchesSearch;
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen text-gray-800 space-y-6">
      {/* Shared Page Header */}
      <PageHeader
        title="Combo Inventory Manager"
        description="Manage bundled physical inventory stocks, dual KP pricing, and audit trails."
        actions={
          <button
            onClick={() => openModal()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-md shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Combo Bundle
          </button>
        }
      />

      {/* Metrics Dashboard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Combos</span>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalCombos}</p>
          </div>
          <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Offerings</span>
            <p className="text-2xl font-bold text-gray-900 mt-1">{activeCombos}</p>
          </div>
          <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Out of Stock Alerts</span>
            <p className="text-2xl font-bold text-gray-900 mt-1">{outOfStockCount}</p>
          </div>
          <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Stock Units</span>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalInventoryUnits.toLocaleString()}</p>
          </div>
          <div className="w-11 h-11 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sample Combos</span>
            <p className="text-2xl font-bold text-gray-900 mt-1">{sampleCombosCount}</p>
          </div>
          <div className="w-11 h-11 bg-pink-50 text-pink-600 rounded-lg flex items-center justify-center shrink-0">
            <Gift className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search combo by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-md pl-9 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {(["all", "active", "draft", "out_of_stock", "sample"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer ${statusFilter === st
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                }`}
            >
              {st.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table View */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500 font-medium">
          Loading combo inventory...
        </div>
      ) : filteredCombos.length === 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center text-gray-500">
          <Layers className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 font-medium">No combo offers match your filter.</p>
        </div>
      ) : (
        (() => {
          const standardCombos = filteredCombos.filter((c) => !c.isSample);
          const sampleCombos = filteredCombos.filter((c) => Boolean(c.isSample));

          const renderComboTable = (
            items: ComboDocument[],
            title: string,
            subtitle: string,
            iconBadge: string
          ) => (
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                    <span>{iconBadge}</span>
                    {title}
                    <span className="ml-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">
                      {items.length}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm italic">
                  No combo offers in this section.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-700">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3">Combo Offer</th>
                        <th className="px-6 py-3">Physical Stock</th>
                        <th className="px-6 py-3">Original MRP</th>
                        <th className="px-6 py-3">Non-Member Price</th>
                        <th className="px-6 py-3">K2K Member Price</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {items.map((combo) => {
                        const isOutOfStock = combo.units_in_stock <= 0;
                        const isLowStock = combo.units_in_stock > 0 && combo.units_in_stock <= 5;
                        const mrp = combo.pricing.originalTotalPrice || combo.pricing.comboPrice || 0;
                        const regularPrice = combo.pricing.comboPrice || 0;
                        const memberPrice = combo.pricing.kpMemberPrice ?? regularPrice;

                        const regularOff = mrp > 0 && regularPrice < mrp ? Math.round(((mrp - regularPrice) / mrp) * 100) : 0;
                        const memberOff = mrp > 0 && memberPrice < mrp ? Math.round(((mrp - memberPrice) / mrp) * 100) : 0;

                        return (
                          <tr key={combo.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                {combo.images.main ? (
                                  <img
                                    src={combo.images.main}
                                    alt={combo.name}
                                    className="w-10 h-10 rounded border border-gray-200 object-cover bg-gray-50 shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] text-gray-400 shrink-0">
                                    No Img
                                  </div>
                                )}
                                <div>
                                  <div className="font-semibold text-gray-900 flex items-center gap-2">
                                    {combo.name}
                                    {combo.isSample && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded uppercase">
                                        SAMPLE
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {combo.items.length} Included Component Items
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${isOutOfStock
                                      ? "bg-red-100 text-red-800"
                                      : isLowStock
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-emerald-100 text-emerald-800"
                                    }`}
                                >
                                  {combo.units_in_stock} Units
                                </span>
                                <button
                                  onClick={() => setQuickAdjustCombo(combo)}
                                  className="text-xs bg-gray-100 hover:bg-gray-200 border border-gray-300 px-2 py-0.5 rounded text-gray-700 font-medium cursor-pointer"
                                >
                                  Adjust
                                </button>
                              </div>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-500">
                              ₹{mrp.toLocaleString("en-IN")}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">
                              ₹{regularPrice.toLocaleString("en-IN")}{" "}
                              {regularOff > 0 && (
                                <span className="text-xs text-blue-600 font-normal">({regularOff}% OFF)</span>
                              )}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap font-bold text-emerald-700">
                              ₹{memberPrice.toLocaleString("en-IN")}{" "}
                              {memberOff > 0 && (
                                <span className="text-xs text-emerald-600 font-normal">({memberOff}% OFF MRP)</span>
                              )}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider ${combo.status === "active"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-700"
                                  }`}
                              >
                                {combo.status}
                              </span>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openStockHistory(combo)}
                                  title="View Audit Trail"
                                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                >
                                  <History className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openModal(combo)}
                                  title="Edit Combo"
                                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(combo.id)}
                                  title="Delete Combo"
                                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );

          return (
            <div>
              {statusFilter !== "sample" &&
                renderComboTable(
                  standardCombos,
                  "Catalog Combo Bundles",
                  "Standard bundled offerings available for purchase",
                  "📦"
                )}
              {(statusFilter === "all" || statusFilter === "sample") &&
                renderComboTable(
                  sampleCombos,
                  "Sample Combo Offerings",
                  "Promotional and trial sample combo packs",
                  "🎁"
                )}
            </div>
          );
        })()
      )}

      {/* Modular Combo Form Modal */}
      <ComboFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editMode={Boolean(selectedCombo)}
        selectedCombo={selectedCombo}
        productsList={productsList}
        categories={categories}
        onSubmit={handleFormSubmit}
        formLoading={formLoading}
      />

      {/* Quick Adjust Stock Modal */}
      {quickAdjustCombo && (
        <div className="fixed inset-0 bg-gray-800/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-sm shadow-xl text-gray-900">
            <h3 className="font-bold text-base mb-1 text-gray-800">Adjust Inventory Stock</h3>
            <p className="text-xs text-gray-500 mb-4">{quickAdjustCombo.name}</p>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              {[-5, -1, 1, 5, 10, 25].map((d) => (
                <button
                  key={d}
                  onClick={() => setQuickDelta(d)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${quickDelta === d ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                >
                  {d > 0 ? `+${d}` : d}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Reason (e.g., Weekly Restock)"
              value={quickReason}
              onChange={(e) => setQuickReason(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-md p-2 text-xs text-gray-900 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setQuickAdjustCombo(null)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-md font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickAdjustSubmit}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-xs transition-colors"
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock History Audit Drawer */}
      {historyDrawerCombo && (
        <div className="fixed inset-0 bg-gray-800/50 backdrop-blur-xs flex justify-end z-50">
          <div className="bg-white border-l border-gray-200 w-full max-w-md h-full p-6 text-gray-900 overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-4">
              <div>
                <h2 className="font-bold text-base text-gray-800">Stock History Audit Log</h2>
                <p className="text-xs text-gray-500">{historyDrawerCombo.name}</p>
              </div>
              <button onClick={() => setHistoryDrawerCombo(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <ul className="space-y-3 text-xs">
              {stockHistory.length === 0 ? (
                <li className="text-center py-8 text-gray-400">No stock history recorded yet.</li>
              ) : (
                stockHistory.map((h) => (
                  <li key={h.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between font-semibold">
                      <span className="capitalize text-gray-800">{h.changeType.replace(/_/g, " ")}</span>
                      <span className={h.changeQuantity >= 0 ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
                        {h.changeQuantity > 0 ? `+${h.changeQuantity}` : h.changeQuantity}
                      </span>
                    </div>
                    <div className="text-gray-600 mt-1">
                      Stock: {h.previousStock} → <strong className="text-gray-900">{h.newStock}</strong>
                    </div>
                    {h.referenceId && (
                      <div className="text-gray-500 text-[11px] mt-0.5 truncate">
                        Ref: {h.referenceId}
                      </div>
                    )}
                    <div className="text-gray-400 text-[10px] mt-1">
                      {new Date(h.timestamp).toLocaleString()}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCombos;
