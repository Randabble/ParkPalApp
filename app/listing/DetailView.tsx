import React from 'react';
import { View, StyleSheet, ScrollView, Image, Dimensions, TouchableOpacity, Platform } from 'react-native';
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
};

export default function DetailView() {
  const params = useLocalSearchParams<RouteParams>();
  const images = typeof params.images === 'string' ? [params.images] : params.images;
  const rating = params.rating ? parseFloat(params.rating) : undefined;

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} bounces={false}>
        {/* Image Carousel */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.imageCarousel}
        >
          {images.map((image, index) => (
            <Image
              key={index}
              source={{ uri: image }}
              style={styles.image}
              resizeMode="cover"
            />
          ))}
        </ScrollView>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={24} color="white" />
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.content}>
          <ThemedText style={styles.title}>{params.title}</ThemedText>
          <ThemedText style={styles.price}>${params.price}/hour</ThemedText>
          
          <View style={styles.addressContainer}>
            <FontAwesome name="map-marker" size={16} color="#666" />
            <ThemedText style={styles.address}>{params.address}</ThemedText>
          </View>

          {rating && (
            <View style={styles.ratingContainer}>
              <FontAwesome name="star" size={16} color="#FFD700" />
              <ThemedText style={styles.rating}>{rating}</ThemedText>
            </View>
          )}

          <View style={styles.divider} />

          <ThemedText style={styles.sectionTitle}>About this spot</ThemedText>
          <ThemedText style={styles.description}>{params.description}</ThemedText>
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
  scrollView: {
    flex: 1,
  },
  imageCarousel: {
    height: 300,
  },
  image: {
    width: screenWidth,
    height: 300,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  price: {
    fontSize: 20,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 15,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  address: {
    fontSize: 16,
    color: '#666',
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
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
}); 