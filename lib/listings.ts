import { db, auth } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, where, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';

export type Listing = {
  id: string;
  host_id: string;
  host_email?: string;
  title: string;
  description: string;
  address: string;
  price: string;
  images: string[];
  rating?: number;
  created_at: Date;
};

export const createListing = async (data: Omit<Listing, 'id' | 'host_id' | 'host_email' | 'created_at'>) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be logged in to create a listing');

    const listingData = {
      ...data,
      host_id: user.uid,
      host_email: user.email,
      created_at: new Date()
    };

    const docRef = await addDoc(collection(db, 'listings'), listingData);
    return { id: docRef.id, ...listingData };
  } catch (error) {
    console.error('Error creating listing:', error);
    throw error;
  }
};

export const getListings = async () => {
  try {
    const q = query(collection(db, 'listings'), orderBy('created_at', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Listing[];
  } catch (error) {
    console.error('Error getting listings:', error);
    throw error;
  }
};

export const getListingsByHostId = async (hostId: string) => {
  try {
    // First try with ordering
    try {
      const q = query(
        collection(db, 'listings'),
        where('host_id', '==', hostId),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Listing[];
    } catch (indexError) {
      // If index doesn't exist yet, fetch without ordering
      console.log('Falling back to unordered query while index builds...');
      const q = query(
        collection(db, 'listings'),
        where('host_id', '==', hostId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Listing[];
    }
  } catch (error) {
    console.error('Error getting host listings:', error);
    throw error;
  }
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

export const deleteListing = async (listingId: string) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be logged in to delete a listing');

    // Get the listing document directly using its ID
    const listingRef = doc(db, 'listings', listingId);
    const listingSnap = await getDoc(listingRef);
    
    if (!listingSnap.exists()) {
      throw new Error('Listing not found');
    }

    const listingData = listingSnap.data();
    if (listingData.host_id !== user.uid) {
      throw new Error('You can only delete your own listings');
    }

    await deleteDoc(listingRef);
    return true;
  } catch (error) {
    console.error('Error deleting listing:', error);
    throw error;
  }
}; 