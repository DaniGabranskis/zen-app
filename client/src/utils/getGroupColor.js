import tagGroups from '../data/tagGroups.json';

export default function getGroupColor(group) {
  // Вернуть первый цвет группы, если есть
  if (tagGroups.groups[group] && tagGroups.groups[group].colors) {
    return tagGroups.groups[group].colors[0];
  }
  // Фоллбэк — серый
  return '#ccc';
}
