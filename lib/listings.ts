import { supabase } from './supabase';

export type Listing = {
  id: string;
  host_id: string;
  title: string;
  description: string;
  address: string;
  price: number;
  images: string[];
  rating: number;
  created_at: string;
};

export async function createListing(listing: Omit<Listing, 'id' | 'host_id' | 'rating' | 'created_at'>) {
  const { data, error } = await supabase
    .from('listings')
    .insert([listing])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getListings() {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getListingsByHostId(hostId: string) {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('host_id', hostId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateListing(id: string, updates: Partial<Listing>) {
  const { data, error } = await supabase
    .from('listings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteListing(id: string) {
  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', id);

  if (error) throw error;
} 