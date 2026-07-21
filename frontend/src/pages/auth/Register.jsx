import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserPlus, FaEye, FaEyeSlash } from "react-icons/fa";
import { PUBLIC_API } from "../../services/api";
import { clearAuthSession } from "../../services/session";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!otpSent || resendSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [otpSent, resendSeconds]);

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedMobile = mobile.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");

  const validateDetails = () => {
    if (name.trim().length < 2 || name.trim().length > 100) return "Name must be between 2 and 100 characters";
    if (!EMAIL_PATTERN.test(normalizedEmail) || normalizedEmail.length > 254) return "Enter a valid email address";
    if (!/^[6-9]\d{9}$/.test(normalizedMobile)) return "Enter a valid 10-digit mobile number";
    if (password.length < 6 || password.length > 128) return "Password must be between 6 and 128 characters";
    if (password !== confirmPassword) return "Passwords do not match";
    return "";
  };

  const sendOtp = async () => {
    setError("");
    setMessage("");
    const validationError = validateDetails();
    if (validationError) return setError(validationError);
    if (otpSent && resendSeconds > 0) return;
    try {
      setLoading(true);
      const { data } = await PUBLIC_API.post("/auth/send-registration-otp", {
        name: name.trim(),
        email: normalizedEmail,
        phone: normalizedMobile,
        password,
      });
      setOtpSent(true);
      setOtp("");
      setResendSeconds(data.resendAfterSeconds || 60);
      setMessage(data.message || "OTP sent to your email");
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

    setMessage("");
    const validationError = validateDetails();
    if (validationError) return setError(validationError);
    if (!otpSent || !/^\d{6}$/.test(otp)) {
      setError("Send and enter the 6-digit email OTP");
      return;
    }

    try {
      setLoading(true);

      const { data } = await PUBLIC_API.post("/auth/verify-registration-otp", {
        email: normalizedEmail,
        otp,
      });
      clearAuthSession();
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/user-dashboard");

    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const changeDetails = () => {
    setOtpSent(false);
    setOtp("");
    setResendSeconds(0);
    setError("");
    setMessage("");
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
        {message && (
          <div className="bg-emerald-100 text-emerald-700 text-sm p-3 rounded-lg mb-4 text-center">
            {message}
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
            maxLength={100}
            disabled={otpSent}
            required
          />

          {/* EMAIL */}
          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-emerald-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={254}
            disabled={otpSent}
            required
          />

          {/* MOBILE */}
          <input
            type="tel"
            placeholder="Mobile Number"
            className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-emerald-400"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
            maxLength={10}
            disabled={otpSent}
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
              maxLength={128}
              disabled={otpSent}
              required
            />

            <span
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-4 cursor-pointer text-gray-500"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          <input
            type={showPassword ? "text" : "password"}
            placeholder="Confirm Password"
            className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-emerald-400"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            maxLength={128}
            disabled={otpSent}
            required
          />

          {!otpSent ? (
            <button
              type="button"
              onClick={sendOtp}
              disabled={loading}
              className="w-full bg-slate-700 hover:bg-slate-800 disabled:opacity-60 text-white py-3 rounded-xl font-semibold"
            >
              {loading ? "Sending OTP..." : "Send email OTP"}
            </button>
          ) : (
            <>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit email OTP"
                className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-emerald-400"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                required
              />
              <p className="text-xs text-emerald-700">OTP sent to {normalizedEmail}. It expires in 10 minutes.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={loading || resendSeconds > 0}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 disabled:opacity-60 text-slate-700 text-sm font-semibold"
                >
                  {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend OTP"}
                </button>
                <button
                  type="button"
                  onClick={changeDetails}
                  disabled={loading}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold"
                >
                  Change details
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white py-3 rounded-xl font-semibold"
              >
                {loading ? "Creating account..." : "Verify & create account"}
              </button>
            </>
          )}
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
