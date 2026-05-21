import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDXWUjjQIvxukZIQQPTR9LNZ4w84zeVb-A",
  authDomain: "branch-report-541trd.firebaseapp.com",
  projectId: "branch-report-541trd",
  storageBucket: "branch-report-541trd.firebasestorage.app",
  messagingSenderId: "934546367696",
  appId: "1:934546367696:web:9a8f0ce748f0f0a9de2ad5",
  measurementId: "G-EQ2D9PJMK3"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
