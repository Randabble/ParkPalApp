import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { FontAwesome } from '@expo/vector-icons';
import { format, addDays, isSameDay, parseISO, isWithinInterval } from 'date-fns';
import { getOverlappingBookings } from '@/lib/bookings';

type TimeSlot = {
  startTime: string;
  endTime: string;
};

type CalendarProps = {
  availability?: {
    start_time?: string;
    end_time?: string;
  };
  onSelectTimeSlot: (date: Date, timeSlot: TimeSlot) => void;
  selectedDate?: Date;
  selectedTimeSlot?: TimeSlot;
  listingId?: string;
};

export function Calendar({ availability, onSelectTimeSlot, selectedDate, selectedTimeSlot, listingId }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookedSlots, setBookedSlots] = useState<{[date: string]: TimeSlot[]}>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const daysToShow = 7;
  const dates = Array.from({ length: daysToShow }, (_, i) => addDays(currentDate, i));

  // Default availability if not provided
  const defaultAvailability = {
    start_time: '09:00',
    end_time: '17:00'
  };

  // Use provided availability or default
  const effectiveAvailability = availability || defaultAvailability;

  useEffect(() => {
    if (listingId) {
      loadBookedSlots();
    }
  }, [listingId, currentDate]);

  const loadBookedSlots = async () => {
    if (!listingId) return;
    
    try {
      setLoading(true);
      setError(null);
      const bookedSlotsMap: {[date: string]: TimeSlot[]} = {};
      
      // For each date in the calendar
      for (const date of dates) {
        const dateKey = format(date, 'yyyy-MM-dd');
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        try {
          const overlappingBookings = await getOverlappingBookings(
            listingId,
            startOfDay.toISOString(),
            endOfDay.toISOString()
          );

          if (overlappingBookings.length > 0) {
            bookedSlotsMap[dateKey] = overlappingBookings.map(booking => ({
              startTime: format(new Date(booking.start_time), 'HH:mm'),
              endTime: format(new Date(booking.end_time), 'HH:mm')
            }));
          }
        } catch (error) {
          console.error(`Error loading booked slots for date ${dateKey}:`, error);
          // Continue with other dates even if one fails
        }
      }

      setBookedSlots(bookedSlotsMap);
    } catch (error) {
      console.error('Error loading booked slots:', error);
      setError('Failed to load booked times. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isTimeSlotSelected = (date: Date, timeSlot: TimeSlot) => {
    return selectedDate && 
           isSameDay(date, selectedDate) && 
           selectedTimeSlot?.startTime === timeSlot.startTime && 
           selectedTimeSlot?.endTime === timeSlot.endTime;
  };

  const isTimeSlotBooked = (date: Date, time: string) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const bookedSlotsForDate = bookedSlots[dateKey] || [];
    
    // Check if the time is within any booked slot
    return bookedSlotsForDate.some(slot => {
      const [slotStartHour, slotStartMinute] = slot.startTime.split(':').map(Number);
      const [slotEndHour, slotEndMinute] = slot.endTime.split(':').map(Number);
      const [timeHour, timeMinute] = time.split(':').map(Number);
      
      const slotStartMinutes = slotStartHour * 60 + slotStartMinute;
      const slotEndMinutes = slotEndHour * 60 + slotEndMinute;
      const timeMinutes = timeHour * 60 + timeMinute;
      
      return timeMinutes >= slotStartMinutes && timeMinutes < slotEndMinutes;
    });
  };

  const generateTimeSlots = (date: Date) => {
    // Ensure we have valid start and end times
    const startTime = effectiveAvailability.start_time || defaultAvailability.start_time;
    const endTime = effectiveAvailability.end_time || defaultAvailability.end_time;
    
    try {
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      
      const slots: TimeSlot[] = [];
      const intervalMinutes = 60; // 1-hour intervals
      
      for (let time = startMinutes; time < endMinutes; time += intervalMinutes) {
        const endTime = Math.min(time + intervalMinutes, endMinutes);
        
        const startTimeStr = `${Math.floor(time / 60).toString().padStart(2, '0')}:${(time % 60).toString().padStart(2, '0')}`;
        const endTimeStr = `${Math.floor(endTime / 60).toString().padStart(2, '0')}:${(endTime % 60).toString().padStart(2, '0')}`;
        
        slots.push({
          startTime: startTimeStr,
          endTime: endTimeStr
        });
      }
      
      return slots;
    } catch (error) {
      console.error('Error generating time slots:', error);
      // Return default time slots if there's an error
      return [
        { startTime: '09:00', endTime: '10:00' },
        { startTime: '10:00', endTime: '11:00' },
        { startTime: '11:00', endTime: '12:00' },
        { startTime: '12:00', endTime: '13:00' },
        { startTime: '13:00', endTime: '14:00' },
        { startTime: '14:00', endTime: '15:00' },
        { startTime: '15:00', endTime: '16:00' },
        { startTime: '16:00', endTime: '17:00' }
      ];
    }
  };

  const renderTimeSlots = (date: Date) => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity onPress={loadBookedSlots} style={styles.retryButton}>
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      );
    }
    
    const timeSlots = generateTimeSlots(date);
    
    if (timeSlots.length === 0) {
      return (
        <View style={styles.noTimeSlots}>
          <ThemedText style={styles.noTimeSlotsText}>No available slots</ThemedText>
        </View>
      );
    }

    const availableTimeSlots = timeSlots.filter(slot => !isTimeSlotBooked(date, slot.startTime));

    if (availableTimeSlots.length === 0) {
      return (
        <View style={styles.noTimeSlots}>
          <ThemedText style={styles.noTimeSlotsText}>All slots booked</ThemedText>
        </View>
      );
    }

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeSlotsContainer}>
        {availableTimeSlots.map((slot, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.timeSlot,
              isTimeSlotSelected(date, slot) && styles.selectedTimeSlot
            ]}
            onPress={() => onSelectTimeSlot(date, slot)}
          >
            <ThemedText style={[
              styles.timeSlotText,
              isTimeSlotSelected(date, slot) && styles.selectedTimeSlotText
            ]}>
              {slot.startTime} - {slot.endTime}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datesContainer}>
        {dates.map((date) => (
          <TouchableOpacity
            key={date.toISOString()}
            style={[
              styles.dateCard,
              isSameDay(date, selectedDate || new Date()) && styles.selectedDateCard
            ]}
            onPress={() => {
              const slots = generateTimeSlots(date);
              if (slots.length > 0) {
                onSelectTimeSlot(date, slots[0]);
              }
            }}
          >
            <ThemedText style={styles.dayName}>
              {format(date, 'EEE')}
            </ThemedText>
            <ThemedText style={styles.dayNumber}>
              {format(date, 'd')}
            </ThemedText>
            <View style={styles.timeSlotsWrapper}>
              {renderTimeSlots(date)}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  datesContainer: {
    flexDirection: 'row',
  },
  dateCard: {
    width: 120,
    padding: 12,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedDateCard: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  dayName: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 4,
  },
  timeSlotsWrapper: {
    marginTop: 8,
  },
  timeSlotsContainer: {
    maxHeight: 120,
  },
  timeSlot: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginRight: 8,
    marginBottom: 8,
  },
  selectedTimeSlot: {
    backgroundColor: '#2196f3',
    borderColor: '#1976d2',
  },
  timeSlotText: {
    fontSize: 12,
    textAlign: 'center',
  },
  selectedTimeSlotText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  noTimeSlots: {
    padding: 8,
    alignItems: 'center',
  },
  noTimeSlotsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  errorContainer: {
    padding: 8,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 4,
  },
  retryButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
}); 