import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { orderApi } from "../../services/api/orderApi";
import { productApi } from "../../services/api/productApi";
import type { Order, OrderStatus, OrderItem } from "../../types/order";
import { toast } from "react-toastify";
import { auth } from "../../services/firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import {
  ShoppingCart,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  Copy,
  Check,
  Download,
  Printer,
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  User,
  CreditCard,
  Tag,
  ZoomIn,
  Edit3,
  X,
  AlertCircle,
  FileText
} from "lucide-react";

const ORDER_STATUSES: { status: OrderStatus; label: string; desc: string }[] = [
  { status: "placed", label: "Placed", desc: "Order has been received" },
  { status: "processing", label: "Processing", desc: "Order is packed and ready for dispatch" },
  { status: "shipped", label: "Shipped", desc: "Handed over to delivery courier" },
  { status: "delivered", label: "Delivered", desc: "Successfully delivered to customer" },
  { status: "cancelled", label: "Cancelled", desc: "Order cancelled & items restocked" },
  { status: "returned", label: "Returned", desc: "Returned by customer" },
];

// Helper to safely parse dates from Firestore, ISO, or epoch
const parseDate = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val?.toDate === "function") return val.toDate();
  if (typeof val?.seconds === "number") return new Date(val.seconds * 1000);
  if (typeof val?._seconds === "number") return new Date(val._seconds * 1000);
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

// Formatter for full dates: "2 November 2026 at 12:15 pm"
const formatFullDate = (val: any): string => {
  const d = parseDate(val);
  if (!d) return "N/A";
  const dateStr = d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).toLowerCase();
  return `${dateStr} at ${timeStr}`;
};

// Formatter for stepper: "2 Nov 2026, 12:15 pm"
const formatStepperDate = (val: any): string => {
  const d = parseDate(val);
  if (!d) return "Pending";
  const dateStr = d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeStr = d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).toLowerCase();
  return `${dateStr}, ${timeStr}`;
};

