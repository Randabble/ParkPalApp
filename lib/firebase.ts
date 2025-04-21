import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB4ZvkB0NdbAmsEEp8ZUCKYRYaFFecsCQ4",
  authDomain: "parkpalapp-ad290.firebaseapp.com",
  projectId: "parkpalapp-ad290",
  storageBucket: "parkpalapp-ad290.firebasestorage.app",
  messagingSenderId: "628536432445",
  appId: "1:628536432445:web:dfe9be6591866aac1ed754"
};

// Initialize Firebase only if it hasn't been initialized already
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Get Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app; 