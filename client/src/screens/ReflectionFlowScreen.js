import React, { useState, useRef } from 'react';
import { Text, Platform, Alert, ToastAndroid } from 'react-native';
import { canonicalizeTags } from '../utils/tagCanon';
import { StackActions, useNavigation } from '@react-navigation/native';
import ScreenWrapper from '../components/ScreenWrapper';
import SwipeCard from '../components/SwipeCard';
import QuestionBlock from '../components/QuestionBlock';
import ZenData from '../data/ZenDataExtend.json';
import QuestionBlockData from '../data/QuestionBlockData.json';
import emotionDetails from '../data/emotionDetails.json';
import useStore from '../store/useStore';
import openai from '../utils/openaiClient';
import buildPrompt from '../utils/promptBuilder';

const emotionWeights = {
  confusion: 6, disconnected: 5, anxious: 5, anger: 4, frustration: 4,
  sadness: 3, overload: 3, joy: 2, gratitude: 2, tension: 2, clarity: 1, calm: 1,
};

function calculateScore(answers) {
  const tags = answers.flatMap(a => a.emotionTags || []);
  if (tags.length === 0) return 50;
  const sum = tags.reduce((acc, tag) => acc + (emotionWeights[tag.toLowerCase()] || 3), 0);
  const maxSum = tags.length * 6;
  return Math.max(0, Math.min(100, Math.round(100 - (sum / maxSum) * 100)));
}

function getKeyEmotions(answers) {
  const count = {};
  answers.flatMap(a => a.tags || []).forEach(tag => {
    if (emotionDetails[tag]) count[tag] = (count[tag] || 0) + 1;
  });
  const total = Object.values(count).reduce((sum, val) => sum + val, 1);
  return Object.entries(count)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label, cnt]) => ({
      label: emotionDetails[label]?.label || label,
      emoji: emotionDetails[label]?.emoji || '',
      percent: Math.round((cnt / total) * 100),
    }));
}

function getKeyTopics(answers) {
  const emotionTags = Object.keys(emotionDetails);
  const count = {};
  answers.flatMap(a => a.tags || []).forEach(tag => {
    if (!emotionTags.includes(tag)) count[tag] = (count[tag] || 0) + 1;
  });
  return Object.entries(count)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag.charAt(0).toUpperCase() + tag.slice(1));
}

function getAdvice(answers) {
  const tags = answers.flatMap(a => a.tags || []);
  if (tags.includes('burnout')) return 'Try to rest or ask for support.';
  if (tags.includes('anxiety')) return 'Take a break and breathe deeply.';
  if (tags.includes('tension')) return 'Consider a short walk or a stretch break.';
  return 'Take a small positive step tomorrow!';
}

async function getAIInsight(answers) {
  try {
    const prompt = buildPrompt({ answers });

    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a mindful assistant helping users reflect.' },
        { role: 'user', content: prompt },
      ],
      model: 'gpt-3.5-turbo',
    });

    const raw = completion.choices[0].message.content.trim();
    console.log('🤖 Raw AI response:', raw);

    const parsed = JSON.parse(raw);  // 💥 должно быть JSON
    return parsed;
  } catch (err) {
    console.error('❌ AI insight generation failed:', err);
    return {
      insight: '',
      tips: [],
      encouragement: '',
    };
  }
}

function getFilteredQuestions(layerKey, answers) {
  const raw = ZenData[layerKey] || [];
  return raw.filter(q => {
    if (q.showIf) {
      return Object.entries(q.showIf).some(([qid, values]) =>
        answers.find(a => a.questionId === qid && values.includes(a.answerText))
      );
    }
    if (q.showIfTags) {
      const tags = answers.flatMap(a => a.tags || []);
      return q.showIfTags.some(tag => tags.includes(tag));
    }
    return true;
  });
}

export default function ReflectionFlowScreen() {
  const navigation = useNavigation();
  const [layer, setLayer] = useState(1);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [questionSet, setQuestionSet] = useState(getFilteredQuestions('L1', []));
  const resultTriggered = useRef(false);

  const next = async (updatedAnswers) => {
    const nextLayer = layer + 1;
    const filtered = getFilteredQuestions(`L${nextLayer}`, updatedAnswers);

    if (filtered.length === 0) {
      if (resultTriggered.current) return;
      resultTriggered.current = true;
      console.log('✅ No more questions. Navigating to ResultScreen.');
      
      navigation.dispatch(StackActions.replace('Result', {
        score: calculateScore(updatedAnswers),
        keyEmotions: getKeyEmotions(updatedAnswers),
        keyTopics: getKeyTopics(updatedAnswers),
        answers: updatedAnswers,
        isGenerating: true,
      }));
      
    } else {
      console.log(`➡️ Moving to Layer ${nextLayer} with ${filtered.length} questions.`);
      setLayer(nextLayer);
      setIndex(0);
      setQuestionSet(filtered);
      setAnswers(updatedAnswers);
    }
  };

  const handleAnswer = (questionId, answerText, tags = [], scoreImpact = 0) => {
  const currentCard = questionSet[index];

  // Strict rule: options must provide their own tags.
  // We no longer use any fallback like currentCard.showIfTags.
  const finalTags = canonicalizeTags(Array.isArray(tags) ? tags : []);

  if (finalTags.length === 0) {
    // Developer log for quick content fixing
    const cardId = currentCard?.id || questionId;
    const optionPreview = String(answerText || '').slice(0, 80);
    console.warn(`[NO_TAGS] question=${cardId} option="${optionPreview}" — option has no tags, answer is blocked.`);

    // User-facing message
    if (Platform.OS === 'android') {
      ToastAndroid.show('This option is not configured yet. Please choose another.', ToastAndroid.SHORT);
    } else {
      Alert.alert('Option not configured', 'This option is not configured yet. Please choose another.');
    }
    return; // Do not save the answer, do not advance
  }

  const updatedAnswers = [
    ...answers,
    {
      questionId,
      answerText,
      tags: finalTags,
      emotionTags: finalTags, // keep current behavior for now
      scoreImpact,
    },
  ];

  console.log('📝 Answer saved:', { questionId, answerText, finalTags });

  if (index + 1 < questionSet.length) {
    setIndex(index + 1);
    setAnswers(updatedAnswers);
  } else {
    next(updatedAnswers);
  }
};

  const renderCard = () => {
    const currentCard = questionSet[index];
    if (!currentCard) return <Text>No questions left.</Text>;

    const rawOptions = QuestionBlockData[currentCard.id] || [];
    const optionsArray = Array.isArray(rawOptions)
      ? rawOptions.map(text => ({ text }))
      : [];

    return currentCard.type === 'swipe' ? (
      <SwipeCard
        key={currentCard.id}
        card={currentCard}
        onSwipeLeft={() =>
          handleAnswer(currentCard.id, currentCard.leftOption.text, currentCard.leftOption.tags, currentCard.leftOption.scoreImpact)
        }
        onSwipeRight={() =>
          handleAnswer(currentCard.id, currentCard.rightOption.text, currentCard.rightOption.tags, currentCard.rightOption.scoreImpact)
        }
      />
    ) : (
      <QuestionBlock
        key={currentCard.id}
        data={currentCard}
        options={optionsArray}
        onSubmit={(answerText, tags = [], scoreImpact = 0) =>
          handleAnswer(currentCard.id, answerText, tags, scoreImpact)
        }
      />
    );
  };

  return <ScreenWrapper useFlexHeight>{renderCard()}</ScreenWrapper>;
}
