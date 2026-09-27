import DoctorLogin from "./DoctorLogin";
import DoctorRegister from "./DoctorRegister";
import DoctorDashboard from "./DoctorDashboard";
import MedicalRegister from "./MedicalRegister";
import MedicalLogin from "./MedicalLogin";
import MedicalDashboard from "./MedicalDashboard";
import MedicalStorePage from "./medical";


import { GoogleGenAI } from "@google/genai";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  useNavigate,
  useLocation,
} from "react-router-dom";

import {
  FileText,
  HeartPulse,
  Upload,
  ShieldCheck,
  Menu,
  X,
  Stethoscope,
  Pill,
  MapPin,
  Star,
  Clock,
  Search,
  ExternalLink,
  Mail,
  UserCircle,
  LogOut,
  History,
  QrCode,
  Lock,
} from "lucide-react";

import "./styles.css";


// =====================================================
// LOCAL USER / SESSION STORAGE
// =====================================================

const USERS_KEY = "vitascan_users";
const CURRENT_USER_KEY = "vitascan_current_user";
const REPORT_PREFIX = "vitascan_recent_";

function readUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); }
  catch { return []; }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function userReportKey(user) {
  return REPORT_PREFIX + (user?.email || "guest").toLowerCase();
}

function readRecentReports(user) {
  try { return JSON.parse(localStorage.getItem(userReportKey(user)) || "[]"); }
  catch { return []; }
}

function saveRecentReport(user, fileName, report) {
  if (!user || !report) return null;
  const history = readRecentReports(user);
  const record = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fileName: fileName || "Blood Report",
    date: new Date().toISOString(),
    report,
    healthRecordAddedAt: new Date().toISOString(),
  };
  history.unshift(record);
  localStorage.setItem(userReportKey(user), JSON.stringify(history.slice(0, 20)));
  return record;
}

function userMatchesRecord(record, user) {
  if (!record || !user) return false;
  const targetEmail = String(user.email || "").trim().toLowerCase();
  const targetName = String(user.name || "").trim().toLowerCase();
  const recordEmail = String(record.patientEmail || record.email || "").trim().toLowerCase();
  const recordName = String(record.patientName || record.name || "").trim().toLowerCase();
  return (targetEmail && recordEmail === targetEmail) || (targetName && recordName === targetName);
}

function getPatientHealthSnapshot(user) {
  const reports = readRecentReports(user);
  const visits = readAppointments().filter(item => userMatchesRecord(item, user));
  const prescriptions = readMedicalOrders().filter(item => userMatchesRecord(item, user));

  const activity = [
    ...reports.map(item => ({
      id: `report-${item.id}`,
      type: "Blood Report",
      date: item.date,
      detail: "Analyzed successfully",
      icon: FileText,
    })),
    ...visits.map(item => ({
      id: `visit-${item.id}`,
      type: "Doctor Visit",
      date: item.createdAt || item.appointmentDate,
      detail: item.description || "General consultation",
      icon: Stethoscope,
    })),
    ...prescriptions.map(item => ({
      id: `prescription-${item.id}`,
      type: "Prescription",
      date: item.createdAt,
      detail: "Prescription added",
      icon: Pill,
    })),
  ].filter(item => item.date).sort((a, b) => new Date(b.date) - new Date(a.date));

  return { reports, visits, prescriptions, activity };
}

