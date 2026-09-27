import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  Activity,
  CalendarDays,
  Clock3,
  IndianRupee,
  MapPin,
  LogOut,
  Menu,
  UserCircle,
  Stethoscope,
  ShieldCheck,
  Phone,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Building2,
  Users,
} from "lucide-react";

import "./doctor.css";

const CURRENT_DOCTOR_KEY =
  "vitascan_current_doctor";

const APPOINTMENTS_KEY =
  "vitascan_doctor_appointments";

const DOCTOR_LOGO = "/doctor-logo.jpeg";

/*
 * This is the SAME appointment storage key
 * used by the existing VitaScan patient/payment
 * system.
 */

function normalize(value = "") {
  return String(value)
    .trim()
    .toLowerCase();
}

function readJSON(key, fallback = []) {
  try {
    const value =
      localStorage.getItem(key);

    return value
      ? JSON.parse(value)
      : fallback;
  } catch {
    return fallback;
  }
}

function getCurrentClinic() {
  return readJSON(
    CURRENT_DOCTOR_KEY,
    null
  );
}

function getAllAppointments() {
  const appointments = readJSON(
    APPOINTMENTS_KEY,
    []
  );

  return Array.isArray(appointments)
    ? appointments
    : [];
}

/*
 * Existing VitaScan appointments use:
 *
 * paymentStatus: "Paid"
 * status: "Booked"
 *
 * We intentionally show only completed
 * paid/booked appointments.
 */

function isPaidAndBooked(appointment) {
  const paymentStatus = normalize(
    appointment?.paymentStatus
  );

  const status = normalize(
    appointment?.status
  );

  return (
    paymentStatus === "paid" &&
    status === "booked"
  );
}

/*
 * The existing appointment system stores
 * the selected clinic in clinicName.
 *
 * Example:
 *
 * clinicName:
 * "Sterling Multi-speciality Hospital"
 *
 * The dashboard compares this against the
 * logged-in clinic name.
 */

function belongsToClinic(
  appointment,
  clinic
) {
  if (!appointment || !clinic) {
    return false;
  }

  const loggedInClinic =
    normalize(clinic.clinicName);

  const appointmentClinic =
    normalize(
      appointment.clinicName ||
        appointment.clinic ||
        appointment.hospitalName
    );

  if (!loggedInClinic) {
    return false;
  }

  return (
    appointmentClinic ===
    loggedInClinic
  );
}

function getClinicAppointments(
  clinic
) {
  const allAppointments =
    getAllAppointments();

  return allAppointments.filter(
    (appointment) =>
      isPaidAndBooked(
        appointment
      ) &&
      belongsToClinic(
        appointment,
        clinic
      )
  );
}