const AdminOrderDetailsPage: React.FC = () => {
  const params = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  // Status modal state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus>("placed");
  const [newTrackingNumber, setNewTrackingNumber] = useState("");

  // Product images cache: maps productId -> main image URL
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [imageZoomUrl, setImageZoomUrl] = useState<string | null>(null);
  const [imageZoomTitle, setImageZoomTitle] = useState<string>("");

  // Invoice modal state
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  const handleDownloadInvoice = async () => {
    if (!order) return;
    try {
      setDownloadingInvoice(true);
      toast.info("Downloading official K2K Tax Invoice...");
      await orderApi.downloadInvoiceFile(order.id, order.invoiceUrl);
      toast.success("Invoice downloaded successfully");
    } catch (err: any) {
      console.error("Failed to download invoice:", err);
      toast.error("Failed to download invoice PDF");
      setIsInvoiceModalOpen(true);
    } finally {
      setDownloadingInvoice(false);
    }
  };

  // Copy tooltip state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    if (!text || text === "N/A") return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`Copied: ${text}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthChecked(true);
      if (!user) {
        setLoading(false);
        setError("Please log in to view order details");
        navigate("/admin/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!isAuthChecked) return;
      if (!auth.currentUser) return;

      const orderId = params.orderId || params.id;
      if (!orderId) {
        setLoading(false);
        setError("Order ID is missing from URL parameters");
        return;
      }

      setCurrentOrderId(orderId);
      await fetchOrderDetails(orderId);
    };

    fetchOrder();
  }, [params, isAuthChecked]);

  const fetchOrderDetails = async (id: string) => {
    if (!auth.currentUser) {
      setError("Authentication required");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const orderData = await orderApi.getOrderById(id);

      if (!orderData) {
        throw new Error("Order not found");
      }

      const normalizedOrder: Order = {
        ...orderData,
        status: (orderData.status?.toLowerCase() || "placed") as OrderStatus,
      };

      setOrder(normalizedOrder);
      setNewStatus(normalizedOrder.status);
      setNewTrackingNumber(normalizedOrder.tracking_number || "");

      // Resolve product images asynchronously if missing from items
      resolveMissingProductImages(normalizedOrder.items || []);
    } catch (err: any) {
      console.error("Failed to fetch order details:", err);
      setError(err.message || "Failed to fetch order details");
      toast.error(err.message || "Failed to fetch order details");
    } finally {
      setLoading(false);
    }
  };

  // Fetch product images for items that do not have an image
  const resolveMissingProductImages = async (items: OrderItem[]) => {
    const imagesToFetch: Record<string, string> = {};

    for (const item of items) {
      const pId = item.product_id || item.productId;
      if (!pId) continue;

      if (item.image) {
        imagesToFetch[pId] = item.image;
        continue;
      }

      // Fetch from product API if not already cached
      if (!productImages[pId]) {
        try {
          const product = await productApi.getProductById(pId);
          const resolvedImg =
            product.images?.main ||
            (Array.isArray(product.images?.gallery) ? product.images.gallery[0] : null) ||
            product.images?.banner ||
            (product as any)?.image;

          if (resolvedImg) {
            imagesToFetch[pId] = resolvedImg;
          }
        } catch (err) {
          console.warn(`Could not resolve image for product ${pId}`, err);
        }
      }
    }

    if (Object.keys(imagesToFetch).length > 0) {
      setProductImages((prev) => ({ ...prev, ...imagesToFetch }));
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrderId || !auth.currentUser) {
      toast.error("Cannot update status: Missing order ID or not authenticated");
      return;
    }

    try {
      setUpdatingStatus(true);
      await orderApi.updateOrderStatus(currentOrderId, {
        status: newStatus,
        tracking_number: newTrackingNumber.trim() || undefined,
      });

      if (newStatus === "cancelled") {
        toast.success("Order cancelled. Inventory has been restocked.");
        try {
          await orderApi.refreshInventoryAfterCancellation(currentOrderId);
        } catch (error) {
          console.warn("Failed to refresh inventory data:", error);
        }
      } else {
        toast.success(`Order status updated to ${newStatus}`);
      }

      setIsStatusModalOpen(false);
      await fetchOrderDetails(currentOrderId);
    } catch (err: any) {
      console.error("Failed to update status:", err);
      toast.error(err.message || "Failed to update order status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Calculation helpers
  const financialSummary = useMemo(() => {
    if (!order || !order.items) {
      return {
        totalUnits: 0,
        mrpTotal: 0,
        sellingSubtotal: 0,
        memberSavings: 0,
        shippingFee: 0,
        gstTotal: 0,
        finalTotal: order?.total_amount || 0,
      };
    }

    let totalUnits = 0;
    let mrpTotal = 0;
    let sellingSubtotal = 0;
    let memberSavings = 0;
    let gstTotal = 0;

    order.items.forEach((item) => {
      const qty = item.quantity || 1;
      const unitSelling = Number(item.unit_price ?? item.price ?? 0);
      const unitMrp = Number(item.original_price ?? item.originalPrice ?? unitSelling);

      totalUnits += qty;
      mrpTotal += unitMrp * qty;
      sellingSubtotal += unitSelling * qty;

      if (unitMrp > unitSelling) {
        memberSavings += (unitMrp - unitSelling) * qty;
      }

      // GST component calculation
      const gstPct = Number(item.gstPercentage || 5);
      const itemGst = (unitSelling * qty * gstPct) / (100 + gstPct);
      gstTotal += itemGst;
    });

    const shippingFee = Number(order.shipping_fee || 0);
    const finalTotal = Number(order.total_amount || sellingSubtotal + shippingFee);

    // If order has an explicit discount field and it's higher
    if (order.discount && order.discount > memberSavings) {
      memberSavings = order.discount;
    }

    return {
      totalUnits,
      mrpTotal: mrpTotal > sellingSubtotal ? mrpTotal : sellingSubtotal + memberSavings,
      sellingSubtotal,
      memberSavings,
      shippingFee,
      gstTotal,
      finalTotal,
    };
  }, [order]);

  // Status Stepper Helper
  const stepperState = useMemo(() => {
    if (!order) return { currentStep: 0, isCancelled: false, isReturned: false };
    const st = order.status?.toLowerCase();
    const isCancelled = st === "cancelled";
    const isReturned = st === "returned";

    let currentStep = 1; // Placed
    if (st === "processing") currentStep = 2;
    if (st === "shipped") currentStep = 3;
    if (st === "delivered") currentStep = 4;

    return { currentStep, isCancelled, isReturned };
  }, [order]);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "placed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Package className="w-3.5 h-3.5" /> Placed
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Processing
          </span>
        );
      case "shipped":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Truck className="w-3.5 h-3.5" /> Shipped
          </span>
        );
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      case "returned":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <RotateCcw className="w-3.5 h-3.5" /> Returned
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  if (loading && !error) {
    return <Loader fullscreen text="Loading order details..." />;
  }

  if (error || !order) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-5xl">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-red-100 rounded-lg text-red-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800">Order Not Found</h3>
              <p className="text-sm text-red-600 mt-1">{error || "Could not retrieve order details."}</p>
              <p className="text-xs text-red-500 font-mono mt-1">ID: {currentOrderId || "Not specified"}</p>
              <div className="mt-4 flex gap-3">
                {currentOrderId && (
                  <button
                    onClick={() => fetchOrderDetails(currentOrderId)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition cursor-pointer"
                  >
                    Try Again
                  </button>
                )}
                <button
                  onClick={() => navigate("/admin/orders")}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition cursor-pointer"
                >
                  Back to Orders
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-7xl">
      {/* Top Header */}
      <PageHeader
        title={`Order #${order.id.length > 14 ? order.id.slice(0, 14) + "..." : order.id}`}
        description={`Placed on ${formatFullDate(order.created_at || (order as any).createdAt)}`}
        onBack={() => navigate("/admin/orders")}
        backText="Back to Orders"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => copyToClipboard(order.id, "order-id")}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition cursor-pointer"
              title="Copy Full Order ID"
            >
              {copiedKey === "order-id" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedKey === "order-id" ? "Copied ID" : "Copy Order ID"}</span>
            </button>

            <button
              onClick={() => setIsInvoiceModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-gray-600" />
              <span>Tax Invoice</span>
            </button>

            <button
              onClick={() => {
                setNewStatus(order.status);
                setNewTrackingNumber(order.tracking_number || "");
                setIsStatusModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Update Status</span>
            </button>
          </div>
        }
      />

      {/* Cancelled / Returned Notice */}
      {stepperState.isCancelled && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-800">This order was cancelled</p>
              <p className="text-xs text-red-600">
                Cancelled on {formatFullDate(order.cancelledDate || order.updated_at)}. Reserved items have been restocked to inventory.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-md uppercase">
            Restocked
          </span>
        </div>
      )}

      {stepperState.isReturned && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-purple-800">This order was returned</p>
            <p className="text-xs text-purple-600">
              Return recorded on {formatFullDate(order.returnedDate || order.updated_at)}.
            </p>
          </div>
        </div>
      )}

      {/* Status Stepper Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="relative">
          <div className="grid grid-cols-4 gap-2 text-center relative z-10">
            {/* Step 1: Placed */}
            <div className="flex flex-col items-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                  stepperState.currentStep >= 1
                    ? "bg-blue-50 border-blue-600 text-blue-600 shadow-sm"
                    : "bg-gray-50 border-gray-300 text-gray-400"
                }`}
              >
                <ShoppingCart className="w-5 h-5" />
              </div>
              <h4 className="mt-3 text-xs sm:text-sm font-semibold text-gray-900">Order Placed</h4>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                {formatStepperDate(order.placedDate || order.created_at || (order as any).createdAt)}
              </p>
            </div>

            {/* Step 2: Processing */}
            <div className="flex flex-col items-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                  stepperState.currentStep >= 2
                    ? "bg-blue-50 border-blue-600 text-blue-600 shadow-sm"
                    : "bg-gray-50 border-gray-300 text-gray-400"
                }`}
              >
                <Package className="w-5 h-5" />
              </div>
              <h4 className="mt-3 text-xs sm:text-sm font-semibold text-gray-900">Processing</h4>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                {order.processingDate ? formatStepperDate(order.processingDate) : stepperState.currentStep >= 2 ? "In progress" : "Pending"}
              </p>
            </div>

            {/* Step 3: Shipped */}
            <div className="flex flex-col items-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                  stepperState.currentStep >= 3
                    ? "bg-blue-50 border-blue-600 text-blue-600 shadow-sm"
                    : "bg-gray-50 border-gray-300 text-gray-400"
                }`}
              >
                <Truck className="w-5 h-5" />
              </div>
              <h4 className="mt-3 text-xs sm:text-sm font-semibold text-gray-900">Shipped</h4>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                {order.shippedDate ? formatStepperDate(order.shippedDate) : stepperState.currentStep >= 3 ? "In transit" : "Pending"}
              </p>
            </div>

            {/* Step 4: Delivered */}
            <div className="flex flex-col items-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                  stepperState.currentStep >= 4
                    ? "bg-emerald-50 border-emerald-600 text-emerald-600 shadow-sm"
                    : "bg-gray-50 border-gray-300 text-gray-400"
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="mt-3 text-xs sm:text-sm font-semibold text-gray-900">Delivered</h4>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                {order.deliveredDate ? formatStepperDate(order.deliveredDate) : "Pending"}
              </p>
            </div>
          </div>

          {/* Stepper Connecting Line */}
          <div className="absolute top-6 left-0 w-full px-[12%] -translate-y-1/2 -z-0 hidden sm:block">
            <div className="h-0.5 bg-gray-200 w-full relative">
              <div
                className="h-0.5 bg-blue-600 transition-all duration-500"
                style={{
                  width:
                    stepperState.currentStep === 1
                      ? "0%"
                      : stepperState.currentStep === 2
                      ? "33.3%"
                      : stepperState.currentStep === 3
                      ? "66.6%"
                      : stepperState.currentStep >= 4
                      ? "100%"
                      : "0%",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout: Two Columns matching the design */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Items & Delivery Address) - 7 cols on large screens */}
        <div className="lg:col-span-7 space-y-6">
          {/* Items Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>Items ({order.items?.length || 0})</span>
              </h3>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                {financialSummary.totalUnits} {financialSummary.totalUnits === 1 ? "unit" : "units"} total
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {order.items && order.items.length > 0 ? (
                order.items.map((item, idx) => {
                  const pId = item.product_id || item.productId || "";
                  const resolvedImage =
                    item.image ||
                    item.imageUrl ||
                    productImages[pId] ||
                    null;

                  const unitSelling = Number(item.unit_price ?? item.price ?? 0);
                  const unitMrp = Number(item.original_price ?? item.originalPrice ?? unitSelling);
                  const qty = item.quantity || 1;
                  const itemSavings = unitMrp > unitSelling ? (unitMrp - unitSelling) * qty : 0;
                  const itemTotal = unitSelling * qty;
                  const gstPct = item.gstPercentage || 5;

                  return (
                    <div key={item.id || idx} className="p-6 transition hover:bg-gray-50/70">
                      <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
                        {/* Original Product Image Preview with Zoom */}
                        <div
                          onClick={() => {
                            if (resolvedImage) {
                              setImageZoomUrl(resolvedImage);
                              setImageZoomTitle(item.name || item.productName || "Product Image");
                            }
                          }}
                          className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-gray-50 border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center group ${
                            resolvedImage ? "cursor-zoom-in" : ""
                          }`}
                        >
                          {resolvedImage ? (
                            <>
                              <img
                                src={resolvedImage}
                                alt={item.name || "Product"}
                                className="w-full h-full object-contain p-1.5 transition-transform duration-200 group-hover:scale-105"
                                onError={(e) => {
                                  // Fallback to placeholder if url fails
                                  (e.target as HTMLElement).style.display = "none";
                                  const parent = (e.target as HTMLElement).parentElement;
                                  if (parent) {
                                    const fallback = parent.querySelector(".img-fallback");
                                    if (fallback) fallback.classList.remove("hidden");
                                  }
                                }}
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <ZoomIn className="w-5 h-5 drop-shadow" />
                              </div>
                            </>
                          ) : null}

                          {/* Fallback display if no image */}
                          <div className={`img-fallback w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 p-2 text-center ${resolvedImage ? "hidden" : ""}`}>
                            <Package className="w-8 h-8 text-gray-300 mb-1" />
                            <span className="text-[10px] text-gray-400 font-medium">No Image</span>
                          </div>

                          <div className="absolute top-1.5 right-1.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md shadow-xs">
                            x{qty}
                          </div>
                        </div>

                        {/* Item Details */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                {pId ? (
                                  <Link
                                    to={`/admin/products/${pId}`}
                                    className="font-bold text-gray-900 hover:text-blue-600 transition-colors text-base sm:text-lg flex items-center gap-1 group"
                                  >
                                    <span>{item.name || item.productName || "Product Item"}</span>
                                    <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100" />
                                  </Link>
                                ) : (
                                  <h4 className="font-bold text-gray-900 text-base sm:text-lg">
                                    {item.name || item.productName || "Product Item"}
                                  </h4>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs sm:text-sm text-gray-600">
                                <span>
                                  Variant: <span className="font-medium text-gray-900">{item.variant_name || item.weight || "Standard"}</span>
                                </span>
                                <span className="text-gray-300">•</span>
                                <span>
                                  Qty: <span className="font-medium text-gray-900">{qty}</span>
                                </span>
                                {item.hsn && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <span>HSN: <span className="font-medium">{item.hsn}</span></span>
                                  </>
                                )}
                              </div>

                              <div className="mt-1 text-xs text-gray-500 font-medium">
                                Includes {gstPct}% GST
                              </div>
                            </div>

                            {/* Item Subtotal for row */}
                            <div className="sm:text-right">
                              <div className="text-base sm:text-lg font-bold text-gray-900">
                                ₹{itemTotal.toLocaleString("en-IN")}
                              </div>
                              <div className="text-xs text-gray-400">
                                (₹{unitSelling.toLocaleString("en-IN")} × {qty})
                              </div>
                            </div>
                          </div>

                          {/* Pricing Badges: MRP, UniVillage Member, Savings */}
                          <div className="pt-1 flex flex-wrap items-center gap-3">
                            {unitMrp > unitSelling && (
                              <span className="text-sm text-gray-400 line-through">
                                ₹{unitMrp.toLocaleString("en-IN")}
                              </span>
                            )}

                            <span className="text-sm font-semibold text-emerald-700">
                              UniVillage Member: ₹{unitSelling.toLocaleString("en-IN")}
                            </span>

                            {itemSavings > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Tag className="w-3 h-3" /> Customer Saves: ₹{itemSavings.toLocaleString("en-IN")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-gray-400">
                  <Package className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-medium">No items found in this order.</p>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Address Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-500" />
                <span>Delivery Address</span>
              </h3>
              {order.userId && (
                <Link
                  to={`/admin/customers/${order.userId}`}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <User className="w-3.5 h-3.5" /> View Customer
                </Link>
              )}
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <p className="text-base font-bold text-gray-900">
                  {order.address?.first_name || order.address?.last_name
                    ? `${order.address.first_name || ""} ${order.address.last_name || ""}`.trim()
                    : order.address?.name || order.username || order.customerName || "Customer"}
                </p>

                {(order.address?.phone || order.customerPhone) && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 mt-1">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <a
                      href={`tel:${order.address?.phone || order.customerPhone}`}
                      className="hover:text-blue-600 transition-colors font-medium"
                    >
                      {order.address?.phone || order.customerPhone}
                    </a>
                  </div>
                )}

                {(order.address?.email || order.customerEmail) && (
                  <div className="flex items-center gap-2 text-sm text-gray-700 mt-1">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <a
                      href={`mailto:${order.address?.email || order.customerEmail}`}
                      className="hover:text-blue-600 transition-colors"
                    >
                      {order.address?.email || order.customerEmail}
                    </a>
                  </div>
                )}
              </div>

              {/* Address details */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-sm text-gray-700 space-y-1">
                {order.address?.apartment && <p>{order.address.apartment}</p>}
                {(order.address?.street || order.address?.address) && (
                  <p>{order.address.street || order.address.address}</p>
                )}
                <p>
                  {[
                    order.address?.city,
                    order.address?.state ? `${order.address.state}${order.address.postal_code || order.address.pincode ? " - " + (order.address.postal_code || order.address.pincode) : ""}` : "",
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">
                  {order.address?.country || "India"}
                </p>
              </div>
            </div>
          </div>

          {/* Shipping & Tracking Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2 pb-4 border-b border-gray-100">
              <Truck className="w-5 h-5 text-gray-500" />
              <span>Shipping & Fulfillment</span>
            </h3>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                <span className="text-xs text-gray-500 block">Shipping Method</span>
                <span className="text-sm font-semibold text-gray-900 mt-0.5 capitalize block">
                  {order.shipping_method || "Standard Delivery"}
                </span>
              </div>

              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Tracking Number</span>
                  <button
                    onClick={() => {
                      setNewStatus(order.status);
                      setNewTrackingNumber(order.tracking_number || "");
                      setIsStatusModalOpen(true);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                  >
                    {order.tracking_number ? "Edit" : "+ Add"}
                  </button>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-semibold text-gray-900 font-mono">
                    {order.tracking_number || "Not assigned"}
                  </span>
                  {order.tracking_number && (
                    <button
                      onClick={() => copyToClipboard(order.tracking_number!, "tracking-no")}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer p-1"
                      title="Copy Tracking Number"
                    >
                      {copiedKey === "tracking-no" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Order Summary, Payment & Actions) - 5 cols on large screens */}
        <div className="lg:col-span-5 space-y-6">
          {/* Order Summary Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Order Summary</h3>

            {/* Metadata Rows */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Order Status</span>
                <div className="flex items-center gap-2">
                  {getStatusBadge(order.status)}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Order Date</span>
                <span className="font-medium text-gray-900 text-right">
                  {formatFullDate(order.created_at || (order as any).createdAt)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Items</span>
                <span className="font-medium text-gray-900">
                  {order.items?.length || 0} items
                </span>
              </div>

              <div className="pt-2 border-t border-gray-100" />

              {/* Financial calculations */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Original Price (MRP)</span>
                <span className="font-medium text-gray-900">
                  ₹{financialSummary.mrpTotal.toLocaleString("en-IN")}
                </span>
              </div>

              {financialSummary.memberSavings > 0 && (
                <div className="flex items-center justify-between text-emerald-700">
                  <span className="font-medium">UniVillage Member Discount</span>
                  <span className="font-semibold">
                    - ₹{financialSummary.memberSavings.toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-gray-500">Shipping</span>
                <span className="font-semibold text-emerald-700">
                  {financialSummary.shippingFee > 0
                    ? `₹${financialSummary.shippingFee.toLocaleString("en-IN")}`
                    : "FREE"}
                </span>
              </div>

              <div className="pt-2 border-t border-gray-100" />

              <div className="flex items-baseline justify-between pt-1">
                <span className="text-base font-bold text-gray-900">
                  Total <span className="text-xs font-normal text-gray-500">(including GST)</span>
                </span>
                <span className="text-2xl font-black text-gray-900">
                  ₹{financialSummary.finalTotal.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Customer Savings Banner */}
            {financialSummary.memberSavings > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 flex items-center justify-between text-sm font-semibold">
                <span>Customer savings on this order</span>
                <span className="text-emerald-700 font-bold">
                  ₹{financialSummary.memberSavings.toLocaleString("en-IN")}
                </span>
              </div>
            )}

            {/* Payment Information Section */}
            <div className="pt-4 border-t border-gray-100 space-y-3 text-sm">
              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-500" />
                <span>Payment Information</span>
              </h4>

              <div className="bg-gray-50 rounded-xl p-3.5 space-y-2 border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs">Method</span>
                  <span className="font-semibold text-gray-900 text-xs uppercase tracking-wider">
                    {order.payment_method || "Online"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs">Status</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                    {order.payment_status || (order.payment_id ? "Paid" : "Pending")}
                  </span>
                </div>

                {(order.payment_id || order.transaction_id) && (
                  <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
                    <span className="text-gray-500 text-xs">Transaction ID</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-medium text-gray-800">
                        {order.payment_id || order.transaction_id}
                      </span>
                      <button
                        onClick={() => copyToClipboard(order.payment_id || order.transaction_id || "", "tx-id")}
                        className="text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
                        title="Copy Transaction ID"
                      >
                        {copiedKey === "tx-id" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main Action: Download Invoice Button */}
            <div className="pt-2">
              <button
                onClick={handleDownloadInvoice}
                disabled={downloadingInvoice}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-60"
              >
                <Download className="w-4 h-4" />
                <span>{downloadingInvoice ? "Downloading Invoice PDF..." : "Download Invoice"}</span>
              </button>
            </div>
          </div>

          {/* Quick Customer Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span>Customer Account</span>
            </h4>

            <div className="text-xs text-gray-600 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-400">Name:</span>
                <span className="font-medium text-gray-900">{order.username || order.customerName || "Customer"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">User ID:</span>
                <span className="font-mono text-gray-700">{order.userId ? `${order.userId.slice(0, 12)}...` : "N/A"}</span>
              </div>
            </div>

            {order.userId && (
              <Link
                to={`/admin/customers/${order.userId}`}
                className="w-full mt-2 py-2 px-3 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <span>View Customer Profile</span>
                <ExternalLink className="w-3 h-3 text-gray-400" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {imageZoomUrl && (
        <div
          onClick={() => setImageZoomUrl(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-4 max-w-2xl w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h4 className="font-bold text-gray-900 text-sm sm:text-base line-clamp-1">
                {imageZoomTitle || "Product Image"}
              </h4>
              <button
                onClick={() => setImageZoomUrl(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 flex items-center justify-center bg-gray-50 rounded-xl my-2 max-h-[70vh] overflow-hidden">
              <img
                src={imageZoomUrl}
                alt={imageZoomTitle}
                className="max-h-[65vh] max-w-full object-contain rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <a
                href={imageZoomUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5"
              >
                <span>Open Original in New Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setImageZoomUrl(null)}
                className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Update Order Status</h3>
                <p className="text-xs text-gray-500 mt-0.5">Order #{order.id.slice(0, 12)}</p>
              </div>
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStatusSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Select Status
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                  {ORDER_STATUSES.map((item) => (
                    <label
                      key={item.status}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        newStatus === item.status
                          ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="order_status"
                        value={item.status}
                        checked={newStatus === item.status}
                        onChange={() => setNewStatus(item.status)}
                        className="mt-0.5 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-900">{item.label}</span>
                          {order.status === item.status && (
                            <span className="text-[10px] bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tracking Number Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Courier / Tracking Number
                </label>
                <input
                  type="text"
                  value={newTrackingNumber}
                  onChange={(e) => setNewTrackingNumber(e.target.value)}
                  placeholder="e.g. DELHIVERY12345678"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Recommended when transitioning status to &quot;Shipped&quot;.
                </p>
              </div>

              {newStatus === "cancelled" && order.status !== "cancelled" && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>
                    Cancelling this order will automatically restore stock for all {financialSummary.totalUnits} items back to inventory.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  disabled={updatingStatus}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {updatingStatus ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tax Invoice Preview & Print Modal */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 sm:p-8 my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Controls */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-gray-900">Tax Invoice / Bill of Supply</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Invoice
                </button>
                {order.invoiceUrl && (
                  <a
                    href={order.invoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200 transition flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF
                  </a>
                )}
                <button
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Invoice Document */}
            <div className="border border-gray-200 rounded-xl p-6 sm:p-8 bg-white text-gray-800 space-y-6">
              {/* Company Header */}
              <div className="text-center pb-4 border-b border-gray-200">
                <h1 className="text-2xl font-black text-gray-900 tracking-wide">KISHAN2KITCHEN</h1>
                <p className="text-xs text-gray-500 mt-1">
                  Webel Bhavan, Monibhandar Premises, 7th Floor, Block - EP &amp; GP, Salt Lake, Sector - V, Kolkata - 700091, West Bengal
                </p>
                <div className="flex items-center justify-center gap-4 text-xs font-semibold text-gray-600 mt-2">
                  <span>GSTIN: 19AAKCC1645G1ZM</span>
                  <span>•</span>
                  <span>FSSAI: 12822999000310</span>
                </div>
              </div>

              {/* Invoice Meta */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p><span className="text-gray-500">Invoice No:</span> <strong className="font-mono">{order.invoiceNumber || `K2K-${order.id.slice(-6).toUpperCase()}`}</strong></p>
                  <p><span className="text-gray-500">Order ID:</span> <span className="font-mono">{order.id}</span></p>
                  <p><span className="text-gray-500">Date:</span> {formatFullDate(order.created_at || (order as any).createdAt)}</p>
                  <p><span className="text-gray-500">Place of Supply:</span> West Bengal (19)</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">Bill To &amp; Ship To:</p>
                  <p className="font-semibold text-gray-800">
                    {order.address?.first_name ? `${order.address.first_name} ${order.address.last_name || ""}` : order.address?.name || order.username || "Customer"}
                  </p>
                  <p>{order.address?.street || order.address?.address || ""}</p>
                  <p>{order.address?.city}, {order.address?.state} - {order.address?.postal_code || order.address?.pincode}</p>
                  <p>{order.address?.phone || order.customerPhone || ""}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-gray-200 divide-y divide-gray-200">
                  <thead className="bg-gray-50 font-bold text-gray-700">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">Item Description</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Rate</th>
                      <th className="p-2 text-right">Disc.</th>
                      <th className="p-2 text-right">GST</th>
                      <th className="p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {order.items?.map((item, idx) => {
                      const qty = item.quantity || 1;
                      const selling = Number(item.unit_price ?? item.price ?? 0);
                      const mrp = Number(item.original_price ?? item.originalPrice ?? selling);
                      const disc = mrp > selling ? (mrp - selling) * qty : 0;
                      const lineTotal = selling * qty;

                      return (
                        <tr key={idx}>
                          <td className="p-2 text-gray-400">{idx + 1}</td>
                          <td className="p-2">
                            <div className="font-bold text-gray-900">{item.name || item.productName}</div>
                            <div className="text-[10px] text-gray-500">{item.variant_name || item.weight}</div>
                          </td>
                          <td className="p-2 text-center font-medium">{qty}</td>
                          <td className="p-2 text-right">₹{mrp.toFixed(2)}</td>
                          <td className="p-2 text-right text-emerald-700">{disc > 0 ? `-₹${disc.toFixed(2)}` : "₹0.00"}</td>
                          <td className="p-2 text-right">{item.gstPercentage || 5}%</td>
                          <td className="p-2 text-right font-bold text-gray-900">₹{lineTotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end pt-2 text-xs">
                <div className="w-64 space-y-1.5">
                  <div className="flex justify-between text-gray-600">
                    <span>Gross Total:</span>
                    <span>₹{financialSummary.mrpTotal.toFixed(2)}</span>
                  </div>
                  {financialSummary.memberSavings > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Total Savings:</span>
                      <span>- ₹{financialSummary.memberSavings.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping Fee:</span>
                    <span>{financialSummary.shippingFee > 0 ? `₹${financialSummary.shippingFee.toFixed(2)}` : "FREE"}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-gray-900 pt-2 border-t border-gray-200">
                    <span>Invoice Value:</span>
                    <span>₹{financialSummary.finalTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 text-center text-[11px] text-gray-400">
                Thank you for your business! This is an official computer-generated Tax Invoice / Bill of Supply.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrderDetailsPage;
