import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyAy03Gwq4E--3zAchUXFckM-FtkuUxytZg",
  authDomain: "gramcare.firebaseapp.com",
  projectId: "gramcare",
  storageBucket: "gramcare.firebasestorage.app",
  messagingSenderId: "998357567629",
  appId: "1:998357567629:web:6470791a61cea74d16bac4"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;