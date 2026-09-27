import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  Eye,
  EyeOff,
  LockKeyhole,
  ArrowLeft,
  ShieldCheck,
  Stethoscope,
  Building2,
} from "lucide-react";

import "./doctor.css";

const CURRENT_DOCTOR_KEY = "vitascan_current_doctor";
const APPOINTMENTS_KEY = "vitascan_doctor_appointments";

// Demo password for the Doctor/Clinic Portal.
const CLINIC_PASSWORD = "admin@1234";
const DOCTOR_LOGO = "/doctor-logo.jpeg";

function normalize(value = "") {
  return String(value).trim().toLowerCase();
}

function readAppointments() {
  try {
    const data = localStorage.getItem(APPOINTMENTS_KEY);
    const appointments = data ? JSON.parse(data) : [];

    return Array.isArray(appointments) ? appointments : [];
  } catch {
    return [];
  }
}

function getClinicNames() {
  const appointments = readAppointments();

  const names = appointments
    .map((item) => item?.clinicName)
    .filter(Boolean)
    .map((name) => String(name).trim());

  return [...new Set(names)].sort((a, b) =>
    a.localeCompare(b)
  );
}

function DoctorLogin() {
  const navigate = useNavigate();

  const [clinicName, setClinicName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  const [clinicNames, setClinicNames] = useState(
    getClinicNames
  );

  useEffect(() => {
    const currentDoctor = localStorage.getItem(
      CURRENT_DOCTOR_KEY
    );

    if (currentDoctor) {
      navigate("/doctor-dashboard", {
        replace: true,
      });
    }

    const refreshClinics = () => {
      setClinicNames(getClinicNames());
    };

    refreshClinics();

    const interval = window.setInterval(
      refreshClinics,
      1000
    );

    window.addEventListener(
      "storage",
      refreshClinics
    );

    return () => {
      window.clearInterval(interval);
      window.removeEventListener(
        "storage",
        refreshClinics
      );
    };
  }, [navigate]);

  const clinicOptions = useMemo(
    () => clinicNames,
    [clinicNames]
  );

  const validate = () => {
    const newErrors = {};

    if (!clinicName.trim()) {
      newErrors.clinicName =
        "Clinic / Hospital name is required.";
    }

    if (!password) {
      newErrors.password =
        "Password is required.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = (event) => {
    event.preventDefault();

    setLoginError("");

    if (!validate()) {
      return;
    }

    const cleanClinicName =
      clinicName.trim();

    if (password !== CLINIC_PASSWORD) {
      setLoginError(
        "Incorrect password. Please enter the clinic portal password."
      );
      return;
    }

    setLoading(true);

    /*
     * No doctor account is required for this demo.
     *
     * The clinic name itself identifies which clinic
     * the doctor is logging into.
     */
    const clinicSession = {
      id: `clinic-${normalize(cleanClinicName)
        .replace(/[^a-z0-9]+/g, "-")}`,
      fullName: "Clinic Doctor",
      clinicName: cleanClinicName,
      password: CLINIC_PASSWORD,
      specialization: "Medical Professional",
      qualification: "Medical Professional",
      experienceYears: "",
      registrationNumber: "",
      address: "",
      city: "",
      pincode: "",
      consultationFee: "",
      availableDays: [],
      startTime: "",
      endTime: "",
      profilePhoto: "",
      verificationStatus: "Demo Clinic",
      loginType: "clinic",
    };

    localStorage.setItem(
      CURRENT_DOCTOR_KEY,
      JSON.stringify(clinicSession)
    );

    setLoading(false);

    navigate("/doctor-dashboard", {
      replace: true,
    });
  };

  return (
    <div className="doctor-auth-page">
      <div className="doctor-auth-container">

        {/* LEFT BRANDING PANEL */}
        <section className="doctor-auth-brand">
          <div className="doctor-auth-brand-content">

            <Link
              to="/"
              className="doctor-back-link"
            >
              <ArrowLeft size={17} />
              Back to VitaScan AI
            </Link>

            <div className="doctor-auth-logo">
              <img
                src={DOCTOR_LOGO}
                alt="Doctor logo"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  borderRadius: "50%",
                }}
              />
            </div>

            <span className="doctor-auth-label">
              VITASCAN AI
            </span>

            <h1>
              Doctor & Clinic
              <br />
              Healthcare Portal
            </h1>

            <p>
              Access appointments received from
              VitaScan AI patients after successful
              appointment payment.
            </p>

            <div className="doctor-auth-feature">
              <div>
                <Building2 size={20} />
              </div>

              <section>
                <strong>
                  Any Registered Clinic
                </strong>

                <span>
                  Login using the clinic name
                  selected by the patient.
                </span>
              </section>
            </div>

            <div className="doctor-auth-feature">
              <div>
                <ShieldCheck size={20} />
              </div>

              <section>
                <strong>
                  Paid Appointments
                </strong>

                <span>
                  Only completed and booked
                  appointments are displayed.
                </span>
              </section>
            </div>

            <div className="doctor-auth-feature">
              <div>
                <Stethoscope size={20} />
              </div>

              <section>
                <strong>
                  Clinic-specific Data
                </strong>

                <span>
                  Each clinic sees only its own
                  patient appointments.
                </span>
              </section>
            </div>

          </div>
        </section>

        {/* LOGIN PANEL */}
        <section className="doctor-auth-form-section">
          <div className="doctor-auth-card">

            <div className="doctor-mobile-logo">
              <div className="doctor-auth-logo">
                <img
                  src={DOCTOR_LOGO}
                  alt="Doctor logo"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    borderRadius: "50%",
                  }}
                />
              </div>

              <strong>
                VitaScan AI
              </strong>
            </div>

            <div className="doctor-form-heading">
              <span>
                DOCTOR / CLINIC PORTAL
              </span>

              <h2>
                Clinic Login
              </h2>

              <p>
                Login to view appointments
                received by your clinic.
              </p>
            </div>

            {loginError && (
              <div className="doctor-error-banner">
                {loginError}
              </div>
            )}

            <form
              onSubmit={handleLogin}
              noValidate
            >

              {/* CLINIC NAME */}
              <div className="doctor-input-group">

                <label htmlFor="clinic-name">
                  Clinic / Hospital Name
                </label>

                <div
                  className={`doctor-input-wrapper ${
                    errors.clinicName
                      ? "doctor-input-error"
                      : ""
                  }`}
                >
                  <Building2 size={18} />

                  <input
                    id="clinic-name"
                    type="text"
                    list="clinic-options"
                    value={clinicName}
                    onChange={(event) => {
                      setClinicName(
                        event.target.value
                      );

                      if (errors.clinicName) {
                        setErrors(
                          (previous) => ({
                            ...previous,
                            clinicName: "",
                          })
                        );
                      }

                      setLoginError("");
                    }}
                    placeholder="Enter clinic / hospital name"
                    autoComplete="organization"
                  />
                </div>

                <datalist id="clinic-options">
                  {clinicOptions.map(
                    (name) => (
                      <option
                        value={name}
                        key={name}
                      />
                    )
                  )}
                </datalist>

                {errors.clinicName && (
                  <small className="doctor-field-error">
                    {errors.clinicName}
                  </small>
                )}

              </div>

              {/* PASSWORD */}
              <div className="doctor-input-group">

                <label htmlFor="clinic-password">
                  Password
                </label>

                <div
                  className={`doctor-input-wrapper ${
                    errors.password
                      ? "doctor-input-error"
                      : ""
                  }`}
                >
                  <LockKeyhole size={18} />

                  <input
                    id="clinic-password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(event) => {
                      setPassword(
                        event.target.value
                      );

                      if (errors.password) {
                        setErrors(
                          (previous) => ({
                            ...previous,
                            password: "",
                          })
                        );
                      }

                      setLoginError("");
                    }}
                    placeholder="Enter clinic password"
                    autoComplete="current-password"
                  />

                  <button
                    type="button"
                    className="doctor-password-toggle"
                    onClick={() =>
                      setShowPassword(
                        (previous) =>
                          !previous
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                {errors.password && (
                  <small className="doctor-field-error">
                    {errors.password}
                  </small>
                )}

              </div>

              <button
                type="submit"
                className="doctor-primary-button"
                disabled={loading}
              >
                {loading ? (
                  "Signing in..."
                ) : (
                  <>
                    <LockKeyhole size={17} />
                    Clinic Login
                  </>
                )}
              </button>

            </form>

            <div className="doctor-demo-password">
              <ShieldCheck size={15} />

              <span>
                Demo password:
              </span>

              <strong>
                admin@1234
              </strong>
            </div>

            <p className="doctor-login-help">
              Enter the exact clinic name shown
              in Connect to Doctor.
            </p>

            <Link
              to="/doctor-register"
              className="doctor-register-link"
            >
              Doctor Registration
            </Link>

            <p className="doctor-security-note">
              <ShieldCheck size={14} />
              Clinic session remains active
              until logout.
            </p>

          </div>
        </section>

      </div>
    </div>
  );
}

export default DoctorLogin;