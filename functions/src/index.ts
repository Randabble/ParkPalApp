import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Function to delete cancelled bookings older than 15 days
export const deleteOldCancelledBookings = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const db = admin.firestore();
    const fifteenDaysAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
    );

    try {
      // Query for cancelled bookings older than 15 days
      const snapshot = await db
        .collection('bookings')
        .where('status', '==', 'cancelled')
        .where('cancelled_at', '<', fifteenDaysAgo)
        .get();

      // Delete each old cancelled booking
      const deletePromises = snapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(deletePromises);

      console.log(`Deleted ${snapshot.size} old cancelled bookings`);
      return null;
    } catch (error) {
      console.error('Error deleting old cancelled bookings:', error);
      throw error;
    }
  }); 