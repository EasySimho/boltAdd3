import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA6qQeuDjqvi7D4z-S-yDBMJ4PWBpOPiNA",
  authDomain: "cri-turni.firebaseapp.com",
  projectId: "cri-turni",
  storageBucket: "cri-turni.firebasestorage.app",
  messagingSenderId: "1039747858689",
  appId: "1:1039747858689:web:4944c4018494ba6e8cdb00",
  measurementId: "G-WVDS8HBMCT"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);