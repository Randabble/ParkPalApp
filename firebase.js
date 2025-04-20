// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { addDoc, collection, doc, getFirestore, setDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB4ZvkB0NdbAmsEEp8ZUCKYRYaFFecsCQ4",
  authDomain: "parkpalapp-ad290.firebaseapp.com",
  projectId: "parkpalapp-ad290",
  storageBucket: "parkpalapp-ad290.firebasestorage.app",
  messagingSenderId: "628536432445",
  appId: "1:628536432445:web:dfe9be6591866aac1ed754",
  measurementId: "G-RWGBVMMM0R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

const addUser = async (userId, email, role) => {
  try {
    await setDoc(doc(db, 'users', userId), {
      email,
      role
    });
  } catch (error) {
    console.error('Error adding user:', error);
  }
};

const signUp = async (email, password, role) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await addUser(user.uid, email, role);
  } catch (error) {
    console.error('Error signing up:', error);
  }
};

export const addListing = async (listingData) => {
  try {
    await addDoc(collection(db, 'listings'), listingData);
  } catch (error) {
    console.error('Error adding listing:', error);
  }
};