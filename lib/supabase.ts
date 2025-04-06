import { createClient } from '@supabase/supabase-js';

// Replace these with your Supabase project URL and anon key
const supabaseUrl = 'https://xcgtakbrijozofvcjbem.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjZ3Rha2JyaWpvem9mdmNqYmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5MDE1NzUsImV4cCI6MjA1OTQ3NzU3NX0.J1NZs5RDJRGvDioD2O3TmPoO9qPxQFC6atabclPA6nQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 