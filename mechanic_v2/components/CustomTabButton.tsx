import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from './ui/icon-symbol';

interface CustomTabButtonProps {
  route: any;
  isFocused: boolean;
  onPress: () => void;
  label: string;
  iconName: string;
}

export function CustomTabButton({
  route,
  isFocused,
  onPress,
  label,
  iconName,
}: CustomTabButtonProps) {
  const handlePress = () => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.tabButton}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        {!isFocused && (
          <IconSymbol
            size={30}
            name={iconName as any}
            color={isFocused ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)'}
          />
        )}
      </View>
      <Text
        style={[
          styles.label,
          { color: isFocused ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)' },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  iconContainer: {
    height: 30,
    marginBottom: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
});

