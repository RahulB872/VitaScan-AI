import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCNs9rhLPNQISH9h59q7z_NzA3b5ZD4kNs",
  authDomain: "vitascan-ai-da758.firebaseapp.com",
  projectId: "vitascan-ai-da758",
  storageBucket: "vitascan-ai-da758.firebasestorage.app",
  messagingSenderId: "45863311337",
  appId: "1:45863311337:web:8ce8837805a946def65d78"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;