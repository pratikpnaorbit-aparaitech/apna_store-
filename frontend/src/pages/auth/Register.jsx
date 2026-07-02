import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserPlus, FaEye, FaEyeSlash } from "react-icons/fa";
import { API } from "../../services/api";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendOtp = async () => {
    setError("");
    if (!email) return setError("Enter your email address");
    try {
      setLoading(true);
      const { data } = await API.post("/auth/registration-otp", { email });
      setOtpSent(true);
      alert(data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Could not send OTP");
    } finally {
      setLoading(false);
    }
  };

  /* ================= REGISTER ================= */
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    if (!otpSent || !/^\d{6}$/.test(otp)) {
      setError("Send and enter the 6-digit email OTP");
      return;
    }

    try {
      setLoading(true);

      await API.post("/auth/register-user", {
        name,
        email,
        mobile,
        password,
        otp,
      });

      alert("Registration successful. Please login.");

      navigate("/login");

    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 px-4">

      <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-emerald-400">

        {/* HEADER */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="bg-emerald-500 p-3 rounded-xl shadow-lg text-white">
            <FaUserPlus size={22} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Register</h1>
        </div>

        <p className="text-center text-gray-500 mb-6">
          Create your user account
        </p>

        {error && (
          <div className="bg-red-100 text-red-600 text-sm p-3 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">

          {/* NAME */}
          <input
            type="text"
            placeholder="Full Name"
            className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-emerald-400"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          {/* EMAIL */}
          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-emerald-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="6-digit email OTP"
              className="min-w-0 flex-1 px-4 py-3 rounded-xl border focus:ring-2 focus:ring-emerald-400"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              required
            />
            <button
              type="button"
              onClick={sendOtp}
              disabled={loading || !email}
              className="px-4 rounded-xl bg-slate-700 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold"
            >
              {otpSent ? "Resend OTP" : "Send OTP"}
            </button>
          </div>
          {otpSent && (
            <p className="text-xs text-emerald-700">OTP sent to {email}. It expires in 10 minutes.</p>
          )}

          {/* MOBILE */}
          <input
            type="tel"
            placeholder="Mobile Number"
            className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-emerald-400"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
            maxLength={10}
            required
          />

          {/* PASSWORD */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-emerald-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <span
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-4 cursor-pointer text-gray-500"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          {/* REGISTER BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white py-3 rounded-xl font-semibold"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        {/* LOGIN LINK */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-emerald-600 font-semibold cursor-pointer hover:underline"
          >
            Login
          </span>
        </p>

      </div>
    </div>
  );
}

export default Register;
