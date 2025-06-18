import React, { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../../services/firebase/firebase";
import { adminSignup } from "../../services/api/authApi";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const AdminSignupLogin = () => {
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const validateForm = () => {
    if (!form.email || !form.password || !form.name) {
      setError("All fields are required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please enter a valid email address");
      return false;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }
    if (!/[A-Z]/.test(form.password)) {
      setError("Password must contain at least one uppercase letter");
      return false;
    }
    if (!/[0-9]/.test(form.password)) {
      setError("Password must contain at least one number");
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    try {
      setLoading(true);
      setError("");

      if (!validateForm()) {
        setLoading(false);
        return;
      }

      // Create Firebase auth user
      let firebaseUser;
      try {
        const { user } = await createUserWithEmailAndPassword(
          auth,
          form.email,
          form.password
        );
        firebaseUser = user;

        await updateProfile(user, { displayName: form.name });
      } catch (error: any) {
        handleFirebaseError(error);
        setLoading(false);
        return;
      }

      // Register with backend
      try {
        await adminSignup({
          email: form.email,
          name: form.name,
          uid: firebaseUser.uid,
        });

        // Success - redirect to login with state
        navigate("/admin/login", {
          state: { signupSuccess: true, email: form.email },
        });
      } catch (error: any) {
        // Clean up Firebase user if backend fails
        try {
          await firebaseUser.delete();
        } catch (deleteError) {
          console.error("Error cleaning up Firebase user:", deleteError);
        }

        handleBackendError(error);
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFirebaseError = (error: any) => {
    const errorMap: Record<string, string> = {
      "auth/email-already-in-use": "An account with this email already exists",
      "auth/invalid-email": "Please enter a valid email address",
      "auth/operation-not-allowed":
        "Email/password accounts are not enabled. Please contact support.",
      "auth/weak-password":
        "Password must be at least 8 characters with a mix of letters and numbers",
      "auth/too-many-requests": "Too many attempts. Please try again later.",
    };

    setError(
      errorMap[error.code] || error.message || "Failed to create account"
    );
  };

  const handleBackendError = (error: any) => {
    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.details ||
      error.message ||
      "Failed to complete registration. Please try again.";
    setError(errorMessage);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          Create Admin Account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Set up your e-commerce administration panel
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
              <p className="font-medium">Error</p>
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={form.name}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                At least 8 characters with 1 uppercase letter and 1 number
              </p>
            </div>

            <div>
              <button
                onClick={handleSignup}
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    Creating account...
                  </>
                ) : (
                  "Create Admin Account"
                )}
              </button>
            </div>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Already have an account?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => navigate("/admin/login")}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign in instead
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSignupLogin;
