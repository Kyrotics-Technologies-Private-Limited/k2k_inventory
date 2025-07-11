import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/admin/layout/Layout";
import AdminDashboard from "./pages/admin/Admindashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import ProductDetailsPage from "./pages/admin/ProductDetailsPage";
import ProductListPage from "./pages/admin/ProductListPage";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminCustomers from "./pages/admin/AdminCustomers";
import { ToastContainer, Bounce } from "react-toastify";
import VariantDetailsPage from "./pages/admin/Variantdetailspage";
import VariantEditPage from "./pages/admin/VariantEditPage";
import AdminOrderDetailsPage from "./pages/admin/AdminOrderDetails";
import AdminSignupLogin from "./pages/admin/AdminSignupLogin";
import AdminLogin from "./pages/admin/AdminLogin";
import ProtectedRoute from "./utils/ProtectedRoute";
import CustomerDetailsPage from "./pages/admin/CustomerDetailsPage";
import ForgotPassword from "./pages/admin/ForgotPassword";

function App() {
  return (
    <BrowserRouter>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={true}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        style={{ marginTop: "3rem" }}
        className="!top-[3rem]"
        transition={Bounce}
      />

      <Routes>
        {/* Public Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/signup" element={<AdminSignupLogin />} />
        <Route path="/admin/forgot-password" element={<ForgotPassword />} />

        {/* Protected Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route
            index
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Products and Variants */}
          <Route
            path="products"
            element={
              <ProtectedRoute>
                <AdminProducts />
              </ProtectedRoute>
            }
          />
          <Route
            path="products/:id"
            element={
              <ProtectedRoute>
                <ProductDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="productlist"
            element={
              <ProtectedRoute>
                <ProductListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="variants/:id"
            element={
              <ProtectedRoute>
                <VariantDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="variants/:id/edit"
            element={
              <ProtectedRoute>
                <VariantEditPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="products/:productId/variants"
            element={
              <ProtectedRoute>
                <VariantDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="products/:productId/variants/:variantId/edit"
            element={
              <ProtectedRoute>
                <VariantEditPage />
              </ProtectedRoute>
            }
          />

          {/* Orders */}
          <Route
            path="orders"
            element={
              <ProtectedRoute>
                <AdminOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="orders/:orderId"
            element={
              <ProtectedRoute>
                <AdminOrderDetailsPage />
              </ProtectedRoute>
            }
          />

          {/* Customers */}
          <Route
            path="customers"
            element={
              <ProtectedRoute>
                <AdminCustomers />
              </ProtectedRoute>
            }
          />
          <Route
            path="customers/:customerId"
            element={
              <ProtectedRoute>
                <CustomerDetailsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/admin" replace />} />

        {/* Catch all other routes */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
