import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Dimensions, TouchableOpacity, Platform, Linking } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';

type RouteParams = {
  id: string;
  host_id: string;
  title: string;
  description: string;
  address: string;
  price: string;
  images: string[];
  rating?: string;
  host_name?: string;
  host_image?: string;
};

export default function DetailView() {
  const params = useLocalSearchParams<RouteParams>();
  const images = typeof params.images === 'string' 
    ? JSON.parse(params.images) 
    : [];
  const rating = params.rating ? parseFloat(params.rating) : undefined;
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const openInMaps = () => {
    const address = encodeURIComponent(params.address);
    const url = Platform.select({
      ios: `maps://app?daddr=${address}`,
      android: `google.navigation:q=${address}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${address}`
    });
    Linking.openURL(url);
  };

  const renderImagePagination = () => (
    <View style={styles.paginationContainer}>
      {images.map((_: string, index: number) => (
        <View
          key={index}
          style={[
            styles.paginationDot,
            index === activeImageIndex && styles.paginationDotActive
          ]}
        />
      ))}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} bounces={false}>
        {/* Image Carousel */}
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
              setActiveImageIndex(newIndex);
            }}
          >
            {images.map((image: string, index: number) => (
              <Image
                key={index}
                source={{ uri: image }}
                style={styles.image}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
          {renderImagePagination()}
        </View>

        {/* Back Button */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome name="arrow-left" size={24} color="black" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <ThemedText style={styles.title}>{params.title}</ThemedText>
          
          {/* Host Info */}
          <View style={styles.hostContainer}>
            {params.host_image ? (
              <Image source={{ uri: params.host_image }} style={styles.hostImage} />
            ) : (
              <View style={[styles.hostImage, styles.hostImagePlaceholder]}>
                <FontAwesome name="user" size={20} color="#666" />
              </View>
            )}
            <ThemedText style={styles.hostName}>
              {params.host_name || 'Host'}
            </ThemedText>
          </View>

          <TouchableOpacity onPress={openInMaps} style={styles.addressContainer}>
            <FontAwesome name="map-marker" size={16} color="#666" />
            <ThemedText style={styles.address}>{params.address}</ThemedText>
            <FontAwesome name="chevron-right" size={12} color="#666" style={styles.addressArrow} />
          </TouchableOpacity>

          {rating && (
            <View style={styles.ratingContainer}>
              <FontAwesome name="star" size={16} color="#FFD700" />
              <ThemedText style={styles.rating}>{rating.toFixed(1)}</ThemedText>
            </View>
          )}

          <View style={styles.priceContainer}>
            <ThemedText style={styles.price}>${params.price}</ThemedText>
            <ThemedText style={styles.priceUnit}>/hour</ThemedText>
          </View>

          <View style={styles.divider} />

          <ThemedText style={styles.sectionTitle}>About this spot</ThemedText>
          <ThemedText style={styles.description}>{params.description}</ThemedText>
        </View>
      </ScrollView>

      {/* Book Now Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bookButton}>
          <ThemedText style={styles.bookButtonText}>Book Now</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    height: 300,
    position: 'relative',
  },
  image: {
    width: screenWidth,
    height: 300,
  },
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 100 : 70,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
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
  paginationContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#fff',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  hostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  hostImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  hostImagePlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostName: {
    fontSize: 16,
    fontWeight: '500',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
  },
  address: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  addressArrow: {
    marginLeft: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  rating: {
    fontSize: 16,
    marginLeft: 5,
    color: '#333',
    fontWeight: '500',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  priceUnit: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  bottomBar: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#fff',
  },
  bookButton: {
    backgroundColor: '#FF385C',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
}); 