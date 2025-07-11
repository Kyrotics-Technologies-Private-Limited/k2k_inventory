import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../services/firebase/firebase";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent! Check your inbox.");
    } catch (error: any) {
      const errorMessage =
        error.code === "auth/user-not-found"
          ? "No user found with this email."
          : "Failed to send reset email. Try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="w-16 h-16 mx-auto bg-blue-600 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
          EC
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Forgot Password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your admin email to reset your password
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleReset}>
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
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/admin/login"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
