import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const addListing = async (listingData: any) => {
  try {
    const docRef = await addDoc(collection(db, 'listings'), listingData);
    console.log('Document written with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error adding document:', error);
    throw error;
  }
};

export const getListings = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'listings'));
    const listings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('Listings:', listings);
    return listings;
  } catch (error) {
    console.error('Error getting documents:', error);
    throw error;
  }
}; 