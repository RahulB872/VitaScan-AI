import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const CURRENT_KEY = "vitascan_current_medical_store";
const MEDICINES_KEY = "vitascan_medical_store_medicines";
const ORDER_KEY = "vitascan_medical_orders";
const ONE_HOUR = 60 * 60 * 1000;

const safeParse = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

const storeKey = (name = "") => String(name).trim().toLowerCase();

function getCurrentStore() {
  const value = safeParse(CURRENT_KEY, null);
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function readOrders() {
  const value = safeParse(ORDER_KEY, []);
  return Array.isArray(value) ? value : [];
}

function writeOrders(items) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(items));
}

function cleanupExpiredDeliveredOrders() {
  const now = Date.now();
  const orders = readOrders();
  const cleaned = orders.filter((order) => {
    const status = String(order.orderStatus || order.status || "").toLowerCase();
    if (!["delivered", "completed"].includes(status)) return true;

    const deliveredAt = order.deliveredAt || order.completedAt || order.statusUpdatedAt;
    if (!deliveredAt) return true;

    const time = new Date(deliveredAt).getTime();
    return !Number.isFinite(time) || now - time < ONE_HOUR;
  });

  if (cleaned.length !== orders.length) writeOrders(cleaned);
  return cleaned;
}

function getStoreOrders(store) {
  const key = storeKey(store?.storeName);
  return cleanupExpiredDeliveredOrders().filter((order) => {
    const orderStoreKey = storeKey(
      order.medicalId ||
      order.medicalStoreName ||
      order.medicalName ||
      order.storeName
    );
    return key && orderStoreKey === key;
  });
}

const demoMedicines = [
  { id: "MED-1", name: "Paracetamol 500mg", category: "Pain Relief", stock: 120, price: 25, availability: "Available" },
  { id: "MED-2", name: "Cetirizine 10mg", category: "Allergy", stock: 80, price: 35, availability: "Available" },
  { id: "MED-3", name: "ORS Sachet", category: "Hydration", stock: 50, price: 20, availability: "Available" },
];

