import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pill, ArrowLeft } from "lucide-react";

const MEDICAL_STORES_KEY = "vitascan_medical_stores";
const FIXED_PASSWORD = "admin@1234";

function readStores() {
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

function saveStores(stores) {
  try {
    localStorage.setItem(
      MEDICAL_STORES_KEY,
      JSON.stringify(stores)
    );

    return true;
  } catch (error) {
    console.error("Unable to save medical stores:", error);
    return false;
  }
}

export default function MedicalRegister() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    storeName: "",
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
    availableDays: "",
    homeDelivery: false,
    deliveryRadius: "",
    contactNumber: "",
    profilePhoto: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (name, value) => {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handlePhoto = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid store logo/profile image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Store logo must be 2 MB or smaller.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      update("profilePhoto", String(reader.result || ""));
      setError("");
    };

    reader.onerror = () => {
      setError("Unable to read the store logo.");
    };

    reader.readAsDataURL(file);
  };

  const submit = (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const required = [
      ["storeName", "Medical Store / Pharmacy Name"],
      ["ownerName", "Owner / Pharmacist Full Name"],
      ["email", "Email"],
      ["mobile", "Mobile Number"],
      ["qualification", "Pharmacist Qualification"],
      ["licenseNumber", "Pharmacy / Drug License Number"],
      ["gstNumber", "GST Number"],
      ["address", "Complete Address"],
      ["city", "City"],
      ["pincode", "Pincode"],
      ["openingTime", "Opening Time"],
      ["closingTime", "Closing Time"],
      ["availableDays", "Available Days"],
      ["contactNumber", "Contact Number"],
    ];

    for (const [key, label] of required) {
      if (!String(form[key] || "").trim()) {
        setError(`${label} is required.`);
        return;
      }
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email.trim()
      )
    ) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(form.mobile.trim())) {
      setError(
        "Please enter a valid 10-digit Indian mobile number."
      );
      return;
    }

    if (!/^\d{6}$/.test(form.pincode.trim())) {
      setError("Pincode must contain exactly 6 digits.");
      return;
    }

    if (
      !/^[6-9]\d{9}$/.test(
        form.contactNumber.trim()
      )
    ) {
      setError(
        "Please enter a valid 10-digit contact number."
      );
      return;
    }

    if (form.licenseNumber.trim().length < 4) {
      setError(
        "Please enter a valid Pharmacy / Drug License Number."
      );
      return;
    }

    if (form.gstNumber.trim().length < 5) {
      setError("Please enter a valid GST Number.");
      return;
    }

    if (
      form.homeDelivery &&
      (!form.deliveryRadius ||
        Number(form.deliveryRadius) <= 0)
    ) {
      setError(
        "Enter a valid delivery radius when home delivery is available."
      );
      return;
    }

    if (form.openingTime === form.closingTime) {
      setError(
        "Opening time and closing time cannot be the same."
      );
      return;
    }

    const availableDays = form.availableDays
      .split(",")
      .map((day) => day.trim())
      .filter(Boolean);

    if (availableDays.length === 0) {
      setError("Please enter at least one available day.");
      return;
    }

    try {
      setSaving(true);

      const stores = readStores();

      const duplicateEmail = stores.some(
        (store) =>
          String(store.email || "")
            .trim()
            .toLowerCase() ===
          form.email.trim().toLowerCase()
      );

      if (duplicateEmail) {
        setError(
          "A medical store with this email is already registered."
        );
        return;
      }

      const duplicateStoreName = stores.some(
        (store) =>
          String(store.storeName || "")
            .trim()
            .toLowerCase() ===
          form.storeName.trim().toLowerCase()
      );

      if (duplicateStoreName) {
        setError(
          "A medical store with this name is already registered."
        );
        return;
      }

      const store = {
        id: `MED-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)
          .toUpperCase()}`,

        storeName: form.storeName.trim(),

        ownerName: form.ownerName.trim(),

        email: form.email.trim().toLowerCase(),

        mobile: form.mobile.trim(),

        // Fixed demo password for every medical store.
        password: FIXED_PASSWORD,

        qualification: form.qualification.trim(),

        licenseNumber: form.licenseNumber.trim(),

        gstNumber: form.gstNumber.trim(),

        address: form.address.trim(),

        city: form.city.trim(),

        pincode: form.pincode.trim(),

        openingTime: form.openingTime,

        closingTime: form.closingTime,

        availableDays,

        homeDelivery: Boolean(form.homeDelivery),

        deliveryRadius: form.homeDelivery
          ? Number(form.deliveryRadius)
          : 0,

        contactNumber: form.contactNumber.trim(),

        profilePhoto: form.profilePhoto || "",

        rating: 0,

        reviews: 0,

        distance: null,

        verificationStatus: "Pending Verification",

        createdAt: new Date().toISOString(),
      };

      const updatedStores = [
        ...stores,
        store,
      ];

      const saved = saveStores(updatedStores);

      if (!saved) {
        setError(
          "Unable to save the registration. Please check your browser storage."
        );
        return;
      }

      setSuccess(
        `Registration successful for ${store.storeName}. You can now log in using the store name and ${FIXED_PASSWORD}.`
      );

      setTimeout(() => {
        navigate("/medical-login");
      }, 1200);
    } catch (err) {
      console.error(
        "Medical store registration error:",
        err
      );

      setError(
        "Unable to save the registration. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main
      className="clinic-auth-page medical-auth-page"
      style={{
        minHeight: "100vh",
        padding: "40px 20px",
        boxSizing: "border-box",
      }}
    >
      <div
        className="clinic-auth-card"
        style={{
          maxWidth: 820,
          margin: "0 auto",
        }}
      >
        <div className="clinic-auth-icon">
          <img
            src="/medical-logo.jpg"
            alt="VitaScan AI Medical Store"
            style={{
              width: 48,
              height: 48,
              objectFit: "contain",
              borderRadius: 10,
            }}
          />
        </div>

        <h1>Medical Store Registration</h1>

        <p>
          Register your pharmacy. The demo login password is
          fixed as <strong>{FIXED_PASSWORD}</strong>.
        </p>

        <form
          className="clinic-auth-form"
          onSubmit={submit}
        >
          <div className="appointment-grid">
            <label>
              Medical Store / Pharmacy Name *
              <input
                type="text"
                value={form.storeName}
                onChange={(e) =>
                  update(
                    "storeName",
                    e.target.value
                  )
                }
                placeholder="Enter medical store name"
              />
            </label>

            <label>
              Owner / Pharmacist Full Name *
              <input
                type="text"
                value={form.ownerName}
                onChange={(e) =>
                  update(
                    "ownerName",
                    e.target.value
                  )
                }
                placeholder="Enter owner/pharmacist name"
              />
            </label>

            <label>
              Email *
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  update(
                    "email",
                    e.target.value
                  )
                }
                placeholder="example@email.com"
              />
            </label>

            <label>
              Mobile Number *
              <input
                type="tel"
                inputMode="numeric"
                value={form.mobile}
                maxLength={10}
                onChange={(e) =>
                  update(
                    "mobile",
                    e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10)
                  )
                }
                placeholder="10-digit mobile number"
              />
            </label>

            <label>
              Pharmacist Qualification *
              <input
                type="text"
                value={form.qualification}
                onChange={(e) =>
                  update(
                    "qualification",
                    e.target.value
                  )
                }
                placeholder="e.g. B.Pharm"
              />
            </label>

            <label>
              Pharmacy / Drug License Number *
              <input
                type="text"
                value={form.licenseNumber}
                onChange={(e) =>
                  update(
                    "licenseNumber",
                    e.target.value
                  )
                }
                placeholder="Enter license number"
              />
            </label>

            <label>
              GST Number *
              <input
                type="text"
                value={form.gstNumber}
                onChange={(e) =>
                  update(
                    "gstNumber",
                    e.target.value.toUpperCase()
                  )
                }
                placeholder="Enter GST number"
              />
            </label>

            <label>
              City *
              <input
                type="text"
                value={form.city}
                onChange={(e) =>
                  update(
                    "city",
                    e.target.value
                  )
                }
                placeholder="Enter city"
              />
            </label>

            <label>
              Pincode *
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={form.pincode}
                onChange={(e) =>
                  update(
                    "pincode",
                    e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 6)
                  )
                }
                placeholder="6-digit pincode"
              />
            </label>

            <label>
              Contact Number *
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={form.contactNumber}
                onChange={(e) =>
                  update(
                    "contactNumber",
                    e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10)
                  )
                }
                placeholder="10-digit contact number"
              />
            </label>

            <label>
              Opening Time *
              <input
                type="time"
                value={form.openingTime}
                onChange={(e) =>
                  update(
                    "openingTime",
                    e.target.value
                  )
                }
              />
            </label>

            <label>
              Closing Time *
              <input
                type="time"
                value={form.closingTime}
                onChange={(e) =>
                  update(
                    "closingTime",
                    e.target.value
                  )
                }
              />
            </label>

            <label>
              Available Days *
              <small
                style={{
                  display: "block",
                  marginTop: 4,
                }}
              >
                Use comma-separated days.
              </small>

              <input
                type="text"
                value={form.availableDays}
                onChange={(e) =>
                  update(
                    "availableDays",
                    e.target.value
                  )
                }
                placeholder="Mon,Tue,Wed,Thu,Fri,Sat,Sun"
              />
            </label>

            <label>
              Delivery Radius (km)

              <input
                type="number"
                min="0"
                step="0.5"
                value={form.deliveryRadius}
                onChange={(e) =>
                  update(
                    "deliveryRadius",
                    e.target.value
                  )
                }
                disabled={!form.homeDelivery}
                placeholder="e.g. 5"
              />
            </label>

            <label className="appointment-full">
              Complete Address *

              <textarea
                rows="3"
                value={form.address}
                onChange={(e) =>
                  update(
                    "address",
                    e.target.value
                  )
                }
                placeholder="Enter complete medical store address"
              />
            </label>

            <label
              className="appointment-full"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <input
                type="checkbox"
                checked={form.homeDelivery}
                onChange={(e) =>
                  update(
                    "homeDelivery",
                    e.target.checked
                  )
                }
              />

              <span>
                Home Delivery Available
              </span>
            </label>

            <label className="appointment-full">
              Profile Photo / Store Logo

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handlePhoto}
              />

              {form.profilePhoto && (
                <div
                  style={{
                    marginTop: 10,
                  }}
                >
                  <img
                    src={form.profilePhoto}
                    alt="Store preview"
                    style={{
                      width: 80,
                      height: 80,
                      objectFit: "cover",
                      borderRadius: 12,
                      border: "1px solid #d9e5ec",
                    }}
                  />
                </div>
              )}
            </label>
          </div>

          <div className="clinic-login-note">
            <strong>
              Medical Store Login Password
            </strong>

            <span>{FIXED_PASSWORD}</span>

            <small>
              Every registered medical store uses
              this same demo password. The store name
              is used as the login ID.
            </small>
          </div>

          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          {success && (
            <div
              className="booking-success"
              style={{
                padding: 16,
              }}
            >
              {success}
            </div>
          )}

          <button
            className="clinic-login-btn"
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : "Submit Medical Store"}
          </button>
        </form>

        <button
          type="button"
          onClick={() =>
            navigate("/medical-login")
          }
          style={{
            marginTop: 14,
            border: 0,
            background: "transparent",
            color: "#315ee8",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          <ArrowLeft
            size={15}
            style={{
              verticalAlign: "middle",
              marginRight: 5,
            }}
          />

          Back to Medical Login
        </button>
      </div>
    </main>
  );
}