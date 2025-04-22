import { StyleSheet, View, TouchableOpacity, FlatList, Image, SafeAreaView, Alert } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { getListings, deleteListing } from '@/lib/listings';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Home: undefined;
  DetailView: { listing: Listing };
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

type Listing = {
  id: string;
  host_id: string;
  host_email?: string;
  title: string;
  description: string;
  address: string;
  price: number;
  images: string[];
  rating?: number;
  created_at: Date;
  status: string;
};

export default function HomeScreen() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    console.log('Current user role:', user?.role);
    loadListings();
  }, [user]);

  const loadListings = async () => {
    try {
      const data = await getListings();
      console.log('Loaded listings:', data);
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

  const renderListing = ({ item }: { item: Listing }) => (
    <TouchableOpacity 
      onPress={() => router.push(`/listing/${item.id}`)}
      style={styles.cardContainer}
    >
      <View style={styles.card}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.images[0] }}
            style={styles.image}
            resizeMode="cover"
          />
          {item.rating && (
            <View style={styles.ratingBadge}>
              <FontAwesome name="star" size={12} color="#FFD700" />
              <ThemedText style={styles.ratingText}>{item.rating.toFixed(1)}</ThemedText>
            </View>
          )}
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <ThemedText style={styles.title} numberOfLines={1}>{item.title}</ThemedText>
              <TouchableOpacity 
                onPress={() => router.push(`/profile/${item.host_id}`)}
                style={styles.hostInfoContainer}
              >
                <ThemedText style={styles.hostInfo} numberOfLines={1}>
                  Listed by {item.host_email || 'Host'}
                </ThemedText>
              </TouchableOpacity>
              <ThemedText style={styles.address} numberOfLines={1}>{item.address}</ThemedText>
            </View>
          </View>
          <ThemedText style={styles.price}>
            <ThemedText style={styles.priceAmount}>${item.price}</ThemedText>/hour
          </ThemedText>
          {user?.uid === item.host_id && (
            <TouchableOpacity 
              onPress={() => handleDelete(item.id)}
              style={styles.deleteButton}
            >
              <FontAwesome name="trash" size={20} color="#FF385C" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Available Parking Spots</ThemedText>
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
            showsVerticalScrollIndicator={false}
          />
        )}

        {user?.role === 'host' && (
          <TouchableOpacity 
            style={styles.fab}
            onPress={() => {
              console.log('FAB pressed - navigating to create listing');
              router.push('/listing/create');
            }}
          >
            <FontAwesome name="plus" size={24} color="white" />
          </TouchableOpacity>
        )}
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
  },
  header: {
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  cardContainer: {
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  imageContainer: {
    position: 'relative',
    height: 200,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  ratingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: 'white',
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  hostInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostInfo: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#666',
  },
  price: {
    fontSize: 14,
    color: '#666',
  },
  priceAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  deleteButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
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
    backgroundColor: '#FF385C',
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
