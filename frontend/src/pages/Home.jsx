import { motion } from "framer-motion";
import { FaBox, FaMoneyBillWave, FaUsers, FaChartLine } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { API } from "../services/api";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white">

      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 shadow-lg">
  <div className="flex justify-between items-center px-8 md:px-16 py-4">

    {/* Logo */}
    <h1 className="text-2xl font-bold text-white tracking-wide">
      Apna Store | Your Store. Your Control.
    </h1>

    {/* Menu */}
    <div className="space-x-6 hidden md:flex items-center">
      <a href="#about" className="text-white hover:text-black font-medium transition">
        About
      </a>
      <a href="#features" className="text-white hover:text-black font-medium transition">
        Features
      </a>
      <a href="#contact" className="text-white hover:text-black font-medium transition">
        Contact
      </a>

      <button
        onClick={() => navigate("/login")}
        className="bg-black text-white px-6 py-2 rounded-full hover:bg-white hover:text-green-600 transition"
      >
        Login
      </button>
    </div>

  </div>
</nav>


      {/* Hero Section */}
      <section className="min-h-screen flex flex-col md:flex-row items-center justify-center gap-16 px-8 md:px-24 pt-40">

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, x: -80 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }}
          className="max-w-xl"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            SmartStore <br /> Management System
          </h2>
          <p className="text-gray-300 text-lg mb-8">
            Complete store automation with billing, inventory and staff management.
          </p>

     <a
  href="#about"
  className="inline-block bg-green-500 px-10 py-3 rounded-full text-lg font-semibold
             transition-all duration-500 ease-in-out
             hover:bg-green-600 hover:scale-110 hover:shadow-2xl
             active:scale-95 shadow-lg"
>
  Get Started
</a>


        </motion.div>

        {/* Image */}
        <motion.img
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          src="https://cdn-icons-png.flaticon.com/512/869/869636.png"
          alt="store"
          className="w-[280px] md:w-[380px] drop-shadow-xl"
        />
      </section>

      {/* About */}
      {/* About Section */}
<section id="about" className="py-28 px-8 md:px-24 bg-gradient-to-b from-slate-900 to-slate-950">

  <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">

    {/* Left Content */}
    <div>
      <h3 className="text-4xl font-bold text-green-500 mb-6">
        About SmartStore
      </h3>

      <p className="text-gray-300 mb-6 leading-relaxed">
        SmartStore is a next-generation store management system designed to
        simplify and automate daily business operations. From inventory tracking
        to billing and staff management, SmartStore gives shop owners complete
        control from a single dashboard.
      </p>

      <p className="text-gray-400 mb-6 leading-relaxed">
        Our platform is built for speed, security, and simplicity — helping
        businesses save time, reduce errors, and grow faster with smart
        automation.
      </p>

      <div className="grid grid-cols-2 gap-6 mt-8">
        <div className="bg-white/10 p-5 rounded-xl text-center">
          <h4 className="text-2xl font-bold text-green-500">500+</h4>
          <p className="text-gray-300">Active Stores</p>
        </div>

        <div className="bg-white/10 p-5 rounded-xl text-center">
          <h4 className="text-2xl font-bold text-green-500">10k+</h4>
          <p className="text-gray-300">Daily Transactions</p>
        </div>
      </div>
    </div>

    {/* Right Image */}
    <div className="flex justify-center">
      <img
        src="https://cdn-icons-png.flaticon.com/512/3500/3500833.png"
        alt="about"
        className="w-[280px] md:w-[380px] drop-shadow-2xl"
      />
    </div>

  </div>

  {/* Mission & Vision */}
  <div className="max-w-6xl mx-auto mt-28 grid md:grid-cols-2 gap-12">

    <div className="bg-white/10 p-10 rounded-xl">
      <h4 className="text-2xl font-bold text-green-500 mb-4">🎯 Our Mission</h4>
      <p className="text-gray-300 leading-relaxed">
        To empower businesses with smart digital tools that automate store
        operations, improve efficiency, and increase profitability.
      </p>
    </div>

    <div className="bg-white/10 p-10 rounded-xl">
      <h4 className="text-2xl font-bold text-green-500 mb-4">🚀 Our Vision</h4>
      <p className="text-gray-300 leading-relaxed">
        To become India's most trusted store management platform for small and
        medium businesses.
      </p>
    </div>

  </div>

  {/* Why Choose SmartStore */}
