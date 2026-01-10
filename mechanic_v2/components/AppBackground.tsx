import React from 'react';
import { StyleSheet, View, Dimensions, ImageBackground } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface AppBackgroundProps {
  children?: React.ReactNode;
}

const AppBackground: React.FC<AppBackgroundProps> = ({ children }) => {
  // Proportions based on the Figma layout
  const peakY = height * 0.44;     // The tip of the mountain
  const shoulderY = height * 0.56; // Where the vertical side meets the slope
  const curveRadius = 30;          // Smoothness of the transitions

  // Path Construction:
  // We use absolute screen coordinates for better precision
  const pathData = `
    M 0,${height} 
    L 0,${shoulderY + curveRadius}
    Q 0,${shoulderY} ${curveRadius},${shoulderY - 14}
    L ${width / 2 - curveRadius},${peakY + 16}
    Q ${width / 2},${peakY} ${width / 2 + curveRadius},${peakY + 16}
    L ${width - curveRadius},${shoulderY - 14}
    Q ${width},${shoulderY} ${width},${shoulderY + curveRadius}
    L ${width},${height}
    Z
  `;

  return (
    <View style={styles.container}>
      {/* 1. Background Gradient Image */}
      <ImageBackground
        source={require('../assets/background/gradient_background.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />

      {/* 2. Overlapping Light Blue Shape */}
      <View style={StyleSheet.absoluteFill}>
        <Svg height={height} width={width} viewBox={`0 0 ${width} ${height}`}>
          <Path
            d={pathData}
            fill="#C2D8EA" // Matches Figma "Rectangle 113" fill exactly
          />
        </Svg>
      </View>

      {/* 3. Content Layer */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    // Each screen handles its own layout
  },
});

export default AppBackground;