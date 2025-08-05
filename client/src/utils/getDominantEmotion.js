// utils/getDominantEmotion.js
import emotionDetails from '../data/emotionDetails.json';

export default function getDominantEmotion(acceptedCards) {
  const emotionScores = {};

  for (const card of acceptedCards) {
    // Считаем только по выбранной опции!
    const tags = card.options?.[card.selectedOption] || [];
    for (const tag of tags) {
      emotionScores[tag] = (emotionScores[tag] || 0) + 1;
    }
  }

  const sorted = Object.entries(emotionScores)
    .sort((a, b) => b[1] - a[1]);

  for (const [emotion] of sorted) {
    const match = emotionDetails.find(e => e.name === emotion);
    if (match) {
      return {
        name: match.name,
        description: match.description,
        color: match.color,
      };
    }
  }

  return {
    name: 'Unknown',
    description: '',
    color: ['#ccc', '#eee'],
  };
}
