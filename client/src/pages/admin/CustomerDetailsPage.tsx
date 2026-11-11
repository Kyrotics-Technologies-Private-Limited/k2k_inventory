import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../services/api/api";
import { orderApi } from "../../services/api/orderApi";
import { productApi } from "../../services/api/productApi";
import { membershipApi } from "../../services/api/membershipApi";
import type { OrderStatus, OrderItem } from "../../types/order";
import { auth } from "../../services/firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import { toast } from "react-toastify";
import {
  Package,
  Copy,
  Check,
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  ZoomIn,
  Download,
  Search,
  Calendar,
  AlertCircle,
  Crown,
  ShieldCheck,
  X
} from "lucide-react";

interface CustomerOrder {
  id: string;
  userId?: string;
  created_at?: string;
  createdAt?: any;
  status: OrderStatus | string;
  total?: number;
  total_amount?: number;
  items?: OrderItem[];
  address?: any;
  payment_method?: string;
  payment_status?: string;
  payment_id?: string;
  transaction_id?: string;
  tracking_number?: string;
  invoiceUrl?: string;
  shipping_fee?: number;
  discount?: number;
  [key: string]: any;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  status?: string;
  location?: string;
  isMember?: boolean;
  membershipType?: string;
  membershipEnd?: any;
  discountPercentage?: number;
  address?: any;
  [key: string]: any;
}

interface MembershipDetails {
  isActive: boolean;
  type: string;
  expiresAt: any;
  discountPercentage: number;
}

