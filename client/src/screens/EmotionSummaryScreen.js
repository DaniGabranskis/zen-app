// screens/EmotionSummaryScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import useStore from '../store/useStore';
import emotionDetails from '../data/emotionDetails.json';
import ScreenWrapper from '../components/ScreenWrapper';

export default function EmotionSummaryScreen({ navigation, route }) {
  const { emotion } = route.params;
  const setEmotion = useStore((state) => state.setEmotion);

  const selectedEmotion =
    typeof emotion === 'string'
      ? emotionDetails.find((e) => e.name.toLowerCase() === emotion.toLowerCase())
      : emotion;

  const handleNext = () => {
    setEmotion(selectedEmotion);
    navigation.navigate('WhyReflection');
  };

  const handleChange = () => {
    navigation.navigate('PrimaryEmotionSelector', {
      origin: 'change',
      emotions: Object.values(emotionDetails),
    });
  };

  if (!selectedEmotion) {
    return (
      <ScreenWrapper style={styles.container}>
        <Text style={styles.title}>Oops. Emotion not found.</Text>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper style={styles.container}>
      <Text style={styles.title}>We think your dominant emotion is:</Text>

      <LinearGradient colors={selectedEmotion.color} style={styles.circle}>
        <Text style={styles.emotionName}>{selectedEmotion.name}</Text>
        <Text style={styles.emotionDescription}>{selectedEmotion.description}</Text>
      </LinearGradient>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextText}>Next</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.changeBtn} onPress={handleChange}>
          <Text style={styles.changeText}>Change Emotion</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    flex: 1,
    backgroundColor: '#FAFAFB',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  circle: {
    width: 260,
    height: 260,
    borderRadius: 130,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  emotionName: {
    fontSize: 34,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  emotionDescription: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  buttons: {
    gap: 16,
    width: '100%',
    alignItems: 'center',
  },
  nextBtn: {
    backgroundColor: '#6C63FF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  nextText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  changeBtn: {
    paddingVertical: 10,
  },
  changeText: {
    color: '#6C63FF',
    fontSize: 16,
    fontWeight: '600',
  },
});
