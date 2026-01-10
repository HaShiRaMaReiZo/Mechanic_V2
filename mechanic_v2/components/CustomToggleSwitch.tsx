import React from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';

interface CustomToggleSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  trackColor?: { false: string; true: string };
  thumbColor?: string;
}

export function CustomToggleSwitch({
  value,
  onValueChange,
  trackColor = { false: '#D3D3D3', true: '#10B981' },
  thumbColor = '#FFFFFF',
}: CustomToggleSwitchProps) {
  const [animatedValue] = React.useState(new Animated.Value(value ? 1 : 0));

  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value, animatedValue]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 33], // Track width (60) - thumb width (24) - padding (3)
  });

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [trackColor.false, trackColor.true],
  });

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => onValueChange(!value)}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.track,
          {
            backgroundColor,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            {
              backgroundColor: thumbColor,
              transform: [{ translateX }],
            },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  track: {
    width: 60,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    padding: 3,
  },
  thumb: {
    width: 24, // Smaller thumb - 24px vs track height 30px
    height: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
});

