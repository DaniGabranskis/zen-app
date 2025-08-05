import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Dimensions } from 'react-native';
import useThemeVars from '../hooks/useThemeVars';

const { width } = Dimensions.get('window');
const PAD = Math.round(width * 0.05);

export default function QuestionBlock({ data, onSubmit }) {
  const { bgcolor, textMain, textSub, button, divider } = useThemeVars();
  const [customAnswer, setCustomAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);

  const options = data.options || [];
  const allowCustom = data.allowCustom !== false; // по умолчанию true
  const placeholder = data.placeholder || 'Type your answer here...';

  const handlePress = (option) => {
    setSelectedOption(option.text);
    onSubmit(option.text, option.tags || [], option.scoreImpact || 0);
  };

  const handleCustomSubmit = () => {
    if (customAnswer.trim().length > 0) {
      onSubmit(customAnswer.trim(), [], 0);
      setCustomAnswer('');
    }
  };

  // Поддержка type: info/ai-support/choice/input/...
  if (data.type === 'info') {
    // Можно расширить, если нужны ссылки/кнопки/AI
    return (
      <View style={[styles.container, { backgroundColor: bgcolor }]}>
        <Text style={[styles.question, { color: textMain }]}>{data.text}</Text>
        {/* тут можешь вывести ссылки/кнопки/действия если нужны */}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgcolor }]}>
      <Text style={[styles.question, { color: textMain }]}>
        {data.text || data.question || '(Missing question text)'}
      </Text>
      {options.length > 0 && (
        <>
          <Text style={[styles.or, { color: textSub }]}>Choose one of ready answers...</Text>
          <ScrollView contentContainerStyle={styles.optionsContainer}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.optionButton, { backgroundColor: button }]}
                onPress={() => handlePress(option)}
              >
                <Text style={[styles.optionText, { color: textMain }]}>{option.text}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {allowCustom && (
        <>
          <Text style={[styles.or, { color: textSub }]}>...or write your own</Text>
          <TextInput
            style={styles.input}
            value={customAnswer}
            onChangeText={setCustomAnswer}
            placeholder={placeholder}
            placeholderTextColor={textSub}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: button, opacity: customAnswer.trim() ? 1 : 0.5 }
            ]}
            onPress={handleCustomSubmit}
            disabled={!customAnswer.trim()}
          >
            <Text style={styles.submitText}>Submit</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: PAD * 1.1,
    paddingTop: PAD * 2.1,
    paddingBottom: PAD,
    justifyContent: 'flex-start',
  },
  question: {
    fontSize: Math.round(width * 0.068),
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: PAD * 0.58,
  },
  optionsContainer: { paddingBottom: PAD },
  optionButton: {
    paddingVertical: PAD * 0.8,
    paddingHorizontal: PAD,
    borderRadius: Math.round(width * 0.03),
    marginBottom: PAD * 0.7,
  },
  optionText: {
    fontSize: Math.round(width * 0.045),
    textAlign: 'center',
  },
  or: {
    textAlign: 'center',
    marginVertical: PAD * 0.74,
    fontSize: Math.round(width * 0.042),
    fontStyle: 'italic',
  },
  input: {
    minHeight: PAD * 3.3,
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: Math.round(width * 0.03),
    padding: PAD * 0.7,
    fontSize: Math.round(width * 0.045),
    marginBottom: PAD,
    backgroundColor: '#FAFAFB',
  },
  submitButton: {
    backgroundColor: '#6C63FF',
    paddingVertical: PAD * 0.8,
    borderRadius: Math.round(width * 0.03),
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: Math.round(width * 0.045),
    fontWeight: '600',
  },
});