function DoctorDashboard() {
  const navigate = useNavigate();

  const [clinic, setClinic] =
    useState(null);

  const [appointments, setAppointments] =
    useState([]);

  const [activeSection, setActiveSection] =
    useState("overview");

  const [
    selectedAppointment,
    setSelectedAppointment,
  ] = useState(null);

  const [mobileMenu, setMobileMenu] =
    useState(false);

  /*
   * Check clinic login session.
   */
  useEffect(() => {
    const currentClinic =
      getCurrentClinic();

    if (!currentClinic) {
      navigate("/doctor-login", {
        replace: true,
      });

      return;
    }

    setClinic(currentClinic);
  }, [navigate]);

  /*
   * Continuously read the EXISTING
   * VitaScan appointment storage.
   *
   * No appointment is created here.
   * No payment is created here.
   * No existing appointment is changed here.
   */
  useEffect(() => {
    if (!clinic) {
      return;
    }

    const loadAppointments = () => {
      const matching =
        getClinicAppointments(
          clinic
        );

      setAppointments(matching);
    };

    loadAppointments();

    /*
     * Check for newly completed payments.
     */
    const interval =
      window.setInterval(
        loadAppointments,
        1000
      );

    /*
     * Also respond to localStorage changes.
     */
    window.addEventListener(
      "storage",
      loadAppointments
    );

    return () => {
      window.clearInterval(
        interval
      );

      window.removeEventListener(
        "storage",
        loadAppointments
      );
    };
  }, [clinic]);

  /*
   * Today's appointments.
   */
  const todayAppointments =
    useMemo(() => {
      const today =
        new Date()
          .toISOString()
          .split("T")[0];

      return appointments.filter(
        (item) =>
          String(
            item.appointmentDate ||
              ""
          ) === today
      );
    }, [appointments]);

  /*
   * Logout ONLY removes the clinic
   * session.
   *
   * It does NOT delete:
   * - patients
   * - appointments
   * - payment information
   * - clinic data
   */
  const handleLogout = () => {
    localStorage.removeItem(
      CURRENT_DOCTOR_KEY
    );

    navigate("/doctor-login", {
      replace: true,
    });
  };

  const openSection = (
    section
  ) => {
    setActiveSection(section);
    setMobileMenu(false);
  };

  if (!clinic) {
    return (
      <div className="doctor-loading">
        <div className="doctor-loading-card">
          <Activity size={32} />

          <h2>
            Loading Clinic Portal...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="doctor-dashboard-page">

      {/* TOP BAR */}
      <header className="doctor-topbar">

        <div className="doctor-brand">

          <div className="doctor-brand-icon">
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

          <div>
            <strong>
              VitaScan AI
            </strong>

            <span>
              Doctor Portal
            </span>
          </div>

        </div>

        <button
          className="doctor-mobile-menu"
          type="button"
          onClick={() =>
            setMobileMenu(
              !mobileMenu
            )
          }
        >
          {mobileMenu ? (
            <X size={22} />
          ) : (
            <Menu size={22} />
          )}
        </button>

        <div className="doctor-top-profile">

          <div className="doctor-mini-avatar">
            <Building2 size={27} />
          </div>

          <div>

            <strong>
              {clinic.clinicName}
            </strong>

            <span>
              Clinic Portal
            </span>

          </div>

        </div>

      </header>

      <div className="doctor-dashboard-layout">

        {/* SIDEBAR */}
        <aside
          className={`doctor-sidebar ${
            mobileMenu
              ? "doctor-sidebar-open"
              : ""
          }`}
        >

          <div className="doctor-sidebar-profile">

            <div className="doctor-large-avatar">
              <Building2 size={55} />
            </div>

            <h3>
              {clinic.clinicName}
            </h3>

            <p>
              Doctor / Clinic Portal
            </p>

            <span className="doctor-verification verified">

              <CheckCircle2 size={14} />

              Demo Clinic Login

            </span>

          </div>

          {/* NAVIGATION */}
          <nav className="doctor-sidebar-nav">

            <button
              className={
                activeSection ===
                "overview"
                  ? "active"
                  : ""
              }
              onClick={() =>
                openSection(
                  "overview"
                )
              }
              type="button"
            >
              <Activity size={19} />
              Overview
            </button>

            <button
              className={
                activeSection ===
                "appointments"
                  ? "active"
                  : ""
              }
              onClick={() =>
                openSection(
                  "appointments"
                )
              }
              type="button"
            >
              <CalendarDays
                size={19}
              />

              Appointments

              {appointments.length >
                0 && (
                <span className="doctor-nav-count">
                  {appointments.length}
                </span>
              )}
            </button>

            <button
              className={
                activeSection ===
                "profile"
                  ? "active"
                  : ""
              }
              onClick={() =>
                openSection(
                  "profile"
                )
              }
              type="button"
            >
              <Building2 size={19} />
              Clinic Profile
            </button>

            <button
              className={
                activeSection ===
                "availability"
                  ? "active"
                  : ""
              }
              onClick={() =>
                openSection(
                  "availability"
                )
              }
              type="button"
            >
              <Clock3 size={19} />
              Availability
            </button>

          </nav>

          {/* LOGOUT */}
          <button
            className="doctor-sidebar-logout"
            type="button"
            onClick={
              handleLogout
            }
          >
            <LogOut size={18} />
            Logout
          </button>

        </aside>

        {/* MAIN CONTENT */}
        <main className="doctor-main-content">

          {/* PAGE HEADING */}
          <div className="doctor-page-heading">

            <div>

              <span className="doctor-eyebrow">
                VitaScan AI Healthcare Portal
              </span>

              <h1>

                {activeSection ===
                  "overview" &&
                  "Clinic Overview"}

                {activeSection ===
                  "appointments" &&
                  "Patient Appointments"}

                {activeSection ===
                  "profile" &&
                  "Clinic Profile"}

                {activeSection ===
                  "availability" &&
                  "Availability"}

              </h1>

              <p>
                {clinic.clinicName}
              </p>

            </div>

            <div className="doctor-heading-status">

              <ShieldCheck size={18} />

              Secure Clinic Portal

            </div>

          </div>

          {/* ============================= */}
          {/* OVERVIEW */}
          {/* ============================= */}

          {activeSection ===
            "overview" && (
            <>

              <section className="doctor-welcome-card">

                <div>

                  <span>
                    Welcome to
                  </span>

                  <h2>
                    {clinic.clinicName}
                  </h2>

                  <p>
                    Paid appointments
                    received from VitaScan AI
                    patients are shown here
                    automatically.
                  </p>

                </div>

                <div className="doctor-welcome-icon">
                  <Stethoscope
                    size={58}
                  />
                </div>

              </section>

              {/* STATISTICS */}
              <section className="doctor-stat-grid">

                <div className="doctor-stat-card">

                  <div className="doctor-stat-icon">
                    <CalendarDays
                      size={22}
                    />
                  </div>

                  <span>
                    Total Appointments
                  </span>

                  <strong>
                    {appointments.length}
                  </strong>

                </div>

                <div className="doctor-stat-card">

                  <div className="doctor-stat-icon">
                    <Users size={22} />
                  </div>

                  <span>
                    Today's Appointments
                  </span>

                  <strong>
                    {
                      todayAppointments.length
                    }
                  </strong>

                </div>

                <div className="doctor-stat-card">

                  <div className="doctor-stat-icon">
                    <ShieldCheck
                      size={22}
                    />
                  </div>

                  <span>
                    Payment Status
                  </span>

                  <strong>
                    Paid
                  </strong>

                </div>

                <div className="doctor-stat-card">

                  <div className="doctor-stat-icon">
                    <Building2
                      size={22}
                    />
                  </div>

                  <span>
                    Clinic
                  </span>

                  <strong>
                    Active
                  </strong>

                </div>

              </section>

              {/* RECENT APPOINTMENTS */}
              <section className="doctor-content-card">

                <div className="doctor-section-header">

                  <div>

                    <h2>
                      Recent Appointments
                    </h2>

                    <p>
                      Appointments completed
                      through the VitaScan AI
                      payment system.
                    </p>

                  </div>

                  <button
                    className="doctor-outline-button"
                    type="button"
                    onClick={() =>
                      openSection(
                        "appointments"
                      )
                    }
                  >
                    View All
                  </button>

                </div>

                <AppointmentList
                  appointments={appointments.slice(
                    0,
                    5
                  )}
                  onView={
                    setSelectedAppointment
                  }
                />

              </section>

            </>
          )}

          {/* ============================= */}
          {/* APPOINTMENTS */}
          {/* ============================= */}

          {activeSection ===
            "appointments" && (
            <section className="doctor-content-card">

              <div className="doctor-section-header">

                <div>

                  <h2>
                    Patient Appointments
                  </h2>

                  <p>
                    Only paid and booked
                    appointments for{" "}
                    <strong>
                      {
                        clinic.clinicName
                      }
                    </strong>{" "}
                    are displayed.
                  </p>

                </div>

                <span className="doctor-total-badge">
                  {appointments.length}{" "}
                  Appointments
                </span>

              </div>

              <AppointmentList
                appointments={
                  appointments
                }
                onView={
                  setSelectedAppointment
                }
              />

            </section>
          )}

          {/* ============================= */}
          {/* PROFILE */}
          {/* ============================= */}

          {activeSection ===
            "profile" && (
            <ClinicProfile
              clinic={clinic}
            />
          )}

          {/* ============================= */}
          {/* AVAILABILITY */}
          {/* ============================= */}

          {activeSection ===
            "availability" && (
            <Availability
              clinic={clinic}
            />
          )}

        </main>

      </div>

      {/* APPOINTMENT MODAL */}
      {selectedAppointment && (
        <AppointmentModal
          appointment={
            selectedAppointment
          }
          onClose={() =>
            setSelectedAppointment(
              null
            )
          }
        />
      )}

    </div>
  );
}

/* =====================================================
   APPOINTMENT LIST
===================================================== */

function AppointmentList({
  appointments,
  onView,
}) {
  if (!appointments.length) {
    return (
      <div className="doctor-empty-state">

        <CalendarDays size={44} />

        <h3>
          No paid appointments yet
        </h3>

        <p>
          When a patient completes an
          appointment payment for this
          clinic, the appointment will
          appear here automatically.
        </p>

      </div>
    );
  }

  return (
    <div className="doctor-appointment-list">

      {appointments.map(
        (item, index) => (
          <article
            className="doctor-appointment-card"
            key={
              item.id ||
              item.appointmentId ||
              index
            }
          >

            <div className="doctor-appointment-card-top">

              <div>

                <span>
                  Appointment ID
                </span>

                <strong>
                  {item.id ||
                    item.appointmentId ||
                    "N/A"}
                </strong>

              </div>

              <span className="doctor-paid-status">

                <CheckCircle2
                  size={15}
                />

                {item.paymentStatus ||
                  "Paid"}

              </span>

            </div>

            <div className="doctor-appointment-grid">

              <div>
                <span>
                  Patient Name
                </span>

                <strong>
                  {item.patientName ||
                    "Not available"}
                </strong>
              </div>

              <div>
                <span>
                  Patient Mobile
                </span>

                <strong>
                  {item.mobile ||
                    item.patientMobile ||
                    "N/A"}
                </strong>
              </div>

              <div>
                <span>
                  Patient Age
                </span>

                <strong>
                  {item.age ||
                    "N/A"}
                </strong>
              </div>

              <div>
                <span>
                  Appointment Date
                </span>

                <strong>
                  {
                    item.appointmentDate ||
                    "N/A"
                  }
                </strong>
              </div>

              <div>
                <span>
                  Appointment Time
                </span>

                <strong>
                  {
                    item.appointmentTime ||
                    "N/A"
                  }
                </strong>
              </div>

              <div>
                <span>
                  Appointment Status
                </span>

                <strong>
                  {item.status ||
                    item.appointmentStatus ||
                    "Booked"}
                </strong>
              </div>

              <div className="doctor-full-width">

                <span>
                  Clinic / Hospital
                </span>

                <strong>
                  {item.clinicName ||
                    item.clinic ||
                    item.hospitalName ||
                    "N/A"}
                </strong>

              </div>

              <div className="doctor-full-width">

                <span>
                  Address
                </span>

                <strong>
                  {item.address ||
                    "N/A"}
                </strong>

              </div>

              <div className="doctor-full-width">

                <span>
                  Patient Problem /
                  Description
                </span>

                <p>
                  {item.description ||
                    item.problem ||
                    item.patientProblem ||
                    "No description provided."}
                </p>

              </div>

              <div>

                <span>
                  Payment Status
                </span>

                <strong className="doctor-payment-paid">
                  {item.paymentStatus ||
                    "Paid"}
                </strong>

              </div>

            </div>

            {item.documentData && (
              <div className="doctor-document-badge">
                <FileText size={15} />
                Medical document attached
              </div>
            )}

            <button
              className="doctor-view-button"
              type="button"
              onClick={() =>
                onView(item)
              }
            >
              <FileText
                size={16}
              />

              View Appointment
            </button>

          </article>
        )
      )}

    </div>
  );
}

/* =====================================================
   CLINIC PROFILE
===================================================== */

function ClinicProfile({
  clinic,
}) {
  const fields = [
    [
      "Clinic / Hospital",
      clinic.clinicName,
    ],
    [
      "Doctor / Portal",
      "Clinic Doctor",
    ],
    [
      "Specialization",
      clinic.specialization ||
        "Medical Professional",
    ],
    [
      "Qualification",
      clinic.qualification ||
        "Not provided",
    ],
    [
      "City",
      clinic.city ||
        "Not provided",
    ],
    [
      "Pincode",
      clinic.pincode ||
        "Not provided",
    ],
    [
      "Consultation Fee",
      clinic.consultationFee
        ? `₹${clinic.consultationFee}`
        : "Not provided",
    ],
    [
      "Verification",
      clinic.verificationStatus ||
        "Demo Clinic",
    ],
  ];

  return (
    <section className="doctor-profile-section">

      <div className="doctor-profile-hero">

        <div className="doctor-profile-photo">
          <Building2 size={70} />
        </div>

        <div>

          <span>
            Clinic / Hospital
          </span>

          <h2>
            {clinic.clinicName}
          </h2>

          <p>
            VitaScan AI Doctor Portal
          </p>

        </div>

        <div className="doctor-profile-verification">

          <ShieldCheck size={18} />

          Clinic Portal Active

        </div>

      </div>

      <div className="doctor-profile-grid">

        {fields.map(
          ([label, value]) => (
            <div
              className="doctor-info-card"
              key={label}
            >

              <span>
                {label}
              </span>

              <strong>
                {value ||
                  "Not provided"}
              </strong>

            </div>
          )
        )}

      </div>

    </section>
  );
}

/* =====================================================
   AVAILABILITY
===================================================== */

function Availability({
  clinic,
}) {
  const days = Array.isArray(
    clinic.availableDays
  )
    ? clinic.availableDays
    : [];

  return (
    <section className="doctor-availability-section">

      <div className="doctor-content-card">

        <div className="doctor-section-header">

          <div>

            <h2>
              Consultation Availability
            </h2>

            <p>
              Availability information
              associated with this clinic.
            </p>

          </div>

          <Clock3 size={25} />

        </div>

        <div className="doctor-availability-card">

          <div>

            <span>
              Available Days
            </span>

            <div className="doctor-days">

              {days.length ? (
                days.map(
                  (day) => (
                    <span
                      key={day}
                    >
                      {day}
                    </span>
                  )
                )
              ) : (
                <span>
                  Contact clinic
                  for availability
                </span>
              )}

            </div>

          </div>

          <div className="doctor-time-box">

            <Clock3 size={21} />

            <div>

              <span>
                Consultation Time
              </span>

              <strong>

                {clinic.startTime ||
                  "--:--"}

                {" - "}

                {clinic.endTime ||
                  "--:--"}

              </strong>

            </div>

          </div>

        </div>

        <div className="doctor-fee-card">

          <IndianRupee
            size={23}
          />

          <div>

            <span>
              Consultation Fee
            </span>

            <strong>
              ₹
              {clinic.consultationFee ||
                "Not provided"}
            </strong>

          </div>

        </div>

      </div>

    </section>
  );
}

/* =====================================================
   APPOINTMENT MODAL
===================================================== */

function AppointmentModal({
  appointment,
  onClose,
}) {
  return (
    <div
      className="doctor-modal-overlay"
      onClick={onClose}
    >

      <div
        className="doctor-modal"
        onClick={(event) =>
          event.stopPropagation()
        }
      >

        <div className="doctor-modal-header">

          <div>

            <span>
              Appointment Details
            </span>

            <h2>
              {appointment.patientName ||
                "Patient"}
            </h2>

          </div>

          <button
            type="button"
            onClick={onClose}
          >
            <X size={20} />
          </button>

        </div>

        <div className="doctor-modal-grid">

          <div>

            <span>
              Appointment ID
            </span>

            <strong>
              {appointment.id ||
                appointment.appointmentId ||
                "N/A"}
            </strong>

          </div>

          <div>

            <span>
              Patient Mobile
            </span>

            <strong>
              {appointment.mobile ||
                appointment.patientMobile ||
                "N/A"}
            </strong>

          </div>

          <div>

            <span>
              Patient Age
            </span>

            <strong>
              {appointment.age ||
                "N/A"}
            </strong>

          </div>

          <div>

            <span>
              Appointment Date
            </span>

            <strong>
              {appointment.appointmentDate ||
                "N/A"}
            </strong>

          </div>

          <div>

            <span>
              Appointment Time
            </span>

            <strong>
              {appointment.appointmentTime ||
                "N/A"}
            </strong>

          </div>

          <div>

            <span>
              Payment Status
            </span>

            <strong className="doctor-modal-paid">
              {appointment.paymentStatus ||
                "Paid"}
            </strong>

          </div>

          <div className="doctor-modal-full">

            <span>
              Appointment Status
            </span>

            <strong>
              {appointment.status ||
                appointment.appointmentStatus ||
                "Booked"}
            </strong>

          </div>

          <div className="doctor-modal-full">

            <span>
              Clinic / Hospital
            </span>

            <strong>
              {appointment.clinicName ||
                appointment.clinic ||
                appointment.hospitalName ||
                "N/A"}
            </strong>

          </div>

          <div className="doctor-modal-full">

            <span>
              Address
            </span>

            <strong>
              {appointment.address ||
                "N/A"}
            </strong>

          </div>

          <div className="doctor-modal-full">

            <span>
              Patient Problem /
              Description
            </span>

            <p>
              {appointment.description ||
                appointment.problem ||
                appointment.patientProblem ||
                "No description provided."}
            </p>

          </div>

          <div className="doctor-modal-full doctor-document-section">

            <span>
              Medical Document / Report
            </span>

            {appointment.documentData ? (
              <div className="doctor-document-card">
                <div className="doctor-document-info">
                  <FileText size={22} />
                  <div>
                    <strong>
                      {appointment.documentName || "Medical Document"}
                    </strong>
                    <small>
                      {appointment.documentType || "Uploaded patient document"}
                    </small>
                  </div>
                </div>

                <div className="doctor-document-preview">
                  {String(appointment.documentType || "").startsWith("image/") ? (
                    <img
                      src={appointment.documentData}
                      alt={appointment.documentName || "Patient medical document"}
                    />
                  ) : (
                    <div className="doctor-pdf-preview">
                      <FileText size={42} />
                      <strong>PDF Medical Report</strong>
                    </div>
                  )}
                </div>

                <a
                  className="doctor-document-view-button"
                  href={appointment.documentData}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileText size={16} />
                  View / Open Document
                </a>
              </div>
            ) : (
              <div className="doctor-document-empty">
                <FileText size={22} />
                <p>No medical document was attached to this appointment.</p>
              </div>
            )}

          </div>

        </div>

        <button
          className="doctor-modal-close"
          type="button"
          onClick={onClose}
        >
          Close
        </button>

      </div>

    </div>
  );
}

export default DoctorDashboard;