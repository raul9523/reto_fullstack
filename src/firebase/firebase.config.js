// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB7qTTBxIbF-RZfOnlHCJ1gh-vDP9MoZlM",
  authDomain: "upbfullstack.firebaseapp.com",
  projectId: "upbfullstack",
  storageBucket: "upbfullstack.firebasestorage.app",
  messagingSenderId: "554824273861",
  appId: "1:554824273861:web:d29724b5b0dce9270605ac"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);