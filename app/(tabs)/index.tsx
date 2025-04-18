import { StyleSheet, View, TouchableOpacity, FlatList, Image, SafeAreaView, Alert } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { getListings, deleteListing } from '@/lib/listings';

type ParkingListing = {
  id: string;
  host_id: string;
  title: string;
  description: string;
  address: string;
  price: string;
  images: string[];
  rating?: number;
};

export default function HomeScreen() {
  const { user } = useAuth();
  const [listings, setListings] = useState<ParkingListing[]>([]);

  useEffect(() => {
    console.log('Current user role:', user?.role);
    loadListings();
  }, [user]);

  const loadListings = async () => {
    try {
      const data = await getListings();
      setListings(data || []);
    } catch (error) {
      console.error('Error loading listings:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteListing(id);
      setListings(prev => prev.filter(listing => listing.id !== id));
      Alert.alert('Success', 'Listing deleted successfully');
    } catch (error) {
      console.error('Error deleting listing:', error);
      Alert.alert('Error', 'Failed to delete listing. Please try again.');
    }
  };

  const renderListing = ({ item }: { item: ParkingListing }) => (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        {item.images && item.images.length > 0 ? (
          <Image source={{ uri: item.images[0] }} style={styles.image} />
        ) : (
          <View style={styles.placeholderImage}>
            <FontAwesome name="car" size={40} color="#ccc" />
          </View>
        )}
      </View>
      <View style={styles.cardContent}>
        <ThemedText type="subtitle" style={styles.title}>{item.title}</ThemedText>
        <ThemedText style={styles.address}>{item.address}</ThemedText>
        <View style={styles.ratingContainer}>
          <FontAwesome name="star" size={16} color="#FFD700" />
          <ThemedText style={styles.rating}>{item.rating?.toFixed(1) || 'N/A'}</ThemedText>
        </View>
        <ThemedText style={styles.price}>${item.price}/hour</ThemedText>
        {user?.uid === item.host_id && (
          <TouchableOpacity onPress={() => handleDelete(item.id)}>
            <FontAwesome name="trash" size={24} color="red" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title">Available Parking Spots</ThemedText>
        </View>

        {listings.length === 0 ? (
          <View style={styles.emptyState}>
            <FontAwesome name="car" size={50} color="#ccc" />
            <ThemedText style={styles.emptyText}>No parking spots available yet</ThemedText>
          </View>
        ) : (
          <FlatList
            data={listings}
            renderItem={renderListing}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
          />
        )}

        {(() => {
          console.log('Rendering FAB - User role:', user?.role);
          return user?.role === 'host' && (
            <TouchableOpacity 
              style={[styles.fab, { elevation: 8 }]}
              onPress={() => {
                console.log('FAB pressed - navigating to create listing');
                router.push('/listing/create');
              }}
            >
              <FontAwesome name="plus" size={24} color="white" />
            </TouchableOpacity>
          );
        })()}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  listContainer: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    height: 200,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: 15,
  },
  title: {
    fontSize: 18,
    marginBottom: 5,
  },
  address: {
    color: '#666',
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  rating: {
    marginLeft: 5,
    color: '#666',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 10,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
    zIndex: 1000,
  },
});
