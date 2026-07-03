import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Spacing, Typography } from '../ui';

type LocationData = {
  street?: string;
  city: string;
  region: string;
  country: string;
  postalCode?: string;
};

type Props = {
  T: any;
  onLocationDetected: (location: LocationData) => void;
  includeStreet?: boolean;
  includePostalCode?: boolean;
};

export function LocationAutofill({ T, onLocationDetected, includeStreet = false, includePostalCode = false }: Props) {
  const [loading, setLoading] = useState(false);

  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address) {
        const locationData: LocationData = {
          city: address.city || address.subregion || '',
          region: address.region || '',
          country: address.country || '',
          ...(includeStreet && address.street ? { street: address.street } : {}),
          ...(includePostalCode && address.postalCode ? { postalCode: address.postalCode } : {}),
        };
        onLocationDetected(locationData);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Failed to get current location');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing['2'],
        backgroundColor: T.primaryLight || T.surfaceHigh,
        paddingHorizontal: Spacing['3'],
        paddingVertical: Spacing['2'],
        borderRadius: 8,
        borderWidth: 1,
        borderColor: T.primary,
        alignSelf: 'flex-start',
      }}
      onPress={getCurrentLocation}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={T.primary} />
      ) : (
        <MaterialCommunityIcons name="crosshairs-gps" size={16} color={T.primary} />
      )}
      <Text
        style={{
          fontSize: Typography.sm,
          color: T.primary,
          fontWeight: Typography.medium as any,
        }}
      >
        {loading ? 'Detecting...' : 'Use Current Location'}
      </Text>
    </TouchableOpacity>
  );
}
