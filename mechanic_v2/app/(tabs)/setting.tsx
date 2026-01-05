import { View, Text, StyleSheet } from 'react-native';
import AppBackground from '@/components/AppBackground';

export default function SettingScreen() {
  return (
    <AppBackground>
      <View style={styles.container}>
        <Text style={styles.text}>Settings</Text>
      </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  text: {
    fontSize: 18,
    color: '#000',
  },
});