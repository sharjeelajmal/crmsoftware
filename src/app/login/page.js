"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { User, Lock, Eye, EyeOff, ArrowRight, AlertCircle, ShoppingBag, BarChart3, Package } from "lucide-react";
import { BRAND } from "@/constants/brand";
import { api, errorMessage } from "@/lib/api-client";

const HIGHLIGHTS = [
  { icon: ShoppingBag, label: "Sales & invoicing" },
  { icon: Package, label: "Live inventory" },
  { icon: BarChart3, label: "Profit analytics" },
];

const INPUT_CLASS =
  "w-full h-14 pl-13 pr-4 text-[15px] text-gray-900 bg-white border-2 border-gray-200 rounded-2xl shadow-sm outline-none " +
  "placeholder:text-gray-400 transition-all duration-200 hover:border-gray-300 " +
  "focus:border-primary focus:shadow-md focus:ring-4 focus:ring-primary/15";

const LABEL_CLASS = "block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2";

const ICON_WRAP_CLASS =
  "absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 " +
  "text-gray-400 transition-colors duration-200 group-focus-within:bg-primary/10 group-focus-within:text-primary";

// useSearchParams needs a Suspense boundary so the page can still be prerendered.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}

function LoginScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-5xl grid md:grid-cols-2 bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <BrandPanel />
        <LoginForm />
      </motion.div>
    </div>
  );
}

function BrandPanel() {
  return (
    <aside
      className={
        "relative overflow-hidden bg-linear-to-br from-primary via-primary to-primary-light text-white " +
        "p-10 md:p-12 flex flex-col justify-between min-h-[260px] md:min-h-[560px]"
      }
    >
      {/* Soft glowing shapes */}
      <div aria-hidden="true" className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
      <div
        aria-hidden="true"
        className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-primary-light/40 blur-3xl"
      />
      <div aria-hidden="true" className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full border border-white/15" />

      <div className="relative z-10 flex items-center gap-3">
        <Image
          src={BRAND.logo}
          alt={`${BRAND.name} Logo`}
          width={48}
          height={48}
          priority
          className="rounded-xl shadow-lg"
        />
        <div>
          <p className="font-bold text-lg leading-tight">{BRAND.name}</p>
          <p className="text-xs text-white/70 tracking-widest uppercase">{BRAND.tagline}</p>
        </div>
      </div>

      <div className="relative z-10 mt-10 md:mt-0">
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
          Run your store
          <br />
          from one place.
        </h2>
        <p className="mt-4 text-white/75 max-w-xs">
          Sales, stock, customers and recovery — everything your business needs, in one clean dashboard.
        </p>
        <ul className="mt-8 space-y-3">
          {HIGHLIGHTS.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 text-sm">
              <span className="p-2 rounded-lg bg-white/15 backdrop-blur-sm">
                <Icon size={16} />
              </span>
              {label}
            </li>
          ))}
        </ul>
      </div>

      <p className="relative z-10 text-xs text-white/50 mt-10 md:mt-0">
        © {new Date().getFullYear()} Aura Business Solution
      </p>
    </aside>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await api.post("/api/auth/login", { username, password });
      // Session cookie is set by the server; refresh so the proxy sees it.
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : "/");
      router.refresh();
    } catch (err) {
      setError(
        err?.status === 401 ? "Invalid username or password" : errorMessage(err, "An error occurred. Please try again.")
      );
      setIsLoading(false);
    }
  };

  return (
    <section className="p-8 sm:p-12 flex flex-col justify-center">
      <div className="mb-8">
        <p className="text-sm font-semibold text-primary uppercase tracking-widest">Admin portal</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Welcome back 👋</h1>
        <p className="mt-2 text-gray-500">Sign in to your {BRAND.name} dashboard.</p>
      </div>

      <form className="space-y-5" onSubmit={handleLogin} noValidate>
        <div className="group">
          <label htmlFor="username" className={LABEL_CLASS}>
            Username or email
          </label>
          <div className="relative">
            <span className={ICON_WRAP_CLASS} aria-hidden="true">
              <User className="w-4 h-4" />
            </span>
            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div className="group">
          <label htmlFor="password" className={LABEL_CLASS}>
            Password
          </label>
          <div className="relative">
            <span className={ICON_WRAP_CLASS} aria-hidden="true">
              <Lock className="w-4 h-4" />
            </span>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${INPUT_CLASS} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className={
                "absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 hover:text-primary " +
                "transition-colors cursor-pointer rounded-r-2xl"
              }
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="flex items-center gap-2 text-sm text-danger bg-danger-soft border border-danger-border rounded-lg px-4 py-3"
          >
            <AlertCircle size={16} /> {error}
          </motion.p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={
            "group/btn mt-2 w-full h-14 flex items-center justify-center gap-2 font-semibold text-white " +
            "bg-primary rounded-2xl shadow-lg shadow-primary/25 transition-all duration-300 " +
            "hover:bg-primary-hover hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus:ring-4 " +
            "focus:ring-primary/20 active:translate-y-0 cursor-pointer disabled:opacity-60 " +
            "disabled:cursor-not-allowed disabled:hover:translate-y-0"
          }
        >
          {isLoading ? (
            <>
              <span
                className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"
                aria-hidden="true"
              />
              Signing in...
            </>
          ) : (
            <>
              Sign in
              <ArrowRight size={18} className="transition-transform group-hover/btn:translate-x-1" />
            </>
          )}
        </button>
      </form>

      <p className="mt-8 text-xs text-center text-gray-400">
        Authorised staff only. Contact the administrator if you need access.
      </p>
    </section>
  );
}