// Format date like: "Nov 02, 2026"
const formatOrderDate = (val: any): string => {
  if (!val) return "N/A";
  let d: Date | null = null;
  if (val instanceof Date) d = val;
  else if (typeof val?.toDate === "function") d = val.toDate();
  else if (typeof val?.seconds === "number") d = new Date(val.seconds * 1000);
  else if (typeof val?._seconds === "number") d = new Date(val._seconds * 1000);
  else d = new Date(val);

  if (!d || isNaN(d.getTime())) return "N/A";

  return d.toLocaleDateString("en-IN", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

// Full date format for profile: "2 November 2026"
const formatProfileDate = (val: any): string => {
  if (!val) return "N/A";
  let d: Date | null = null;
  if (val instanceof Date) d = val;
  else if (typeof val?.toDate === "function") d = val.toDate();
  else if (typeof val?.seconds === "number") d = new Date(val.seconds * 1000);
  else if (typeof val?._seconds === "number") d = new Date(val._seconds * 1000);
  else d = new Date(val);

  if (!d || isNaN(d.getTime())) return "N/A";

  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const CustomerDetailsPage: React.FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [membership, setMembership] = useState<MembershipDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  // Search & Filters matching user screenshot
  const [searchInput, setSearchInput] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  // Lightbox zoom modal state
  const [imageZoomUrl, setImageZoomUrl] = useState<string | null>(null);
  const [imageZoomTitle, setImageZoomTitle] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Product images cache for items
  const [productImages, setProductImages] = useState<Record<string, string>>({});

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
        setError("Please log in to view customer details");
        navigate("/admin/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!isAuthChecked || !customerId) return;
    fetchCustomerAndOrders();
  }, [customerId, isAuthChecked]);

  const fetchCustomerAndOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch customer data and orders
      let fetchedCustomer: Customer | null = null;
      let fetchedOrders: CustomerOrder[] = [];

      try {
        const res = await api.get(`/admin/customers/${customerId}`);
        if (res.data?.customer) {
          fetchedCustomer = res.data.customer;
        }
        if (Array.isArray(res.data?.orders)) {
          fetchedOrders = res.data.orders;
        }
      } catch (err: any) {
        console.warn("api /admin/customers call failed, attempting fallback:", err);
      }

      // 2. Fallback search for orders if empty
      if (fetchedOrders.length === 0) {
        try {
          const allOrders = await orderApi.getAllOrdersForAdmin();
          const userOrders = allOrders.filter(
            (o) => o.userId === customerId || (o as any).user_id === customerId
          );
          if (userOrders.length > 0) {
            fetchedOrders = userOrders as CustomerOrder[];
          }
        } catch (oErr) {
          console.warn("Failed to fallback search orders:", oErr);
        }
      }

      if (!fetchedCustomer) {
        if (fetchedOrders.length > 0) {
          const sample = fetchedOrders[0];
          fetchedCustomer = {
            id: customerId!,
            name: sample.address?.first_name
              ? `${sample.address.first_name} ${sample.address.last_name || ""}`.trim()
              : sample.username || sample.customerName || "Customer",
            email: sample.address?.email || sample.customerEmail || "N/A",
            phone: sample.address?.phone || sample.customerPhone || "N/A",
            joinDate: sample.createdAt || sample.created_at || new Date().toISOString(),
          };
        } else {
          throw new Error("Customer profile not found");
        }
      }

      setCustomer(fetchedCustomer);
      setOrders(fetchedOrders);

      // 3. Fetch membership status specifically
      try {
        const userMemberships = await membershipApi.getUserMemberships(customerId!);
        if (Array.isArray(userMemberships) && userMemberships.length > 0) {
          const activeMem = userMemberships.find((m: any) => {
            if (!m.isMember) return false;
            if (!m.membershipEnd) return true;
            const endD = m.membershipEnd?._seconds
              ? new Date(m.membershipEnd._seconds * 1000)
              : new Date(m.membershipEnd);
            return endD > new Date();
          });

          if (activeMem) {
            setMembership({
              isActive: true,
              type: activeMem.membershipType || "Kishanparivar Member",
              expiresAt: activeMem.membershipEnd,
              discountPercentage: activeMem.discountPercentage || 5,
            });
          } else {
            setMembership({
              isActive: false,
              type: userMemberships[0]?.membershipType || "Non-Member",
              expiresAt: userMemberships[0]?.membershipEnd || null,
              discountPercentage: 0,
            });
          }
        } else {
          // Check from customer root doc
          const isMem = Boolean(fetchedCustomer.isMember);
          const endD = fetchedCustomer.membershipEnd
            ? fetchedCustomer.membershipEnd?._seconds
              ? new Date(fetchedCustomer.membershipEnd._seconds * 1000)
              : new Date(fetchedCustomer.membershipEnd)
            : null;
          const isStillValid = !endD || endD > new Date();

          setMembership({
            isActive: isMem && isStillValid,
            type: fetchedCustomer.membershipType || (isMem ? "Kishanparivar Member" : "Non-Member"),
            expiresAt: fetchedCustomer.membershipEnd || null,
            discountPercentage: fetchedCustomer.discountPercentage || (isMem ? 5 : 0),
          });
        }
      } catch (memErr) {
        console.warn("Could not check user memberships:", memErr);
      }

      // 4. Resolve product images for all items
      resolveItemImages(fetchedOrders);
    } catch (err: any) {
      console.error("Failed to fetch customer details:", err);
      setError(err.message || "Failed to fetch customer details");
    } finally {
      setLoading(false);
    }
  };

  const resolveItemImages = async (orderList: CustomerOrder[]) => {
    const toFetch: Record<string, string> = {};

    for (const ord of orderList) {
      if (Array.isArray(ord.items)) {
        for (const item of ord.items) {
          const pId = item.productId || item.product_id;
          if (!pId) continue;

          if (item.image || item.imageUrl) {
            toFetch[pId] = item.image || item.imageUrl || "";
            continue;
          }

          if (!productImages[pId]) {
            try {
              const p = await productApi.getProductById(pId);
              const img =
                p.images?.main ||
                (Array.isArray(p.images?.gallery) ? p.images.gallery[0] : null) ||
                p.images?.banner;
              if (img) toFetch[pId] = img;
            } catch (pErr) {
              // ignore
            }
          }
        }
      }
    }

    if (Object.keys(toFetch).length > 0) {
      setProductImages((prev) => ({ ...prev, ...toFetch }));
    }
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActiveSearchQuery(searchInput.trim());
  };

  // Status Presentation Helpers (Matching Screenshot)
  const getStatusDisplay = (status: string) => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "placed":
        return {
          label: "Placed",
          dotColor: "bg-blue-600",
          textColor: "text-blue-600",
          subtitle: "Your order is on the way",
        };
      case "processing":
        return {
          label: "Processing",
          dotColor: "bg-amber-500",
          textColor: "text-amber-600",
          subtitle: "Being packed at warehouse",
        };
      case "shipped":
        return {
          label: "Shipped",
          dotColor: "bg-indigo-600",
          textColor: "text-indigo-600",
          subtitle: "Your order is on the way",
        };
      case "delivered":
        return {
          label: "Delivered",
          dotColor: "bg-emerald-600",
          textColor: "text-emerald-600",
          subtitle: "Delivered to customer",
        };
      case "cancelled":
        return {
          label: "Cancelled",
          dotColor: "bg-red-600",
          textColor: "text-red-600",
          subtitle: "Order cancelled & restocked",
        };
      case "returned":
        return {
          label: "Returned",
          dotColor: "bg-purple-600",
          textColor: "text-purple-600",
          subtitle: "Item returned by customer",
        };
      default:
        return {
          label: status || "Placed",
          dotColor: "bg-blue-600",
          textColor: "text-blue-600",
          subtitle: "Order received",
        };
    }
  };

  // Customer Financial & Order Statistics
  const customerStats = useMemo(() => {
    let totalSpent = 0;
    let completedOrders = 0;
    let totalSavings = 0;

    orders.forEach((ord) => {
      const amt = Number(ord.total ?? ord.total_amount ?? 0);
      const st = (ord.status || "").toLowerCase();
      if (st !== "cancelled") {
        totalSpent += amt;
      }
      if (st === "delivered") {
        completedOrders += 1;
      }
      if (ord.discount) {
        totalSavings += Number(ord.discount);
      }
    });

    return {
      totalOrders: orders.length,
      totalSpent,
      completedOrders,
      totalSavings,
    };
  }, [orders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      // 1. Status Filter
      if (activeFilter !== "all") {
        if (ord.status?.toLowerCase() !== activeFilter.toLowerCase()) {
          return false;
        }
      }

      // 2. Search Query Filter
      if (activeSearchQuery) {
        const q = activeSearchQuery.toLowerCase();
        const matchId = ord.id?.toLowerCase().includes(q);
        const matchItem = ord.items?.some((it) =>
          (it.name || it.productName || "").toLowerCase().includes(q)
        );
        const matchTx = ord.transaction_id?.toLowerCase().includes(q) || ord.payment_id?.toLowerCase().includes(q);
        if (!matchId && !matchItem && !matchTx) return false;
      }

      return true;
    });
  }, [orders, activeFilter, activeSearchQuery]);

  const filterTabs = [
    { key: "all", label: "All" },
    { key: "delivered", label: "Delivered" },
    { key: "shipped", label: "Shipped" },
    { key: "processing", label: "Processing" },
    { key: "cancelled", label: "Cancelled" },
  ];

  if (loading) return <Loader fullscreen text="Loading customer details and orders..." />;

  if (error || !customer) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 rounded-xl text-red-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-800">Customer Not Found</h3>
              <p className="text-sm text-red-600 mt-1">{error || "Could not load customer information."}</p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={fetchCustomerAndOrders}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm font-semibold transition cursor-pointer"
                >
                  Try Again
                </button>
                <button
                  onClick={() => navigate("/admin/customers")}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-semibold transition cursor-pointer"
                >
                  Back to Customers
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isMemberActive = membership?.isActive;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-6xl">
      {/* Top Header */}
      <PageHeader
        title={customer.name || "Customer Profile"}
        description={`Customer ID: ${customer.id}`}
        onBack={() => navigate("/admin/customers")}
        backText="Back to Customers"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => copyToClipboard(customer.id, "cust-id")}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition cursor-pointer"
            >
              {copiedKey === "cust-id" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedKey === "cust-id" ? "Copied ID" : "Copy Customer ID"}</span>
            </button>
          </div>
        }
      />

      {/* Customer All Details & Membership Overview Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-gray-100">
          {/* Avatar and Basic Contact Information */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-2xl sm:text-3xl font-black shadow-md flex-shrink-0">
              {customer.name && customer.name.length > 0 ? customer.name.charAt(0).toUpperCase() : "C"}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{customer.name || "Customer"}</h2>

                {/* Membership Status Badge */}
                {isMemberActive ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs">
                    <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>Active Member</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
                    <span>Non-Member</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-600 pt-0.5">
                {customer.email && (
                  <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 hover:text-blue-600">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>{customer.email}</span>
                  </a>
                )}
                {customer.phone && (
                  <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 hover:text-blue-600">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{customer.phone}</span>
                  </a>
                )}
                <span className="flex items-center gap-1.5 text-gray-500">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>Joined: {formatProfileDate(customer.joinDate)}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-4 w-full lg:w-auto border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-8">
            <div>
              <span className="text-xs text-gray-400 block font-medium">Orders Placed</span>
              <span className="text-xl font-bold text-gray-900">{customerStats.totalOrders}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block font-medium">Lifetime Spend</span>
              <span className="text-xl font-bold text-emerald-700">₹{customerStats.totalSpent.toLocaleString("en-IN")}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block font-medium">Delivered</span>
              <span className="text-xl font-bold text-blue-600">{customerStats.completedOrders}</span>
            </div>
          </div>
        </div>

        {/* Membership Details & Address Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Membership Plan Info Box */}
          <div
            className={`rounded-xl p-4 border transition ${
              isMemberActive
                ? "bg-gradient-to-br from-emerald-50/70 to-teal-50/40 border-emerald-200"
                : "bg-gray-50/80 border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-200/60">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Crown className={`w-4 h-4 ${isMemberActive ? "text-amber-500" : "text-gray-400"}`} />
                <span>UniVillage Membership Details</span>
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded ${
                  isMemberActive ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-700"
                }`}
              >
                {isMemberActive ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="space-y-1.5 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Tier / Type:</span>
                <span className="font-semibold text-gray-900">{membership?.type || "Standard Customer"}</span>
              </div>

              {isMemberActive && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Member Discount:</span>
                    <span className="font-semibold text-emerald-700">
                      {membership?.discountPercentage ? `${membership.discountPercentage}% OFF` : "Exclusive Member Pricing"}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-500">Membership Expiry:</span>
                    <span className="font-semibold text-gray-900">
                      {membership?.expiresAt ? formatProfileDate(membership.expiresAt) : "Active (Perpetual / Ongoing)"}
                    </span>
                  </div>
                </>
              )}

              {!isMemberActive && (
                <p className="text-xs text-gray-500 pt-1">
                  This customer is not subscribed to an active membership plan.
                </p>
              )}
            </div>
          </div>

          {/* Delivery / Default Address Box */}
          <div className="rounded-xl p-4 bg-gray-50/80 border border-gray-200">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-200/60">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span>Customer Delivery Address</span>
              </span>
            </div>

            <div className="text-xs sm:text-sm text-gray-700 space-y-0.5">
              {orders.length > 0 && orders[0].address ? (
                <>
                  <p className="font-semibold text-gray-900">
                    {[orders[0].address.first_name, orders[0].address.last_name].filter(Boolean).join(" ") || customer.name}
                  </p>
                  <p>{orders[0].address.street || orders[0].address.address || ""}</p>
                  <p>
                    {[orders[0].address.city, orders[0].address.state].filter(Boolean).join(", ")}
                    {orders[0].address.postal_code || orders[0].address.pincode
                      ? ` - ${orders[0].address.postal_code || orders[0].address.pincode}`
                      : ""}
                  </p>
                  <p className="text-xs text-gray-500">{orders[0].address.country || "India"}</p>
                </>
              ) : (
                <p className="text-xs text-gray-400 italic py-2">No saved address found for this customer.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Orders Section Header */}
      <div className="space-y-4">
        {/* Search Bar matching screenshot */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search your orders here"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder-gray-400"
            />
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Search Orders</span>
            </button>
          </form>
        </div>

        {/* Filter Pills row matching screenshot */}
        <div className="bg-white rounded-2xl border border-gray-200 px-6 py-3.5 shadow-sm flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">
            FILTER:
          </span>

          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`px-5 py-1.5 text-xs font-semibold rounded-full transition cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Orders List matching User's Screenshot */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-gray-800">No Orders Found</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {activeSearchQuery || activeFilter !== "all"
                ? "No customer orders matched your search or status filter."
                : "This customer has not placed any orders yet."}
            </p>
            {(activeSearchQuery || activeFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchInput("");
                  setActiveSearchQuery("");
                  setActiveFilter("all");
                }}
                className="mt-4 px-4 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((ord) => {
              const orderTotal = Number(ord.total ?? ord.total_amount ?? 0);
              const items = Array.isArray(ord.items) && ord.items.length > 0 ? ord.items : [];
              const statusDisplay = getStatusDisplay(ord.status);

              return (
                <div
                  key={ord.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-xs hover:border-gray-300 transition overflow-hidden"
                >
                  {/* Top Row: Order ID & Placed Date (Matching Screenshot) */}
                  <div
                    onClick={() => navigate(`/admin/orders/${ord.id}`)}
                    className="px-6 py-3.5 border-b border-gray-100 flex flex-wrap items-center justify-between text-xs sm:text-sm cursor-pointer hover:bg-gray-50/60 transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">Order ID:</span>
                      <span className="font-mono text-blue-600 font-bold hover:underline">{ord.id}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(ord.id, `ord-${ord.id}`);
                        }}
                        className="text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                        title="Copy Order ID"
                      >
                        {copiedKey === `ord-${ord.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="text-gray-500 text-xs">
                      Placed on: <span className="font-medium text-gray-700">{formatOrderDate(ord.created_at || ord.createdAt)}</span>
                    </div>
                  </div>

                  {/* Items Rows */}
                  {items.length > 0 ? (
                    items.map((item, idx) => {
                      const pId = item.productId || item.product_id || "";
                      const resolvedImg = item.image || item.imageUrl || productImages[pId] || null;
                      const unitPrice = Number(item.unit_price ?? item.price ?? 0);
                      const qty = item.quantity || 1;
                      const itemTotal = unitPrice * qty;

                      return (
                        <div
                          key={item.id || idx}
                          onClick={() => navigate(`/admin/orders/${ord.id}`)}
                          className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-50 last:border-b-0 cursor-pointer hover:bg-gray-50/70 transition"
                        >
                          {/* Left: Product Thumbnail & Title (Matching Screenshot) */}
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            {/* Product Thumbnail */}
                            <div
                              onClick={(e) => {
                                if (resolvedImg) {
                                  e.stopPropagation();
                                  setImageZoomUrl(resolvedImg);
                                  setImageZoomTitle(item.name || item.productName || "Product Image");
                                }
                              }}
                              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center relative group ${
                                resolvedImg ? "cursor-zoom-in" : ""
                              }`}
                            >
                              {resolvedImg ? (
                                <>
                                  <img
                                    src={resolvedImg}
                                    alt={item.name || "Product"}
                                    className="w-full h-full object-contain p-1 transition-transform group-hover:scale-105"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = "none";
                                      const parent = (e.target as HTMLElement).parentElement;
                                      if (parent) {
                                        const fb = parent.querySelector(".fb");
                                        if (fb) fb.classList.remove("hidden");
                                      }
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                    <ZoomIn className="w-4 h-4" />
                                  </div>
                                </>
                              ) : null}

                              <div className={`fb w-full h-full flex flex-col items-center justify-center text-gray-400 ${resolvedImg ? "hidden" : ""}`}>
                                <Package className="w-6 h-6 text-gray-300" />
                              </div>
                            </div>

                            {/* Product Title and Variant */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-gray-900 group-hover:text-blue-600 transition text-sm sm:text-base line-clamp-1">
                                  {item.name || item.productName || "Product Item"}
                                </span>
                                {pId && (
                                  <Link
                                    to={`/admin/products/${pId}`}
                                    onClick={(e) => e.stopPropagation()}
                                    title="View Product in Catalog"
                                    className="text-gray-400 hover:text-blue-600 p-0.5 inline-flex"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </Link>
                                )}
                              </div>

                              <p className="text-xs text-gray-500 mt-0.5">
                                Qty: {qty} • {item.variant_name || item.weight || "100 g"}
                              </p>
                            </div>
                          </div>

                          {/* Center: Price (Matching Screenshot) */}
                          <div className="md:px-8">
                            <span className="text-base sm:text-lg font-bold text-gray-900">
                              ₹{itemTotal.toLocaleString("en-IN")}
                            </span>
                          </div>

                          {/* Right: Status Bullet, Subtitle & View Details (Matching Screenshot) */}
                          <div className="md:text-right flex flex-col items-start md:items-end justify-center min-w-[160px]">
                            <div className="flex items-center gap-1.5 font-bold text-sm">
                              <span className={`w-2 h-2 rounded-full ${statusDisplay.dotColor}`} />
                              <span className={statusDisplay.textColor}>{statusDisplay.label}</span>
                            </div>

                            <p className="text-xs text-gray-500 mt-0.5">
                              {statusDisplay.subtitle}
                            </p>

                            <div className="flex items-center gap-3 mt-1">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    toast.info("Downloading official K2K invoice...");
                                    await orderApi.downloadInvoiceFile(ord.id, ord.invoiceUrl);
                                    toast.success("Invoice downloaded successfully");
                                  } catch (err) {
                                    toast.error("Failed to download invoice");
                                  }
                                }}
                                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 hover:underline cursor-pointer"
                                title="Download Official Tax Invoice PDF"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Invoice</span>
                              </button>

                              <span className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                                View Details
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    /* Fallback when line items are not individually populated */
                    <div
                      onClick={() => navigate(`/admin/orders/${ord.id}`)}
                      className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/70 transition"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400">
                          <Package className="w-6 h-6 text-gray-300" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm">Order Items</h4>
                          <p className="text-xs text-gray-500 mt-0.5">Items details on order page</p>
                        </div>
                      </div>

                      <div className="md:px-8">
                        <span className="text-base sm:text-lg font-bold text-gray-900">
                          ₹{orderTotal.toLocaleString("en-IN")}
                        </span>
                      </div>

                      <div className="md:text-right flex flex-col items-start md:items-end justify-center min-w-[160px]">
                        <div className="flex items-center gap-1.5 font-bold text-sm">
                          <span className={`w-2 h-2 rounded-full ${statusDisplay.dotColor}`} />
                          <span className={statusDisplay.textColor}>{statusDisplay.label}</span>
                        </div>

                        <p className="text-xs text-gray-500 mt-0.5">
                          {statusDisplay.subtitle}
                        </p>

                        <div className="flex items-center gap-3 mt-1">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                toast.info("Downloading official K2K invoice...");
                                await orderApi.downloadInvoiceFile(ord.id, ord.invoiceUrl);
                                toast.success("Invoice downloaded successfully");
                              } catch (err) {
                                toast.error("Failed to download invoice");
                              }
                            }}
                            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 hover:underline cursor-pointer"
                            title="Download Official Tax Invoice PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Invoice</span>
                          </button>

                          <span className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                            View Details
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox Zoom Modal */}
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
                <span>Open Original Asset</span>
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
    </div>
  );
};

export default CustomerDetailsPage;
