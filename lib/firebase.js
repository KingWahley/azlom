import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyDFDEn5PnKxEsLeI10nFuFgwimd-VvmYG0",
  authDomain: "azlomhaulage.firebaseapp.com",
  projectId: "azlomhaulage",
  storageBucket: "azlomhaulage.firebasestorage.app",
  messagingSenderId: "320440589426",
  appId: "1:320440589426:web:0ebbb878d2d936c09876eb"
};
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
}
export const auth = getAuth();
export const db = getFirestore();
