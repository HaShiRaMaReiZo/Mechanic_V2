import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaintenanceStatus } from '@/features/contracts/contractsSlice';

interface StatusBannerProps {
  maintenanceStatus: MaintenanceStatus | undefined;
}

export function StatusBanner({ maintenanceStatus }: StatusBannerProps) {
  if (!maintenanceStatus) {
    return null;
  }

  // Determine background color based on status
  const getBackgroundColor = () => {
    switch (maintenanceStatus.status) {
      case 'DUE':
        return '#E6FFF1'; // Green
      case 'NOT_YET_DUE':
        return '#FAEED3'; // Yellow
      case 'OVER_DUE':
        return '#FDE1E6'; // Red
      case 'ALREADY_IMPLEMENTED':
        return '#E5E5E5'; // Grey
      default:
        return '#E5E5E5';
    }
  };

  return (
    <View style={[styles.banner, { backgroundColor: getBackgroundColor() }]}>
      <Text style={styles.message}>{maintenanceStatus.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  message: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
    lineHeight: 20,
  },
});

