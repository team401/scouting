// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDiT399j2F-0eWAQZ-ojnxztsM6TR21jIE",
  authDomain: "migrationtest-523f7.firebaseapp.com",
  projectId: "migrationtest-523f7",
  storageBucket: "migrationtest-523f7.firebasestorage.app",
  messagingSenderId: "664774467147",
  appId: "1:664774467147:web:955ea3acd9dca76b0b37ce",
  measurementId: "G-NR6D1WPK8F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Only call getAnalytics if running in the browser
let analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

export { app, analytics };
