import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

interface CustomLoadingIndicatorProps {
  size?: 'small' | 'large';
  color?: string;
  style?: any;
}

export function CustomLoadingIndicator({ 
  size = 'large', 
  color = '#423491',
  style 
}: CustomLoadingIndicatorProps) {
  // Scale factor to make the indicator bigger
  // 'small' -> 1.5x, 'large' -> 1.8x
  const scaleFactor = size === 'small' ? 1.5 : 1.8;
  
  return (
    <View style={[styles.container, style]}>
      <View style={{ transform: [{ scale: scaleFactor }] }}>
        <ActivityIndicator size={size} color={color} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
});