export default function MedicalDashboard() {
  const navigate = useNavigate();
  const [store, setStore] = useState(null);
  const [active, setActive] = useState("overview");
  const [orders, setOrders] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewer, setViewer] = useState(null);

  const refresh = () => {
    const current = getCurrentStore();
    if (!current) return;
    setStore(current);
    setOrders(getStoreOrders(current));
  };

  useEffect(() => {
    const current = getCurrentStore();
    if (!current) {
      navigate("/medical-login", { replace: true });
      return;
    }

    setStore(current);
    setOrders(getStoreOrders(current));

    const existing = safeParse(MEDICINES_KEY, null);
    if (Array.isArray(existing)) {
      setMedicines(existing);
    } else {
      setMedicines(demoMedicines);
      localStorage.setItem(MEDICINES_KEY, JSON.stringify(demoMedicines));
    }

    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);
    const timer = setInterval(refresh, 3000);
    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(timer);
    };
  }, [navigate]);

  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = useMemo(
    () => orders.filter((o) => String(o.requestDate || o.date || o.orderDate || o.createdAt || "").slice(0, 10) === today),
    [orders, today]
  );

  const pending = orders.filter((o) => !["completed", "delivered", "cancelled"].includes(String(o.orderStatus || o.status || "").toLowerCase())).length;
  const completed = orders.filter((o) => ["completed", "delivered"].includes(String(o.orderStatus || o.status || "").toLowerCase())).length;

  const logout = () => {
    localStorage.removeItem(CURRENT_KEY);
    navigate("/medical-login", { replace: true });
  };

  const markDelivered = (id) => {
    const now = new Date().toISOString();
    const updated = readOrders().map((order) =>
      order.id === id
        ? { ...order, status: "Delivered", orderStatus: "Delivered", deliveredAt: now, statusUpdatedAt: now }
        : order
    );
    writeOrders(updated);
    refresh();
  };

  const profileValue = (field) => store?.[field] || "—";

  const openDocument = (data, name, type) => {
    if (!data) return;

    const lowerName = String(name || "").toLowerCase();
    const guessedType =
      type ||
      (lowerName.endsWith(".png") ? "image/png" : "") ||
      (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg") ? "image/jpeg" : "") ||
      (lowerName.endsWith(".webp") ? "image/webp" : "") ||
      (lowerName.endsWith(".pdf") ? "application/pdf" : "") ||
      "";

    // Keep image Data URLs unchanged. This is more reliable in Android WebView
    // than converting the image to a Blob URL before rendering.
    if (typeof data === "string" && data.startsWith("data:image/")) {
      const imageType = data.match(/^data:([^;,]+)/i)?.[1] || guessedType || "image/jpeg";
      setViewer({ url: data, name: name || "Uploaded Image", type: imageType, isImage: true });
      return;
    }

    // Support older orders that stored only raw Base64 without the data: prefix.
    if (typeof data === "string" && !data.startsWith("data:") && String(guessedType).startsWith("image/")) {
      setViewer({
        url: `data:${guessedType};base64,${data}`,
        name: name || "Uploaded Image",
        type: guessedType,
        isImage: true,
      });
      return;
    }

    try {
      let url = data;
      let resolvedType = guessedType;

      if (typeof data === "string" && data.startsWith("data:")) {
        const comma = data.indexOf(",");
        if (comma > -1) {
          const header = data.slice(0, comma);
          const mime = header.match(/^data:([^;,]+)/i)?.[1] || guessedType || "application/octet-stream";
          const body = data.slice(comma + 1);

          if (mime.startsWith("image/")) {
            setViewer({ url: data, name: name || "Uploaded Image", type: mime, isImage: true });
            return;
          }

          const binary = atob(body);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
          url = URL.createObjectURL(new Blob([bytes], { type: mime }));
          resolvedType = mime;
        }
      }

      setViewer({
        url,
        name: name || "Uploaded Document",
        type: resolvedType || "application/octet-stream",
        isImage: String(resolvedType).startsWith("image/"),
      });
    } catch (error) {
      console.error("Unable to open uploaded document", error);
      setViewer({ url: data, name: name || "Uploaded Document", type: guessedType, isImage: String(guessedType).startsWith("image/") });
    }
  };

  const closeDocument = () => {
    if (viewer?.url?.startsWith("blob:")) URL.revokeObjectURL(viewer.url);
    setViewer(null);
  };

  if (!store) return null;

  const title =
    active === "overview" ? "Medical Store Overview" :
    active === "orders" ? "Medicine Requests" :
    active === "profile" ? "Store Profile" :
    active === "availability" ? "Availability" : "Medicines";

  return (
    <div className="medical-dashboard-app" style={styles.app}>
      <header className="medical-dashboard-topbar" style={styles.topbar}>
        <div style={styles.topBrand}>
          <img src="/medical-logo.jpeg" alt="VitaScan AI" style={styles.topLogo} />
          <div>
            <b>VitaScan AI</b>
            <small style={styles.topBrandSmall}>Medical Store Portal</small>
          </div>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.storeHeader}>
            <span style={styles.storeAvatar}>🏪</span>
            <div>
              <b>{store.storeName}</b>
              <small style={styles.storeHeaderSmall}>Medical Store</small>
            </div>
          </div>
          <button className="medical-dashboard-menu-button" style={styles.menuButton} onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle menu">
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </header>

      <aside className={`medical-dashboard-sidebar ${menuOpen ? "open" : ""}`} style={{ ...styles.sidebar, ...(menuOpen ? styles.sidebarOpen : {}) }}>
        <div style={styles.sideStore}>
          <div style={styles.bigAvatar}>🏪</div>
          <b style={styles.sideStoreName}>{store.storeName}</b>
          <span style={styles.sideStoreOwner}>{store.ownerName}</span>
          <em style={styles.sideStoreStatus}>● {store.verificationStatus || "Pending Verification"}</em>
        </div>

        <nav style={styles.nav}>
          {[
            ["overview", "Overview"],
            ["orders", "Medicine Requests"],
            ["profile", "Store Profile"],
            ["availability", "Availability"],
            ["medicines", "Medicines"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setActive(id); setMenuOpen(false); }}
              style={{ ...styles.navItem, ...(active === id ? styles.navActive : {}) }}
            >
              {label}
            </button>
          ))}
        </nav>

        <button onClick={logout} style={styles.logout}>↪ Logout</button>
      </aside>

      <main className="medical-dashboard-main" style={styles.main}>
        <div className="medical-dashboard-heading" style={styles.pageHeading}>
          <div>
            <div style={styles.eyebrow}>VITASCAN AI HEALTHCARE PORTAL</div>
            <h1 style={styles.pageTitle}>{title}</h1>
            <span style={styles.pageStore}>{store.storeName}</span>
          </div>
          <div style={styles.secure}>🛡 Secure Medical Store Portal</div>
        </div>

        {active === "overview" && (
          <>
            <section className="medical-dashboard-banner" style={styles.banner}>
              <div>
                <small>Welcome to</small>
                <h2 style={styles.bannerTitle}>{store.storeName}</h2>
                <p style={styles.bannerText}>Medicine requests from VitaScan AI patients appear here automatically.</p>
              </div>
              <div style={styles.bannerIcon}>💊</div>
            </section>

            <div style={styles.stats}>
              <Stat label="Total Requests" value={orders.length} icon="▣" />
              <Stat label="Pending Orders" value={pending} icon="◷" />
              <Stat label="Completed" value={completed} icon="✓" />
              <Stat label="Today's Requests" value={todayOrders.length} icon="▦" />
              <Stat label="Verification" value={store.verificationStatus || "Pending"} icon="♢" />
            </div>

            <section style={styles.panel}>
              <div style={styles.panelHead}>
                <div>
                  <h2 style={styles.panelTitle}>Recent Medicine Requests</h2>
                  <p style={styles.panelText}>Prescription files and order details are visible to this Medical Store only.</p>
                </div>
                <button onClick={() => setActive("orders")} style={styles.smallButton}>View All</button>
              </div>
              {orders.length ? <OrderList orders={orders.slice(0, 5)} onDelivered={markDelivered} onViewDocument={openDocument} /> : <Empty text="No medicine requests available" />}
            </section>
          </>
        )}

        {active === "orders" && (
          <section style={styles.panel}>
            <div style={styles.panelHead}>
              <div>
                <h2 style={styles.panelTitle}>Medicine Orders / Requests</h2>
                <p style={styles.panelText}>Delivered orders are automatically removed one hour after delivery.</p>
              </div>
            </div>
            {orders.length ? <OrderList orders={orders} onDelivered={markDelivered} onViewDocument={openDocument} /> : <Empty text="No medicine requests available" />}
          </section>
        )}

        {active === "profile" && (
          <section style={styles.panel}>
            <div style={styles.profileHeader}>
              {store.profilePhoto ? <img src={store.profilePhoto} alt="Store" style={styles.profileImage} /> : <div style={styles.profileImageFallback}>🏪</div>}
              <div><h2 style={{ margin: 0 }}>{store.storeName}</h2><span>{store.ownerName}</span></div>
              <span style={styles.status}>{store.verificationStatus || "Pending Verification"}</span>
            </div>
            <InfoGrid items={[
              ["Owner / Pharmacist", profileValue("ownerName")], ["Email", profileValue("email")],
              ["Mobile", profileValue("mobile")], ["Qualification", profileValue("qualification")],
              ["License Number", profileValue("licenseNumber")], ["GST Number", profileValue("gstNumber")],
              ["Address", profileValue("address")], ["City", profileValue("city")],
              ["Pincode", profileValue("pincode")], ["Opening Hours", `${profileValue("openingTime")} – ${profileValue("closingTime")}`],
              ["Available Days", profileValue("availableDays")], ["Home Delivery", store.homeDelivery ? "Available" : "Not Available"],
              ["Delivery Radius", store.homeDelivery ? `${profileValue("deliveryRadius")} km` : "—"],
              ["Rating / Reviews", `⭐ ${store.rating ?? 0} / ${store.reviews ?? 0}`],
            ]} />
          </section>
        )}

        {active === "availability" && (
          <section style={styles.panel}>
            <h2 style={styles.panelTitle}>Store Availability</h2>
            <InfoGrid items={[
              ["Available Days", profileValue("availableDays")],
              ["Opening Time", profileValue("openingTime")],
              ["Closing Time", profileValue("closingTime")],
              ["Home Delivery", store.homeDelivery ? "Available" : "Not Available"],
              ["Delivery Radius", store.homeDelivery ? `${profileValue("deliveryRadius")} km` : "—"],
              ["Verification", profileValue("verificationStatus")],
            ]} />
          </section>
        )}

        {active === "medicines" && (
          <section style={styles.panel}>
            <div style={styles.panelHead}>
              <div><h2 style={styles.panelTitle}>Medicine Management</h2><p style={styles.panelText}>Inventory is kept separate from patient order data.</p></div>
            </div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead><tr><th style={styles.th}>Medicine Name</th><th style={styles.th}>Category</th><th style={styles.th}>Stock</th><th style={styles.th}>Price</th><th style={styles.th}>Availability</th></tr></thead>
                <tbody>
                  {medicines.map((m) => (
                    <tr key={m.id || m.name}>
                      <td style={styles.td}>{m.name}</td>
                      <td style={styles.td}>{m.category || "—"}</td>
                      <td style={styles.td}>{m.stock ?? m.quantity ?? 0}</td>
                      <td style={styles.td}>₹{m.price ?? 0}</td>
                      <td style={styles.td}><span style={styles.status}>{m.availability || "Available"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {viewer && (
          <div style={styles.viewerBackdrop} onClick={closeDocument}>
            <div style={styles.viewerModal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.viewerHeader}>
                <b style={styles.viewerTitle}>📄 {viewer.name}</b>
                <button type="button" style={styles.viewerClose} onClick={closeDocument} aria-label="Close document">✕</button>
              </div>
              {viewer.isImage || String(viewer.type).startsWith("image/") ? (
                <div style={styles.imageViewerWrap}>
                  <img
                    src={viewer.url}
                    alt={viewer.name}
                    style={styles.viewerImage}
                    onError={(event) => {
                      console.error("Uploaded image could not be rendered");
                      event.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              ) : (
                <iframe title={viewer.name} src={viewer.url} style={styles.viewerFrame} />
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

function Stat({ label, value, icon }) {
  return <div style={styles.stat}><span style={styles.statIcon}>{icon}</span><small style={styles.statLabel}>{label}</small><strong style={styles.statValue}>{value}</strong></div>;
}

function Empty({ text }) {
  return <div style={styles.empty}>{text}</div>;
}

function InfoGrid({ items }) {
  return <div style={styles.infoGrid}>{items.map(([label, value]) => <div key={label} style={styles.infoItem}><small style={styles.infoLabel}>{label}</small><b style={styles.infoValue}>{value}</b></div>)}</div>;
}

function OrderList({ orders, onDelivered, onViewDocument }) {
  return (
    <div style={styles.orderList}>
      {orders.map((o, i) => {
        const status = o.orderStatus || o.status || "Order Received";
        const isDelivered = ["delivered", "completed"].includes(String(status).toLowerCase());
        const documentData = o.documentData || o.prescriptionData || o.prescriptionUrl || o.documentUrl || o.prescription;

        return (
          <article key={o.id || o.orderId || i} style={styles.order}>
            <div style={styles.orderTop}>
              <b>Order ID: {o.orderId || o.id || `ORDER-${i + 1}`}</b>
              <span style={styles.status}>{status}</span>
            </div>

            <div className="medical-order-grid" style={styles.orderGrid}>
              <OrderField label="Patient Name" value={o.patientName || o.patient?.name} />
              <OrderField label="Patient Mobile" value={o.patientMobile || o.mobile || o.patient?.mobile} />
              <OrderField label="Request Date" value={o.requestDate || o.orderDate || String(o.createdAt || "").slice(0, 10)} />
              <OrderField label="Request Time" value={o.requestTime || o.time || String(o.createdAt || "").slice(11, 16)} />
              <OrderField label="Medicine Details" value={o.medicines || o.medicineName || o.medicine || o.name} wide />
              <OrderField label="Payment Status" value={o.paymentStatus || "Cash on Delivery"} />
              <OrderField label="Delivery Address" value={o.deliveryAddress || o.address} wide />
              <OrderField label="Document" value={o.documentName || (documentData ? "Prescription available" : "—")} wide />
            </div>

            <div style={styles.orderActions}>
              {documentData && (
                <button
                  type="button"
                  style={styles.documentButton}
                  onClick={() => onViewDocument(documentData, o.documentName, o.documentType)}
                >
                  📄 View Uploaded Document
                </button>
              )}
              {!isDelivered && (
                <button type="button" style={styles.deliveredButton} onClick={() => onDelivered(o.id)}>
                  Mark as Delivered
                </button>
              )}
              {isDelivered && o.deliveredAt && (
                <small style={styles.deleteNote}>Auto-delete: 1 hour after delivery</small>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function OrderField({ label, value, wide = false }) {
  return (
    <span style={wide ? { gridColumn: "1 / -1", ...styles.orderField } : styles.orderField}>
      <small style={styles.orderLabel}>{label}</small>
      <b style={styles.orderValue}>{value || "—"}</b>
    </span>
  );
}

const styles = {
  app: { minHeight: "100vh", background: "#f4f8fa", color: "#153a55", fontFamily: "Inter, Arial, sans-serif" },
  topbar: { position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, height: 72, background: "#fff", borderBottom: "1px solid #dce7eb", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", boxSizing: "border-box" },
  topBrand: { display: "flex", alignItems: "center", gap: 10, fontSize: 17, color: "#123b58", minWidth: 0 },
  topBrandSmall: { display: "block", color: "#8093a2", fontSize: 10, marginTop: 2 },
  topLogo: { width: 42, height: 42, borderRadius: 12, objectFit: "cover", flex: "0 0 auto" },
  headerRight: { display: "flex", alignItems: "center", gap: 14, minWidth: 0 },
  storeHeader: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 },
  storeHeaderSmall: { display: "block", color: "#8093a2", fontSize: 10, marginTop: 2 },
  storeAvatar: { width: 42, height: 42, borderRadius: "50%", background: "#e6f7f4", display: "grid", placeItems: "center", flex: "0 0 auto" },
  menuButton: { display: "none", border: "1px solid #d7e4e8", background: "#fff", borderRadius: 9, width: 42, height: 40, fontSize: 19, cursor: "pointer", color: "#087f78" },
  sidebar: { position: "fixed", zIndex: 900, top: 72, bottom: 0, left: 0, width: 225, background: "#fff", borderRight: "1px solid #dce7eb", padding: 18, boxSizing: "border-box", display: "flex", flexDirection: "column", transition: "transform .25s ease", overflowY: "auto" },
  sidebarOpen: {},
  sideStore: { textAlign: "center", padding: "10px 5px 22px", borderBottom: "1px solid #edf2f4", display: "flex", flexDirection: "column", gap: 6 },
  bigAvatar: { width: 68, height: 68, margin: "0 auto 8px", borderRadius: "50%", background: "#e8f7f5", display: "grid", placeItems: "center", fontSize: 31 },
  sideStoreName: { fontWeight: 800, overflowWrap: "anywhere" },
  sideStoreOwner: { color: "#71879a", fontSize: 13, overflowWrap: "anywhere" },
  sideStoreStatus: { color: "#16805b", background: "#e9f8f1", borderRadius: 20, padding: "5px 8px", fontSize: 11, fontStyle: "normal", margin: "4px auto 0" },
  nav: { marginTop: 6 },
  navItem: { width: "100%", border: 0, background: "transparent", textAlign: "left", padding: "13px 12px", marginTop: 6, borderRadius: 10, color: "#61778b", fontWeight: 750, cursor: "pointer" },
  navActive: { background: "#e8f7f5", color: "#078b80" },
  logout: { marginTop: "auto", width: "100%", border: "1px solid #d7e4e8", background: "#fff", color: "#087f78", borderRadius: 10, padding: 12, fontWeight: 800, cursor: "pointer" },
  main: { marginLeft: 225, padding: "34px 28px", boxSizing: "border-box", minHeight: "100vh", paddingTop: 106, overflowX: "hidden" },
  pageHeading: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, marginBottom: 24, flexWrap: "wrap" },
  eyebrow: { color: "#078b80", fontWeight: 850, letterSpacing: 1, fontSize: 11 },
  pageTitle: { margin: "10px 0 6px", color: "#17324d", fontSize: 29, overflowWrap: "anywhere" },
  pageStore: { color: "#6c8397", overflowWrap: "anywhere" },
  secure: { border: "1px solid #c7eadf", background: "#eaf9f2", color: "#167453", padding: "10px 14px", borderRadius: 10, fontWeight: 750, fontSize: 12 },
  banner: { borderRadius: 18, padding: "25px 27px", background: "linear-gradient(110deg,#078f83,#1e72aa)", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, marginBottom: 20 },
  bannerTitle: { margin: "8px 0", fontSize: 24, overflowWrap: "anywhere" },
  bannerText: { margin: 0, opacity: 0.9 },
  bannerIcon: { width: 78, height: 78, borderRadius: "50%", background: "rgba(255,255,255,.15)", display: "grid", placeItems: "center", fontSize: 36, flex: "0 0 auto" },
  stats: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 14, marginBottom: 20 },
  stat: { minWidth: 0, background: "#fff", border: "1px solid #e0eaee", borderRadius: 14, padding: 17, display: "flex", flexDirection: "column", gap: 8 },
  statIcon: { width: 31, height: 31, borderRadius: 9, background: "#e8f7f5", display: "grid", placeItems: "center", color: "#078b80" },
  statLabel: { color: "#70879a", fontSize: 12 },
  statValue: { fontSize: 22, color: "#153b57", overflowWrap: "anywhere" },
  panel: { background: "#fff", border: "1px solid #dfe9ed", borderRadius: 16, padding: 20, boxSizing: "border-box", width: "100%" },
  panelHead: { display: "flex", justifyContent: "space-between", gap: 20, alignItems: "center", marginBottom: 18, flexWrap: "wrap" },
  panelTitle: { margin: 0, fontSize: 19 },
  panelText: { color: "#72879a", margin: "6px 0 0", fontSize: 13 },
  smallButton: { border: "1px solid #cfe1e7", background: "#fff", color: "#087f78", borderRadius: 9, padding: "9px 13px", fontWeight: 800, cursor: "pointer" },
  empty: { border: "1px dashed #cfdfe5", borderRadius: 13, padding: 45, textAlign: "center", color: "#71879a" },
  orderList: { display: "grid", gap: 13 },
  order: { border: "1px solid #e0eaee", borderRadius: 13, padding: 15, minWidth: 0 },
  orderTop: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 },
  orderGrid: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 },
  orderField: { minWidth: 0, background: "#f8fbfc", border: "1px solid #edf2f4", borderRadius: 10, padding: 10, display: "flex", flexDirection: "column", gap: 5 },
  orderLabel: { color: "#72879a", fontSize: 11 },
  orderValue: { color: "#183a55", fontSize: 13, overflowWrap: "anywhere" },
  orderActions: { display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "center" },
  documentButton: { border: "1px solid #cfe1e7", background: "#eef9f7", color: "#087f78", borderRadius: 9, padding: "9px 12px", fontWeight: 800, cursor: "pointer" },
  deliveredButton: { border: 0, background: "#087f78", color: "#fff", borderRadius: 9, padding: "9px 12px", fontWeight: 800, cursor: "pointer" },
  deleteNote: { color: "#71879a", fontSize: 11 },
  viewerBackdrop: { position: "fixed", inset: 0, zIndex: 3000, background: "rgba(10,30,45,.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18, boxSizing: "border-box" },
  viewerModal: { width: "min(1000px, 96vw)", height: "min(780px, 92vh)", background: "#fff", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 18px 60px rgba(0,0,0,.28)" },
  viewerHeader: { minHeight: 54, padding: "0 12px 0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: "1px solid #e5edf0" },
  viewerTitle: { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#173b56" },
  viewerClose: { width: 38, height: 38, border: 0, borderRadius: 9, background: "#f0f5f7", color: "#173b56", fontSize: 18, cursor: "pointer", flex: "0 0 auto" },
  viewerFrame: { width: "100%", height: "100%", border: 0, background: "#f4f6f7", flex: 1 },
  imageViewerWrap: { flex: 1, minHeight: 0, overflow: "auto", padding: 14, background: "#f4f6f7", display: "flex", alignItems: "center", justifyContent: "center" },
  viewerImage: { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" },
  status: { display: "inline-block", width: "fit-content", background: "#e9f8f1", color: "#167453", borderRadius: 20, padding: "5px 9px", fontSize: 11, fontWeight: 800 },
  profileHeader: { display: "flex", alignItems: "center", gap: 16, paddingBottom: 20, marginBottom: 20, borderBottom: "1px solid #edf2f4", flexWrap: "wrap" },
  profileImage: { width: 74, height: 74, borderRadius: "50%", objectFit: "cover" },
  profileImageFallback: { width: 74, height: 74, borderRadius: "50%", background: "#e8f7f5", display: "grid", placeItems: "center", fontSize: 34 },
  infoGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 14 },
  infoItem: { border: "1px solid #e4edf0", background: "#fbfdfe", borderRadius: 12, padding: 14, minWidth: 0 },
  infoLabel: { display: "block", color: "#71879a", fontSize: 11, marginBottom: 6 },
  infoValue: { color: "#173b56", fontSize: 13, overflowWrap: "anywhere" },
  tableWrap: { width: "100%", overflowX: "auto" },
  table: { width: "100%", minWidth: 650, borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "12px 10px", fontSize: 12, color: "#71879a", borderBottom: "1px solid #e7eef1" },
  td: { padding: "13px 10px", fontSize: 13, color: "#173b56", borderBottom: "1px solid #eef3f5" },
};


if (typeof document !== "undefined" && !document.getElementById("medical-dashboard-responsive-fix")) {
  const style = document.createElement("style");
  style.id = "medical-dashboard-responsive-fix";
  style.textContent = `
    @media (max-width: 760px) {
      .medical-dashboard-topbar { padding: 0 14px !important; }
      .medical-dashboard-topbar .topBrandSmall { display: none; }
      .medical-dashboard-topbar b { font-size: 14px; }
      .medical-dashboard-menu-button { display: grid !important; place-items: center; }
      .medical-dashboard-sidebar {
        width: min(290px, 86vw) !important;
        transform: translateX(-105%);
        box-shadow: 8px 0 25px rgba(20,50,70,.14);
      }
      .medical-dashboard-sidebar.open { transform: translateX(0); }
      .medical-dashboard-main {
        margin-left: 0 !important;
        padding: 92px 12px 24px !important;
        min-width: 0 !important;
      }
      .medical-dashboard-heading { gap: 12px !important; }
      .medical-dashboard-heading h1 { font-size: 24px !important; }
      .medical-dashboard-banner { padding: 20px 18px !important; }
      .medical-dashboard-banner h2 { font-size: 20px !important; }
      .medical-dashboard-banner > div:last-child { width: 56px !important; height: 56px !important; font-size: 28px !important; }
      .medical-order-grid { grid-template-columns: 1fr !important; }
      .medical-order-grid > span { grid-column: auto !important; }
    }
    @media (max-width: 430px) {
      .medical-dashboard-topbar .storeHeader > div { display: none; }
      .medical-dashboard-topbar .topLogo { width: 38px !important; height: 38px !important; }
      .medical-dashboard-topbar { height: 64px !important; }
      .medical-dashboard-sidebar { top: 64px !important; }
      .medical-dashboard-main { padding-top: 82px !important; }
      .medical-dashboard-heading .secure { width: 100%; }
    }
  `;
  document.head.appendChild(style);
}
