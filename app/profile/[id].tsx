import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, FlatList, Dimensions, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { getListingsByHostId } from '@/lib/listings';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

type UserProfile = {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  description?: string;
  contactInfo?: string;
  role?: string;
  rating?: number;
  reviewCount?: number;
};

export default function ProfileView() {
  const params = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<any[]>([]);

  useEffect(() => {
    loadProfile();
    loadUserListings();
  }, [params.id]);

  const loadProfile = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', params.id));
      if (userDoc.exists()) {
        setProfile({ uid: userDoc.id, ...userDoc.data() } as UserProfile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadUserListings = async () => {
    try {
      const userListings = await getListingsByHostId(params.id);
      setListings(userListings);
    } catch (error) {
      console.error('Error loading user listings:', error);
    }
  };

  const renderListing = ({ item }: any) => (
    <TouchableOpacity 
      onPress={() => router.push(`/listing/${item.id}`)}
      style={styles.listingCard}
    >
      <Image
        source={{ uri: item.images[0] }}
        style={styles.listingImage}
        resizeMode="cover"
      />
      <View style={styles.listingInfo}>
        <ThemedText style={styles.listingTitle} numberOfLines={1}>{item.title}</ThemedText>
        <ThemedText style={styles.listingPrice}>${item.price}/hour</ThemedText>
      </View>
    </TouchableOpacity>
  );

  if (!profile) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText>Loading profile...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} bounces={false}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={24} color="black" />
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            {profile.photoURL ? (
              <Image source={{ uri: profile.photoURL }} style={styles.profileImage} />
            ) : (
              <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
                <FontAwesome name="user" size={40} color="#666" />
              </View>
            )}
            <ThemedText style={styles.displayName}>
              {profile.displayName || profile.email}
            </ThemedText>
            {profile.role && (
              <View style={styles.roleBadge}>
                <ThemedText style={styles.roleText}>{profile.role}</ThemedText>
              </View>
            )}
          </View>

          {/* Rating Section */}
          <View style={styles.ratingSection}>
            <FontAwesome name="star" size={20} color="#FFD700" />
            <ThemedText style={styles.rating}>
              {profile.rating?.toFixed(1) || 'No ratings yet'} 
              {profile.reviewCount && ` (${profile.reviewCount} reviews)`}
            </ThemedText>
          </View>

          {/* Description */}
          {profile.description && (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>About</ThemedText>
              <ThemedText style={styles.description}>{profile.description}</ThemedText>
            </View>
          )}

          {/* Contact Info */}
          {profile.contactInfo && (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Contact Information</ThemedText>
              <ThemedText style={styles.contactInfo}>{profile.contactInfo}</ThemedText>
            </View>
          )}

          {/* Listings Section */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Listings</ThemedText>
            <FlatList
              data={listings}
              renderItem={renderListing}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listingsContainer}
              ListEmptyComponent={
                <ThemedText style={styles.emptyText}>No listings yet</ThemedText>
              }
            />
          </View>

          {/* Reviews Section - Placeholder */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Reviews</ThemedText>
            <View style={styles.reviewsPlaceholder}>
              <FontAwesome name="comments" size={24} color="#ccc" />
              <ThemedText style={styles.emptyText}>Reviews coming soon</ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    height: Platform.OS === 'ios' ? 100 : 70,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  profileSection: {
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
  },
  profileImagePlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  roleBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 5,
  },
  roleText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  rating: {
    fontSize: 16,
    marginLeft: 8,
    color: '#333',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  contactInfo: {
    fontSize: 16,
    color: '#333',
  },
  listingsContainer: {
    paddingRight: 20,
  },
  listingCard: {
    width: screenWidth * 0.7,
    marginRight: 15,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  listingImage: {
    width: '100%',
    height: 150,
  },
  listingInfo: {
    padding: 12,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  listingPrice: {
    fontSize: 14,
    color: '#007AFF',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  reviewsPlaceholder: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
  },
}); 