function getDiseaseTrendSnapshot(reports) {
  const definitions = [
    { key: "anemia", label: "Anemia-related markers", terms: ["anemia", "haemoglobin", "hemoglobin", "hb", "iron", "ferritin"] },
    { key: "diabetes", label: "Diabetes-related markers", terms: ["diabetes", "glucose", "hba1c", "blood sugar", "fasting sugar", "sugar"] },
    { key: "cholesterol", label: "Cholesterol / lipid markers", terms: ["cholesterol", "ldl", "hdl", "triglyceride", "lipid"] },
    { key: "thyroid", label: "Thyroid-related markers", terms: ["thyroid", "tsh", "t3", "t4"] },
    { key: "vitamins", label: "Vitamin-related markers", terms: ["vitamin d", "vitamin b12", "b12", "vitamin"] },
    { key: "liver", label: "Liver-related markers", terms: ["liver", "alt", "ast", "bilirubin", "sgpt", "sgot"] },
    { key: "kidney", label: "Kidney-related markers", terms: ["kidney", "creatinine", "urea", "egfr"] },
  ];

  return definitions.map((definition) => {
    const matched = reports.filter((report) => {
      const text = typeof report.report === "string"
        ? report.report
        : JSON.stringify(report.report || "");
      const lower = text.toLowerCase();
      return definition.terms.some((term) => lower.includes(term));
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    if (!matched.length) return null;

    return {
      ...definition,
      count: matched.length,
      firstDate: matched[0].date,
      latestDate: matched[matched.length - 1].date,
      latestFile: matched[matched.length - 1].fileName || "Health report",
      status: matched.length > 1 ? "Seen across multiple reports" : "Seen in one report",
    };
  }).filter(Boolean).sort((a, b) => b.count - a.count);
}

function makeSecureAccessToken() {
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `VS-${Date.now().toString(36).toUpperCase()}-${random}`;
}

function clearUserReportData(user) {
  if (!user) return;
  localStorage.removeItem(userReportKey(user));
  sessionStorage.removeItem("vitascan_active_report");
  sessionStorage.removeItem("vitascan_active_file");
}

function getCurrentUser() {
  try { return JSON.parse(sessionStorage.getItem(CURRENT_USER_KEY) || "null"); }
  catch { return null; }
}


// =====================================================
// DOCTOR / CLINIC APPOINTMENT STORAGE
// Prototype storage only. Production should use a backend.
// =====================================================
const APPOINTMENTS_KEY = "vitascan_doctor_appointments";
const MEDICAL_ORDERS_KEY = "vitascan_medical_orders";
const CLINIC_PASSWORD = "Admin@1234";
const MEDICAL_PASSWORD = "admin@1234";

function readAppointments() {
  try {
    return JSON.parse(localStorage.getItem(APPOINTMENTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeAppointments(items) {
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(items));
}

function clinicKey(name = "") {
  return String(name).trim().toLowerCase();
}

function createAppointment(data) {
  const appointment = {
    ...data,
    id: `APT-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    clinicId: clinicKey(data.clinicName),
    paymentStatus: "Pending",
    status: "Payment Pending",
    createdAt: new Date().toISOString(),
  };
  const items = readAppointments();
  items.unshift(appointment);
  writeAppointments(items);
  return appointment;
}


function readMedicalOrders() {
  try {
    return JSON.parse(localStorage.getItem(MEDICAL_ORDERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeMedicalOrders(items) {
  localStorage.setItem(MEDICAL_ORDERS_KEY, JSON.stringify(items));
}

function createMedicalOrder(data) {
  const order = {
    ...data,
    id: `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    // Keep one stable key so the order is shown only in the selected Medical Store dashboard.
    medicalId: clinicKey(data.medicalName || data.medicalStoreName),
    medicalStoreName: data.medicalName || data.medicalStoreName || "",
    status: "Order Received",
    paymentStatus: "Cash on Delivery",
    deliveryTime: "Within 20 minutes",
    createdAt: new Date().toISOString(),
  };
  const items = readMedicalOrders();
  items.unshift(order);
  writeMedicalOrders(items);
  return order;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function markAppointmentPaid(id) {
  const items = readAppointments().map(item =>
    item.id === id
      ? {
          ...item,
          paymentStatus: "Paid",
          status: "Booked",
          paidAt: new Date().toISOString(),
        }
      : item
  );
  writeAppointments(items);
}

// =====================================================
// BIOMARKER DATA
// =====================================================

const REPORT_TYPES = [
  "CBC", "Lipid Profile", "LFT", "KFT", "Thyroid", "HbA1c",
  "Blood Sugar", "Vitamin D", "Vitamin B12", "Iron Profile", "Calcium",
  "Electrolytes", "CRP", "ESR", "Uric Acid", "Urine R/E",
  "Urine Culture", "Stool Routine", "Dengue", "Malaria"
];

const biomarkerData = [
  { report: "CBC", icon: "🩸", title: "Hemoglobin (Hb)", english: "Protein in red blood cells that carries oxygen to tissues.", hindi: "कम हीमोग्लोबिन एनीमिया या आयरन/अन्य पोषक तत्वों की कमी से जुड़ा हो सकता है; अधिक स्तर कई कारणों से हो सकता है।" },
  { report: "CBC", icon: "🩸", title: "RBC Count", english: "Measures the number of red blood cells that carry oxygen.", hindi: "यह लाल रक्त कोशिकाओं की संख्या बताता है, जो शरीर तक ऑक्सीजन पहुंचाती हैं।" },
  { report: "CBC", icon: "🩸", title: "WBC Count (TLC)", english: "Measures total white blood cells, which help defend the body against infection.", hindi: "यह सफेद रक्त कोशिकाओं की कुल संख्या बताता है, जो संक्रमण से लड़ने में मदद करती हैं।" },
  { report: "CBC", icon: "🩸", title: "Platelet Count", english: "Measures platelets, the blood cells involved in clotting and stopping bleeding.", hindi: "यह प्लेटलेट्स की संख्या बताता है, जो रक्तस्राव रोकने के लिए क्लॉट बनाने में मदद करते हैं।" },
  { report: "CBC", icon: "🩸", title: "PCV / HCT (Hematocrit)", english: "Shows the percentage of blood volume made up of red blood cells.", hindi: "यह बताता है कि रक्त के कुल आयतन में लाल रक्त कोशिकाओं का कितना प्रतिशत है।" },
  { report: "CBC", icon: "🩸", title: "MCV", english: "Shows the average size of red blood cells and helps classify anemia patterns.", hindi: "यह लाल रक्त कोशिकाओं के औसत आकार को बताता है और एनीमिया के प्रकार को समझने में मदद कर सकता है।" },
  { report: "CBC", icon: "🩸", title: "MCH", english: "Shows the average amount of hemoglobin in each red blood cell.", hindi: "यह प्रत्येक लाल रक्त कोशिका में हीमोग्लोबिन की औसत मात्रा बताता है।" },
  { report: "CBC", icon: "🩸", title: "MCHC", english: "Shows the average concentration of hemoglobin inside red blood cells.", hindi: "यह लाल रक्त कोशिकाओं के अंदर हीमोग्लोबिन की औसत सांद्रता बताता है।" },
  { report: "CBC", icon: "🩸", title: "RDW", english: "Shows how much red blood cell sizes vary from one cell to another.", hindi: "यह लाल रक्त कोशिकाओं के आकार में होने वाले अंतर को बताता है।" },
  { report: "CBC", icon: "🩸", title: "Neutrophils", english: "White blood cells that are important for the early response to many bacterial infections.", hindi: "न्यूट्रोफिल कई बैक्टीरियल संक्रमणों के प्रति शरीर की शुरुआती प्रतिरक्षा प्रतिक्रिया में महत्वपूर्ण होते हैं।" },
  { report: "CBC", icon: "🩸", title: "Lymphocytes", english: "White blood cells involved in immune responses and antibody production.", hindi: "लिम्फोसाइट प्रतिरक्षा प्रतिक्रिया और एंटीबॉडी बनाने में महत्वपूर्ण होते हैं।" },
  { report: "CBC", icon: "🩸", title: "Monocytes", english: "White blood cells that help remove damaged cells and support immune defense.", hindi: "मोनोसाइट क्षतिग्रस्त कोशिकाओं को हटाने और प्रतिरक्षा सुरक्षा में मदद करते हैं।" },
  { report: "CBC", icon: "🩸", title: "Eosinophils", english: "White blood cells that may increase with allergies or some parasitic infections.", hindi: "एलर्जी या कुछ परजीवी संक्रमणों में ईोसिनोफिल बढ़ सकते हैं।" },
  { report: "CBC", icon: "🩸", title: "Basophils", english: "White blood cells involved in inflammatory and allergic responses.", hindi: "बेसोफिल सूजन और एलर्जी से जुड़ी प्रतिरक्षा प्रतिक्रियाओं में भाग लेते हैं." },
  { report: "Lipid Profile", icon: "❤️", title: "Total Cholesterol", english: "Measures the overall amount of cholesterol in the blood.", hindi: "यह रक्त में कुल कोलेस्ट्रॉल की मात्रा बताता है।" },
  { report: "Lipid Profile", icon: "❤️", title: "LDL Cholesterol", english: "Often called 'bad cholesterol'; higher levels are associated with cardiovascular risk.", hindi: "LDL को अक्सर खराब कोलेस्ट्रॉल कहा जाता है; अधिक स्तर हृदय-रक्तवाहिका जोखिम से जुड़ा हो सकता है।" },
  { report: "Lipid Profile", icon: "❤️", title: "HDL Cholesterol", english: "Helps transport cholesterol away from tissues; it is commonly called 'good cholesterol'.", hindi: "HDL को अक्सर अच्छा कोलेस्ट्रॉल कहा जाता है और यह ऊतकों से कोलेस्ट्रॉल को वापस ले जाने में मदद करता है।" },
  { report: "Lipid Profile", icon: "❤️", title: "Triglycerides", english: "A major type of fat in the blood used for energy storage.", hindi: "ट्राइग्लिसराइड रक्त में मौजूद वसा का एक प्रमुख प्रकार है, जिसे शरीर ऊर्जा के भंडारण में उपयोग करता है।" },
  { report: "Lipid Profile", icon: "❤️", title: "VLDL", english: "A lipoprotein that mainly carries triglycerides through the bloodstream.", hindi: "VLDL एक लिपोप्रोटीन है जो मुख्य रूप से ट्राइग्लिसराइड को रक्त में ले जाता है।" },
  { report: "Lipid Profile", icon: "❤️", title: "Non-HDL Cholesterol", english: "Represents cholesterol carried by several potentially atherogenic lipoproteins other than HDL.", hindi: "नॉन-HDL कोलेस्ट्रॉल HDL के अलावा कई लिपोप्रोटीन में मौजूद कोलेस्ट्रॉल को दर्शाता है।" },
  { report: "LFT", icon: "🧪", title: "Total Bilirubin", english: "Measures total bilirubin, a yellow pigment produced during red blood cell breakdown.", hindi: "यह कुल बिलीरुबिन मापता है, जो लाल रक्त कोशिकाओं के टूटने से बनने वाला पीला पदार्थ है।" },
  { report: "LFT", icon: "🧪", title: "Direct Bilirubin", english: "Measures conjugated bilirubin processed by the liver.", hindi: "यह उस बिलीरुबिन को मापता है जिसे लिवर प्रोसेस करता है।" },
  { report: "LFT", icon: "🧪", title: "Indirect Bilirubin", english: "Represents unconjugated bilirubin before liver processing.", hindi: "यह लिवर द्वारा प्रोसेस किए जाने से पहले वाले बिलीरुबिन का हिस्सा दर्शाता है।" },
  { report: "LFT", icon: "🧪", title: "ALT (SGPT)", english: "An enzyme found mainly in liver cells; changes can occur with liver-cell injury.", hindi: "ALT मुख्य रूप से लिवर कोशिकाओं में पाया जाने वाला एंजाइम है; लिवर कोशिकाओं की चोट में यह बदल सकता है।" },
  { report: "LFT", icon: "🧪", title: "AST (SGOT)", english: "An enzyme found in liver and other tissues; it is interpreted with other tests.", hindi: "AST लिवर और अन्य ऊतकों में पाया जाता है और इसे अन्य टेस्ट के साथ समझा जाता है।" },
  { report: "LFT", icon: "🧪", title: "ALP", english: "An enzyme associated with bile ducts and also bone tissue.", hindi: "ALP पित्त नलिकाओं और हड्डी के ऊतक से जुड़ा एंजाइम है।" },
  { report: "LFT", icon: "🧪", title: "GGT", english: "An enzyme often used with other liver tests to assess hepatobiliary patterns.", hindi: "GGT एक एंजाइम है जिसे अन्य लिवर टेस्ट के साथ लिवर/पित्त नली पैटर्न समझने में उपयोग किया जाता है।" },
  { report: "LFT", icon: "🧪", title: "Total Protein", english: "Measures the total amount of major proteins in blood, mainly albumin and globulins.", hindi: "यह रक्त में मुख्य प्रोटीनों, विशेषकर एल्ब्यूमिन और ग्लोब्युलिन की कुल मात्रा को मापता है।" },
  { report: "LFT", icon: "🧪", title: "Albumin", english: "A major blood protein made by the liver that helps maintain fluid balance.", hindi: "एल्ब्यूमिन लिवर द्वारा बनाया जाने वाला प्रमुख रक्त प्रोटीन है और द्रव संतुलन बनाए रखने में मदद करता है।" },
  { report: "LFT", icon: "🧪", title: "Globulin", english: "A group of blood proteins involved in immune function and transport.", hindi: "ग्लोब्युलिन रक्त प्रोटीनों का समूह है जो प्रतिरक्षा और परिवहन जैसे कार्यों में शामिल होता है।" },
  { report: "KFT", icon: "💧", title: "Serum Creatinine", english: "A waste product used as an important marker of kidney filtration.", hindi: "क्रिएटिनिन शरीर का अपशिष्ट पदार्थ है और किडनी की फिल्ट्रेशन समझने में महत्वपूर्ण मार्कर है।" },
  { report: "KFT", icon: "💧", title: "Blood Urea / BUN", english: "Measures urea-related nitrogen in blood, a waste product cleared largely by the kidneys.", hindi: "यह रक्त में यूरिया से संबंधित नाइट्रोजन को मापता है, जिसे मुख्य रूप से किडनी साफ करती है।" },
  { report: "KFT", icon: "💧", title: "eGFR", english: "An estimate of kidney filtration based on creatinine and other factors.", hindi: "eGFR किडनी की फिल्ट्रेशन क्षमता का अनुमान देता है और क्रिएटिनिन सहित कई कारकों पर आधारित होता है।" },
  { report: "KFT", icon: "💧", title: "Uric Acid", english: "A waste product formed from purine breakdown and cleared partly by the kidneys.", hindi: "यूरिक एसिड प्यूरिन के टूटने से बनता है और इसका कुछ हिस्सा किडनी से बाहर निकलता है।" },
  { report: "KFT", icon: "💧", title: "Sodium", english: "An electrolyte important for fluid balance, nerves and muscles.", hindi: "सोडियम शरीर में द्रव संतुलन, नसों और मांसपेशियों के लिए महत्वपूर्ण इलेक्ट्रोलाइट है।" },
  { report: "KFT", icon: "💧", title: "Potassium", english: "An electrolyte essential for muscle and heart electrical activity.", hindi: "पोटैशियम मांसपेशियों और हृदय की विद्युत गतिविधि के लिए जरूरी इलेक्ट्रोलाइट है।" },
  { report: "Thyroid Profile", icon: "🦋", title: "TSH", english: "A pituitary hormone that regulates thyroid hormone production.", hindi: "TSH पिट्यूटरी ग्रंथि का हार्मोन है जो थायरॉइड हार्मोन के उत्पादन को नियंत्रित करता है।" },
  { report: "Thyroid Profile", icon: "🦋", title: "Free T4", english: "The unbound circulating form of thyroxine, a major thyroid hormone.", hindi: "Free T4 रक्त में मौजूद सक्रिय रूप से उपलब्ध थायरॉक्सिन हार्मोन का हिस्सा है।" },
  { report: "Thyroid Profile", icon: "🦋", title: "Free T3", english: "The unbound form of triiodothyronine, an active thyroid hormone.", hindi: "Free T3 ट्राईआयोडोथायरोनिन का उपलब्ध रूप है, जो थायरॉइड की सक्रियता से जुड़ा हार्मोन है।" },
  { report: "Thyroid Profile", icon: "🦋", title: "Total T4", english: "Measures both bound and unbound thyroxine in blood.", hindi: "यह रक्त में बंधे और उपलब्ध दोनों प्रकार के T4 की कुल मात्रा को मापता है।" },
  { report: "Thyroid Profile", icon: "🦋", title: "Anti-TPO Antibody", english: "An antibody test that can help identify autoimmune thyroid patterns when clinically appropriate.", hindi: "Anti-TPO एंटीबॉडी टेस्ट कुछ ऑटोइम्यून थायरॉइड पैटर्न को समझने में मदद कर सकता है।" },
  { report: "HbA1c", icon: "📈", title: "HbA1c (%)", english: "Reflects average blood glucose exposure over roughly the previous 2–3 months.", hindi: "HbA1c लगभग पिछले 2–3 महीनों के औसत रक्त शर्करा एक्सपोज़र का संकेत देता है।" },
  { report: "HbA1c", icon: "📈", title: "Estimated Average Glucose (eAG)", english: "Converts HbA1c into an estimated average glucose value for easier understanding.", hindi: "eAG HbA1c को अनुमानित औसत ग्लूकोज़ मान में बदलकर समझने में आसान बनाता है।" },
  { report: "Blood Sugar", icon: "🍬", title: "Fasting Blood Glucose", english: "Measures blood glucose after fasting, commonly used for glucose screening and monitoring.", hindi: "फास्टिंग ब्लड ग्लूकोज़ उपवास के बाद रक्त शर्करा को मापता है और स्क्रीनिंग/मॉनिटरिंग में उपयोग होता है।" },
  { report: "Blood Sugar", icon: "🍬", title: "Post-Prandial (PP) Glucose", english: "Measures blood glucose after a meal, at the time specified by the laboratory or clinician.", hindi: "यह भोजन के बाद रक्त शर्करा को मापता है; सही समय रिपोर्ट या डॉक्टर के निर्देश के अनुसार देखा जाता है।" },
  { report: "Blood Sugar", icon: "🍬", title: "Random Blood Glucose", english: "Measures glucose at a non-specified time regardless of the last meal.", hindi: "रैंडम ब्लड ग्लूकोज़ किसी भी समय रक्त में शर्करा को मापता है, भोजन के समय से स्वतंत्र।" },
  { report: "Vitamin D", icon: "☀️", title: "25-OH Vitamin D", english: "The main blood test used to assess vitamin D status.", hindi: "25-OH Vitamin D शरीर में विटामिन D की स्थिति जानने के लिए मुख्य रक्त टेस्ट है।" },
  { report: "Vitamin D", icon: "☀️", title: "Vitamin D2", english: "One form of vitamin D that can contribute to measured vitamin D levels.", hindi: "Vitamin D2 विटामिन D का एक रूप है जो कुल विटामिन D स्तर में योगदान कर सकता है।" },
  { report: "Vitamin D", icon: "☀️", title: "Vitamin D3", english: "A form of vitamin D produced in skin and also found in some supplements and foods.", hindi: "Vitamin D3 विटामिन D का एक रूप है जो त्वचा में बनता है और कुछ सप्लीमेंट/खाद्य स्रोतों में भी मिलता है।" },
  { report: "Vitamin B12", icon: "🧬", title: "Serum Vitamin B12", english: "Measures circulating vitamin B12, important for blood-cell formation and nerve function.", hindi: "यह रक्त में विटामिन B12 की मात्रा बताता है, जो रक्त कोशिका निर्माण और नसों के सामान्य कार्य के लिए महत्वपूर्ण है।" },
  { report: "Vitamin B12", icon: "🧬", title: "Methylmalonic Acid (MMA)", english: "May help assess functional B12 deficiency when used with other clinical information.", hindi: "MMA को अन्य जानकारी के साथ उपयोग करने पर शरीर में B12 की कार्यात्मक कमी समझने में मदद मिल सकती है।" },
  { report: "Vitamin B12", icon: "🧬", title: "Homocysteine", english: "A blood marker that can rise with B12 or folate deficiency and other conditions.", hindi: "होमोसिस्टीन B12 या फोलेट की कमी सहित कई स्थितियों में बढ़ सकता है।" },
  { report: "Iron Profile", icon: "🔩", title: "Serum Iron", english: "Measures iron circulating in the blood, mostly bound to transferrin.", hindi: "यह रक्त में घूम रहे आयरन की मात्रा मापता है, जो मुख्यतः ट्रांसफेरिन से जुड़ा होता है।" },
  { report: "Iron Profile", icon: "🔩", title: "Ferritin", english: "A major marker of stored iron; it is also affected by inflammation.", hindi: "फेरिटिन शरीर में संग्रहित आयरन का प्रमुख मार्कर है, लेकिन सूजन से भी प्रभावित हो सकता है।" },
  { report: "Iron Profile", icon: "🔩", title: "TIBC", english: "Estimates the blood's total capacity to bind iron, largely reflecting transferrin availability.", hindi: "TIBC रक्त की आयरन बांधने की कुल क्षमता का अनुमान देता है और ट्रांसफेरिन उपलब्धता से जुड़ा है।" },
  { report: "Iron Profile", icon: "🔩", title: "Transferrin", english: "The main blood protein that transports iron.", hindi: "ट्रांसफेरिन रक्त का मुख्य प्रोटीन है जो आयरन को शरीर में ले जाता है।" },
  { report: "Iron Profile", icon: "🔩", title: "Transferrin Saturation", english: "Shows the proportion of iron-binding sites occupied by iron.", hindi: "यह बताता है कि आयरन बांधने वाली साइटों में से कितनी साइट आयरन से भरी हैं।" },
  { report: "Calcium", icon: "🦴", title: "Total Calcium", english: "Measures the total calcium in blood, including protein-bound and free calcium.", hindi: "यह रक्त में कुल कैल्शियम मापता है, जिसमें प्रोटीन से जुड़ा और मुक्त कैल्शियम दोनों शामिल होते हैं।" },
  { report: "Calcium", icon: "🦴", title: "Ionized Calcium", english: "Measures the free, biologically active form of calcium in blood.", hindi: "यह रक्त में मौजूद मुक्त और जैविक रूप से सक्रिय कैल्शियम को मापता है।" },
  { report: "Calcium", icon: "🦴", title: "Albumin", english: "A blood protein that affects interpretation of total calcium.", hindi: "एल्ब्यूमिन एक रक्त प्रोटीन है जो कुल कैल्शियम की व्याख्या को प्रभावित कर सकता है।" },
  { report: "Calcium", icon: "🦴", title: "Phosphorus", english: "A mineral that works with calcium in bones and many cellular functions.", hindi: "फॉस्फोरस कैल्शियम के साथ हड्डियों और कई कोशिकीय कार्यों में महत्वपूर्ण भूमिका निभाता है।" },
  { report: "Calcium", icon: "🦴", title: "PTH", english: "Parathyroid hormone that helps regulate calcium and phosphorus balance.", hindi: "PTH पैराथायरॉइड हार्मोन है जो कैल्शियम और फॉस्फोरस के संतुलन को नियंत्रित करने में मदद करता है।" },
  { report: "Electrolytes", icon: "⚡", title: "Sodium (Na+)", english: "Helps regulate body-fluid balance, nerve signaling and muscle function.", hindi: "सोडियम शरीर के द्रव संतुलन, नसों के संकेत और मांसपेशियों के कार्य को नियंत्रित करने में मदद करता है।" },
  { report: "Electrolytes", icon: "⚡", title: "Potassium (K+)", english: "Important for nerve signals, muscle contraction and heart rhythm.", hindi: "पोटैशियम नसों के संकेत, मांसपेशियों के संकुचन और हृदय की लय के लिए महत्वपूर्ण है।" },
  { report: "Electrolytes", icon: "⚡", title: "Chloride (Cl-)", english: "Works with sodium and other electrolytes to maintain fluid and acid-base balance.", hindi: "क्लोराइड सोडियम और अन्य इलेक्ट्रोलाइट्स के साथ द्रव तथा एसिड-बेस संतुलन बनाए रखने में मदद करता है।" },
  { report: "Electrolytes", icon: "⚡", title: "Bicarbonate (HCO3-)", english: "Helps maintain the body's acid-base balance.", hindi: "बाइकार्बोनेट शरीर के एसिड-बेस संतुलन को बनाए रखने में मदद करता है।" },
  { report: "Electrolytes", icon: "⚡", title: "Magnesium (Mg2+)", english: "Supports muscle, nerve and many enzyme functions.", hindi: "मैग्नीशियम मांसपेशियों, नसों और कई एंजाइम कार्यों के लिए जरूरी है।" },
  { report: "CRP", icon: "🔥", title: "C-Reactive Protein (CRP)", english: "An inflammation-related protein that can rise with infection, inflammation or tissue injury.", hindi: "CRP सूजन से जुड़ा प्रोटीन है जो संक्रमण, सूजन या ऊतक की चोट में बढ़ सकता है।" },
  { report: "CRP", icon: "🔥", title: "hs-CRP", english: "A high-sensitivity CRP test used mainly for low-grade inflammation and cardiovascular risk assessment in selected settings.", hindi: "hs-CRP कम स्तर की सूजन और कुछ परिस्थितियों में हृदय-रक्तवाहिका जोखिम के आकलन में उपयोग किया जाता है।" },
  { report: "ESR", icon: "🌡️", title: "ESR", english: "Measures how quickly red blood cells settle in a tube; it is a non-specific inflammation marker.", hindi: "ESR बताता है कि टेस्ट ट्यूब में लाल रक्त कोशिकाएं कितनी तेजी से नीचे बैठती हैं; यह सूजन का गैर-विशिष्ट मार्कर है।" },
  { report: "ESR", icon: "🌡️", title: "ESR 1-hour", english: "The commonly reported sedimentation measurement after one hour.", hindi: "यह एक घंटे के बाद लाल रक्त कोशिकाओं के बैठने की सामान्य रिपोर्ट की गई माप है।" },
  { report: "Uric Acid", icon: "🧂", title: "Serum Uric Acid", english: "Measures uric acid in blood, produced during purine breakdown.", hindi: "यह रक्त में यूरिक एसिड की मात्रा मापता है, जो प्यूरिन के टूटने से बनता है।" },
  { report: "Uric Acid", icon: "🧂", title: "Uric Acid in Urine", english: "Measures uric acid excretion in urine and can add context in selected clinical evaluations.", hindi: "यह पेशाब में यूरिक एसिड के उत्सर्जन को मापता है और कुछ स्थितियों में अतिरिक्त जानकारी देता है।" },
  { report: "Urine R/E", icon: "🚽", title: "Urine Appearance", english: "Checks color and clarity of the urine sample.", hindi: "यह पेशाब के रंग और साफ़/धुंधले स्वरूप को देखता है।" },
  { report: "Urine R/E", icon: "🚽", title: "Specific Gravity", english: "Reflects urine concentration and hydration-related concentrating ability.", hindi: "यह पेशाब की सांद्रता और शरीर की पानी से संबंधित स्थिति के बारे में संकेत देता है।" },
  { report: "Urine R/E", icon: "🚽", title: "Urine pH", english: "Measures how acidic or alkaline the urine is.", hindi: "यह बताता है कि पेशाब कितना अम्लीय या क्षारीय है।" },
  { report: "Urine R/E", icon: "🚽", title: "Urine Protein", english: "Checks for protein in urine, which may require clinical interpretation if persistent.", hindi: "यह पेशाब में प्रोटीन की मौजूदगी देखता है; लगातार असामान्य होने पर चिकित्सकीय मूल्यांकन जरूरी हो सकता है।" },
  { report: "Urine R/E", icon: "🚽", title: "Urine Glucose", english: "Checks whether glucose is present in urine.", hindi: "यह देखता है कि पेशाब में ग्लूकोज़ मौजूद है या नहीं।" },
  { report: "Urine R/E", icon: "🚽", title: "Urine Ketones", english: "Checks for ketone bodies, which can appear when the body uses fat as a major fuel source.", hindi: "यह कीटोन बॉडीज की जांच करता है, जो शरीर द्वारा वसा को प्रमुख ऊर्जा स्रोत के रूप में उपयोग करने पर दिखाई दे सकती हैं।" },
  { report: "Urine R/E", icon: "🚽", title: "Urine Blood / RBC", english: "Checks for blood or red blood cells in urine.", hindi: "यह पेशाब में रक्त या लाल रक्त कोशिकाओं की मौजूदगी देखता है।" },
  { report: "Urine R/E", icon: "🚽", title: "Urine WBC / Pus Cells", english: "Checks for white blood cells, which can occur with urinary inflammation or infection.", hindi: "यह सफेद रक्त कोशिकाओं की जांच करता है, जो मूत्र मार्ग की सूजन या संक्रमण में बढ़ सकती हैं।" },
  { report: "Urine R/E", icon: "🚽", title: "Nitrite", english: "A chemical marker that can be positive with some nitrate-reducing bacteria.", hindi: "नाइट्राइट कुछ ऐसे बैक्टीरिया की मौजूदगी में पॉजिटिव हो सकता है जो नाइट्रेट को बदलते हैं।" },
  { report: "Urine R/E", icon: "🚽", title: "Leukocyte Esterase", english: "A urine-strip marker associated with white blood cells.", hindi: "ल्यूकोसाइट एस्टरेज़ यूरिन में सफेद रक्त कोशिकाओं से जुड़ा टेस्ट मार्कर है।" },
  { report: "Urine Culture", icon: "🧫", title: "Culture Growth", english: "Shows whether bacteria or other microorganisms grow from the urine sample.", hindi: "यह बताता है कि पेशाब के सैंपल में बैक्टीरिया या अन्य सूक्ष्मजीव बढ़े हैं या नहीं।" },
  { report: "Urine Culture", icon: "🧫", title: "Colony Count (CFU/mL)", english: "Quantifies the amount of microbial growth reported by the laboratory.", hindi: "यह लैब द्वारा रिपोर्ट की गई सूक्ष्मजीव वृद्धि की मात्रा बताता है।" },
  { report: "Urine Culture", icon: "🧫", title: "Organism Identified", english: "Names the microorganism isolated from the culture when growth is detected.", hindi: "यदि वृद्धि मिलती है तो यह कल्चर में पाए गए सूक्ष्मजीव का नाम बताता है।" },
  { report: "Urine Culture", icon: "🧫", title: "Antibiotic Susceptibility", english: "Shows which tested antibiotics the identified organism is susceptible or resistant to.", hindi: "यह बताता है कि पाया गया सूक्ष्मजीव जांचे गए किन एंटीबायोटिक्स के प्रति संवेदनशील या प्रतिरोधी है।" },
  { report: "Stool Routine", icon: "🔬", title: "Stool Appearance", english: "Checks stool color, consistency and visible characteristics.", hindi: "यह मल के रंग, बनावट और दिखाई देने वाली विशेषताओं को देखता है।" },
  { report: "Stool Routine", icon: "🔬", title: "Occult Blood", english: "Looks for small amounts of blood that are not visible to the eye.", hindi: "यह ऐसे रक्त की जांच करता है जो आंखों से दिखाई नहीं देता।" },
  { report: "Stool Routine", icon: "🔬", title: "Mucus", english: "Checks for mucus in the stool, which can occur in several gastrointestinal conditions.", hindi: "मल में म्यूकस कई पाचन तंत्र की स्थितियों में दिखाई दे सकता है।" },
  { report: "Stool Routine", icon: "🔬", title: "Ova and Parasites", english: "Looks for parasite eggs or other parasite forms in stool.", hindi: "यह मल में परजीवी अंडों या अन्य परजीवी रूपों की जांच करता है।" },
  { report: "Stool Routine", icon: "🔬", title: "Stool Pus Cells", english: "Checks for white blood cells in stool, which may occur with intestinal inflammation or infection.", hindi: "यह मल में सफेद रक्त कोशिकाओं की जांच करता है, जो आंतों की सूजन या संक्रमण में मिल सकती हैं।" },
  { report: "Stool Routine", icon: "🔬", title: "Stool RBC", english: "Checks for red blood cells in stool.", hindi: "यह मल में लाल रक्त कोशिकाओं की मौजूदगी देखता है।" },
  { report: "Stool Routine", icon: "🔬", title: "Yeast / Fungal Elements", english: "Looks for yeast or fungal elements when reported by microscopy.", hindi: "यह माइक्रोस्कोपी में रिपोर्ट किए गए यीस्ट या फंगल तत्वों की जांच करता है।" },
  { report: "Dengue", icon: "🦟", title: "NS1 Antigen", english: "A dengue viral antigen test that may be useful particularly early in illness.", hindi: "NS1 डेंगू वायरस से जुड़ा एंटीजन टेस्ट है जो बीमारी के शुरुआती दिनों में उपयोगी हो सकता है।" },
  { report: "Dengue", icon: "🦟", title: "Dengue IgM", english: "An antibody that generally develops after the early phase of infection.", hindi: "डेंगू IgM एक एंटीबॉडी है जो आमतौर पर संक्रमण के शुरुआती चरण के बाद विकसित होती है।" },
  { report: "Dengue", icon: "🦟", title: "Dengue IgG", english: "An antibody that can reflect current or past exposure depending on timing and clinical context.", hindi: "डेंगू IgG समय और चिकित्सकीय संदर्भ के अनुसार वर्तमान या पुराने संक्रमण/एक्सपोज़र का संकेत दे सकता है।" },
  { report: "Dengue", icon: "🦟", title: "Platelet Count", english: "Platelets are monitored in dengue along with symptoms and other laboratory findings.", hindi: "डेंगू में प्लेटलेट्स को लक्षणों और अन्य रिपोर्ट मानों के साथ मॉनिटर किया जाता है।" },
  { report: "Dengue", icon: "🦟", title: "Hematocrit (HCT/PCV)", english: "Hematocrit may be followed with other findings when dengue is suspected or confirmed.", hindi: "डेंगू की स्थिति में HCT/PCV को अन्य रिपोर्ट और लक्षणों के साथ देखा जा सकता है।" },
  { report: "Malaria", icon: "🦠", title: "Peripheral Blood Smear", english: "Microscopic examination used to look for malaria parasites in blood.", hindi: "यह रक्त की माइक्रोस्कोपिक जांच है जिसमें मलेरिया परजीवी खोजे जाते हैं।" },
  { report: "Malaria", icon: "🦠", title: "Malaria Antigen / Rapid Test", english: "Detects malaria-related antigens using a rapid diagnostic test.", hindi: "यह रैपिड टेस्ट द्वारा मलेरिया से जुड़े एंटीजन की जांच करता है।" },
  { report: "Malaria", icon: "🦠", title: "Plasmodium Species", english: "Identifies the malaria parasite species when microscopy or testing can distinguish it.", hindi: "यह जांच से पहचानी गई मलेरिया परजीवी की प्रजाति बताता है।" },
  { report: "Malaria", icon: "🦠", title: "Parasite Density", english: "Estimates the amount of malaria parasites in the blood when reported.", hindi: "यदि रिपोर्ट किया गया हो तो यह रक्त में मलेरिया परजीवियों की मात्रा का अनुमान देता है।" },
  { report: "Malaria", icon: "🦠", title: "Hemoglobin", english: "May be monitored because malaria can be associated with anemia in some cases.", hindi: "मलेरिया के कुछ मामलों में एनीमिया हो सकता है, इसलिए हीमोग्लोबिन को मॉनिटर किया जा सकता है।" },
  { report: "Malaria", icon: "🦠", title: "Platelet Count", english: "May be monitored along with other findings during malaria evaluation.", hindi: "मलेरिया की जांच में प्लेटलेट्स को अन्य रिपोर्ट मानों के साथ मॉनिटर किया जा सकता है।" },
];


// =====================================================
// APP LAYOUT
// =====================================================

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(getCurrentUser);

  const closeMenu = () => setMenuOpen(false);

  const handleLogin = (user) => {
    sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    setCurrentUser(user);
    navigate("/", { replace: true });
  };

  const handleLogout = () => {
    clearUserReportData(currentUser);
    sessionStorage.clear();
    setCurrentUser(null);
    setMenuOpen(false);
  };

  // Clinic portal is separate from the patient login.
  if (
    location.pathname === "/clinic-login" ||
    location.pathname === "/clinic-dashboard"
  ) {
    return (
      <Routes>
        <Route path="/clinic-login" element={<ClinicLogin />} />
        <Route path="/clinic-dashboard" element={<ClinicDashboard />} />
      </Routes>
    );
  }

  // Medical portal is separate from the patient, clinic and doctor login.
  if (
    location.pathname === "/medical-login" ||
    location.pathname === "/medical-dashboard"
  ) {
    return (
      <Routes>
        <Route path="/medical-login" element={<MedicalLogin />} />
        <Route path="/medical-dashboard" element={<MedicalDashboard />} />
      </Routes>
    );
  }

  // Doctor portal is separate from the patient and clinic login.
if (
  location.pathname === "/doctor-login" ||
  location.pathname === "/doctor-register" ||
  location.pathname === "/doctor-dashboard"
) {
  return (
    <Routes>
      <Route
        path="/doctor-login"
        element={<DoctorLogin />}
      />

      <Route
        path="/doctor-register"
        element={<DoctorRegister />}
      />

      <Route
        path="/doctor-dashboard"
        element={<DoctorDashboard />}
      />
    </Routes>
  );
}

  if (!currentUser) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <NavLink to="/" className="logo" onClick={closeMenu}>
            <span className="logo-icon"><HeartPulse size={24} /></span>
            <span>VitaScan AI</span>
          </NavLink>

          <button
            type="button"
            className="menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={25} /> : <Menu size={25} />}
          </button>

          <nav className={menuOpen ? "nav open" : "nav"}>
            <NavLink to="/" end onClick={closeMenu}>Home</NavLink>
            <NavLink to="/biomarker-guide" onClick={closeMenu}>Biomarker Guide</NavLink>
            <NavLink to="/compare-reports" onClick={closeMenu}>Compare Reports</NavLink>
            <NavLink to="/recent-chats" onClick={closeMenu}>
              <History size={16} /> Recent Chats
            </NavLink>
            <NavLink to="/connect-doctor" onClick={closeMenu}>
              <Stethoscope size={16} /> Connect to Doctor
            </NavLink>
            <NavLink to="/medical-stores" onClick={closeMenu}>
              <Pill size={16} /> Medical Stores
            </NavLink>
            <NavLink to="/contact" onClick={closeMenu}>
              <Mail size={16} /> Contact Us
            </NavLink>
            <NavLink to="/guidelines" onClick={closeMenu}>Guidelines</NavLink>
            <NavLink to="/privacy" onClick={closeMenu}>Privacy</NavLink>
            <span className="user-chip">
              <UserCircle size={16} /> {currentUser.name}
            </span>
            <button type="button" className="logout-btn" onClick={handleLogout}>
              <LogOut size={16} /> Logout
            </button>
          </nav>
        </div>
      </header>

     <Routes>
           <Route path="/" element={<Home />} />
           <Route path="/biomarker-guide" element={<BiomarkerGuide />} />
           <Route path="/recent-chats" element={<RecentChats />} />
           <Route path="/connect-doctor" element={<ConnectDoctor />} />

           <Route path="/medical" element={<MedicalStorePage />} />
           <Route path="/medical-stores" element={<MedicalStores />} />
           <Route path="/medical-login" element={<MedicalLogin />} />
           <Route path="/medical-dashboard" element={<MedicalDashboard />} />
           <Route path="/medical-register" element={<MedicalRegister />} />

           <Route path="/contact" element={<ContactUs />} />
           <Route path="/guidelines" element={<Guidelines />} />
           <Route path="/privacy" element={<Privacy />} />
           <Route path="/compare-reports" element={<CompareReports />} />
       </Routes>
    </>
  );
}

function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password || (mode === "register" && !name.trim())) {
      setError("Please fill all required fields.");
      return;
    }
    const users = readUsers();
    const existing = users.find(u => u.email === cleanEmail);

    if (mode === "register") {
      if (existing) {
        setError("An account with this email already exists. Please log in.");
        return;
      }
      const user = { name: name.trim(), email: cleanEmail, password };
      writeUsers([...users, user]);
      onLogin({ name: user.name, email: user.email });
    } else {
      if (!existing || existing.password !== password) {
        setError("Incorrect email or password.");
        return;
      }
      onLogin({ name: existing.name, email: existing.email });
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-logo"><HeartPulse size={30} /></div>
        <h1>{mode === "login" ? "Welcome Back" : "Create Your VitaScan Account"}</h1>
        <p>Sign in to keep your VitaScan profile and access your recent reports.</p>
        <form onSubmit={submit}>
          {mode === "register" && <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" autoComplete="email" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" autoComplete={mode === "login" ? "current-password" : "new-password"} />
          {error && <div className="error-box">{error}</div>}
          <button className="auth-submit" type="submit">{mode === "login" ? "Login" : "Create Account"}</button>
        </form>
        <button className="auth-switch" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
          {mode === "login" ? "New user? Create an account" : "Already have an account? Login"}
        </button>
        <small className="auth-note">Reports and recent chats are deleted when you log out. Your account profile remains available for your next login.</small>
      </div>
    </main>
  );
}

function RecentChats() {
  const user = getCurrentUser();
  const [reports, setReports] = useState(() => readRecentReports(user));

  const clearHistory = () => {
    clearUserReportData(user);
    setReports([]);
  };

  return (
    <main className="page recent-page">
      <div className="page-inner recent-container">
        <div className="recent-heading">
          <div><h1>Recent Chats</h1><p className="page-subtitle">Your recent AI laboratory-report analyses for this account.</p></div>
          {reports.length > 0 && <button className="logout-btn" onClick={clearHistory}>Clear History</button>}
        </div>
        {!reports.length ? (
          <div className="service-empty"><History size={34}/><h3>No recent reports</h3><p>Analyze a blood report and it will appear here.</p></div>
        ) : (
          <div className="recent-grid">
            {reports.map(item => (
              <article className="recent-card" key={item.id}>
                <div className="recent-card-top"><History size={20}/><span>{new Date(item.date).toLocaleString("en-IN")}</span></div>
                <h3>{item.fileName}</h3>
                <p>{item.report?.riskLevel || "Undetermined"} · Risk score {item.report?.riskScore ?? "N/A"}/100</p>
                <details><summary>View summary</summary><p>{item.report?.doctorNote || "No summary available."}</p></details>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

// =====================================================
// HOME PAGE
// =====================================================

function humanizeHealthKey(key) {
  return String(key)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function renderHealthValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function HealthRecordFields({ record, exclude = [] }) {
  const excluded = new Set(exclude);
  const entries = Object.entries(record || {}).filter(([key, value]) => !excluded.has(key) && value !== undefined && value !== null && value !== "");
  if (!entries.length) return null;

  return (
    <div className="health-record-all-fields">
      <div className="health-record-all-fields-title">Additional record details</div>
      <div className="health-record-all-fields-grid">
        {entries.map(([key, value]) => (
          <div className="health-record-field" key={key}>
            <span>{humanizeHealthKey(key)}</span>
            <strong>{renderHealthValue(value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function Home() {

  const inputRef = useRef(null);

  const [file, setFile] = useState(null);

  const [drag, setDrag] = useState(false);

  const [metric, setMetric] = useState(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrToken, setQrToken] = useState("");
  const [qrExpiresAt, setQrExpiresAt] = useState(null);

  const currentUser = getCurrentUser();
  const snapshot = getPatientHealthSnapshot(currentUser);
  const diseaseTrends = getDiseaseTrendSnapshot(snapshot.reports);


  const selectFile = (selectedFile) => {

    if (!selectedFile) {
      return;
    }


    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];


    if (
      !allowedTypes.includes(
        selectedFile.type
      )
    ) {
      alert(
        "Please upload JPG, PNG, WEBP or PDF report."
      );

      return;
    }


    setFile(selectedFile);
  };

  const generateSecureQr = () => {
    const token = makeSecureAccessToken();
    const expires = Date.now() + 15 * 60 * 1000;
    setQrToken(token);
    setQrExpiresAt(expires);
    setQrOpen(true);
  };

  const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "September 2026";
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const activityItems = snapshot.activity.length
    ? snapshot.activity.slice(0, 3)
    : [
        { id: "demo-report", type: "Blood Report", date: "2026-09-01", detail: "Analyzed successfully", icon: FileText },
        { id: "demo-visit", type: "Doctor Visit", date: "2026-09-08", detail: "General consultation", icon: Stethoscope },
        { id: "demo-prescription", type: "Prescription", date: "2026-09-12", detail: "Prescription added", icon: Pill },
      ];

  return (
    <main className="home-page">

      <section className="home-hero">

        <div className="hero-inner">

          <div className="hero-left">

            <h1>
              Understand Your Health
              <br />

              <span>
                Beyond the Numbers
              </span>
            </h1>


            <p>
              VitaScan AI uses advanced AI to
              bridge the gap between complex
              laboratory data and your
              well-being. Upload your blood
              report for a clear, actionable
              analysis.
            </p>


            <div
              className={`upload-box ${
                drag ? "drag" : ""
              }`}

              onDragOver={(event) => {

                event.preventDefault();

                setDrag(true);

              }}

              onDragLeave={() =>
                setDrag(false)
              }

              onDrop={(event) => {

                event.preventDefault();

                setDrag(false);

                selectFile(
                  event.dataTransfer.files[0]
                );

              }}
            >

              <div className="file-symbol">

                <FileText size={28} />

              </div>


              <h3>
                Upload Laboratory Report
              </h3>


              <p>
                Drag and drop your report image
                (JPG, PNG) or click to browse
              </p>


              <button
                className="choose-btn"

                onClick={() =>
                  inputRef.current?.click()
                }
              >
                Choose File
              </button>


              <input
                ref={inputRef}

                type="file"

                hidden

                accept=".jpg,.jpeg,.png,.webp,.pdf"

                onChange={(event) =>
                  selectFile(
                    event.target.files[0]
                  )
                }
              />


              {file && (

                <div className="selected-file">

                  <span>
                    {file.name}
                  </span>

                </div>

              )}

            </div>

          </div>


          {/* FLOATING CARDS */}

          <div className="floating-cards">

            <div
              className="metric-card hemoglobin"

              onClick={() =>
                setMetric({

                  title:
                    "Hemoglobin",

                  value:
                    "14.2 g/dL",

                  status:
                    "Normal",

                  text:
                    "Hemoglobin is the protein in red blood cells that carries oxygen around the body.",

                })
              }
            >

              <div className="metric-icon blood">
                ♦
              </div>


              <div>

                <small>
                  Hemoglobin
                </small>

                <strong>
                  14.2 g/dL
                </strong>

                <b className="normal">
                  Normal
                </b>

              </div>

            </div>


            <div
              className="metric-card glucose"

              onClick={() =>
                setMetric({

                  title:
                    "Glucose",

                  value:
                    "105 mg/dL",

                  status:
                    "Slightly High",

                  text:
                    "Glucose is the main sugar used by the body for energy. This sample value is displayed as slightly high.",

                })
              }
            >

              <div className="metric-icon bolt">
                ϟ
              </div>


              <div>

                <small>
                  Glucose
                </small>

                <strong>
                  105 mg/dL
                </strong>

                <b className="high">
                  Slightly High
                </b>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* Patient health record additions */}
      <section className="health-record-section" aria-label="My Health Record">
        <div className="health-record-shell">
          <div className="health-record-card">
            <div className="health-record-header">
              <div className="health-record-heading">
                <div className="health-record-icon"><Lock size={20} /></div>
                <div>
                  <h2>My Health Record</h2>
                  <p>Your connected health history in one secure place.</p>
                </div>
              </div>
              <span className="record-owner-badge">Patient Record</span>
            </div>

            <div className="health-record-stats">
              <div><span>Reports</span><strong>{snapshot.reports.length}</strong></div>
              <div><span>Visits</span><strong>{snapshot.visits.length}</strong></div>
              <div><span>Prescriptions</span><strong>{snapshot.prescriptions.length}</strong></div>
            </div>

            <div className="health-record-actions">
              <button type="button" className="health-record-primary" onClick={() => setRecordOpen(true)}>
                <FileText size={17} /> View Health Record
              </button>
              <button type="button" className="health-record-qr" onClick={generateSecureQr}>
                <QrCode size={17} /> Generate Secure QR
              </button>
            </div>

            <div className="secure-qr-inline">
              <div>
                <QrCode size={18} />
                <div>
                  <strong>Secure QR Access</strong>
                  <span>Authorized clinician access only · 15 minutes</span>
                </div>
              </div>
              <button type="button" onClick={generateSecureQr}>Generate Secure QR</button>
            </div>
          </div>
        </div>
      </section>

      <section className="health-activity-section" aria-label="Recent Health Activity">
        <div className="health-record-shell">
          <div className="health-section-heading">
            <div>
              <span className="health-eyebrow">LONGITUDINAL HEALTH HISTORY</span>
              <h2>Recent Health Activity</h2>
            </div>
            <button type="button" className="health-text-btn" onClick={() => setRecordOpen(true)}>
              View full record
            </button>
          </div>

          <div className="health-timeline">
            {activityItems.map((item) => {
              const Icon = item.icon;
              return (
                <article className="health-timeline-item" key={item.id}>
                  <div className="health-timeline-icon"><Icon size={17} /></div>
                  <div>
                    <strong>{item.type}</strong>
                    <span>{formatDate(item.date)}</span>
                    <p>{item.detail}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="disease-trend-section" aria-label="Disease Trend Monitoring">
        <div className="health-record-shell">
          <div className="health-section-heading">
            <div>
              <span className="health-eyebrow">LONGITUDINAL MONITORING</span>
              <h2>Disease Trend Monitoring</h2>
              <p className="disease-trend-subtitle">Track health-condition and biomarker mentions across your saved reports over time.</p>
            </div>
            <NavLink to="/compare-reports" className="health-text-btn">Compare reports</NavLink>
          </div>

          {diseaseTrends.length ? (
            <div className="disease-trend-grid">
              {diseaseTrends.slice(0, 6).map((trend) => (
                <article className="disease-trend-card" key={trend.key}>
                  <div className="disease-trend-card-top">
                    <div className="disease-trend-icon">↗</div>
                    <span className="disease-trend-badge">{trend.count} report{trend.count === 1 ? "" : "s"}</span>
                  </div>
                  <h3>{trend.label}</h3>
                  <p>{trend.status}</p>
                  <div className="disease-trend-meta">
                    <span>First seen</span><strong>{formatDate(trend.firstDate)}</strong>
                    <span>Latest</span><strong>{formatDate(trend.latestDate)}</strong>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="disease-trend-empty">
              <div className="disease-trend-empty-icon">📈</div>
              <div>
                <strong>No disease trend available yet</strong>
                <p>Upload and save multiple health reports to your Health Record. VitaScan will then organize recurring condition and biomarker mentions across dates.</p>
              </div>
              <button type="button" onClick={() => inputRef.current?.click()}>Upload Report</button>
            </div>
          )}

          <div className="disease-trend-note">
            <strong>Important:</strong> This is a monitoring view based on information found in saved reports. It does not diagnose a disease or predict future illness. Use the Compare Reports feature and consult a qualified clinician for medical interpretation.
          </div>
        </div>
      </section>

      <section className="home-feature-strip" aria-label="Existing VitaScan features">
        <div className="home-feature-strip-head">
          <div>
            <span className="health-eyebrow">EXISTING VITASCAN FEATURES</span>
            <h2>Continue Your Health Journey</h2>
          </div>
        </div>
        <div className="home-feature-links">
          <NavLink to="/biomarker-guide"><HeartPulse size={17} /> Biomarker Guide</NavLink>
          <NavLink to="/compare-reports"><FileText size={17} /> Compare Reports</NavLink>
          <NavLink to="/recent-chats"><History size={17} /> Recent Chats</NavLink>
          <NavLink to="/connect-doctor"><Stethoscope size={17} /> Doctor / Clinic</NavLink>
          <NavLink to="/medical-stores"><Pill size={17} /> Medical Stores</NavLink>
        </div>
      </section>

      {/* ANALYSIS REPORT ON SAME HOME PAGE */}

      {file && (

        <Analyze
          file={file}
          onClear={() =>
            setFile(null)
          }
        />

      )}


      {metric && (

        <InfoPopup

          title={`${metric.title} — ${metric.value}`}

          text={`${metric.status}. ${metric.text}`}

          onClose={() =>
            setMetric(null)
          }

        />

      )}


      {recordOpen && (
        <div className="popup-backdrop health-record-backdrop" onClick={() => setRecordOpen(false)}>
          <section className="health-record-modal" onClick={(event) => event.stopPropagation()}>
            <div className="health-modal-top">
              <div>
                <span className="health-eyebrow">PATIENT-OWNED RECORD</span>
                <h2>My Health Record</h2>
                <p>Previous reports, visits and prescriptions connected to your account.</p>
              </div>
              <button type="button" className="popup-close" onClick={() => setRecordOpen(false)} aria-label="Close">×</button>
            </div>

            <div className="health-modal-stats">
              <div><strong>{snapshot.reports.length}</strong><span>Reports</span></div>
              <div><strong>{snapshot.visits.length}</strong><span>Visits</span></div>
              <div><strong>{snapshot.prescriptions.length}</strong><span>Prescriptions</span></div>
            </div>

            <div className="health-record-list health-record-full-list">
              <div className="health-record-list-title">Complete health history</div>

              <section className="health-record-detail-section">
                <div className="health-record-detail-heading">
                  <div><FileText size={18} /><strong>Blood / Medical Reports</strong></div>
                  <span>{snapshot.reports.length} record{snapshot.reports.length === 1 ? "" : "s"}</span>
                </div>

                {snapshot.reports.length ? snapshot.reports.map((item) => (
                  <article className="health-record-detail-card" key={`full-report-${item.id}`}>
                    <div className="health-record-detail-top">
                      <div>
                        <strong>{item.fileName || "Blood Report"}</strong>
                        <span>{formatDate(item.date)}</span>
                      </div>
                      <span className="health-record-status">Saved</span>
                    </div>
                    <div className="health-report-readable">
                      <div className="health-report-readable-title">Report analysis</div>
                      <div className="health-report-readable-body">
                        {typeof item.report === "string" ? item.report : JSON.stringify(item.report, null, 2)}
                      </div>
                    </div>
                    <HealthRecordFields record={item} exclude={["id", "fileName", "date", "report", "healthRecordAddedAt"]} />
                  </article>
                )) : (
                  <div className="health-empty-state compact">
                    <FileText size={22} />
                    <span>No blood or medical reports have been added yet.</span>
                  </div>
                )}
              </section>

              <section className="health-record-detail-section">
                <div className="health-record-detail-heading">
                  <div><Stethoscope size={18} /><strong>Doctor Visits</strong></div>
                  <span>{snapshot.visits.length} visit{snapshot.visits.length === 1 ? "" : "s"}</span>
                </div>

                {snapshot.visits.length ? snapshot.visits.map((item) => (
                  <article className="health-record-detail-card" key={`full-visit-${item.id}`}>
                    <div className="health-record-detail-top">
                      <div>
                        <strong>{item.doctorName || item.doctor || item.clinicName || "Doctor / Clinic Visit"}</strong>
                        <span>{formatDate(item.appointmentDate || item.createdAt)}</span>
                      </div>
                      <span className="health-record-status">{item.status || item.paymentStatus || "Recorded"}</span>
                    </div>
                    <div className="health-record-meta-grid">
                      {item.appointmentTime && <div><small>Time</small><span>{item.appointmentTime}</span></div>}
                      {item.clinicName && <div><small>Clinic</small><span>{item.clinicName}</span></div>}
                      {item.specialization && <div><small>Specialization</small><span>{item.specialization}</span></div>}
                      {item.reason && <div><small>Reason</small><span>{item.reason}</span></div>}
                      {item.description && <div><small>Notes</small><span>{item.description}</span></div>}
                    </div>
                    <HealthRecordFields record={item} exclude={["id", "patientName", "patientEmail", "doctorName", "doctor", "clinicName", "appointmentDate", "appointmentTime", "specialization", "reason", "description", "createdAt", "status", "paymentStatus"]} />
                  </article>
                )) : (
                  <div className="health-empty-state compact">
                    <Stethoscope size={22} />
                    <span>No doctor visits have been recorded yet.</span>
                  </div>
                )}
              </section>

              <section className="health-record-detail-section">
                <div className="health-record-detail-heading">
                  <div><Pill size={18} /><strong>Prescriptions & Medical Orders</strong></div>
                  <span>{snapshot.prescriptions.length} record{snapshot.prescriptions.length === 1 ? "" : "s"}</span>
                </div>

                {snapshot.prescriptions.length ? snapshot.prescriptions.map((item) => (
                  <article className="health-record-detail-card" key={`full-prescription-${item.id}`}>
                    <div className="health-record-detail-top">
                      <div>
                        <strong>{item.medicineName || item.medicationName || item.medicalStoreName || "Medical Order / Prescription"}</strong>
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                      <span className="health-record-status">{item.status || "Recorded"}</span>
                    </div>
                    <div className="health-record-meta-grid">
                      {item.medicalStoreName && <div><small>Medical Store</small><span>{item.medicalStoreName}</span></div>}
                      {item.medicineName && <div><small>Medicine</small><span>{item.medicineName}</span></div>}
                      {item.quantity && <div><small>Quantity</small><span>{item.quantity}</span></div>}
                      {item.deliveryTime && <div><small>Delivery</small><span>{item.deliveryTime}</span></div>}
                      {item.paymentStatus && <div><small>Payment</small><span>{item.paymentStatus}</span></div>}
                    </div>
                    <HealthRecordFields record={item} exclude={["id", "patientName", "patientEmail", "medicalStoreName", "medicineName", "medicationName", "quantity", "deliveryTime", "paymentStatus", "createdAt", "status"]} />
                  </article>
                )) : (
                  <div className="health-empty-state compact">
                    <Pill size={22} />
                    <span>No prescriptions or medical orders have been recorded yet.</span>
                  </div>
                )}
              </section>
            </div>

            <div className="health-record-security-note">
              <Lock size={17} />
              <span>Only your authenticated patient account should access this record. Backend/database authorization must enforce this separation.</span>
            </div>
          </section>
        </div>
      )}

      {qrOpen && (
        <div className="popup-backdrop secure-qr-backdrop" onClick={() => setQrOpen(false)}>
          <section className="secure-qr-modal" onClick={(event) => event.stopPropagation()}>
            <div className="health-modal-top">
              <div>
                <span className="health-eyebrow">SECURE CLINICIAN ACCESS</span>
                <h2>Secure QR Access</h2>
                <p>The QR represents a secure reference/token. It does not contain your medical information directly.</p>
              </div>
              <button type="button" className="popup-close" onClick={() => setQrOpen(false)} aria-label="Close">×</button>
            </div>

            <div className="secure-qr-status-grid">
              <div><span>Status</span><strong>Ready</strong></div>
              <div><span>Access</span><strong>Authorized Clinician Only</strong></div>
              <div><span>Duration</span><strong>15 minutes</strong></div>
            </div>

            <div className="qr-code-stage" aria-label="Secure QR code placeholder">
              <div className="qr-grid">
                {Array.from({ length: 121 }, (_, index) => {
                  const row = Math.floor(index / 11);
                  const col = index % 11;
                  const inFinder = (r0, c0) => row >= r0 && row <= r0 + 4 && col >= c0 && col <= c0 + 4;
                  let isOn = false;
                  if (inFinder(0, 0) || inFinder(0, 6) || inFinder(6, 0)) {
                    const origins = [[0, 0], [0, 6], [6, 0]];
                    const origin = origins.find(([r0, c0]) => inFinder(r0, c0));
                    const rr = row - origin[0];
                    const cc = col - origin[1];
                    isOn = rr === 0 || rr === 4 || cc === 0 || cc === 4 || (rr === 2 && cc === 2);
                  } else {
                    const code = qrToken.charCodeAt(index % Math.max(qrToken.length, 1)) || 7;
                    isOn = ((index * 17 + code) % 5) < 2;
                  }
                  return <span key={index} className={isOn ? "qr-cell on" : "qr-cell"} />;
                })}
              </div>
              <strong>SECURE TOKEN</strong>
              <code>{qrToken}</code>
            </div>

            <div className="secure-qr-share-note">
              <Lock size={17} />
              <span>Share this QR only with your authorized clinician. The backend must validate the token, role and expiry before releasing the patient's record.</span>
            </div>

            <div className="secure-qr-footer">
              <span>Expires: {qrExpiresAt ? new Date(qrExpiresAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "15 minutes"}</span>
              <button type="button" className="health-record-primary" onClick={generateSecureQr}>Generate New QR</button>
            </div>
          </section>
        </div>
      )}

      <section className="privacy-indicator-section" aria-label="Health data protection">
        <div className="privacy-indicator-card">
          <div className="privacy-indicator-title">
            <div className="privacy-indicator-icon"><Lock size={18} /></div>
            <div><strong>Your Health Data is Protected</strong><span>Privacy is part of the record architecture.</span></div>
          </div>
          <div className="privacy-indicator-items">
            <span>✓ Authenticated access</span>
            <span>✓ Role-based authorization</span>
            <span>✓ Secure clinician access</span>
            <span>✓ Individual records are not available to administrators</span>
          </div>
        </div>
      </section>

      <footer className="footer home-footer">

        © 2026 VitaScan AI.
        All rights assigned to educational research.

      </footer>

    </main>
  );
}




// =====================================================
// BIOMARKER GUIDE
// =====================================================

function BiomarkerGuide() {
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");

  const filtered = biomarkerData.filter((item) =>
    `${item.report} ${item.title} ${item.english} ${item.hindi}`
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  );

  return (
    <>
      <main className="page biomarker-guide-page">
        <div className="page-inner">
          <h1>Biomarker Guide</h1>
          <p className="page-subtitle">
            Explore individual biomarkers and test parameters from all 20 VitaScan AI report types.
            Search any report, test name or biomarker to learn what it means.
          </p>

          <div className="guide-search-wrap">
            <Search size={19} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search CBC, MCV, Hemoglobin, TSH, LDL, Creatinine..."
              aria-label="Search biomarker guide"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")}>
                Clear
              </button>
            )}
          </div>

          <div className="guide-count">
            Showing {filtered.length} of {biomarkerData.length} biomarker guides • 20 report types
          </div>

          <div className="biomarker-grid">
            {filtered.map((item, index) => (
              <article
                className="bio-card guide-parameter-card"
                key={`${item.report}-${item.title}-${index}`}
                onClick={() => setSelected(item)}
              >
                <div className="guide-card-top">
                  <div className="bio-icon">{item.icon}</div>
                  <span className="guide-report-tag">{item.report}</span>
                </div>

                <h3>{item.title}</h3>

                <p className="guide-preview">
                  {item.english}
                </p>

                <p className="guide-preview hindi-text">
                  {item.hindi}
                </p>

                <button
                  type="button"
                  className="guide-details-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelected(item);
                  }}
                >
                  View details
                </button>
              </article>
            ))}
          </div>

          {!filtered.length && (
            <div className="service-empty guide-no-results">
              <Search size={32} />
              <h3>No biomarker found</h3>
              <p>
                Try a report name or parameter such as CBC, PCV, MCV, Hemoglobin,
                TSH, LDL, Creatinine, Vitamin D, Urine Protein or Dengue NS1.
              </p>
            </div>
          )}
        </div>
      </main>

      {selected && (
        <div className="popup-backdrop" onClick={() => setSelected(null)}>
          <div
            className="info-popup guide-popup"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="popup-top">
              <div className="popup-icon">{selected.icon}</div>
              <button
                className="popup-close"
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <span className="guide-report-tag popup-report-tag">
              {selected.report}
            </span>

            <h2>{selected.title}</h2>

            <div className="guide-language-block">
              <h3>English</h3>
              <p>{selected.english}</p>
            </div>

            <div className="guide-language-block hindi-text">
              <h3>हिंदी</h3>
              <p>{selected.hindi}</p>
            </div>

            <div className="guide-popup-note">
              Educational information only. Reference ranges can vary by laboratory,
              age, sex, pregnancy status and clinical context. A biomarker alone does
              not confirm a diagnosis.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// =====================================================
// COMPARE TWO BLOOD REPORTS
// =====================================================
function CompareReports() {
  const previousInputRef = useRef(null);
  const currentInputRef = useRef(null);
  const [previousFile, setPreviousFile] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [comparison, setComparison] = useState(null);

  const handleFile = (file, setter) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) {
      setError("Please upload JPG, PNG, WEBP or PDF reports.");
      return;
    }
    setError("");
    setter(file);
  };

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const compareReports = async () => {
    if (!previousFile || !currentFile) {
      setError("Please upload both the previous and current blood reports.");
      return;
    }
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setError("Gemini API key is missing. Add VITE_GEMINI_API_KEY to your .env file.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const [previousData, currentData] = await Promise.all([
        toBase64(previousFile),
        toBase64(currentFile),
      ]);
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
You are a medical laboratory report comparison assistant.
Compare the PREVIOUS laboratory report with the CURRENT laboratory report. Identify the report type(s) and compare equivalent visible parameters even when the reports contain different layouts or units.
Read only values actually visible. Never invent missing values. If a value is missing from either report, use "Not available". Match equivalent biomarkers. Compare numerical values and reference ranges when visible. Do not assume every increase is good or every decrease is bad. Explain the direction and clinical meaning simply. This is educational, not a diagnosis. Do not prescribe medicines.
Return ONLY valid JSON with:
overallStatus: one of "Improving", "Stable", "Needs Attention", "Mixed"
improvedCount: number
stableCount: number
attentionCount: number
biomarkers: array with parameter, previousValue, currentValue, change, direction, status, explanation, previousPercent, currentPercent.
direction: "increase", "decrease", "no significant change", or "not available".
status: "Improved", "Stable", "Needs Attention", "Mixed", or "Not Available".
previousPercent/currentPercent: 0-100 visual comparison values.
doctorNote: concise professional AI doctor's-note-style summary of the important changes, without diagnosis or prescription.
homeRemedies: 3-5 safe general wellness suggestions based only on the comparison; do not claim treatment.
periodSummary: one short overall summary of the change between reports.
`;
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [
          { inlineData: { mimeType: previousFile.type, data: previousData } },
          { inlineData: { mimeType: currentFile.type, data: currentData } },
          { text: prompt },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              overallStatus: { type: "string" },
              improvedCount: { type: "number" },
              stableCount: { type: "number" },
              attentionCount: { type: "number" },
              biomarkers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    parameter: { type: "string" },
                    previousValue: { type: "string" },
                    currentValue: { type: "string" },
                    change: { type: "string" },
                    direction: { type: "string" },
                    status: { type: "string" },
                    explanation: { type: "string" },
                    previousPercent: { type: "number" },
                    currentPercent: { type: "number" },
                  },
                  required: ["parameter","previousValue","currentValue","change","direction","status","explanation","previousPercent","currentPercent"],
                },
              },
              doctorNoteEnglish: { type: "string" },
              doctorNoteHindi: { type: "string" },
              actionableSteps: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    english: { type: "string" },
                    hindi: { type: "string" },
                  },
                  required: ["english", "hindi"],
                },
              },
              homeRemedies: { type: "array", items: { type: "string" } },
              periodSummary: { type: "string" },
            },
            required: [
              "overallStatus",
              "improvedCount",
              "stableCount",
              "attentionCount",
              "biomarkers",
              "doctorNoteEnglish",
              "doctorNoteHindi",
              "actionableSteps",
              "homeRemedies",
              "periodSummary",
            ],
          },
        },
      });
      setComparison(JSON.parse(response.text));
    } catch (err) {
  console.error(err);

  const message = err?.message || "";

  if (
    message.includes("429") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("quota") ||
    message.includes("Quota")
  ) {
    setError(
      "Gemini API quota exceeded. Please wait for the quota to reset or check your Google AI Studio billing and Rate Limits page."
    );
  } else {
    setError(
      message || "Unable to compare the reports. Please try again."
    );
  }
} finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setComparison(null);
    setPreviousFile(null);
    setCurrentFile(null);
    setError("");
  };

  const clean = (value = "") => value.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
  const arrow = (direction = "") => direction === "increase" ? "↑" : direction === "decrease" ? "↓" : "→";
  const width = (value) => `${Math.min(100, Math.max(0, Number(value) || 0))}%`;

  if (comparison) {
    return (
      <main className="page compare-page">
        <div className="compare-container">
          <div className="compare-heading">
            <div>
              <h1>Compare Blood Reports</h1>
              <p className="page-subtitle">Track how your visible blood biomarkers changed between reports.</p>
            </div>
            <button className="compare-reset-btn" onClick={reset}>Compare Again</button>
          </div>

          <section className="compare-summary-card">
            <div className="compare-summary-icon">📈</div>
            <div><span className="compare-summary-label">Overall Health Trend</span><h2>{comparison.overallStatus || "Mixed"}</h2><p>{comparison.periodSummary}</p></div>
          </section>

          <div className="compare-stat-grid">
            <div className="compare-stat improved"><strong>{comparison.improvedCount || 0}</strong><span>Improved</span></div>
            <div className="compare-stat stable"><strong>{comparison.stableCount || 0}</strong><span>Stable</span></div>
            <div className="compare-stat attention"><strong>{comparison.attentionCount || 0}</strong><span>Needs Attention</span></div>
          </div>

          <section className="comparison-card">
            <div className="comparison-card-header"><div><h2>Biomarker Changes</h2><p>Previous report compared with your current report</p></div></div>
            <div className="comparison-list">
              {comparison.biomarkers?.map((item, index) => (
                <article className="comparison-item" key={`${item.parameter}-${index}`}>
                  <div className="comparison-item-top"><strong>{item.parameter}</strong><span className={`comparison-status ${clean(item.status)}`}>{item.status}</span></div>
                  <div className="comparison-values">
                    <span>Previous: <b>{item.previousValue}</b></span>
                    <span>Current: <b>{item.currentValue}</b></span>
                    <span className={`change-value ${clean(item.status)}`}>{arrow(item.direction)} {item.change}</span>
                  </div>
                  <div className="comparison-bars">
                    <div className="bar-row"><span>Previous</span><div className="comparison-bar-track"><div className="comparison-bar previous" style={{ width: width(item.previousPercent) }} /></div></div>
                    <div className="bar-row"><span>Current</span><div className="comparison-bar-track"><div className="comparison-bar current" style={{ width: width(item.currentPercent) }} /></div></div>
                  </div>
                  <p className="comparison-explanation">{item.explanation}</p>
                </article>
              ))}
            </div>
          </section>

          <div className="comparison-bottom-grid">

            <section className="result-card comparison-doctor-card">
              <div className="result-card-header">
                <h2>Doctor's Note</h2>
                <span className="voice-button">🔊</span>
              </div>

              <div className="doctor-note-language">
                <h3>English</h3>
                <p>
                  {comparison.doctorNoteEnglish ||
                    comparison.doctorNote ||
                    "The comparison has been completed. Please review the biomarker changes above."}
                </p>
              </div>

              <div className="doctor-note-language hindi-note">
                <h3>हिंदी</h3>
                <p>
                  {comparison.doctorNoteHindi ||
                    "तुलना पूरी हो गई है। ऊपर दिए गए बायोमार्कर में हुए बदलावों की समीक्षा करें।"}
                </p>
              </div>
            </section>

            <section className="result-card comparison-action-card">
              <div className="result-card-header">
                <h2>Actionable Steps</h2>
                <span className="nutrition-icon">✓</span>
              </div>

              <ul className="action-list">
                {(comparison.actionableSteps?.length
                  ? comparison.actionableSteps
                  : [
                      {
                        english:
                          "Review any values that remain outside the reference range with a qualified healthcare professional.",
                        hindi:
                          "जो मान सामान्य सीमा से बाहर हैं, उनके बारे में योग्य स्वास्थ्य विशेषज्ञ से सलाह लें।",
                      },
                      {
                        english:
                          "Continue healthy daily habits and monitor future blood reports.",
                        hindi:
                          "स्वस्थ दैनिक आदतें जारी रखें और भविष्य की ब्लड रिपोर्ट की निगरानी करें।",
                      },
                      {
                        english:
                          "Do not start or stop medicines based only on this AI comparison.",
                        hindi:
                          "केवल इस AI तुलना के आधार पर कोई दवा शुरू या बंद न करें।",
                      },
                    ]
                ).map((item, index) => (
                  <li key={index}>
                    <strong>
                      {typeof item === "string" ? item : item.english}
                    </strong>
                    {typeof item !== "string" && (
                      <span className="action-hindi">{item.hindi}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section className="result-card comparison-remedy-card">
              <div className="result-card-header">
                <h2>🏠 Home Remedies</h2>
                <span className="nutrition-icon">🌿</span>
              </div>

              <ul className="remedy-list">
                {comparison.homeRemedies?.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>

              <p className="remedy-note">
                General wellness suggestions only; not a substitute for
                professional medical advice.
              </p>
            </section>

          </div>

          <div className="medical-warning"><strong>Important:</strong> This AI comparison is for educational purposes only and is not a medical diagnosis. Consult a qualified healthcare professional for medical decisions.</div>
          <button className="back-btn" onClick={reset}>← Compare Different Reports</button>
        </div>
      </main>
    );
  }

  return (
    <main className="page compare-page">
      <div className="compare-container">
        <div className="compare-title"><div className="compare-title-icon">📊</div><h1>Compare Blood Reports</h1><p className="page-subtitle">Upload two blood reports to understand what changed between the previous and current results.</p></div>
        <div className="compare-upload-grid">
          <section className="compare-upload-card"><div className="compare-upload-number">01</div><h2>Previous Report</h2><p className="compare-upload-label">Your older blood report</p><div className="compare-drop-zone" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0], setPreviousFile); }} onClick={() => previousInputRef.current?.click()}><Upload size={34}/><strong>{previousFile ? previousFile.name : "Upload previous report"}</strong><span>JPG, PNG, WEBP or PDF</span><input ref={previousInputRef} hidden type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => handleFile(e.target.files[0], setPreviousFile)}/></div></section>
          <div className="compare-arrow">→</div>
          <section className="compare-upload-card"><div className="compare-upload-number">02</div><h2>Current Report</h2><p className="compare-upload-label">Your latest blood report</p><div className="compare-drop-zone" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0], setCurrentFile); }} onClick={() => currentInputRef.current?.click()}><Upload size={34}/><strong>{currentFile ? currentFile.name : "Upload current report"}</strong><span>JPG, PNG, WEBP or PDF</span><input ref={currentInputRef} hidden type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => handleFile(e.target.files[0], setCurrentFile)}/></div></section>
        </div>
        {error && <div className="error-box">{error}</div>}
        <button
  className="compare-main-btn"
  onClick={compareReports}
  disabled={loading || !previousFile || !currentFile}
>
  {loading ? "Comparing..." : "Compare Reports"}
</button>
        {loading && <div className="loading-box compare-loading"><div className="loader"></div><h3>Comparing your blood reports...</h3><p>Gemini AI is reading both reports and identifying meaningful changes.</p></div>}
        <div className="compare-info"><strong>How it works</strong><span>VitaScan AI compares visible biomarkers from both reports, highlights increases and decreases, and generates a concise Doctor's Note and general home-care suggestions.</span></div>
      </div>
    </main>
  );
}


// =====================================================
// LOCATIONIQ + OPENSTREETMAP SERVICE PAGES
// =====================================================

let leafletPromise = null;

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    const cssId = "vitascan-leaflet-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const existing = document.querySelector('script[data-vitascan-leaflet="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.L));
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.defer = true;
    script.dataset.vitascanLeaflet = "true";
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("Map library could not be loaded."));
    document.head.appendChild(script);
  });

  return leafletPromise;
}

async function locationIqGeocode(region) {
  const apiKey = import.meta.env.VITE_LOCATIONIQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "LocationIQ API key is missing. Add VITE_LOCATIONIQ_API_KEY to your .env file."
    );
  }

  const params = new URLSearchParams({
    key: apiKey,
    format: "json",
    q: `${region}, India`,
    limit: "1",
    normalizeaddress: "1",
    dedupe: "1",
  });

  const response = await fetch(
    `https://us1.locationiq.com/v1/search?${params.toString()}`
  );

  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      detail = body?.error ? ` ${body.error}` : "";
    } catch {}
    throw new Error(`LocationIQ location search failed (${response.status}).${detail}`);
  }

  const data = await response.json();
  if (!Array.isArray(data) || !data.length) {
    throw new Error("Location not found. Enter a valid city, area or Indian PIN code.");
  }

  return {
    lat: Number(data[0].lat),
    lon: Number(data[0].lon),
    display: data[0].display_name || region,
  };
}

function locationIqNearbyTags(type) {
  return type === "doctor"
    ? "amenity:doctors,healthcare:doctor,healthcare:clinic,hospital"
    : "pharmacy,healthcare:pharmacy";
}

async function locationIqNearby(center, radiusKm, type) {
  const apiKey = import.meta.env.VITE_LOCATIONIQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "LocationIQ API key is missing. Add VITE_LOCATIONIQ_API_KEY to your .env file."
    );
  }

  const radiusMeters = Math.min(20000, Math.max(1000, radiusKm * 1000));
  const params = new URLSearchParams({
    key: apiKey,
    lat: String(center.lat),
    lon: String(center.lon),
    tag: locationIqNearbyTags(type),
    radius: String(radiusMeters),
    limit: "50",
    format: "json",
  });

  const response = await fetch(
    `https://us1.locationiq.com/v1/nearby?${params.toString()}`
  );

  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      detail = body?.error ? ` ${body.error}` : "";
    } catch {}
    throw new Error(`LocationIQ nearby search failed (${response.status}).${detail}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) return [];

  const seen = new Set();
  return data
    .map((item, index) => {
      const lat = Number(item.lat);
      const lon = Number(item.lon);
      const address = item.address || {};
      const name = item.name || address.name || (type === "doctor" ? "Doctor / Clinic" : "Medical Store");
      const addressText = item.display_name || [
        address.house_number,
        address.road,
        address.neighbourhood,
        address.suburb,
        address.city || address.town || address.village,
        address.state,
        address.postcode,
      ].filter(Boolean).join(", ") || "Address not listed";
      const distanceKm = Number.isFinite(Number(item.distance))
        ? Number(item.distance) / 1000
        : haversineKm(center.lat, center.lon, lat, lon);

      return {
        id: `${item.osm_type || "poi"}-${item.osm_id || item.place_id || index}`,
        name,
        address: addressText,
        lat,
        lon,
        distance: distanceKm,
        type: item.type || item.tag_type || type,
        category: item.class || "",
        rating: null,
        phone: item.phone || address.phone || null,
        mapsUrl: googleMapsSearchUrl(`${name} ${addressText}`),
      };
    })
    .filter((place) => {
      if (!Number.isFinite(place.lat) || !Number.isFinite(place.lon)) return false;
      const key = `${place.name}|${place.address}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return place.distance <= radiusKm;
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 50);
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function googleMapsSearchUrl(query) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
}

function googleMapsDirectionsUrl(lat, lon) {
  return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(`${lat},${lon}`);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[char]));
}

function LocationIQMap({ center, places, selectedId, onSelect }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      if (!center || !mapContainerRef.current) return;
      const L = await loadLeaflet();
      if (cancelled || !mapContainerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(mapContainerRef.current, {
          zoomControl: true,
          scrollWheelZoom: true,
        }).setView([center.lat, center.lon], 14);

        const locationIqToken =
          import.meta.env.VITE_LOCATIONIQ_TOKEN ||
          import.meta.env.VITE_LOCATIONIQ_API_KEY ||
          "";

        const tileUrl = locationIqToken
          ? `https://{s}-tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${locationIqToken}`
          : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

        L.tileLayer(tileUrl, {
          maxZoom: 19,
          attribution: locationIqToken
            ? '&copy; LocationIQ &copy; OpenStreetMap contributors'
            : '&copy; OpenStreetMap contributors',
        }).addTo(mapRef.current);
      } else {
        mapRef.current.setView([center.lat, center.lon], 14);
      }

      // Leaflet can calculate a wrong size when the map is created inside a grid
      // column that has just become visible. Recalculate it after the first paint.
      requestAnimationFrame(() => {
        if (mapRef.current) mapRef.current.invalidateSize();
      });

      if (markerLayerRef.current) markerLayerRef.current.clearLayers();
      else markerLayerRef.current = L.layerGroup().addTo(mapRef.current);

      L.marker([center.lat, center.lon], { title: "Searched location" })
        .addTo(markerLayerRef.current)
        .bindPopup(`<strong>Searched location</strong><br>${escapeHtml(center.display)}`);

      places.forEach((place) => {
        L.marker([place.lat, place.lon], { title: place.name })
          .bindPopup(`<strong>${escapeHtml(place.name)}</strong><br>${place.distance.toFixed(1)} km away`)
          .on("click", () => onSelect(place.id))
          .addTo(markerLayerRef.current);
      });

      if (places.length) {
        const bounds = L.latLngBounds([[center.lat, center.lon], ...places.map((place) => [place.lat, place.lon])]);
        mapRef.current.fitBounds(bounds.pad(0.15), { maxZoom: 15 });
      }
    };
    init().catch((error) => console.error("Leaflet map error:", error));
    return () => { cancelled = true; };
  }, [center, places, onSelect]);

  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const place = places.find((item) => item.id === selectedId);
    if (place) mapRef.current.setView([place.lat, place.lon], 16, { animate: true });
  }, [selectedId, places]);

  useEffect(() => () => {
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
  }, []);

  return (
    <div className="locationiq-map-wrap">
      <div ref={mapContainerRef} className="locationiq-map" />
      <div className="map-attribution-note">Map data &copy; OpenStreetMap contributors</div>
    </div>
  );
}

function PlaceCard({ place, type, selected, onClick, onApply }) {
  const ratingLabel =
    typeof place.rating === "number"
      ? place.rating.toFixed(1)
      : "Not listed";

  return (
    <article
      className={`place-card ${selected ? "selected" : ""}`}
      onClick={onClick}
    >
      <div className="place-card-top">
        <div className="place-type-icon">
          {type === "doctor" ? <Stethoscope size={22} /> : <Pill size={22} />}
        </div>
        <div className="place-title-wrap">
          <h3>{place.name}</h3>
          <div className="place-rating">
            <Star size={15} fill="currentColor" />
            <strong>{ratingLabel}</strong>
            <span>{place.rating ? "Listed rating" : "Rating not available"}</span>
          </div>
        </div>
      </div>

      <div className="place-info">
        <span><MapPin size={15} /> {place.address}</span>
        <span><Clock size={15} /> {place.distance.toFixed(1)} km away</span>
        {place.phone && <span>📞 {place.phone}</span>}
        {type === "medical" && <span className="delivery-badge">⚡ Delivery within 20 minutes · Cash on Delivery</span>}
      </div>

      <div className="place-actions">
        <a href={googleMapsDirectionsUrl(place.lat, place.lon)} target="_blank" rel="noreferrer" className="place-map-btn" onClick={e => e.stopPropagation()}>
          🧭 Directions
        </a>
        <a href={place.mapsUrl} target="_blank" rel="noreferrer" className="place-secondary-btn" onClick={e => e.stopPropagation()}>
          <ExternalLink size={15} /> Google Maps
        </a>
        <button
          type="button"
          className={type === "doctor" ? "apply-doctor-btn" : "apply-medical-btn"}
          onClick={event => {
            event.stopPropagation();
            onApply(place);
          }}
        >
          ✓ Apply
        </button>
      </div>
    </article>
  );
}

function AppointmentPanel({ clinic, onClose }) {
  const [form, setForm] = useState({
    patientName: "", mobile: "", address: "", age: "", description: "",
    appointmentDate: "", appointmentTime: "", document: null, documentName: "",
  });
  const [appointment, setAppointment] = useState(null);
  const [error, setError] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [bookingDone, setBookingDone] = useState(false);

  const updateField = (name, value) => setForm(prev => ({ ...prev, [name]: value }));

  const handleDocument = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Please upload a PDF, JPG, PNG or WEBP document.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Document must be 5 MB or smaller.");
      return;
    }
    setError("");
    updateField("document", file);
    updateField("documentName", file.name);
  };

  const submitForm = async event => {
    event.preventDefault();
    setError("");
    if (Object.entries(form).some(([key, value]) => key !== "document" && key !== "documentName" && !String(value).trim())) {
      setError("Please fill all appointment fields.");
      return;
    }
    if (!form.document) {
      setError("Please upload your medical document/report.");
      return;
    }
    if (!/^[0-9]{10}$/.test(form.mobile.trim())) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    const age = Number(form.age);
    if (!Number.isInteger(age) || age < 1 || age > 120) {
      setError("Please enter a valid age.");
      return;
    }
    try {
      const documentData = await fileToDataUrl(form.document);
      const created = createAppointment({
        clinicName: clinic.name, clinicAddress: clinic.address, clinicPhone: clinic.phone || "",
        patientName: form.patientName.trim(), mobile: form.mobile.trim(), address: form.address.trim(),
        age, description: form.description.trim(), appointmentDate: form.appointmentDate,
        appointmentTime: form.appointmentTime, documentName: form.documentName, documentData,
        documentType: form.document.type,
      });
      setAppointment(created);
      setPaymentOpen(true);
    } catch (err) {
      console.error(err);
      setError("Unable to save the document. Please try again with a smaller file.");
    }
  };

  const confirmPayment = () => {
    if (!appointment) return;
    markAppointmentPaid(appointment.id);
    setAppointment(prev => ({ ...prev, paymentStatus: "Paid", status: "Booked" }));
    setBookingDone(true);
  };

  return (
    <section className="appointment-panel" id="appointment-panel">
      <div className="appointment-panel-header">
        <div><span className="appointment-kicker">Appointment Request</span><h2>{clinic.name}</h2><p>{clinic.address}</p></div>
        <button type="button" className="appointment-close" onClick={onClose} aria-label="Close appointment form"><X size={19} /></button>
      </div>

      {!appointment && (
        <form className="appointment-form" onSubmit={submitForm}>
          <div className="appointment-grid">
            <label>Client / Patient Name *<input value={form.patientName} onChange={e => updateField("patientName", e.target.value)} placeholder="Enter full name" /></label>
            <label>Mobile Number *<input value={form.mobile} onChange={e => updateField("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" placeholder="10-digit mobile number" /></label>
            <label className="appointment-full">Client Address *<textarea value={form.address} onChange={e => updateField("address", e.target.value)} rows="3" placeholder="Enter complete address" /></label>
            <label>Age *<input type="number" min="1" max="120" value={form.age} onChange={e => updateField("age", e.target.value)} placeholder="Age" /></label>
            <label>Appointment Date *<input type="date" min={new Date().toISOString().split("T")[0]} value={form.appointmentDate} onChange={e => updateField("appointmentDate", e.target.value)} /></label>
            <label>Appointment Time *<input type="time" value={form.appointmentTime} onChange={e => updateField("appointmentTime", e.target.value)} /></label>
            <label className="appointment-full">Blood Report / Disease Description *<textarea value={form.description} onChange={e => updateField("description", e.target.value)} rows="5" placeholder="Describe your blood report findings, symptoms or health concern..." /></label>
            <label className="appointment-full document-upload-field">
              Medical Document / Report *
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={handleDocument} />
              <span className="document-help">Upload PDF, JPG, PNG or WEBP · Maximum 5 MB</span>
              {form.documentName && <strong className="document-selected">📎 {form.documentName}</strong>}
            </label>
          </div>
          {error && <div className="error-box">{error}</div>}
          <div className="appointment-form-actions">
            <button type="button" className="appointment-cancel-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="appointment-submit-btn">Submit & Continue to Payment →</button>
          </div>
        </form>
      )}

      {appointment && !bookingDone && paymentOpen && (
        <div className="payment-section">
          <div className="appointment-summary">
            <div><span>Appointment ID</span><strong>{appointment.id}</strong></div>
            <div><span>Clinic</span><strong>{appointment.clinicName}</strong></div>
            <div><span>Appointment</span><strong>{appointment.appointmentDate} · {appointment.appointmentTime}</strong></div>
            <div><span>Status</span><strong className="payment-pending">Payment Pending</strong></div>
          </div>
          <div className="qr-payment-card">
            <div className="qr-code-area"><div className="qr-fake" aria-label="Payment QR placeholder"><span>V</span><span>S</span><span>AI</span></div><strong>VitaScan AI Payment QR</strong><small>Replace this demo QR with the clinic's verified UPI QR.</small></div>
            <div className="payment-details"><span className="payment-label">Secure Appointment Payment</span><h3>Complete payment to book</h3><p>Scan the QR using your UPI application. After the payment is verified, the appointment will be marked as booked.</p><button type="button" className="payment-confirm-btn" onClick={confirmPayment}>✓ Payment Completed</button><small className="payment-demo-note">Prototype mode: this button simulates successful payment. Real payment verification must be connected to a backend.</small></div>
          </div>
        </div>
      )}

      {bookingDone && (
        <div className="booking-success">
          <div className="booking-success-icon">✓</div><span className="appointment-kicker">Appointment Confirmed</span><h2>Appointment Booked Successfully</h2>
          <p>Your appointment and uploaded document have been sent to the selected clinic.</p>
          <div className="booking-details">
            <div><span>Appointment ID</span><strong>{appointment.id}</strong></div><div><span>Clinic</span><strong>{appointment.clinicName}</strong></div>
            <div><span>Date</span><strong>{appointment.appointmentDate}</strong></div><div><span>Time</span><strong>{appointment.appointmentTime}</strong></div>
            <div><span>Document</span><strong>{appointment.documentName}</strong></div><div><span>Payment</span><strong className="paid-text">Paid ✓</strong></div>
          </div>
          <button type="button" className="appointment-submit-btn" onClick={onClose}>Done</button>
        </div>
      )}
    </section>
  );
}

function LocationIQPlaceFinder({ type }) {
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState(5);
  const [sort, setSort] = useState("distance");
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchedLocation, setSearchedLocation] = useState("");
  const [center, setCenter] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedClinic, setSelectedClinic] = useState(null);

  const search = async () => {
    if (!location.trim()) {
      setError("Enter your city, area or PIN code first.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setPlaces([]);
      setSelectedId(null);
      setSelectedClinic(null);

      const geocoded = await locationIqGeocode(location.trim());
      const found = await locationIqNearby(geocoded, radius, type);

      if (sort === "distance") {
        found.sort((a, b) => a.distance - b.distance);
      } else if (sort === "rating") {
        found.sort(
          (a, b) =>
            (b.rating || -1) - (a.rating || -1) ||
            a.distance - b.distance
        );
      }

      setCenter(geocoded);
      setPlaces(found);
      setSearchedLocation(geocoded.display);

      if (!found.length) {
        setError(
          `No nearby ${
            type === "doctor" ? "doctors or clinics" : "medical stores"
          } were found within ${radius} km. Try a larger radius or another PIN code.`
        );
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to search nearby places.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page service-page">
      <div className="service-container">
        <div className="service-hero">
          <div className="service-hero-icon">
            {type === "doctor" ? (
              <Stethoscope size={30} />
            ) : (
              <Pill size={30} />
            )}
          </div>

          <h1>
            {type === "doctor"
              ? "Connect to a Doctor"
              : "Find a Medical Store"}
          </h1>

          <p>
            {type === "doctor"
              ? "Find nearby doctors and clinics using LocationIQ and OpenStreetMap."
              : "Find nearby pharmacies and medical stores using LocationIQ and OpenStreetMap."}
          </p>
        </div>

        <section className="service-search-card">
          <div className="service-search-row">
            <div className="service-field">
              <label>Region / PIN Code</label>
              <div className="service-input">
                <MapPin size={18} />
                <input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && search()}
                  placeholder="e.g. 411044 or Akurdi"
                />
              </div>
            </div>

            <div className="service-field">
              <label>Search range: {radius} km</label>
              <input
                className="range-input"
                type="range"
                min="1"
                max="20"
                value={radius}
                onChange={e => setRadius(Number(e.target.value))}
              />
              <div className="range-labels">
                <span>1 km</span>
                <span>20 km</span>
              </div>
            </div>

            <div className="service-field">
              <label>Sort by</label>
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
              >
                <option value="distance">Closest first</option>
                <option value="rating">Highest listed rating</option>
              </select>
            </div>

            <button
              type="button"
              className="service-search-btn"
              onClick={search}
              disabled={loading}
            >
              <Search size={18} />
              {loading ? "Searching..." : "Find Nearby"}
            </button>
          </div>
        </section>

        <div className="google-data-note">
          <strong>Location search</strong>
          <span>
            Uses LocationIQ for geocoding and nearby places, with OpenStreetMap
            for the interactive map. Ratings are shown only when the returned
            listing contains rating data.
          </span>
        </div>

        {error && <div className="error-box">{error}</div>}

        {center && (
          <div className="service-results-header">
            <div>
              <h2>
                {type === "doctor"
                  ? "Nearby Doctors & Clinics"
                  : "Nearby Medical Stores"}
              </h2>
              <p>
                {places.length} result{places.length === 1 ? "" : "s"} within{" "}
                {radius} km of {searchedLocation}
              </p>
            </div>
          </div>
        )}

        {center && (
          <div className="service-results-layout">
            <LocationIQMap
              center={center}
              places={places}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />

            <div className="places-list">
              {places.length > 0 ? (
                places.map(place => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    type={type}
                    selected={selectedId === place.id}
                    onClick={() => setSelectedId(place.id)}
                    onApply={place => {
                      setSelectedId(place.id);
                      setSelectedClinic(place);
                      window.setTimeout(() => {
                        document.getElementById(type === "doctor" ? "appointment-panel" : "medical-order-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }, 50);
                    }}
                  />
                ))
              ) : (
                <div className="service-empty compact">
                  <Search size={34} />
                  <h3>No results yet</h3>
                  <p>
                    Try a larger radius or another nearby PIN code.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedClinic && type === "doctor" && (
          <AppointmentPanel clinic={selectedClinic} onClose={() => setSelectedClinic(null)} />
        )}

        {selectedClinic && type === "medical" && (
          <MedicalOrderPanel medical={selectedClinic} onClose={() => setSelectedClinic(null)} />
        )}

        {!loading && !center && !error && (
          <div className="service-empty">
            <Search size={34} />
            <h3>Search your area to begin</h3>
            <p>
              Enter a city, locality or PIN code. The default search radius is
              5 km.
            </p>
          </div>
        )}

        <div className="availability-note">
          <strong>Important</strong>
          <span>
            Opening hours, appointment availability and ratings can change.
            Verify the latest clinic information before visiting.
          </span>
        </div>
      </div>
    </main>
  );
}

// =====================================================
// CLINIC LOGIN / DOCTOR DASHBOARD
// =====================================================

function MedicalOrderPanel({ medical, onClose }) {
  const [form, setForm] = useState({ patientName: "", mobile: "", address: "", medicines: "", document: null, documentName: "" });
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  const updateField = (name, value) => setForm(prev => ({ ...prev, [name]: value }));

  const handleDocument = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) return setError("Please upload a PDF, JPG, PNG or WEBP document.");
    if (file.size > 5 * 1024 * 1024) return setError("Document must be 5 MB or smaller.");
    setError("");
    updateField("document", file);
    updateField("documentName", file.name);
  };

  const submit = async event => {
    event.preventDefault();
    setError("");
    if (!form.patientName.trim() || !form.mobile.trim() || !form.address.trim() || !form.medicines.trim()) {
      setError("Please fill all order fields.");
      return;
    }
    if (!/^[0-9]{10}$/.test(form.mobile.trim())) return setError("Please enter a valid 10-digit mobile number.");
    if (!form.document) return setError("Please upload the prescription/medical document.");
    try {
      const documentData = await fileToDataUrl(form.document);
      const created = createMedicalOrder({
        medicalName: medical.name,
        medicalStoreName: medical.name,
        medicalAddress: medical.address,
        medicalPhone: medical.phone || "",
        patientName: form.patientName.trim(),
        mobile: form.mobile.trim(),
        address: form.address.trim(),
        medicines: form.medicines.trim(),
        medicineName: form.medicines.trim(),
        documentName: form.documentName,
        documentData,
        documentType: form.document.type,
      });
      setOrder(created);
    } catch (err) {
      console.error(err);
      setError("Unable to save the document. Please try again with a smaller file.");
    }
  };

  return (
    <section className="appointment-panel medical-order-panel" id="medical-order-panel">
      <div className="appointment-panel-header">
        <div><span className="appointment-kicker">Medicine Order</span><h2>{medical.name}</h2><p>{medical.address}</p></div>
        <button type="button" className="appointment-close" onClick={onClose}><X size={19} /></button>
      </div>

      {!order ? (
        <form className="appointment-form" onSubmit={submit}>
          <div className="medical-service-info"><strong>⚡ Delivery within 20 minutes</strong><span>💵 Cash on Delivery · No online payment required</span></div>
          <div className="appointment-grid">
            <label>Patient Name *<input value={form.patientName} onChange={e => updateField("patientName", e.target.value)} placeholder="Enter full name" /></label>
            <label>Mobile Number *<input value={form.mobile} onChange={e => updateField("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" placeholder="10-digit mobile number" /></label>
            <label className="appointment-full">Delivery Address *<textarea value={form.address} onChange={e => updateField("address", e.target.value)} rows="3" placeholder="Enter complete delivery address" /></label>
            <label className="appointment-full">Medicine / Order Details *<textarea value={form.medicines} onChange={e => updateField("medicines", e.target.value)} rows="5" placeholder="Enter medicine names, quantities or prescription details..." /></label>
            <label className="appointment-full document-upload-field">Prescription / Medical Document *<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={handleDocument} /><span className="document-help">PDF, JPG, PNG or WEBP · Maximum 5 MB</span>{form.documentName && <strong className="document-selected">📎 {form.documentName}</strong>}</label>
          </div>
          {error && <div className="error-box">{error}</div>}
          <div className="appointment-form-actions"><button type="button" className="appointment-cancel-btn" onClick={onClose}>Cancel</button><button type="submit" className="appointment-submit-btn">Place Order · Cash on Delivery</button></div>
        </form>
      ) : (
        <div className="booking-success">
          <div className="booking-success-icon">✓</div><span className="appointment-kicker">Order Received</span><h2>Order Placed Successfully</h2>
          <p>{order.medicalName} has received your order. Your delivery is expected within 20 minutes.</p>
          <div className="booking-details">
            <div><span>Order ID</span><strong>{order.id}</strong></div><div><span>Medical Store</span><strong>{order.medicalName}</strong></div>
            <div><span>Delivery</span><strong>Within 20 minutes</strong></div><div><span>Payment</span><strong>Cash on Delivery</strong></div><div><span>Document</span><strong>{order.documentName}</strong></div>
          </div>
          <button type="button" className="appointment-submit-btn" onClick={onClose}>Done</button>
        </div>
      )}
    </section>
  );
}

function ClinicLogin() {
  const navigate = useNavigate();
  const [clinicName, setClinicName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = event => {
    event.preventDefault();
    setError("");

    if (!clinicName.trim() || !password) {
      setError("Enter clinic name and password.");
      return;
    }

    if (password !== CLINIC_PASSWORD) {
      setError("Incorrect clinic password.");
      return;
    }

    sessionStorage.setItem(
      "vitascan_clinic_user",
      clinicName.trim()
    );
    navigate("/clinic-dashboard", { replace: true });
  };

  return (
    <main className="clinic-auth-page">
      <div className="clinic-auth-card">
        <div className="clinic-auth-icon">
          <Stethoscope size={30} />
        </div>

        <h1>Clinic Login</h1>
        <p>
          Login using the clinic name exactly as it appears in the nearby
          clinic listing.
        </p>

        <form className="clinic-auth-form" onSubmit={submit}>
          <label>
            Clinic Name / Login ID
            <input
              value={clinicName}
              onChange={e => setClinicName(e.target.value)}
              placeholder="Clinic name"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
            />
          </label>

          {error && <div className="error-box">{error}</div>}

          <button type="submit" className="clinic-login-btn">
            Login to Clinic
          </button>
        </form>

        <div className="clinic-login-note">
          <strong>Prototype clinic password</strong>
          <span>{CLINIC_PASSWORD}</span>
          <small>
            For production, use secure clinic-specific authentication instead
            of a shared password.
          </small>
        </div>
      </div>
    </main>
  );
}

function ClinicDashboard() {
  const navigate = useNavigate();
  const [clinicName, setClinicName] = useState(
    () => sessionStorage.getItem("vitascan_clinic_user") || ""
  );
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    if (!clinicName) {
      navigate("/clinic-login", { replace: true });
      return;
    }

    const loadAppointments = () => {
      const clinicId = clinicKey(clinicName);

      const booked = readAppointments().filter(
        item =>
          item.clinicId === clinicId &&
          item.paymentStatus === "Paid" &&
          item.status === "Booked"
      );

      setAppointments(booked);
    };

    loadAppointments();
    const timer = window.setInterval(loadAppointments, 1000);

    return () => window.clearInterval(timer);
  }, [clinicName, navigate]);

  const logout = () => {
    sessionStorage.removeItem("vitascan_clinic_user");
    setClinicName("");
    navigate("/clinic-login", { replace: true });
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <main className="clinic-dashboard-page">
      <div className="clinic-dashboard-container">
        <header className="clinic-dashboard-header">
          <div>
            <span className="clinic-portal-label">
              VitaScan AI · Doctor Portal
            </span>
            <h1>{clinicName}</h1>
            <p>
              Only paid and confirmed appointments for this clinic are shown.
            </p>
          </div>

          <button
            type="button"
            className="clinic-logout-btn"
            onClick={logout}
          >
            Logout
          </button>
        </header>

        <div className="clinic-stats">
          <div>
            <strong>{appointments.length}</strong>
            <span>Booked Appointments</span>
          </div>

          <div>
            <strong>
              {
                appointments.filter(
                  item => item.appointmentDate === today
                ).length
              }
            </strong>
            <span>Today's Appointments</span>
          </div>

          <div>
            <strong>PAID</strong>
            <span>Payment Status</span>
          </div>
        </div>

        {!appointments.length ? (
          <div className="clinic-empty">
            <Stethoscope size={38} />
            <h2>No paid appointments yet</h2>
            <p>
              When a patient completes an appointment payment for this clinic,
              the appointment will appear here.
            </p>
          </div>
        ) : (
          <div className="clinic-appointments">
            {appointments.map(item => (
              <article className="clinic-appointment-card" key={item.id}>
                <div className="clinic-appointment-top">
                  <div>
                    <span>Appointment ID</span>
                    <strong>{item.id}</strong>
                  </div>
                  <b className="paid-badge">✓ Paid · Booked</b>
                </div>

                <div className="clinic-patient-grid">
                  <div>
                    <span>Patient Name</span>
                    <strong>{item.patientName}</strong>
                  </div>

                  <div>
                    <span>Mobile</span>
                    <strong>{item.mobile}</strong>
                  </div>

                  <div>
                    <span>Age</span>
                    <strong>{item.age}</strong>
                  </div>

                  <div>
                    <span>Appointment Date</span>
                    <strong>{item.appointmentDate}</strong>
                  </div>

                  <div>
                    <span>Appointment Time</span>
                    <strong>{item.appointmentTime}</strong>
                  </div>

                  <div className="patient-full">
                    <span>Patient Address</span>
                    <strong>{item.address}</strong>
                  </div>

                  <div className="patient-full">
                    <span>Blood Report / Disease Description</span>
                    <p>{item.description}</p>
                  </div>

                  <div className="patient-full appointment-document-row">
                    <span>Uploaded Medical Document</span>
                    <strong>{item.documentName || "No document uploaded"}</strong>
                    {item.documentData && (
                      <button
                        type="button"
                        className="view-document-btn"
                        onClick={() => {
                          const win = window.open();
                          if (win) {
                            win.document.write(`<title>${escapeHtml(item.documentName || "Medical Document")}</title><iframe src="${item.documentData}" style="width:100%;height:100vh;border:0"></iframe>`);
                            win.document.close();
                          }
                        }}
                      >
                        📄 View Document
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ConnectDoctor() {
  return <LocationIQPlaceFinder type="doctor" />;
}

function MedicalStores() {
  return <LocationIQPlaceFinder type="medical" />;
}


function ContactUs() {
  const members = [
    { name: "Rahul Laxman Bhoi", email: "rahulbhoi872@gmail.com" },
    { name: "Vaibhav Harishchandra Devram", email: "vaibhavdevram7@gmail.com" },
    { name: "Siddhesh Vilas Chaudhari", email: "siddheshchaudhari655@gmail.com" },
    { name: "Manish Sandip Bagul", email: "bagulmanish570@gmail.com" },
    { name: "Adesh Kalyan Bhandwalkar", email: "adiibhandwalkar@gmail.com" },
    { name: "Sakshi Balasaheb Belote", email: "sakshibelote046@gmail.com" },

  ];

  return (
    <main className="page contact-page">
      <div className="contact-container">
        <div className="service-hero">
          <div className="service-hero-icon"><Mail size={30} /></div>
          <h1>Contact Us</h1>
          <p>For business enquiries, feedback and collaboration.</p>
        </div>

        <div className="contact-team-grid">
          {members.map((member, index) => (
            <a className="contact-member-card" href={`mailto:${member.email}`} key={member.email}>
              <div className="contact-member-number">{index + 1}</div>
              <div className="contact-member-info">
                <span>Team Member</span>
                <strong>{member.name}</strong>
                <small>{member.email}</small>
              </div>
              <Mail size={20} />
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}

// =====================================================
// APP GUIDELINES
// =====================================================

function Guidelines() {
  const [selected, setSelected] = useState(null);

  const guidelineItems = [
    { icon: "📄", title: "1. Upload a Blood Report", text: "Upload a clear JPG, PNG or WEBP image of your blood report. Make sure the report is readable and the important values are visible." },
    { icon: "🔍", title: "2. Analyze Your Report", text: "After selecting your report, use the Analyze option to let VitaScan AI read the visible laboratory values and organize them into an easy-to-understand result." },
    { icon: "📊", title: "3. Understand Biomarkers", text: "Review the biomarker table and status indicators. Use the Biomarker Guide to learn the basic meaning of common blood parameters in simple language." },
    { icon: "⚠️", title: "4. Check Risk Information", text: "Review the displayed risk level and explanations carefully. Risk information is an AI-generated educational summary and should not be treated as a medical diagnosis." },
    { icon: "📝", title: "5. Read the AI Doctor's Note", text: "The AI Doctor's Note summarizes important observations from the uploaded report. Read it together with the biomarker results rather than relying on the note alone." },
    { icon: "🥗", title: "6. Follow General Wellness Tips", text: "Home remedies and actionable steps are general wellness suggestions. Do not use them as a replacement for medicines or professional medical treatment." },
    { icon: "📈", title: "7. Compare Two Reports", text: "Use Compare Reports to upload a previous and current report and view visible biomarker changes, trends and simple explanations." },
    { icon: "🕘", title: "8. Use Recent Chats", text: "When logged in, analyzed reports can appear in Recent Chats for the current account. This helps you review previous analysis results during your session." },
    { icon: "👨‍⚕️", title: "9. Connect to a Doctor", text: "Use Connect to Doctor to explore available nearby doctor or healthcare place information. Verify current availability, ratings and contact details before visiting." },
    { icon: "💊", title: "10. Find Medical Stores", text: "Use the Medical Stores section to explore nearby medical stores. Confirm medicine availability, price and delivery details directly with the selected store." },
    { icon: "🔐", title: "11. Protect Your Personal Information", text: "Avoid uploading unnecessary personally identifiable information. Review the Privacy section to understand how the application handles report and account-related data." },
    { icon: "🚨", title: "12. When to Contact a Professional", text: "If a report shows concerning values, or if you have symptoms or health concerns, consult a qualified healthcare professional. VitaScan AI is an educational assistance tool and does not replace professional care." },
  ];

  return (
    <>
      <main className="page guidelines-page">
        <div className="page-inner">
          <h1>App Guidelines</h1>
          <p className="page-subtitle">Follow these simple steps to use VitaScan AI safely and effectively.</p>

          <div className="guidelines-grid">
            {guidelineItems.map((item) => (
              <article className="guideline-card" key={item.title} onClick={() => setSelected(item)}>
                <div className="guideline-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>

          <div className="guidelines-disclaimer">
            <strong>Important:</strong>
            <span>VitaScan AI provides AI-generated educational information from uploaded reports. It does not diagnose diseases, prescribe medicines, or replace a qualified doctor.</span>
          </div>
        </div>
      </main>

      {selected && (
        <InfoPopup icon={selected.icon} title={selected.title} text={selected.text} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

// =====================================================
// PRIVACY PAGE
// =====================================================

function Privacy() {
  const [selected, setSelected] = useState(null);

  const privacyItems = [
    { title: "1. Report Data Handling", text: "VitaScan AI is designed not to permanently store uploaded blood-report files on the application server. Report processing should be limited to the purpose of generating the requested analysis." },
    { title: "2. Recent Reports", text: "When you are logged in, recent analysis results can be associated with your account in browser storage so that they can appear in Recent Chats. These results are removed when you log out according to the application's current session behavior." },
    { title: "3. Logout & Session Privacy", text: "Logging out clears the current session and removes the user's recent-report data from the browser storage used by VitaScan AI. Your account profile can remain available for a future login." },
    { title: "4. AI Processing", text: "Uploaded reports may be processed through the configured Gemini API. Avoid including unnecessary personal identifiers in a report before uploading it." },
    { title: "5. Secure Data Transfer", text: "When the application is deployed over HTTPS, data transferred between the browser and the application is protected using encrypted HTTPS/TLS communication. Do not use an untrusted network for sensitive information." },
    { title: "6. Local Browser Storage", text: "VitaScan AI uses browser storage for account/session and recent-report functionality. Clear your browser's site data if you want to remove locally stored application information outside the normal logout flow." },
    { title: "7. Password Safety", text: "Use a strong, unique password for your VitaScan AI account and never share it with another person. Do not reuse an important banking, email or social-media password." },
    { title: "8. Minimal Personal Information", text: "Only provide information needed to use the application. Avoid uploading documents containing unnecessary phone numbers, addresses, identity numbers or other sensitive personal information." },
    { title: "9. Third-Party Services", text: "Some features may rely on third-party services such as the Gemini API or location/place data services. Their handling of data is governed by their respective policies and terms." },
    { title: "10. Medical Privacy", text: "Blood reports can contain sensitive health information. Share your reports only with people or healthcare professionals you trust and avoid posting report screenshots publicly." },
    { title: "11. Device Security", text: "Protect the device and browser used to access VitaScan AI with a screen lock, updated software and a trusted user account. Anyone with access to an unlocked device may be able to access locally stored application data." },
    { title: "12. Educational Use", text: "VitaScan AI is an educational health-information tool. AI results may be incomplete or incorrect and must not be treated as a confirmed diagnosis, prescription or emergency medical advice." },
  ];

  return (
    <>
      <main className="page privacy-page">
        <div className="page-inner">
          <h1>Privacy Policy</h1>
          <p className="page-subtitle">Your health data is your own. Here is how VitaScan AI is designed to handle privacy, storage and responsible use.</p>

          <div className="privacy-grid">
            {privacyItems.map((item) => (
              <article className="privacy-card" key={item.title} onClick={() => setSelected(item)}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>

          <div className="privacy-note">
            <strong>Privacy reminder:</strong>
            <span>Do not upload unnecessary personally identifiable information. Always verify the latest privacy terms of any third-party service used by the deployed version of VitaScan AI.</span>
          </div>
        </div>
      </main>

      {selected && (
        <InfoPopup title={selected.title} text={selected.text} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

// =====================================================
// POPUP
// =====================================================

function InfoPopup({
  icon,
  title,
  text,
  onClose,
}) {

  return (

    <div
      className="popup-backdrop"

      onClick={onClose}
    >

      <div
        className="info-popup"

        onClick={(event) =>
          event.stopPropagation()
        }
      >

        <div className="popup-top">

          <div className="popup-icon">
            {icon || "🔐"}
          </div>


          <button
            className="popup-close"

            onClick={onClose}
          >

            <X size={18} />

          </button>

        </div>


        <h2>
          {title}
        </h2>


        <p>
          {text}
        </p>

      </div>

    </div>

  );
}


// =====================================================
// ANALYZE
// =====================================================

function Analyze({
  file,
  onClear,
}) {

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [report, setReport] =
    useState(null);


  // ---------------------------------------------------
  // FILE TO BASE64
  // ---------------------------------------------------

  const fileToBase64 = (
    selectedFile
  ) => {

    return new Promise(
      (resolve, reject) => {

        const reader =
          new FileReader();


        reader.onload = () => {

          resolve(
            reader.result.split(",")[1]
          );

        };


        reader.onerror = reject;


        reader.readAsDataURL(
          selectedFile
        );

      }
    );

  };


  // ---------------------------------------------------
  // GEMINI ANALYSIS
  // ---------------------------------------------------

  const analyzeReport =
    async () => {

      if (!file) {

        setError(
          "Please upload a blood report first."
        );

        return;

      }


      const apiKey =
        import.meta.env
          .VITE_GEMINI_API_KEY;


      if (!apiKey) {

        setError(
          "Gemini API key is missing. Add VITE_GEMINI_API_KEY to your .env file."
        );

        return;

      }


      try {

        setLoading(true);

        setError("");


        const base64Image =
          await fileToBase64(file);


        const ai =
          new GoogleGenAI({
            apiKey,
          });


        // ------------------------------------------------
        // AI PROMPT
        // ------------------------------------------------

        const prompt = `

You are a medical laboratory report analysis assistant.

Analyze the uploaded laboratory report image carefully. It may be any one of these 20 report types: CBC, Lipid Profile, LFT, KFT, Thyroid, HbA1c, Blood Sugar, Vitamin D, Vitamin B12, Iron Profile, Calcium, Electrolytes, CRP, ESR, Uric Acid, Urine R/E, Urine Culture, Stool Routine, Dengue, or Malaria.

IMPORTANT:

- Read only values that are actually visible in the report.
- Do not invent missing values.
- If a value cannot be read, mark it as "Not available".
- Identify the report type first and set reportType to the closest supported type.
- Compare values with the reference range printed on the report whenever visible; otherwise use cautious general ranges only when appropriate.
- Analyze all visible parameters relevant to the detected report type, not just blood CBC markers.
- This is an educational application, not a medical diagnosis.
- Use clear and simple English.
- Also provide a Hindi summary.
- Do not diagnose diseases.
- Do not recommend prescription medicines.

Return ONLY valid JSON matching the requested structure.

The application needs:

1. Biomarker table
2. Doctor's note
3. Hindi summary
4. Actionable steps
5. AI nutrition plan
6. Home remedies
7. Overall health risk assessment

For every biomarker provide:

- parameter
- result
- normalRange
- status
- visualPercent

Status should normally be:

Normal
Low
High
Undetermined

visualPercent should be a number from 0 to 100.

HOME REMEDIES:

Provide 3 to 5 simple general wellness suggestions based ONLY on the visible findings.

Do not claim that a home remedy can cure a disease.

Do not recommend prescription medicines.

Keep suggestions safe and educational.

HEALTH RISK:

Provide an educational overall risk assessment based on visible abnormal laboratory findings.

Do not diagnose a disease.

riskLevel must be exactly one of:

"No Risk"
"Low Risk"
"Moderate Risk"
"High Risk"
"Very High Risk"

riskScore must be a number from 0 to 100.

0 means no apparent risk from the visible values.

Higher scores indicate more concerning abnormalities.

If important information is missing, use:

riskLevel = "Undetermined"

and provide a reasonable riskScore.

`;


        // ------------------------------------------------
        // GEMINI REQUEST
        // ------------------------------------------------

        const response =
          await ai.models.generateContent({

            model: "gemini-3.1-flash-lite",

            contents: [

              {
                inlineData: {

                  mimeType:
                    file.type,

                  data:
                    base64Image,

                },

              },

              {
                text:
                  prompt,
              },

            ],


            config: {

              responseMimeType:
                "application/json",


              responseSchema: {

                type: "object",


                properties: {

                  reportType: { type: "string" },

                  biomarkers: {

                    type: "array",

                    items: {

                      type: "object",

                      properties: {

                        parameter: {
                          type: "string",
                        },

                        result: {
                          type: "string",
                        },

                        normalRange: {
                          type: "string",
                        },

                        status: {
                          type: "string",
                        },

                        visualPercent: {
                          type: "number",
                        },

                      },


                      required: [

                        "parameter",

                        "result",

                        "normalRange",

                        "status",

                        "visualPercent",

                      ],

                    },

                  },


                  doctorNote: {
                    type: "string",
                  },


                  hindiSummary: {
                    type: "string",
                  },


                  actionableSteps: {

                    type: "array",

                    items: {
                      type: "string",
                    },

                  },


                  nutritionPlan: {

                    type: "array",

                    items: {
                      type: "string",
                    },

                  },


                  homeRemedies: {

                    type: "array",

                    items: {
                      type: "string",
                    },

                  },


                  riskLevel: {
                    type: "string",
                  },


                  riskScore: {
                    type: "number",
                  },

                },


                required: [

                  "reportType",

                  "biomarkers",

                  "doctorNote",

                  "hindiSummary",

                  "actionableSteps",

                  "nutritionPlan",

                  "homeRemedies",

                  "riskLevel",

                  "riskScore",

                ],

              },

            },

          });


        // ------------------------------------------------
        // PARSE RESULT
        // ------------------------------------------------

        const result =
          JSON.parse(
            response.text
          );


        setReport(result);
        saveRecentReport(getCurrentUser(), file?.name, result);
        sessionStorage.setItem("vitascan_active_report", JSON.stringify(result));
        sessionStorage.setItem("vitascan_active_file", file?.name || "Blood Report");

      }


    catch (err) {

  console.error(err);

  const message = err?.message || "";

  if (
    message.includes("429") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("quota") ||
    message.includes("Quota")
  ) {
    setError(
      "Gemini API quota exceeded. Please wait for the quota to reset or check your Google AI Studio billing and Rate Limits page."
    );
  } else {
    setError(
      message ||
      "Unable to analyze the report. Please try again."
    );
  }

}


      finally {

        setLoading(false);

      }

    };


  // ---------------------------------------------------
  // REPORT RESULT
  // ---------------------------------------------------

  if (report) {

    return (

      <section className="analysis-section">

        <AnalysisResult

          report={report}

          onBack={() => {

            setReport(null);

            onClear?.();

          }}

        />

      </section>

    );

  }


  // ---------------------------------------------------
  // ANALYZE BUTTON
  // ---------------------------------------------------

  return (

    <section className="analysis-section">

      <div className="analyze-inner">

        {!loading && (

          <button
            className="analyze-main-btn"

            onClick={analyzeReport}
          >

            Analyze Blood Report

          </button>

        )}


        {error && (

          <div className="error-box">
            {error}
          </div>

        )}


        {loading && (

          <div className="loading-box">

            <div className="loader"></div>

            <h3>
              Analyzing your blood report...
            </h3>

            <p>
              Gemini AI is reading the
              visible biomarkers and
              preparing your report.
            </p>

          </div>

        )}


        <div className="api-note">

          <strong>
            AI Analysis
          </strong>

          <span>
            Your uploaded image is sent
            to Gemini for analysis and the
            returned data is displayed in
            the report below.
          </span>

        </div>

      </div>

    </section>

  );
}


// =====================================================
// ANALYSIS RESULT
// =====================================================

function AnalysisResult({
  report,
  onBack,
}) {

  const currentUser = getCurrentUser();
  const [recordAdded, setRecordAdded] = useState(false);

  const addToHealthRecord = () => {
    if (!currentUser || !report) {
      setRecordAdded(false);
      return;
    }

    const fileName = sessionStorage.getItem("vitascan_active_file") || "Blood Report";
    const history = readRecentReports(currentUser);
    const matchIndex = history.findIndex(item => item.fileName === fileName);

    if (matchIndex >= 0) {
      history[matchIndex] = {
        ...history[matchIndex],
        healthRecordAddedAt: new Date().toISOString(),
      };
      localStorage.setItem(userReportKey(currentUser), JSON.stringify(history.slice(0, 20)));
    } else {
      saveRecentReport(currentUser, fileName, report);
    }

    setRecordAdded(true);
  };

  const today =
    new Date().toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );


  // ---------------------------------------------------
  // RISK SCORE
  // ---------------------------------------------------

  const rawScore =
    Number(report.riskScore);


  const riskScore =
    Math.min(
      100,
      Math.max(
        0,
        Number.isFinite(rawScore)
          ? rawScore
          : 0
      )
    );


  const riskLevel =
    report.riskLevel ||
    "Undetermined";


  // Three colour risk category:
  // Green = No Risk, Yellow = Low/Moderate, Red = High/Very High.
  const riskClass =
    riskLevel === "No Risk" || riskScore <= 20
      ? "risk-green"
      : riskLevel === "High Risk" ||
        riskLevel === "Very High Risk" ||
        riskScore >= 67
      ? "risk-red"
      : "risk-yellow";


  return (

    <main className="analysis-page">

      <div className="analysis-container">


        {/* ==========================================
            HEADER
            ========================================== */}

        <div className="analysis-header">

          <div>

            <h1>
              Analysis Report {report.reportType ? `— ${report.reportType}` : ""}
            </h1>


            <button
              className="download-btn"

              onClick={() =>
                window.print()
              }
            >
              📄 Download PDF
            </button>

          </div>


          <div className="report-meta">

            <span>
              Report Date:
              {" "}
              {today}
            </span>


            <span>

              Confidence:

              <b className="confidence-high">
                High
              </b>

            </span>

          </div>

        </div>


        {/* ==========================================
            BIOMARKER TABLE
            ========================================== */}

        <section className="analysis-card">

          <h2>
            Biomarker Table
          </h2>


          <div className="table-wrapper">

            <table>

              <thead>

                <tr>

                  <th>
                    Parameter
                  </th>

                  <th>
                    Result
                  </th>

                  <th>
                    Normal Range
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Visual Scale
                  </th>

                </tr>

              </thead>


              <tbody>

                {report.biomarkers?.map(
                  (item, index) => {

                    const status =
                      item.status ||
                      "Undetermined";


                    const statusClass =
                      status
                        .toLowerCase()
                        .replace(
                          " ",
                          "-"
                        );


                    return (

                      <tr key={index}>

                        <td>

                          <u>
                            {item.parameter}
                          </u>

                        </td>


                        <td>

                          <strong>
                            {item.result}
                          </strong>

                        </td>


                        <td>
                          {item.normalRange}
                        </td>


                        <td>

                          <span
                            className={`status ${statusClass}`}
                          >
                            {status}
                          </span>

                        </td>


                        <td>

                          <div className="visual-scale">

                            <div

                              className={`visual-fill ${statusClass}`}

                              style={{

                                width:
                                  `${Math.min(
                                    100,
                                    Math.max(
                                      0,
                                      Number(
                                        item.visualPercent
                                      ) || 50
                                    )
                                  )}%`,

                              }}

                            ></div>

                          </div>

                        </td>

                      </tr>

                    );

                  }
                )}

              </tbody>

            </table>

          </div>

        </section>


        {/* ==========================================
            EXISTING RESULT CARDS
            ========================================== */}

        <div className="analysis-grid">


          {/* DOCTOR NOTE */}

          <section className="result-card">

            <div className="result-card-header">

              <h2>
                Doctor's Note
              </h2>

              <span className="voice-button">
                🔊
              </span>

            </div>


            <p>
              {report.doctorNote}
            </p>

          </section>


          {/* HINDI */}

          <section className="result-card">

            <div className="result-card-header">

              <h2>
                हिंदी सारांश (Hindi)
              </h2>

              <span className="voice-button">
                🔊
              </span>

            </div>


            <p className="hindi-text">
              {report.hindiSummary}
            </p>

          </section>


          {/* ACTIONABLE STEPS */}

          <section className="result-card">

            <div className="result-card-header">

              <h2>
                Actionable Steps
              </h2>

            </div>


            <ul className="action-list">

              {report.actionableSteps?.map(
                (step, index) => (

                  <li key={index}>
                    {step}
                  </li>

                )
              )}

            </ul>

          </section>


          {/* NUTRITION */}

          <section className="result-card nutrition-card">

            <div className="result-card-header">

              <h2>
                AI Nutrition Plan
              </h2>

              <span className="nutrition-icon">
                🍎
              </span>

            </div>


            <ul>

              {report.nutritionPlan?.map(
                (item, index) => (

                  <li key={index}>
                    {item}
                  </li>

                )
              )}

            </ul>

          </section>


          {/* ==========================================
              HOME REMEDIES
              ========================================== */}

          <section className="result-card home-remedies-card">

            <div className="result-card-header">

              <h2>
                🏠 Home Remedies
              </h2>

              <span className="nutrition-icon">
                🌿
              </span>

            </div>


            <ul className="remedy-list">

              {report.homeRemedies?.map(
                (item, index) => (

                  <li key={index}>
                    {item}
                  </li>

                )
              )}

            </ul>


            <p className="remedy-note">

              These are general wellness
              suggestions based on the visible
              report findings. They are not a
              substitute for professional medical
              advice.

            </p>

          </section>


          {/* ==========================================
              HEALTH RISK SPEEDOMETER
              ========================================== */}

          <section className="result-card risk-card">

            <div className="result-card-header">

              <h2>
                🎯 Health Risk Score
              </h2>

            </div>


            <div
              className={`risk-gauge ${riskClass}`}

              style={{
                "--risk-score":
                  `${riskScore}%`,
              }}
            >

              <div className="gauge-inner">

                <strong>
                  {Math.round(
                    riskScore
                  )}
                </strong>

                <span>
                  / 100
                </span>

              </div>

            </div>


            <div className="risk-label">

              {riskLevel}

            </div>


            <p className="risk-description">

              This score is an educational
              assessment based on the visible
              laboratory values. It is not a
              medical diagnosis.

            </p>

            <div className="risk-legend">
              <span className="risk-legend-item green">
                <i></i> No Risk
              </span>
              <span className="risk-legend-item yellow">
                <i></i> Low / Moderate
              </span>
              <span className="risk-legend-item red">
                <i></i> High / Very High
              </span>
            </div>

          </section>


        </div>


        <div className="health-record-add-bar">
          <div>
            <div className="health-record-add-icon"><FileText size={18} /></div>
            <div>
              <strong>Add this report to My Health Record</strong>
              <span>Keep this analyzed report connected to your longitudinal patient history.</span>
            </div>
          </div>
          <button type="button" className="health-record-primary" onClick={addToHealthRecord}>
            {recordAdded ? "Added to Health Record ✓" : "Add to Health Record"}
          </button>
        </div>

        {/* ==========================================
            MEDICAL WARNING
            ========================================== */}

        <div className="medical-warning">

          <strong>
            Important:
          </strong>

          {" "}

          This AI-generated report is for
          educational purposes only and is not
          a medical diagnosis. Please consult
          a qualified healthcare professional
          for medical decisions.

        </div>


        {/* ==========================================
            BACK BUTTON
            ========================================== */}

        <button
          className="back-btn"

          onClick={onBack}
        >

          ← Analyze Another Report

        </button>


      </div>

    </main>

  );
}


// =====================================================
// START REACT
// =====================================================

createRoot(
  document.getElementById("root")
).render(

  <BrowserRouter>

    <Layout />

  </BrowserRouter>

);