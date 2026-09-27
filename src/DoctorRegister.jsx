import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  UserRound,
  Mail,
  Phone,
  LockKeyhole,
  Eye,
  EyeOff,
  Stethoscope,
  GraduationCap,
  BriefcaseMedical,
  Building2,
  MapPin,
  IndianRupee,
  Clock3,
  CalendarDays,
  ShieldCheck,
  Upload,
  CheckCircle2,
} from "lucide-react";

import "./doctor.css";

const DOCTORS_KEY = "vitascan_doctors";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function readDoctors() {
  try {
    const data = localStorage.getItem(DOCTORS_KEY);
    const doctors = data ? JSON.parse(data) : [];
    return Array.isArray(doctors) ? doctors : [];
  } catch {
    return [];
  }
}

function DoctorRegister() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    specialization: "",
    qualification: "",
    experienceYears: "",
    registrationNumber: "",
    clinicName: "",
    address: "",
    city: "",
    pincode: "",
    consultationFee: "",
    availableDays: [],
    startTime: "",
    endTime: "",
    profilePhoto: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [photoName, setPhotoName] = useState("");

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((previous) => ({
        ...previous,
        [field]: "",
      }));
    }

    setSuccess("");
  };

  const handleDayChange = (day) => {
    setForm((previous) => {
      const alreadySelected =
        previous.availableDays.includes(day);

      return {
        ...previous,
        availableDays: alreadySelected
          ? previous.availableDays.filter(
              (item) => item !== day
            )
          : [...previous.availableDays, day],
      };
    });

    if (errors.availableDays) {
      setErrors((previous) => ({
        ...previous,
        availableDays: "",
      }));
    }
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors((previous) => ({
        ...previous,
        profilePhoto:
          "Please select a valid image file.",
      }));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrors((previous) => ({
        ...previous,
        profilePhoto:
          "Profile photo must be smaller than 2 MB.",
      }));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      updateField(
        "profilePhoto",
        String(reader.result || "")
      );

      setPhotoName(file.name);
    };

    reader.readAsDataURL(file);
  };

  const validate = () => {
    const newErrors = {};

    const cleanName = form.fullName.trim();
    const cleanEmail = form.email.trim().toLowerCase();
    const cleanMobile = form.mobile.replace(/\D/g, "");
    const cleanPincode = form.pincode.replace(/\D/g, "");

    if (!cleanName) {
      newErrors.fullName = "Full name is required.";
    } else if (cleanName.length < 3) {
      newErrors.fullName =
        "Please enter your complete name.";
    }

    if (!cleanEmail) {
      newErrors.email = "Email address is required.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    ) {
      newErrors.email =
        "Please enter a valid email address.";
    }

    if (!cleanMobile) {
      newErrors.mobile =
        "Mobile number is required.";
    } else if (cleanMobile.length !== 10) {
      newErrors.mobile =
        "Mobile number must contain 10 digits.";
    }

    if (!form.password) {
      newErrors.password =
        "Password is required.";
    } else if (form.password.length < 6) {
      newErrors.password =
        "Password must contain at least 6 characters.";
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword =
        "Please confirm your password.";
    } else if (
      form.password !== form.confirmPassword
    ) {
      newErrors.confirmPassword =
        "Passwords do not match.";
    }

    if (!form.specialization.trim()) {
      newErrors.specialization =
        "Specialization is required.";
    }

    if (!form.qualification.trim()) {
      newErrors.qualification =
        "Qualification is required.";
    }

    if (
      form.experienceYears === "" ||
      Number(form.experienceYears) < 0
    ) {
      newErrors.experienceYears =
        "Please enter valid experience.";
    }

    if (!form.registrationNumber.trim()) {
      newErrors.registrationNumber =
        "Medical registration/license number is required.";
    }

    if (!form.clinicName.trim()) {
      newErrors.clinicName =
        "Clinic/Hospital name is required.";
    }

    if (!form.address.trim()) {
      newErrors.address =
        "Complete address is required.";
    }

    if (!form.city.trim()) {
      newErrors.city = "City is required.";
    }

    if (!cleanPincode) {
      newErrors.pincode = "Pincode is required.";
    } else if (cleanPincode.length !== 6) {
      newErrors.pincode =
        "Pincode must contain 6 digits.";
    }

    if (
      form.consultationFee === "" ||
      Number(form.consultationFee) < 0
    ) {
      newErrors.consultationFee =
        "Please enter a valid consultation fee.";
    }

    if (!form.availableDays.length) {
      newErrors.availableDays =
        "Select at least one available day.";
    }

    if (!form.startTime) {
      newErrors.startTime =
        "Start time is required.";
    }

    if (!form.endTime) {
      newErrors.endTime =
        "End time is required.";
    }

    if (
      form.startTime &&
      form.endTime &&
      form.startTime >= form.endTime
    ) {
      newErrors.endTime =
        "End time must be after start time.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = (event) => {
    event.preventDefault();

    setSuccess("");

    if (!validate()) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    const doctors = readDoctors();

    const cleanEmail = form.email.trim().toLowerCase();

    const existingDoctor = doctors.find(
      (doctor) =>
        String(doctor.email || "")
          .trim()
          .toLowerCase() === cleanEmail
    );

    if (existingDoctor) {
      setErrors({
        email:
          "A doctor account with this email already exists.",
      });

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    const doctor = {
      id: `DOC-${Date.now()}`,

      fullName: form.fullName.trim(),
      email: cleanEmail,
      mobile: form.mobile.replace(/\D/g, ""),

      password: form.password,

      specialization: form.specialization.trim(),
      qualification: form.qualification.trim(),

      experienceYears: Number(form.experienceYears),

      registrationNumber:
        form.registrationNumber.trim(),

      clinicName: form.clinicName.trim(),

      address: form.address.trim(),
      city: form.city.trim(),
      pincode: form.pincode.replace(/\D/g, ""),

      consultationFee: Number(form.consultationFee),

      availableDays: form.availableDays,

      startTime: form.startTime,
      endTime: form.endTime,

      profilePhoto: form.profilePhoto,

      /*
       * New registrations begin as Pending Verification.
       * An admin/backend verification system can later change
       * this to Verified.
       */
      verificationStatus: "Pending Verification",

      /*
       * Fields prepared for future Connect to Doctor integration.
       */
      rating: 0,
      reviews: 0,
      distance: null,

      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
      DOCTORS_KEY,
      JSON.stringify([...doctors, doctor])
    );

    setSuccess(
      "Doctor registration completed successfully. Redirecting to Doctor Login..."
    );

    setTimeout(() => {
      navigate("/doctor-login", {
        replace: true,
        state: {
          registeredEmail: cleanEmail,
        },
      });
    }, 1200);
  };

  return (
    <div className="doctor-register-page">

      {/* HEADER */}
      <header className="doctor-register-header">

        <Link to="/" className="doctor-register-brand">
          <div className="doctor-auth-logo">
            <Activity size={25} />
          </div>

          <div>
            <strong>VitaScan AI</strong>
            <span>Doctor Portal</span>
          </div>
        </Link>

        <Link
          to="/doctor-login"
          className="doctor-login-existing"
        >
          Already registered?
          <strong> Doctor Login</strong>
        </Link>

      </header>

      <main className="doctor-register-main">

        {/* PAGE INTRO */}
        <section className="doctor-register-intro">

          <Link to="/doctor-login" className="doctor-back-link">
            <ArrowLeft size={16} />
            Back to Doctor Login
          </Link>

          <span>VITASCAN AI DOCTOR REGISTRATION</span>

          <h1>Create Your Doctor Profile</h1>

          <p>
            Register your professional information to create
            your VitaScan AI Doctor Portal account.
          </p>

        </section>

        {success && (
          <div className="doctor-success-banner">
            <CheckCircle2 size={19} />
            {success}
          </div>
        )}

        <form
          className="doctor-register-form"
          onSubmit={handleRegister}
          noValidate
        >

          {/* =================================================
              PERSONAL INFORMATION
              ================================================= */}

          <section className="doctor-register-card">

            <div className="doctor-register-section-title">
              <div>
                <UserRound size={21} />
              </div>

              <section>
                <h2>Personal Information</h2>
                <p>Your basic professional identity.</p>
              </section>
            </div>

            <div className="doctor-form-grid">

              <FormField
                label="Full Name"
                required
                icon={<UserRound size={17} />}
                error={errors.fullName}
              >
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(event) =>
                    updateField(
                      "fullName",
                      event.target.value
                    )
                  }
                  placeholder="Dr. John Smith"
                  autoComplete="name"
                />
              </FormField>

              <FormField
                label="Doctor Email"
                required
                icon={<Mail size={17} />}
                error={errors.email}
              >
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    updateField(
                      "email",
                      event.target.value
                    )
                  }
                  placeholder="doctor@example.com"
                  autoComplete="email"
                />
              </FormField>

              <FormField
                label="Mobile Number"
                required
                icon={<Phone size={17} />}
                error={errors.mobile}
              >
                <input
                  type="tel"
                  value={form.mobile}
                  onChange={(event) =>
                    updateField(
                      "mobile",
                      event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 10)
                    )
                  }
                  placeholder="10 digit mobile number"
                  inputMode="numeric"
                  autoComplete="tel"
                />
              </FormField>

              <FormField
                label="Medical Registration / License Number"
                required
                icon={<ShieldCheck size={17} />}
                error={errors.registrationNumber}
              >
                <input
                  type="text"
                  value={form.registrationNumber}
                  onChange={(event) =>
                    updateField(
                      "registrationNumber",
                      event.target.value
                    )
                  }
                  placeholder="Medical registration number"
                />
              </FormField>

            </div>
          </section>

          {/* =================================================
              PASSWORD
              ================================================= */}

          <section className="doctor-register-card">

            <div className="doctor-register-section-title">
              <div>
                <LockKeyhole size={21} />
              </div>

              <section>
                <h2>Account Security</h2>
                <p>Set a secure password for your portal.</p>
              </section>
            </div>

            <div className="doctor-form-grid">

              <FormField
                label="Password"
                required
                icon={<LockKeyhole size={17} />}
                error={errors.password}
              >
                <div className="doctor-register-password">
                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={form.password}
                    onChange={(event) =>
                      updateField(
                        "password",
                        event.target.value
                      )
                    }
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (previous) => !previous
                      )
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </FormField>

              <FormField
                label="Confirm Password"
                required
                icon={<LockKeyhole size={17} />}
                error={errors.confirmPassword}
              >
                <div className="doctor-register-password">
                  <input
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={form.confirmPassword}
                    onChange={(event) =>
                      updateField(
                        "confirmPassword",
                        event.target.value
                      )
                    }
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (previous) => !previous
                      )
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </FormField>

            </div>
          </section>

          {/* =================================================
              PROFESSIONAL INFORMATION
              ================================================= */}

          <section className="doctor-register-card">

            <div className="doctor-register-section-title">
              <div>
                <Stethoscope size={21} />
              </div>

              <section>
                <h2>Professional Information</h2>
                <p>Your medical qualifications and experience.</p>
              </section>
            </div>

            <div className="doctor-form-grid">

              <FormField
                label="Specialization"
                required
                icon={<Stethoscope size={17} />}
                error={errors.specialization}
              >
                <input
                  type="text"
                  value={form.specialization}
                  onChange={(event) =>
                    updateField(
                      "specialization",
                      event.target.value
                    )
                  }
                  placeholder="e.g. Cardiologist"
                />
              </FormField>

              <FormField
                label="Qualification"
                required
                icon={<GraduationCap size={17} />}
                error={errors.qualification}
              >
                <input
                  type="text"
                  value={form.qualification}
                  onChange={(event) =>
                    updateField(
                      "qualification",
                      event.target.value
                    )
                  }
                  placeholder="e.g. MBBS, MD"
                />
              </FormField>

              <FormField
                label="Years of Experience"
                required
                icon={<BriefcaseMedical size={17} />}
                error={errors.experienceYears}
              >
                <input
                  type="number"
                  min="0"
                  max="70"
                  value={form.experienceYears}
                  onChange={(event) =>
                    updateField(
                      "experienceYears",
                      event.target.value
                    )
                  }
                  placeholder="e.g. 10"
                />
              </FormField>

              <FormField
                label="Consultation Fee"
                required
                icon={<IndianRupee size={17} />}
                error={errors.consultationFee}
              >
                <input
                  type="number"
                  min="0"
                  value={form.consultationFee}
                  onChange={(event) =>
                    updateField(
                      "consultationFee",
                      event.target.value
                    )
                  }
                  placeholder="e.g. 500"
                />
              </FormField>

            </div>
          </section>

          {/* =================================================
              CLINIC INFORMATION
              ================================================= */}

          <section className="doctor-register-card">

            <div className="doctor-register-section-title">
              <div>
                <Building2 size={21} />
              </div>

              <section>
                <h2>Clinic / Hospital Information</h2>
                <p>Where patients can consult you.</p>
              </section>
            </div>

            <div className="doctor-form-grid">

              <FormField
                label="Clinic / Hospital Name"
                required
                icon={<Building2 size={17} />}
                error={errors.clinicName}
              >
                <input
                  type="text"
                  value={form.clinicName}
                  onChange={(event) =>
                    updateField(
                      "clinicName",
                      event.target.value
                    )
                  }
                  placeholder="City Care Hospital"
                />
              </FormField>

              <FormField
                label="City"
                required
                icon={<MapPin size={17} />}
                error={errors.city}
              >
                <input
                  type="text"
                  value={form.city}
                  onChange={(event) =>
                    updateField(
                      "city",
                      event.target.value
                    )
                  }
                  placeholder="Pune"
                />
              </FormField>

              <FormField
                label="Pincode"
                required
                icon={<MapPin size={17} />}
                error={errors.pincode}
              >
                <input
                  type="text"
                  value={form.pincode}
                  onChange={(event) =>
                    updateField(
                      "pincode",
                      event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6)
                    )
                  }
                  placeholder="411001"
                  inputMode="numeric"
                />
              </FormField>

              <div className="doctor-form-field doctor-form-full">

                <label>
                  Complete Address
                  <span>*</span>
                </label>

                <div
                  className={`doctor-register-textarea ${
                    errors.address
                      ? "doctor-input-error"
                      : ""
                  }`}
                >
                  <MapPin size={17} />

                  <textarea
                    value={form.address}
                    onChange={(event) =>
                      updateField(
                        "address",
                        event.target.value
                      )
                    }
                    placeholder="Enter complete clinic/hospital address"
                    rows="4"
                  />
                </div>

                {errors.address && (
                  <small className="doctor-field-error">
                    {errors.address}
                  </small>
                )}

              </div>

            </div>
          </section>

          {/* =================================================
              AVAILABILITY
              ================================================= */}

          <section className="doctor-register-card">

            <div className="doctor-register-section-title">
              <div>
                <CalendarDays size={21} />
              </div>

              <section>
                <h2>Consultation Availability</h2>
                <p>Tell patients when you are available.</p>
              </section>
            </div>

            <div className="doctor-form-full">

              <label className="doctor-days-label">
                Available Days
                <span>*</span>
              </label>

              <div className="doctor-register-days">

                {DAYS.map((day) => (
                  <label
                    key={day}
                    className={
                      form.availableDays.includes(day)
                        ? "selected"
                        : ""
                    }
                  >
                    <input
                      type="checkbox"
                      checked={form.availableDays.includes(
                        day
                      )}
                      onChange={() =>
                        handleDayChange(day)
                      }
                    />

                    <span>{day.slice(0, 3)}</span>
                  </label>
                ))}

              </div>

              {errors.availableDays && (
                <small className="doctor-field-error">
                  {errors.availableDays}
                </small>
              )}

            </div>

            <div className="doctor-form-grid">

              <FormField
                label="Start Time"
                required
                icon={<Clock3 size={17} />}
                error={errors.startTime}
              >
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(event) =>
                    updateField(
                      "startTime",
                      event.target.value
                    )
                  }
                />
              </FormField>

              <FormField
                label="End Time"
                required
                icon={<Clock3 size={17} />}
                error={errors.endTime}
              >
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(event) =>
                    updateField(
                      "endTime",
                      event.target.value
                    )
                  }
                />
              </FormField>

            </div>
          </section>

          {/* =================================================
              PROFILE PHOTO
              ================================================= */}

          <section className="doctor-register-card">

            <div className="doctor-register-section-title">
              <div>
                <UserRound size={21} />
              </div>

              <section>
                <h2>Profile Photo</h2>
                <p>Add a professional photo for your doctor profile.</p>
              </section>
            </div>

            <div className="doctor-photo-upload">

              <div className="doctor-register-preview">

                {form.profilePhoto ? (
                  <img
                    src={form.profilePhoto}
                    alt="Doctor profile preview"
                  />
                ) : (
                  <UserRound size={42} />
                )}

              </div>

              <div>

                <label className="doctor-upload-button">
                  <Upload size={17} />
                  Choose Profile Photo

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                  />
                </label>

                {photoName && (
                  <p className="doctor-photo-name">
                    {photoName}
                  </p>
                )}

                <small>
                  JPG, PNG or WEBP. Maximum size: 2 MB.
                </small>

                {errors.profilePhoto && (
                  <small className="doctor-field-error">
                    {errors.profilePhoto}
                  </small>
                )}

              </div>

            </div>
          </section>

          {/* =================================================
              VERIFICATION
              ================================================= */}

          <section className="doctor-verification-info">

            <ShieldCheck size={24} />

            <div>
              <strong>Verification Status</strong>

              <p>
                Your account will initially be marked as
                <b> Pending Verification</b>. For the hackathon
                demo, this status is stored with your doctor
                profile and can later be connected to an
                administrator verification system.
              </p>
            </div>

            <span>
              Pending Verification
            </span>

          </section>

          {/* =================================================
              SUBMIT
              ================================================= */}

          <div className="doctor-register-submit">

            <button
              type="submit"
              className="doctor-primary-button doctor-register-submit-button"
            >
              <CheckCircle2 size={18} />
              Create Doctor Account
              <ArrowRight size={18} />
            </button>

            <p>
              Already have an account?{" "}
              <Link to="/doctor-login">
                Login here
              </Link>
            </p>

          </div>

        </form>

      </main>
    </div>
  );
}

/*
 * Reusable form field component.
 */
function FormField({
  label,
  required,
  icon,
  error,
  children,
}) {
  return (
    <div className="doctor-form-field">

      <label>
        {label}

        {required && <span>*</span>}
      </label>

      <div
        className={`doctor-register-input ${
          error ? "doctor-input-error" : ""
        }`}
      >
        {icon}
        {children}
      </div>

      {error && (
        <small className="doctor-field-error">
          {error}
        </small>
      )}

    </div>
  );
}

export default DoctorRegister;