import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CustomTabButton } from './CustomTabButton';
import { IconSymbol } from './ui/icon-symbol';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TAB_BAR_HEIGHT = 70;
// Slightly smaller active-circle size for better proportion
const CIRCLE_SIZE = 56;
const CIRCLE_RADIUS = CIRCLE_SIZE / 2; // 28px
const CIRCLE_EXTENDS_ABOVE = CIRCLE_RADIUS; // Half circle above
const CUTOUT_DEPTH = 42; // Keep current depth (user-approved)

export function CustomTabBar(props: BottomTabBarProps) {
  const { state, descriptors, navigation } = props;
  // React Navigation passes tabBarStyle as `style` into the custom tab bar.
  // We need to spread it onto our container so the underlying wrapper
  // background becomes transparent instead of white.
  // Type definition for `style` isn't exposed on BottomTabBarProps, so we
  // access it via a safe cast.
  const externalStyle = (props as any).style;
  const activeIndex = state.index;
  
  // Hide tab bar on maintenance-data and services screens
  const currentRoute = state.routes[activeIndex]?.name;
  if (currentRoute === 'maintenance-data' || currentRoute === 'services') {
    return null;
  }
  
  const tabWidth = SCREEN_WIDTH / 3;

  // Center of active tab
  const circleCenter = tabWidth * activeIndex + tabWidth / 2;

  // Perfect semicircular cutout matching Image 2
  // Circle: 64px total, 32px above bar (top: -32), 32px in cutout
  const createTabBarPath = () => {
    const r = CIRCLE_RADIUS;
    const h = TAB_BAR_HEIGHT;
    
    // Cutout width control (slightly wider than circle, but not too wide)
    const cutoutPadding = 4; // Extra width on each side
    const cutoutWidth = r * 2 + cutoutPadding * 2; // Total cutout width
    const cutoutRadius = cutoutWidth / 2;
    
    // Perfect semicircle: bottom half of circle with bigger radius
    // Using cubic bezier for perfect semicircle (Kappa = 0.5522847498)
    const kappa = 0.5522847498;
    const cutoutLeft = circleCenter - cutoutRadius;
    const cutoutRight = circleCenter + cutoutRadius;
    const transitionWidth = 12; // Slightly longer transition for softer shoulders
    
    // Smoother transition control points (tuned for very soft edges)
    const smoothFactor = 0.6; // Controls smoothness of entry/exit curves
    const deepestY = CUTOUT_DEPTH * 0.94; // Slightly shallower, wider bottom
    
    return `
      M 0,20
      Q 0,0 20,0
      L ${cutoutLeft - transitionWidth},0
      
      C ${cutoutLeft - transitionWidth * smoothFactor},0 ${cutoutLeft - transitionWidth * 0.4},${CUTOUT_DEPTH * 0.22} ${cutoutLeft},${CUTOUT_DEPTH * 0.4}
      C ${cutoutLeft},${CUTOUT_DEPTH * (1 - kappa)} ${circleCenter - cutoutRadius * kappa},${deepestY} ${circleCenter},${deepestY}
      C ${circleCenter + cutoutRadius * kappa},${deepestY} ${cutoutRight},${CUTOUT_DEPTH * (1 - kappa)} ${cutoutRight},${CUTOUT_DEPTH * 0.4}
      C ${cutoutRight + transitionWidth * 0.4},${CUTOUT_DEPTH * 0.22} ${cutoutRight + transitionWidth * smoothFactor},0 ${cutoutRight + transitionWidth},0
      
      L ${SCREEN_WIDTH - 20},0
      Q ${SCREEN_WIDTH},0 ${SCREEN_WIDTH},20
      L ${SCREEN_WIDTH},${h}
      L 0,${h}
      Z
    `;
  };

  const iconMap: Record<string, string> = {
    home: 'house.fill',
    history: 'clock.fill',
    setting: 'gearshape.fill',
  };

  const labelMap: Record<string, string> = {
    home: 'Search',
    history: 'History',
    setting: 'Setting',
  };

  return (
    <View style={styles.wrapper}>
      <View 
        style={[
          styles.container, 
          externalStyle, 
          { 
            backgroundColor: 'transparent',
            overflow: 'visible', // Allow content to extend beyond bounds
          }
        ]}
        pointerEvents="box-none" // Allow touches to pass through transparent areas
      >
      {/* FLOATING ACTIVE ICON */}
      <View
        style={[
          styles.circle,
          {
            left: circleCenter - CIRCLE_RADIUS,
          },
        ]}
      >
        <IconSymbol
          size={32}
          name={iconMap[state.routes[activeIndex].name] as any}
          color="#FFFFFF"
        />
      </View>

      {/* TAB BAR BACKGROUND */}
      <Svg width={SCREEN_WIDTH} height={TAB_BAR_HEIGHT} style={styles.svgContainer}>
        <Path d={createTabBarPath()} fill="#423491" />
      </Svg>

      {/* TAB BUTTONS */}
      <View style={styles.tabsContainer}>
        {state.routes.map((route, index) => {
          if (route.name === 'maintenance-data' || route.name === 'services') {
            return null;
          }

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <CustomTabButton
              key={route.key}
              route={route}
              isFocused={isFocused}
              onPress={onPress}
              label={labelMap[route.name] || route.name}
              iconName={iconMap[route.name] || 'house.fill'}
            />
          );
        })}
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: SCREEN_WIDTH,
    backgroundColor: 'transparent', // Full transparent wrapper to cover any default background
  },
  container: {
    position: 'relative',
    height: TAB_BAR_HEIGHT,
    backgroundColor: 'transparent', // Explicit transparent - more reliable than 'transparent'
  },

  svgContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },

  circle: {
    position: 'absolute',
    // Nudge circle slightly down so it visually hugs the cutout
    top: -(CIRCLE_EXTENDS_ABOVE - 4),
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_RADIUS,
    backgroundColor: '#666666',
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },

  tabsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 4,
    backgroundColor: 'transparent', // Explicit transparent
  },
});
