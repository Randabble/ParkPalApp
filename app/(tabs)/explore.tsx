import React, { useState, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, ActivityIndicator, Alert, TouchableOpacity, Text, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import MapView, { Marker, Region } from 'react-native-maps';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

interface Listing {
  id: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  price_per_hour: number;
  available: boolean;
}

export default function MapScreen() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [region, setRegion] = useState<Region>({
    latitude: 37.7749, // Default to San Francisco
    longitude: -122.4194,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      // If permission granted, get current location
      if (status === 'granted') {
        try {
          const location = await Location.getCurrentPositionAsync({});
          setRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          });
        } catch (err) {
          console.error('Error getting location:', err);
        }
      }
      
      // Load listings
      loadListings();
    })();
  }, []);

  const loadListings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all available listings
      const listingsQuery = query(
        collection(db, 'listings'),
        where('available', '==', true)
      );
      
      const querySnapshot = await getDocs(listingsQuery);
      const listingsData: Listing[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Only add listings with valid coordinates
        if (data.latitude && data.longitude && 
            !isNaN(data.latitude) && !isNaN(data.longitude) &&
            data.latitude !== 0 && data.longitude !== 0) {
          listingsData.push({
            id: doc.id,
            title: data.title || 'Untitled Listing',
            address: data.address || 'No address',
            latitude: data.latitude,
            longitude: data.longitude,
            price_per_hour: data.price_per_hour || 0,
            available: data.available || false,
          });
        }
      });
      
      setListings(listingsData);
      
      // If we have listings and no location permission, center the map on the first one
      if (listingsData.length > 0 && !locationPermission) {
        setRegion({
          latitude: listingsData[0].latitude,
          longitude: listingsData[0].longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading listings:', err);
      setError('Failed to load listings. Please try again.');
      setLoading(false);
    }
  };

  const handleMarkerPress = (listing: Listing) => {
    Alert.alert(
      listing.title,
      `Price: $${listing.price_per_hour}/hour\nAddress: ${listing.address}`,
      [
        {
          text: 'View Details',
          onPress: () => router.push(`/listing/${listing.id}`),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const goToUserLocation = async () => {
    if (locationPermission) {
      try {
        const location = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      } catch (err) {
        console.error('Error getting location:', err);
        Alert.alert('Error', 'Could not get your current location');
      }
    } else {
      Alert.alert(
        'Location Permission Required',
        'Please enable location services to use this feature',
        [
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                // Open iOS settings
                Linking.openURL('app-settings:');
              } else {
                // Open Android settings
                Linking.openSettings();
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <ActivityIndicator size="large" color="#0000ff" />
          <ThemedText style={styles.loadingText}>Loading map...</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={loadListings}>
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title">Find Parking</ThemedText>
          <TouchableOpacity onPress={loadListings}>
            <Ionicons name="refresh" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={region}
            onRegionChangeComplete={setRegion}
            showsUserLocation={locationPermission}
          >
            {listings.map((listing) => (
              <Marker
                key={listing.id}
                coordinate={{
                  latitude: listing.latitude,
                  longitude: listing.longitude,
                }}
                title={listing.title}
                description={`$${listing.price_per_hour}/hour`}
                onPress={() => handleMarkerPress(listing)}
              />
            ))}
          </MapView>
          
          <TouchableOpacity 
            style={styles.myLocationButton}
            onPress={goToUserLocation}
          >
            <Ionicons name="locate" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.footer}>
          <ThemedText>
            {listings.length > 0 
              ? `Showing ${listings.length} available parking spots` 
              : 'No available parking spots found'}
          </ThemedText>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 10,
    margin: 16,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  myLocationButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
