import { db } from '../firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';

export type Listing = {
  id: string;
  host_id: string;
  title: string;
  description: string;
  address: string;
  price: string;
  images: string[];
  rating?: number;
  created_at?: Date;
};

export const createListing = async (listingData: Listing) => {
  try {
    const docRef = await addDoc(collection(db, 'listings'), listingData);
    return docRef.id;
  } catch (error) {
    console.error('Error adding listing:', error);
    throw error;
  }
};

export const getListings = async (): Promise<Listing[]> => {
  const querySnapshot = await getDocs(collection(db, 'listings'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Listing[];
};

export const getListingsByHostId = async (hostId: string): Promise<Listing[]> => {
  const allListings = await getListings();
  return allListings.filter((listing: Listing) => listing.host_id === hostId);
};

export const updateListing = async (id: string, updatedData: Partial<Listing>) => {
  try {
    const listingRef = doc(db, 'listings', id);
    await updateDoc(listingRef, updatedData);
  } catch (error) {
    console.error('Error updating listing:', error);
    throw error;
  }
};

export const deleteListing = async (id: string) => {
  try {
    const listingRef = doc(db, 'listings', id);
    await deleteDoc(listingRef);
  } catch (error) {
    console.error('Error deleting listing:', error);
    throw error;
  }
}; 