<div className="max-w-6xl mx-auto mt-28 text-center">
  <h3 className="text-4xl font-bold text-green-500 mb-12">
    Why Choose SmartStore?
  </h3>

  <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10">

    {/* Card 1 */}
    <div className="group bg-white/10 backdrop-blur-lg p-8 rounded-2xl
                    transition-all duration-500 ease-in-out
                    hover:-translate-y-4 hover:scale-105
                    hover:shadow-[0_20px_40px_rgba(34,197,94,0.4)]
                    cursor-pointer">

      <div className="text-4xl mb-4 transition-transform duration-500 group-hover:scale-125">
        ⚡
      </div>

      <h4 className="text-xl font-semibold mt-4">Fast & Reliable</h4>
      <p className="text-gray-400 mt-2 text-sm">
        Lightning-fast performance with real-time data updates.
      </p>
    </div>

    {/* Card 2 */}
    <div className="group bg-white/10 backdrop-blur-lg p-8 rounded-2xl
                    transition-all duration-500 ease-in-out
                    hover:-translate-y-4 hover:scale-105
                    hover:shadow-[0_20px_40px_rgba(34,197,94,0.4)]
                    cursor-pointer">

      <div className="text-4xl mb-4 transition-transform duration-500 group-hover:scale-125">
        🔒
      </div>

      <h4 className="text-xl font-semibold mt-4">Secure System</h4>
      <p className="text-gray-400 mt-2 text-sm">
        Enterprise-grade security for your business data.
      </p>
    </div>

    {/* Card 3 */}
    <div className="group bg-white/10 backdrop-blur-lg p-8 rounded-2xl
                    transition-all duration-500 ease-in-out
                    hover:-translate-y-4 hover:scale-105
                    hover:shadow-[0_20px_40px_rgba(34,197,94,0.4)]
                    cursor-pointer">

      <div className="text-4xl mb-4 transition-transform duration-500 group-hover:scale-125">
        📊
      </div>

      <h4 className="text-xl font-semibold mt-4">Smart Reports</h4>
      <p className="text-gray-400 mt-2 text-sm">
        Powerful analytics to track your growth.
      </p>
    </div>

    {/* Card 4 */}
    <div className="group bg-white/10 backdrop-blur-lg p-8 rounded-2xl
                    transition-all duration-500 ease-in-out
                    hover:-translate-y-4 hover:scale-105
                    hover:shadow-[0_20px_40px_rgba(34,197,94,0.4)]
                    cursor-pointer">

      <div className="text-4xl mb-4 transition-transform duration-500 group-hover:scale-125">
        ☁
      </div>

      <h4 className="text-xl font-semibold mt-4">Cloud Based</h4>
      <p className="text-gray-400 mt-2 text-sm">
        Access your store from anywhere, anytime.
      </p>
    </div>

  </div>
</div>
</section>
      {/* Features */}

<section id="features" className="py-24 bg-white/5 px-8 md:px-24">
  <h3 className="text-4xl font-bold text-center text-green-500 mb-16">
    Key Features
  </h3>

  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">

    {/* Card 1 */}
    <div className="group bg-white/10 backdrop-blur-lg p-10 rounded-2xl text-center
                    transition-all duration-500 ease-in-out
                    hover:-translate-y-4 hover:scale-105
                    hover:shadow-[0_20px_40px_rgba(34,197,94,0.4)]
                    cursor-pointer">

      <div className="text-5xl mb-4 transition-transform duration-500 group-hover:scale-125">
        📦
      </div>

      <h4 className="text-xl font-semibold mb-2">Inventory Management</h4>
      <p className="text-gray-400 text-sm">
        Track products, stock levels and availability in real-time.
      </p>
    </div>


    {/* Card 2 */}
    <div className="group bg-white/10 backdrop-blur-lg p-10 rounded-2xl text-center
                    transition-all duration-500 ease-in-out
                    hover:-translate-y-4 hover:scale-105
                    hover:shadow-[0_20px_40px_rgba(34,197,94,0.4)]
                    cursor-pointer">

      <div className="text-5xl mb-4 transition-transform duration-500 group-hover:scale-125">
        💰
      </div>

      <h4 className="text-xl font-semibold mb-2">Smart Billing</h4>
      <p className="text-gray-400 text-sm">
        Fast and accurate billing with automated calculations.
      </p>
    </div>


    {/* Card 3 */}
    <div className="group bg-white/10 backdrop-blur-lg p-10 rounded-2xl text-center
                    transition-all duration-500 ease-in-out
                    hover:-translate-y-4 hover:scale-105
                    hover:shadow-[0_20px_40px_rgba(34,197,94,0.4)]
                    cursor-pointer">

      <div className="text-5xl mb-4 transition-transform duration-500 group-hover:scale-125">
        👨‍💼
      </div>

      <h4 className="text-xl font-semibold mb-2">Staff Control</h4>
      <p className="text-gray-400 text-sm">
        Manage staff access and track performance easily.
      </p>
    </div>


    {/* Card 4 */}
    <div className="group bg-white/10 backdrop-blur-lg p-10 rounded-2xl text-center
                    transition-all duration-500 ease-in-out
                    hover:-translate-y-4 hover:scale-105
                    hover:shadow-[0_20px_40px_rgba(34,197,94,0.4)]
                    cursor-pointer">

      <div className="text-5xl mb-4 transition-transform duration-500 group-hover:scale-125">
        📊
      </div>

      <h4 className="text-xl font-semibold mb-2">Sales Reports</h4>
      <p className="text-gray-400 text-sm">
        Get powerful analytics and growth insights.
      </p>
    </div>

  </div>
</section>

      

      {/* Contact */}
      <section id="contact" className="py-24 text-center px-8 md:px-24">
        <h3 className="text-4xl font-bold text-green-500 mb-6">Contact</h3>
        <p className="text-gray-300">support@smartstore.com</p>
        <p className="text-gray-300">+91 9876543210</p>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center bg-black">
        <p className="text-gray-400 text-sm">
          © 2026 SmartStore. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white/10 p-8 rounded-xl text-center hover:scale-105 transition"
    >
      <div className="text-5xl text-green-500 mb-4 flex justify-center">
        {icon}
      </div>
      <h4 className="text-xl font-semibold">{title}</h4>
    </motion.div>
  );
}

export default Home;
