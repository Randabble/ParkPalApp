import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, Image, TouchableOpacity, Alert, RefreshControl, Text, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getListingsByHostId, deleteListing, Listing } from '@/lib/listings';

export default function MyListingsScreen() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      console.log('User loaded in MyListingsScreen:', user);
      loadMyListings();
    } else {
      console.log('No user found in MyListingsScreen');
      setLoading(false);
    }
  }, [user]);

  const loadMyListings = async () => {
    if (!user) {
      console.log('Cannot load listings: No user found');
      setError('You must be logged in to view your listings');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log('Loading listings for user:', user.uid, 'with role:', user.role);
      
      const data = await getListingsByHostId(user.uid);
      console.log('My listings loaded:', data);
      
      if (!data || data.length === 0) {
        console.log('No listings found for user:', user.uid);
        setError('You don\'t have any listings yet');
      } else {
        setListings(data);
      }
    } catch (error) {
      console.error('Error loading my listings:', error);
      setError('Failed to load your listings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMyListings();
    setRefreshing(false);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this listing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteListing(id);
              setListings(prev => prev.filter(listing => listing.id !== id));
              Alert.alert('Success', 'Listing deleted successfully');
            } catch (error) {
              console.error('Error deleting listing:', error);
              Alert.alert('Error', 'Failed to delete listing');
            }
          }
        }
      ]
    );
  };

  const handleEdit = (id: string) => {
    router.push(`/(tabs)/edit-listing?id=${id}`);
  };

  const renderListing = ({ item }: { item: Listing }) => (
    <View style={styles.card}>
      <TouchableOpacity 
        onPress={() => router.push(`/listing/${item.id}`)}
        style={styles.cardContent}
      >
        <View style={styles.imageContainer}>
          {item.images && item.images.length > 0 ? (
            <Image
              source={{ uri: item.images[0] }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.image, styles.placeholderImage]}>
              <FontAwesome name="image" size={40} color="#ccc" />
            </View>
          )}
          <View style={styles.statusBadge}>
            <ThemedText style={styles.statusText}>{item.status || 'Active'}</ThemedText>
          </View>
        </View>
        
        <View style={styles.cardDetails}>
          <ThemedText style={styles.cardTitle}>{item.title}</ThemedText>
          <ThemedText style={styles.cardPrice}>${item.price}/hour</ThemedText>
          <ThemedText style={styles.cardLocation}>{item.location}</ThemedText>
        </View>
      </TouchableOpacity>
      
      <View style={styles.cardActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEdit(item.id)}
        >
          <FontAwesome name="edit" size={16} color="#fff" />
          <ThemedText style={styles.actionButtonText}>Edit</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item.id)}
        >
          <FontAwesome name="trash" size={16} color="#fff" />
          <ThemedText style={styles.actionButtonText}>Delete</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={styles.loadingText}>Loading your listings...</ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <FontAwesome name="exclamation-circle" size={50} color="#ff6b6b" />
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <TouchableOpacity style={styles.refreshButton} onPress={loadMyListings}>
          <ThemedText style={styles.refreshButtonText}>Try Again</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>My Listings</ThemedText>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/create-listing')}
        >
          <FontAwesome name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {listings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome name="list" size={50} color="#ccc" />
          <ThemedText style={styles.emptyText}>You don't have any listings yet</ThemedText>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => router.push('/create-listing')}
          >
            <ThemedText style={styles.createButtonText}>Create Your First Listing</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listings}
          renderItem={renderListing}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#007AFF']}
            />
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
  },
  imageContainer: {
    width: 100,
    height: 100,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardDetails: {
    flex: 1,
    padding: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardPrice: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
  cardLocation: {
    fontSize: 14,
    color: '#666',
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  editButton: {
    backgroundColor: '#4CAF50',
    borderBottomLeftRadius: 10,
  },
  deleteButton: {
    backgroundColor: '#f44336',
    borderBottomRightRadius: 10,
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    marginBottom: 20,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
}); 