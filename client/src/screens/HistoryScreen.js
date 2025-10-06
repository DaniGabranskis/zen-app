// screens/HistoryScreen.js
// Purpose: Display saved reflections as a list or a calendar with filters/sorting.
// Why: Let users review their past days quickly and visually.

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { Calendar } from 'react-native-calendars';
import useStore from '../store/useStore';
import useThemeVars from '../hooks/useThemeVars';
import useResponsive from '../hooks/useResponsive';
import ScreenWrapper from '../components/ScreenWrapper';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const P_SMALL = Math.round(SCREEN_WIDTH * 0.02);

export default function HistoryScreen({ navigation }) {
  // NOTE: get theme first, then compute keys that depend on theme
  const { bgcolor, textMain, cardBg, data, divider, button } = useThemeVars();

  // Purpose: force Calendar re-render on theme change (key depends on cardBg)
  const calendarKey = `calendar-${cardBg}`;

  // Responsive helpers (optional vars if you use them in styles)
  const { pad, corner } = useResponsive();

  // View mode: list or calendar
  const [showCalendar, setShowCalendar] = useState(false);

  // Date filter state: { from: 'YYYY-MM-DD' | null, to: 'YYYY-MM-DD' | null }
  const [dateFilter, setDateFilter] = useState({ from: null, to: null });

  // Sorting state and options
  const [sortType, setSortType] = useState('dateDesc');
  const sortOptions = [
    { label: 'Date ↓', value: 'dateDesc' },
    { label: 'Date ↑', value: 'dateAsc' },
    { label: 'Score ↓', value: 'scoreDesc' },
    { label: 'Score ↑', value: 'scoreAsc' },
  ];

  // Dropdown state and anchor (for absolute-positioned menu)
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const sortButtonRef = useRef(null);
  const [dropdownAnchor, setDropdownAnchor] = useState({ x: 0, y: 0, width: 200 });
  const insets = useSafeAreaInsets(); // Purpose: read safe-area paddings from device

  // All history entries from store
  const history = useStore((state) => state.history);

  // Helper: map score (0..100) to a color bar
  const getScoreColor = (score) => {
    if (typeof score !== 'number') return '#ccc';
    if (score < 33) return '#EF4444';   // red for low
    if (score < 66) return '#FACC15';   // yellow for mid
    return '#22C55E';                   // green for high
  };

  // Build marked dates for Calendar (one dot per day, colored by score)
  const markedDates = useMemo(() => {
    const marked = {};
    history.forEach((item) => {
      const dateKey = new Date(item.date).toISOString().split('T')[0];
      const color = getScoreColor(item.score);
      marked[dateKey] = {
        selected: true,
        selectedColor: color,
        customStyles: {
          container: { backgroundColor: color, borderRadius: 8 },
          text: { color: 'white', fontWeight: 'bold' },
        },
      };
    });
    return marked;
  }, [history]);

  // Header with title and divider
  const renderHeader = () => (
    <View style={stylesHeader.header}>
      <Text style={[stylesHeader.title, { color: textMain }]}>Your History</Text>
      <View style={[stylesHeader.divider, { backgroundColor: divider }]} />
    </View>
  );

  // Single history card
  const renderCard = (item) => {
    const date = new Date(item.date).toLocaleDateString();
    const label = item.dominantGroup || 'Unknown';
    const barColor = getScoreColor(item.score);
    const preview = item.reflection?.slice(0, 100) || 'No reflection';

    return (
      <TouchableOpacity
        style={[stylesCard.card, { backgroundColor: cardBg }]}
        onPress={() =>
          navigation.navigate('ResultModal', {
            ...item,
            fromHistory: true, // ResultScreen adapts layout/behavior when opened from history
          })
        }
      >
        <View style={[stylesCard.corner, { backgroundColor: barColor, width: corner, height: corner }]} />
        <Text style={[stylesCard.date, { color: data }]}>{date}</Text>
        <Text style={stylesCard.emotionLine}>{label}</Text>
        <Text style={stylesCard.score}>Score: {item.score}/100</Text>
        <Text numberOfLines={3} style={stylesCard.preview}>{preview}...</Text>
      </TouchableOpacity>
    );
  };

  // Purpose: detect if a hex color looks dark to adjust weekday header contrast
  const isHexDark = (hex) => {
    try {
      const h = (hex || '').replace('#', '');
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b; // perceived brightness
      return luminance < 140; // tweak if needed
    } catch {
      return false;
    }
  };
  // Use whole-screen background to detect dark mode, not card color
  const isDark = isHexDark(bgcolor);
  const weekHeaderColor = isDark ? '#6E6E6E' : '#4A4A4A';

  // Controls: toggle calendar + sort dropdown
  const renderFilterControls = () => (
    <View style={stylesControls.controlsWrapper}>
      <TouchableOpacity
        style={[
          stylesControls.calendarButton,
          showCalendar && stylesControls.calendarButtonActive,
          { backgroundColor: button },
        ]}
        onPress={() => setShowCalendar(!showCalendar)}
      >
        <Text style={stylesControls.buttonText}>
          {showCalendar ? 'Hide Calendar' : 'Calendar'}
        </Text>
      </TouchableOpacity>

      <View style={stylesControls.dropdownContainer}>
        <TouchableOpacity
          ref={sortButtonRef}
          style={[
            stylesControls.button,
            dropdownOpen && stylesControls.sortButtonOpen,
            { backgroundColor: button },
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
          <Text style={stylesControls.buttonText}>
            Sort by {sortOptions.find((o) => o.value === sortType)?.label}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Filter + sort pipeline
  const filteredHistory = useMemo(() => {
    const list = [...history].filter((item) => {
      if (!dateFilter.from && !dateFilter.to) return true;
      const date = new Date(item.date);
      const from = dateFilter.from ? new Date(dateFilter.from) : null;
      const to = dateFilter.to ? new Date(dateFilter.to) : null;
      if (from && date < from) return false;
      if (to && date > to) return false;
      return true;
    });

    list.sort((a, b) => {
      if (sortType === 'dateDesc') return new Date(b.date) - new Date(a.date);
      if (sortType === 'dateAsc') return new Date(a.date) - new Date(b.date);
      if (sortType === 'scoreDesc') return b.score - a.score;
      if (sortType === 'scoreAsc') return a.score - b.score;
      return 0;
    });

    return list;
  }, [history, dateFilter, sortType]);

  return (
    <ScreenWrapper style={[stylesPage.container, { backgroundColor: bgcolor }]}>
      <FlatList
        data={filteredHistory}
        keyExtractor={(item, index) => `${item.date}-${index}`}
        contentContainerStyle={{
          ...stylesPage.content,
          // Purpose: avoid empty gap while keeping content clear of the tab bar
          paddingBottom: 0, // no extra gap at the bottom
        }}
        ListHeaderComponent={() => (
          <>
            {renderHeader()}
            {renderFilterControls()}
            {showCalendar && (
              <View
                style={{
                  // Purpose: match card width and edges exactly
                  width: '92%',                 // same as cards
                  alignSelf: 'center',          // center within screen
                  borderRadius: corner,         // same rounding as cards
                  overflow: 'hidden',           // clip calendar to rounded corners
                  backgroundColor: button, // dropdown uses same color as Sort button
                  elevation: 2,
                  marginTop: pad * 0.6,
                  marginBottom: pad * 0.8,
                }}
              >
                <Calendar
                  key={calendarKey}
                  markingType="custom"
                  markedDates={markedDates}
                  onDayPress={(day) => {
                    // Purpose: toggle date range selection
                    if (!dateFilter.from || (dateFilter.from && dateFilter.to)) {
                      setDateFilter({ from: day.dateString, to: null });
                    } else {
                      const fromDate = new Date(dateFilter.from);
                      const toDate = new Date(day.dateString);
                      if (toDate < fromDate) {
                        setDateFilter({ from: day.dateString, to: dateFilter.from });
                      } else {
                        setDateFilter((prev) => ({ ...prev, to: day.dateString }));
                      }
                    }
                  }}
                  theme={{
                    // Purpose: remove internal borders and keep colors consistent
                    calendarBackground: cardBg,
                    selectedDayBackgroundColor: '#A78BFA',
                    selectedDayTextColor: '#fff',
                    textDisabledColor: '#8B8B8B',
                    arrowColor: textMain,
                    textSectionTitleColor: weekHeaderColor, // weekday strip (Sun..Sat)
                    monthTextColor: textMain,               // month title color
                    dayTextColor: textMain,                 // days color
                    textDayFontWeight: '500',
                    borderWidth: 0,
                  }}
                  style={{
                    // Purpose: let calendar fill wrapper exactly
                    width: '100%',
                    backgroundColor: 'transparent',
                  }}
                />
              </View>
            )}
          </>
        )}
        ListEmptyComponent={() => (
          <Text style={stylesPage.empty}>You haven't saved any days yet.</Text>
        )}
        renderItem={({ item }) => renderCard(item)}
      />

      {dropdownOpen && (
  // Purpose: overlay contains backdrop and menu to control stacking on Android
  <View style={stylesControls.overlay}>
    {/* Backdrop catches outside taps */}
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => setDropdownOpen(false)}
      style={stylesControls.overlayBackdrop}
    />

    {/* Dropdown menu above the backdrop */}
    <View
      style={[
        stylesControls.dropdownMenuGlobal,
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
            stylesControls.dropdownItem,
            opt.value === sortType && stylesControls.selectedItem,
          ]}
          onPress={() => {
            setSortType(opt.value);
            setDropdownOpen(false);
          }}
        >
          <Text style={stylesControls.dropdownItemText}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
)}
    </ScreenWrapper>
  );
}

/* ================== Styles ================== */
// Split into small groups for readability.

const stylesPage = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  empty: {
    fontSize: Math.round(SCREEN_WIDTH * 0.042),
    textAlign: 'center',
    marginTop: 20,
  },
});

