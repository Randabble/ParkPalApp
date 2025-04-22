import { db, auth } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, where, updateDoc, deleteDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';

export interface Listing {
  id: string;
  user_id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  vehicle_type: string;
  availability: {
    start_time: string;
    end_time: string;
  };
  rules: string;
  created_at: Date;
  updated_at: Date;
}

export const createListing = async (data: Omit<Listing, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User must be logged in to create a listing');

    const listingData = {
      ...data,
      user_id: user.uid,
      created_at: new Date(),
      updated_at: new Date()
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
    const listings = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate() || new Date(),
      updated_at: doc.data().updated_at?.toDate() || new Date()
    })) as Listing[];
    console.log('Fetched listings:', listings);
    return listings;
  } catch (error) {
    console.error('Error getting listings:', error);
    throw error;
  }
};

export const getListingsByHostId = async (hostId: string) => {
  try {
    console.log('Fetching listings for host ID:', hostId);
    
    // Try with user_id field first
    try {
      const q = query(
        collection(db, 'listings'),
        where('user_id', '==', hostId),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const listings = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date()
      })) as Listing[];
      
      console.log(`Found ${listings.length} listings with user_id field`);
      
      // If we found listings with user_id, return them
      if (listings.length > 0) {
        return listings;
      }
      
      // If no listings found with user_id, try with host_id
      const q2 = query(
        collection(db, 'listings'),
        where('host_id', '==', hostId),
        orderBy('created_at', 'desc')
      );
      const querySnapshot2 = await getDocs(q2);
      const listings2 = querySnapshot2.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date()
      })) as Listing[];
      
      console.log(`Found ${listings2.length} listings with host_id field`);
      return listings2;
      
    } catch (indexError) {
      console.log('Error with ordered query, falling back to unordered queries:', indexError);
      
      // Try unordered queries as fallback
      const q1 = query(
        collection(db, 'listings'),
        where('user_id', '==', hostId)
      );
      const querySnapshot1 = await getDocs(q1);
      const listings1 = querySnapshot1.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date()
      })) as Listing[];
      
      console.log(`Found ${listings1.length} listings with user_id field (unordered)`);
      
      // If we found listings with user_id, return them
      if (listings1.length > 0) {
        return listings1;
      }
      
      // If no listings found with user_id, try with host_id
      const q2 = query(
        collection(db, 'listings'),
        where('host_id', '==', hostId)
      );
      const querySnapshot2 = await getDocs(q2);
      const listings2 = querySnapshot2.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date()
      })) as Listing[];
      
      console.log(`Found ${listings2.length} listings with host_id field (unordered)`);
      return listings2;
    }
  } catch (error) {
    console.error('Error getting host listings:', error);
    throw error;
  }
};

export const getListingById = async (id: string): Promise<Listing | null> => {
  try {
    const listingDoc = await getDoc(doc(db, 'listings', id));
    if (!listingDoc.exists()) {
      return null;
    }
    return {
      id: listingDoc.id,
      ...listingDoc.data(),
      created_at: listingDoc.data().created_at?.toDate(),
      updated_at: listingDoc.data().updated_at?.toDate(),
    } as Listing;
  } catch (error) {
    console.error('Error getting listing:', error);
    throw error;
  }
};

export const getUserListings = async (userId: string): Promise<Listing[]> => {
  try {
    const listingsQuery = query(
      collection(db, 'listings'),
      where('user_id', '==', userId)
    );
    const querySnapshot = await getDocs(listingsQuery);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate(),
      updated_at: doc.data().updated_at?.toDate(),
    })) as Listing[];
  } catch (error) {
    console.error('Error getting user listings:', error);
    throw error;
  }
};

export const updateListing = async (id: string, data: Partial<Listing>): Promise<void> => {
  try {
    const listingRef = doc(db, 'listings', id);
    await updateDoc(listingRef, {
      ...data,
      updated_at: new Date(),
    });
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
    if (listingData.user_id !== user.uid) {
      throw new Error('You can only delete your own listings');
    }

    await deleteDoc(listingRef);
    return true;
  } catch (error) {
    console.error('Error deleting listing:', error);
    throw error;
  }
}; 