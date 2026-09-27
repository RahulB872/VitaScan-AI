import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Pill,
  Store,
  LockKeyhole,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  PackageCheck,
  Truck,
} from "lucide-react";

const CURRENT_MEDICAL_KEY = "vitascan_current_medical_store";
const MEDICAL_STORES_KEY = "vitascan_medical_stores";
const MEDICAL_PASSWORD = "admin@1234";

function safeReadStores() {
  try {
    const data = JSON.parse(
      localStorage.getItem(MEDICAL_STORES_KEY) || "[]"
    );

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Unable to read medical stores:", error);
    return [];
  }
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function createMedicalId(name) {
  return (
    "medical-" +
    normalizeName(name)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}

export default function MedicalLogin() {
  const navigate = useNavigate();

  const [storeName, setStoreName] = useState("");
  const [password, setPassword] = useState("admin@1234");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (event) => {
    event.preventDefault();

    setError("");

    const enteredStoreName = storeName.trim();

    if (!enteredStoreName) {
      setError("Please enter the medical store name.");
      return;
    }

    if (!password) {
      setError("Please enter the password.");
      return;
    }

    if (password !== MEDICAL_PASSWORD) {
      setError("Incorrect password. Demo password is admin@1234.");
      return;
    }

    try {
      setLoading(true);

      /*
       * Check whether the store was registered through
       * MedicalRegister.jsx.
       */
      const registeredStores = safeReadStores();

      const registeredStore = registeredStores.find(
        (store) =>
          normalizeName(
            store?.storeName || store?.name
          ) === normalizeName(enteredStoreName)
      );

      let medicalStore;

      if (registeredStore) {
        /*
         * If registered, preserve all registered information.
         */
        medicalStore = {
          ...registeredStore,

          storeName:
            registeredStore.storeName ||
            registeredStore.name ||
            enteredStoreName,
        };
      } else {
        /*
         * Stores returned by the Medical Stores map can also
         * log in directly.
         */
        medicalStore = {
          id: createMedicalId(enteredStoreName),

          storeName: enteredStoreName,

          ownerName: "",
          email: "",
          mobile: "",

          qualification: "",
          licenseNumber: "",
          gstNumber: "",

          address: "",
          city: "",
          pincode: "",

          openingTime: "",
          closingTime: "",

          availableDays: [],

          homeDelivery: false,
          deliveryRadius: 0,

          contactNumber: "",

          profilePhoto: "",

          rating: 0,
          reviews: 0,
          distance: null,

          verificationStatus: "Map Listing",

          createdAt: new Date().toISOString(),
        };
      }

      /*
       * Only create/update the current medical-store session.
       *
       * No patient, doctor, appointment, payment,
       * or order information is deleted.
       */
      localStorage.setItem(
        CURRENT_MEDICAL_KEY,
        JSON.stringify(medicalStore)
      );

      sessionStorage.setItem(
        CURRENT_MEDICAL_KEY,
        JSON.stringify(medicalStore)
      );

      navigate("/medical-dashboard", {
        replace: true,
      });
    } catch (loginError) {
      console.error(
        "Medical store login error:",
        loginError
      );

      setError(
        "Unable to login to the medical store. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>

      {/* ================= LEFT PANEL ================= */}
      <section style={styles.leftPanel}>
        <div style={styles.leftContent}>

          {/* Back to VitaScan AI */}
          <button
            type="button"
            onClick={() => navigate("/")}
            style={styles.backToHome}
          >
            <ArrowLeft size={18} />
            <span>Back to VitaScan AI</span>
          </button>

          {/* Logo */}
          <div style={styles.logoCircle}>
            <img
              src="/medical-logo.jpeg"
              alt="VitaScan AI Medical Store"
              style={styles.logo}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
            <Pill
              size={38}
              style={styles.fallbackIcon}
            />
          </div>

          <div style={styles.brandSmall}>
            VITASCAN AI
          </div>

          <h2 style={styles.leftTitle}>
            Medical Store
            <br />
            Healthcare Portal
          </h2>

          <p style={styles.leftDescription}>
            Access medicine requests received from
            VitaScan AI patients and manage your
            medical store orders.
          </p>

          {/* Feature 1 */}
          <div style={styles.feature}>
            <div style={styles.featureIcon}>
              <Store size={25} />
            </div>

            <div>
              <div style={styles.featureTitle}>
                Any Medical Store
              </div>

              <div style={styles.featureText}>
                Login using the exact medical store
                name shown in Medical Stores.
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div style={styles.feature}>
            <div style={styles.featureIcon}>
              <PackageCheck size={25} />
            </div>

            <div>
              <div style={styles.featureTitle}>
                Medicine Requests
              </div>

              <div style={styles.featureText}>
                View medicine requests received from
                VitaScan AI patients.
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div style={styles.feature}>
            <div style={styles.featureIcon}>
              <Truck size={25} />
            </div>

            <div>
              <div style={styles.featureTitle}>
                Store-specific Data
              </div>

              <div style={styles.featureText}>
                Each medical store sees only its own
                medicine requests and store details.
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ================= RIGHT PANEL ================= */}
      <section style={styles.rightPanel}>
        <div style={styles.loginCard}>

          <div style={styles.portalLabel}>
            MEDICAL STORE PORTAL
          </div>

          <h1 style={styles.title}>
            Medical Store Login
          </h1>

          <p style={styles.subtitle}>
            Login to view medicine requests received
            by your medical store.
          </p>

          <form onSubmit={handleLogin}>

            {/* Medical Store Name */}
            <label style={styles.label}>
              Medical Store Name
            </label>

            <div style={styles.inputWrapper}>
              <Store
                size={19}
                style={styles.inputIcon}
              />

              <input
                type="text"
                value={storeName}
                onChange={(event) => {
                  setStoreName(event.target.value);
                  setError("");
                }}
                placeholder="Enter medical store name"
                autoComplete="organization"
                style={styles.input}
              />
            </div>

            {/* Password */}
            <label style={styles.label}>
              Password
            </label>

            <div style={styles.inputWrapper}>
              <LockKeyhole
                size={19}
                style={styles.inputIcon}
              />

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                placeholder="Enter medical store password"
                autoComplete="current-password"
                style={{
                  ...styles.input,
                  paddingRight: 48,
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (previous) => !previous
                  )
                }
                style={styles.eyeButton}
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div style={styles.errorBox}>
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.loginButton,
                opacity: loading ? 0.7 : 1,
              }}
            >
              <LogIn size={18} />

              <span>
                {loading
                  ? "Logging in..."
                  : "Medical Store Login"}
              </span>
            </button>
          </form>

          {/* Demo Password */}
          <div style={styles.demoPassword}>
            <ShieldCheck
              size={16}
            />

            <span>
              Demo password:
              <strong>admin@1234</strong>
            </span>
          </div>

          <p style={styles.instruction}>
            Enter the exact medical store name shown
            in Medical Stores.
          </p>

          {/* Registration */}
          <button
            type="button"
            onClick={() =>
              navigate("/medical-register")
            }
            style={styles.registrationButton}
          >
            Medical Store Registration
          </button>

          {/* Back */}
          <button
            type="button"
            onClick={() =>
              navigate("/medical-stores")
            }
            style={styles.backButton}
          >
            <ArrowLeft size={16} />
            <span>Back to Medical Stores</span>
          </button>

          {/* Session Message */}
          <div style={styles.sessionMessage}>
            <ShieldCheck
              size={16}
              style={{ flexShrink: 0 }}
            />

            <span>
              Medical store session remains active
              until logout and is kept separate from
              existing patient and doctor sessions.
            </span>
          </div>

        </div>
      </section>
    </div>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    background: "#f3f8fa",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  /* LEFT SIDE */

  leftPanel: {
    minHeight: "100vh",
    background:
      "linear-gradient(145deg, #078b87 0%, #147f9e 52%, #1875b3 100%)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  leftContent: {
    width: "100%",
    maxWidth: 560,
    padding: "48px 70px",
    boxSizing: "border-box",
  },

  backToHome: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    border: 0,
    background: "transparent",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    padding: 0,
    marginBottom: 34,
  },

  logoCircle: {
    width: 66,
    height: 66,
    borderRadius: "50%",
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    marginBottom: 28,
  },

  logo: {
    width: 60,
    height: 60,
    objectFit: "contain",
    borderRadius: "50%",
    position: "relative",
    zIndex: 2,
  },

  fallbackIcon: {
    position: "absolute",
    color: "#078b87",
    zIndex: 1,
  },

  brandSmall: {
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: "1.8px",
    marginBottom: 22,
  },

  leftTitle: {
    fontSize: 43,
    lineHeight: 1.2,
    margin: 0,
    fontWeight: 800,
    letterSpacing: "-0.8px",
  },

  leftDescription: {
    maxWidth: 500,
    fontSize: 16,
    lineHeight: 1.65,
    marginTop: 23,
    marginBottom: 38,
    color: "rgba(255,255,255,0.92)",
  },

  feature: {
    display: "flex",
    alignItems: "center",
    gap: 17,
    marginBottom: 26,
  },

  featureIcon: {
    width: 50,
    height: 50,
    flexShrink: 0,
    borderRadius: 12,
    background: "rgba(255,255,255,0.14)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  featureTitle: {
    fontSize: 15,
    fontWeight: 800,
    marginBottom: 5,
  },

  featureText: {
    fontSize: 13,
    lineHeight: 1.45,
    color: "rgba(255,255,255,0.82)",
  },

  /* RIGHT SIDE */

  rightPanel: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "50px 60px",
    boxSizing: "border-box",
  },

  loginCard: {
    width: "100%",
    maxWidth: 495,
    background: "#ffffff",
    border: "1px solid #dce6eb",
    borderRadius: 20,
    padding: "48px 42px",
    boxSizing: "border-box",
    boxShadow:
      "0 18px 45px rgba(28, 61, 78, 0.08)",
  },

  portalLabel: {
    color: "#008b87",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "1.5px",
    marginBottom: 10,
  },

  title: {
    margin: 0,
    color: "#0d3452",
    fontSize: 31,
    lineHeight: 1.2,
    fontWeight: 800,
  },

  subtitle: {
    color: "#6b8191",
    fontSize: 14,
    lineHeight: 1.5,
    margin: "10px 0 29px",
  },

  label: {
    display: "block",
    color: "#123b58",
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 8,
    marginTop: 18,
  },

  inputWrapper: {
    position: "relative",
    width: "100%",
  },

  inputIcon: {
    position: "absolute",
    left: 15,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#78909e",
    pointerEvents: "none",
  },

  input: {
    width: "100%",
    height: 56,
    border: "1px solid #d3e1e7",
    borderRadius: 10,
    background: "#ffffff",
    color: "#183b53",
    fontSize: 15,
    outline: "none",
    padding: "0 15px 0 50px",
    boxSizing: "border-box",
  },

  eyeButton: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    border: 0,
    background: "transparent",
    color: "#78909e",
    cursor: "pointer",
    padding: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  errorBox: {
    marginTop: 14,
    padding: "11px 13px",
    borderRadius: 9,
    border: "1px solid #ffc7c7",
    background: "#fff1f1",
    color: "#b42318",
    fontSize: 13,
    lineHeight: 1.45,
  },

  loginButton: {
    width: "100%",
    height: 56,
    marginTop: 21,
    border: 0,
    borderRadius: 9,
    background:
      "linear-gradient(90deg, #078b87, #1679b2)",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  demoPassword: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    color: "#193c55",
    fontSize: 14,
    marginTop: 4,
  },

  instruction: {
    color: "#173b57",
    fontSize: 14,
    lineHeight: 1.5,
    margin: "25px 0 18px",
  },

  registrationButton: {
    width: "100%",
    height: 47,
    border: "1px solid #d2e1e8",
    borderRadius: 9,
    background: "#ffffff",
    color: "#008b87",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },

  backButton: {
    width: "100%",
    marginTop: 12,
    border: 0,
    background: "transparent",
    color: "#5f7687",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    padding: 6,
  },

  sessionMessage: {
    marginTop: 21,
    padding: "12px 13px",
    borderRadius: 10,
    background: "#f2f9f8",
    color: "#637b8a",
    fontSize: 12,
    lineHeight: 1.5,
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
  },
};

/* =====================================================
   RESPONSIVE
===================================================== */

const styleSheet = document.createElement("style");

styleSheet.innerHTML = `
  @media (max-width: 900px) {
    .medical-login-page {
      grid-template-columns: 1fr !important;
    }
  }
`;

if (
  typeof document !== "undefined" &&
  !document.getElementById("medical-login-responsive-style")
) {
  styleSheet.id = "medical-login-responsive-style";
  document.head.appendChild(styleSheet);
}