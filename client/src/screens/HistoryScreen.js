import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, ScrollView  } from 'react-native';
import useStore from '../store/useStore';
import useThemeVars from '../hooks/useThemeVars';
import ScreenWrapper from '../components/ScreenWrapper';
import { Calendar } from 'react-native-calendars';
import useResponsive from '../hooks/useResponsive';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const { width, height, rem, pad, corner, font } = useResponsive();
const P_SMALL = Math.round(SCREEN_WIDTH * 0.02);
/**
 * HistoryScreen — displays all user's reflection history.
 * User can switch between list and calendar view.
 * Each entry opens ResultModal for detailed review.
 */

export default function HistoryScreen({ navigation }) {
  // NOTE: we need theme first to build calendarKey safely
  const { bgcolor, textMain, cardBg, data, divider, button } = useThemeVars();

  // Purpose: force Calendar re-render on theme change (key depends on cardBg)
  const calendarKey = `calendar-${cardBg}`;

  // 'list' for flat list, 'calendar' for calendar visualization
  const [showCalendar, setShowCalendar] = useState(false);

  const [dropdownAnchorY, setDropdownAnchorY] = useState(0);
  const sortButtonRef = useRef(null);
  const [dropdownAnchor, setDropdownAnchor] = useState({ x: 0, y: 0 });
  

  // All days saved in store
  const history = useStore((state) => state.history);

    const getScoreColor = (score) => {
    if (typeof score !== 'number') return '#ccc';
    if (score < 33) return '#EF4444';
    if (score < 66) return '#FACC15';
    return '#22C55E';
  };

  // Build marked dates for Calendar from all history entries
  const markedDates = useMemo(() => {
    const marked = {};
    history.forEach((item) => {
      const dateKey = new Date(item.date).toISOString().split('T')[0];
      const color = getScoreColor(item.score);
      marked[dateKey] = {
        selected: true,
        selectedColor: color,
        customStyles: {
          container: {
            backgroundColor: color,
            borderRadius: 8,
          },
          text: {
            color: 'white',
            fontWeight: 'bold',
          },
        },
      };
    });
    return marked;
  }, [history]);

  // Renders title, divider, and layout switch buttons
  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <Text style={[styles.title, { color: textMain }]}>Your History</Text>
        <View style={[styles.divider, { backgroundColor: divider }]} />
      </View>
    </>
  );

    /**
   * Renders a single history entry as a card
   * Opens ResultModal with all details on press
   */
  const renderCard = (item) => {
    const date = new Date(item.date).toLocaleDateString();
    const label = item.dominantGroup || 'Unknown';
    const barColor = getScoreColor(item.score);
    const preview = item.reflection?.slice(0, 100) || 'No reflection';

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardBg }]}
        onPress={() =>
          navigation.navigate('ResultModal', {
            ...item,
            fromHistory: true,     // Used by ResultScreen to alter layout/behavior
          })
        }
      >
        <View style={[styles.corner, { backgroundColor: barColor }]} />
        <View style={[styles.colorBar, { backgroundColor: barColor }]} />
        <Text style={[styles.date, { color: data }]}>{date}</Text>
        <Text style={styles.emotionLine}>{label}</Text>
        <Text style={styles.score}>Score: {item.score}/100</Text>
        <Text numberOfLines={3} style={styles.preview}>{preview}...</Text>
      </TouchableOpacity>
    );
  };

  const renderFilterControls = () => (
    <View style={styles.controlsWrapper}>
      <TouchableOpacity style={[
        styles.calendarButton,
        showCalendar && styles.calendarButtonActive, {backgroundColor: button}
      ]} onPress={() => setShowCalendar(!showCalendar)}>
        <Text style={styles.buttonText}>
          {showCalendar ? 'Hide Calendar' : 'Calendar'}
        </Text>
      </TouchableOpacity>

      <View style={styles.dropdownContainer}>
        <TouchableOpacity
          ref={sortButtonRef}
          style={[
            styles.button,
            dropdownOpen && styles.sortButtonOpen, {backgroundColor: button}
          ]}
          onPress={() => {
            if (sortButtonRef.current) {
              sortButtonRef.current.measureInWindow((x, y, width, height) => {
                setDropdownAnchor({ x, y: y + height, width });
                setDropdownOpen(true);
              });
            }
          }}
        >
          <Text style={styles.buttonText}>
            Sort by {sortOptions.find(o => o.value === sortType)?.label}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const filteredHistory = [...history]
  .filter(item => {
    if (!dateFilter.from && !dateFilter.to) return true;
    const date = new Date(item.date);
    const from = dateFilter.from ? new Date(dateFilter.from) : null;
    const to = dateFilter.to ? new Date(dateFilter.to) : null;
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  })
  .sort((a, b) => {
    if (sortType === 'dateDesc') return new Date(b.date) - new Date(a.date);
    if (sortType === 'dateAsc') return new Date(a.date) - new Date(b.date);
    if (sortType === 'scoreDesc') return b.score - a.score;
    if (sortType === 'scoreAsc') return a.score - b.score;
    return 0;
  });

  // --- Main Render: Switches between List and Calendar layouts ---
  return (
  <ScreenWrapper style={[styles.container, { backgroundColor: bgcolor }]}>
      <FlatList
        data={filteredHistory}
        keyExtractor={(item, index) => `${item.date}-${index}`}
        contentContainerStyle={{...styles.content, paddingBottom: height * 0.07,}}
        ListHeaderComponent={() => (
          <>
            {renderHeader()}
            {renderFilterControls()}
            {showCalendar && (
              <Calendar
                key={calendarKey}
                markingType="custom"
                markedDates={markedDates}
                onDayPress={(day) => {
                  if (!dateFilter.from || (dateFilter.from && dateFilter.to)) {
                    setDateFilter({ from: day.dateString, to: null });
                  } else {
                    const fromDate = new Date(dateFilter.from);
                    const toDate = new Date(day.dateString);
                    if (toDate < fromDate) {
                      setDateFilter({ from: day.dateString, to: dateFilter.from });
                    } else {
                      setDateFilter(prev => ({ ...prev, to: day.dateString }));
                    }
                  }
                }}
                theme={{
                  calendarBackground: cardBg,
                  selectedDayBackgroundColor: '#A78BFA',
                  selectedDayTextColor: '#fff',
                  textDisabledColor: '#8B8B8B',
                  textMonthFontWeight: 'bold',
                  textMonthFontSize: Math.round(SCREEN_WIDTH * 0.05),
                  arrowColor: textMain,
                  textSectionTitleColor: textMain,
                  textDayFontWeight: '500',
                  textDayFontSize: Math.round(SCREEN_WIDTH * 0.042),
                  textDayHeaderFontSize: Math.round(SCREEN_WIDTH * 0.038),
                  borderWidth: 0,
                }}
                style={{
                  borderRadius: 18,
                  elevation: 2,
                  overflow: 'hidden',
                  marginTop: 10,
                  marginBottom: 12,
                }}
              />
            )}
          </>
        )}
        ListEmptyComponent={() => (
          <Text style={styles.empty}>You haven't saved any days yet.</Text>
        )}
        renderItem={({ item }) => renderCard(item)}
      />
      {dropdownOpen && (
        <View
          style={[
            styles.dropdownMenuGlobal,
            {
              top: dropdownAnchor.y,
              left: dropdownAnchor.x,
              width: dropdownAnchor.width,
              backgroundColor: cardBg,
            },
          ]}
        >
          {sortOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.dropdownItem,
                opt.value === sortType && styles.activeItem,
              ]}
              onPress={() => {
                setSortType(opt.value);
                setDropdownOpen(false);
              }}
            >
              <Text style={styles.dropdownItemText}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
  </ScreenWrapper>
);
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  header: {
    width: '100%',
    alignItems: 'center',
    marginTop: pad * 2, 
  },
  title: {
    fontSize: Math.round(SCREEN_WIDTH * 0.08),
    fontWeight: '800',
    textAlign: 'center',
    alignSelf: 'center',
    marginBottom: pad,
  },
  divider: {
    height: 1.5,
    width: Math.round(SCREEN_WIDTH * 0.5),
    alignSelf: 'center',
    opacity: 0.12,
    marginBottom: pad,
  },
  empty: {
    fontSize: Math.round(SCREEN_WIDTH * 0.042),
    textAlign: 'center',
    marginTop: pad * 2,
  },
  corner: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: corner,
    height: corner,
    borderBottomLeftRadius: corner,
    zIndex: 2,
  },
  card: {
    alignSelf: 'center',
    borderRadius: Math.round(SCREEN_WIDTH * 0.05),
    padding: pad,
    marginBottom: pad,
    elevation: 2,
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 480,
    position: 'relative',
  },
  date: {
    fontSize: Math.round(SCREEN_WIDTH * 0.040),
    marginBottom: P_SMALL,
  },
  emotionLine: {
    fontSize: Math.round(SCREEN_WIDTH * 0.049),
    fontWeight: '600',
    marginBottom: P_SMALL * 1.4,
  },
  preview: {
    fontSize: Math.round(SCREEN_WIDTH * 0.04),
    color: '#333',
  },
  controlsWrapper: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 16,
  },
  calendarButton: {
    backgroundColor: '#A78BFA',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  calendarButtonActive: {
    backgroundColor: '#7C3AED', // немного темнее, чтобы выглядело как "нажато"
  },
  button: {
    backgroundColor: '#A78BFA',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  sortButtonOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 16,
  },
  dropdownItem: {
    // Purpose: unified dropdown item style (avoid duplicates)
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  selectedItem: {
    backgroundColor: '#A78BFA',
  },
  dropdownItemText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  dropdownContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  dropdownButton: {
    backgroundColor: '#F4F4F4',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderColor: '#ddd',
    borderWidth: 1,
  },
  dropdownButtonText: {
    color: '#333',
    fontSize: 14,
  },
  activeItem: {
    backgroundColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  dropdownMenuGlobal: {
    position: 'absolute',
    backgroundColor: '#fff',
    paddingVertical: 4,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 100,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
});