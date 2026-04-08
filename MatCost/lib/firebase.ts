// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD9BWvMTsR8FPX7bA4YaPJqTqlR8t8DA9c",
  authDomain: "matcost-3be50.firebaseapp.com",
  projectId: "matcost-3be50",
  storageBucket: "matcost-3be50.firebasestorage.app",
  messagingSenderId: "982108923069",
  appId: "1:982108923069:web:8a80195c228f9b449ec3d4",
  measurementId: "G-MLNEFJ349J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
// const analytics = getAnalytics(app);