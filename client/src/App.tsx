import { BrowserRouter, Routes, Route } from "react-router-dom";

// Public components

import Layout from "./components/admin/layout/Layout";
import AdminDashboard from "./pages/admin/Admindashboard";
//import { store } from "./store/store";
//import { Provider } from "react-redux";
//import AppProvider from "./AppProvider";
import AdminProducts from "./pages/admin/AdminProducts";
//import PhoneAuth from "./components/PhoneAuth";

import ProductDetailsPage from "./pages/admin/ProductDetailsPage";
import ProductListPage from "./pages/admin/ProductListPage";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminOrderDetails from "./pages/admin/AdminOrderDetails";
import AdminCustomers from "./pages/admin/AdminCustomers";
import { ToastContainer, Bounce } from "react-toastify";
import VariantDetailsPage from "./pages/admin/Variantdetailspage";
import VariantEditPage from "./pages/admin/VariantEditPage";



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
        style={{ marginTop: '3rem' }}  
        className="!top-[3rem]" // This ensures toast appears below navbar
        transition={Bounce} />
    
          <Routes>
            
            {/* Admin Routes */}
            <Route path="/admin" element={<Layout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="products/:id" element={<ProductDetailsPage />} />
              <Route path="productlist" element={<ProductListPage />} />
              <Route
                path="products/:productId/variants"
                element={<VariantDetailsPage />}
              />
              <Route
                path="products/:productId/variants/:variantId/edit"
                element={<VariantEditPage />}
              />              <Route path="orders" element={<AdminOrders />} />
              <Route path="orders/:orderId" element={<AdminOrderDetails />} />
              <Route path="customers" element={<AdminCustomers />} />
              {/* Add other admin routes as needed */}
            </Route>
          </Routes>
       
      </BrowserRouter>
   
  );
}

export default App;