const stylesHeader = StyleSheet.create({
  header: { width: '100%', alignItems: 'center', marginTop: 16 },
  title: {
    fontSize: Math.round(SCREEN_WIDTH * 0.08),
    fontWeight: '800',
    textAlign: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  divider: {
    height: 1.5,
    width: Math.round(SCREEN_WIDTH * 0.5),
    alignSelf: 'center',
    opacity: 0.12,
    marginBottom: 16,
  },
});

const stylesCard = StyleSheet.create({
  card: {
    alignSelf: 'center',
    borderRadius: Math.round(SCREEN_WIDTH * 0.05),
    padding: 16,
    paddingLeft: 28,              // give content extra space from the left stripe
    marginBottom: 16,
    elevation: 2,
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 480,
    position: 'relative',
    overflow: 'hidden',           // clip children to rounded corners
  },
  corner: {
    position: 'absolute',
    top: 0,
    right: 0,
    borderBottomLeftRadius: 16,
    zIndex: 2,
  },
  date: {
    fontSize: Math.round(SCREEN_WIDTH * 0.04),
    marginBottom: P_SMALL,
  },
  emotionLine: {
    fontSize: Math.round(SCREEN_WIDTH * 0.049),
    fontWeight: '600',
    marginBottom: P_SMALL * 1.4,
  },
  score: {
    fontSize: Math.round(SCREEN_WIDTH * 0.04),
    marginBottom: P_SMALL,
  },
  preview: {
    fontSize: Math.round(SCREEN_WIDTH * 0.04),
    color: '#333',
  },
});

const stylesControls = StyleSheet.create({
  controlsWrapper: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 16,
  },
  calendarButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  calendarButtonActive: {
    opacity: 0.92, // simple pressed effect
  },
  button: {
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
  dropdownContainer: { position: 'relative', alignItems: 'center' },
  dropdownItem: {
    // unified style (avoid duplicates)
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  selectedItem: { backgroundColor: '#A78BFA' },
  dropdownItemText: {
    fontSize: 14,
    color: 'white',
    textAlign: 'center',
    fontWeight: '500',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: 'transparent',
  },
  overlay: {
    // Purpose: full-screen layer for backdrop + menu
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,  // above page content
    elevation: 9, // Android stacking
  },
  overlayBackdrop: {
    // Purpose: catch outside taps to close the menu
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  dropdownMenuGlobal: {
    position: 'absolute',
    paddingVertical: 4,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    zIndex: 1000,   // keep menu above the backdrop
    elevation: 10,  // Android: ensure menu floats above
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },


});
