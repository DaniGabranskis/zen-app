// screens/HistoryScreen.js
// Purpose: Display saved reflections as a list or a calendar with filters/sorting.
// Why: Let users review their past days quickly and visually.

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import HistoryCalendar from '../components/HistoryCalendar';
import useStore from '../store/useStore';
import useThemeVars from '../hooks/useThemeVars';
import useResponsive from '../hooks/useResponsive';
import ScreenWrapper from '../components/ScreenWrapper';
import { getEmotionMeta } from '../utils/evidenceEngine';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const P_SMALL = Math.round(SCREEN_WIDTH * 0.02);
const BTN_HEIGHT = Math.round(SCREEN_WIDTH * 0.12); // 10% высоты экрана
const BTN_RADIUS = Math.round(SCREEN_WIDTH * 0.05);
const BTN_TEXT = Math.round(SCREEN_WIDTH * 0.04);  // размер шрифта

export default function HistoryScreen({ navigation }) {
  // Новые переменные темы
  const {
  background,
  textPrimary,
  dataText,
  cardBackground,
  dividerColor,
  accent,
  } = useThemeVars();

  // Purpose: force Calendar re-render on theme change (key depends on cardBackground)
  const calendarKey = `calendar-${cardBackground}`;

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
    { label: 'A→Z', value: 'labelAsc' },
    { label: 'Z→A', value: 'labelDesc' },
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

  // Header with title and divider
  const renderHeader = () => (
    <View style={stylesHeader.header}>
      <Text style={[stylesHeader.title, { color: textPrimary }]}>Your History</Text>
      <View style={[stylesHeader.divider, { backgroundColor: dividerColor }]} />
    </View>
  );

  // Single history card
  const renderCard = (item) => {
    const date = new Date(item.date).toLocaleDateString();
    const label = item.dominantGroup || 'Unknown';
    const meta = getEmotionMeta(item.dominantGroup);
    const barColor = Array.isArray(meta?.color) ? meta.color[0] : '#A78BFA';
    // prefer shortDescription from session.l5; fallback to miniInsight; else '—'
    const short = item?.session?.l5?.shortDescription?.trim?.() || '';
    const mini  = item?.session?.l5?.miniInsight?.trim?.() || '';
    const text  = short || mini || '—';

    // Limit the length of the text (approximately 80 characters)
    const maxLen = 80;
    const preview =
      text.length > maxLen
        ? text.slice(0, maxLen).trim().replace(/[.,;:]?$/, '') + '...'
        : text;

    return (
      <TouchableOpacity
        style={[stylesCard.card, { backgroundColor: cardBackground }]}
        onPress={() =>
          navigation.navigate('ResultModal', {
            ...item,
            fromHistory: true, // ResultScreen adapts layout/behavior when opened from history
          })
        }
      >
        <View
          style={[
            stylesCard.corner,
            { backgroundColor: barColor, width: corner, height: corner },
          ]}
        />
        {/* Дата и весь текст одной цветовой группы (как ты просил) */}
        <Text style={[stylesCard.date, { color: dataText }]}>{date}</Text>
        <Text style={[stylesCard.emotionLine, { color: dataText }]}>
          {label}
        </Text>
        <Text style={[stylesCard.score, { color: dataText }]}>
          Intensity: {item?.session?.l4?.intensity ?? '—'}/10
        </Text>
        <Text
          numberOfLines={3}
          style={[stylesCard.preview, { color: dataText }]}
        >
          {preview}
        </Text>
      </TouchableOpacity>
    );
  };

  // Purpose: detect if a hex color looks dark to adjust contrast
  function isHexDark(hex) {
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
  }

  // Controls: toggle calendar + sort dropdown
  const renderFilterControls = () => (
    <View style={stylesControls.controlsWrapper}>
      <TouchableOpacity
        style={[
          stylesControls.calendarButton,
          showCalendar && stylesControls.calendarButtonActive,
          { backgroundColor: accent },
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
            { backgroundColor: accent },
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
      if (sortType === 'dateAsc')  return new Date(a.date) - new Date(b.date);

      // NEW: sort by emotion label
      if (sortType === 'labelAsc') {
        const la = (a?.dominantGroup || '').toString();
        const lb = (b?.dominantGroup || '').toString();
        return la.localeCompare(lb, undefined, { sensitivity: 'base' });
      }
      if (sortType === 'labelDesc') {
        const la = (a?.dominantGroup || '').toString();
        const lb = (b?.dominantGroup || '').toString();
        return lb.localeCompare(la, undefined, { sensitivity: 'base' });
      }

      return 0;
    });

    return list;
  }, [history, dateFilter, sortType]);

  return (
    <ScreenWrapper
      useFlexHeight
      noBottomInset
      style={[stylesPage.container, { backgroundColor: background }]}
    >
      <FlatList
        data={filteredHistory}
        keyExtractor={(item, index) => `${item.date}-${index}`}
        contentContainerStyle={{
          ...stylesPage.content,
          // Keep a small bottom padding so last card is not under the tab bar
          paddingBottom: 8,
        }}
        ListHeaderComponent={() => (
          <>
            {renderHeader()}
            {renderFilterControls()}
            {showCalendar && (
              <View style={{ marginTop: pad * 0.3, marginBottom: pad * 0.5 }}>
                <HistoryCalendar
                  key={calendarKey}
                  history={history}
                  value={dateFilter}
                  onChange={(range) => setDateFilter(range)}
                />
              </View>
            )}
          </>
        )}
        ListEmptyComponent={() => (
          <Text style={[stylesPage.empty, { color: textPrimary }]}>
            You haven't saved any days yet.
          </Text>
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
                backgroundColor: cardBackground ,
              },
            ]}
          >
            {sortOptions.map((opt) => {
              const selected = opt.value === sortType;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    stylesControls.dropdownItem,
                    selected && [
                      stylesControls.selectedItem,
                      { backgroundColor: accent },
                    ],
                  ]}
                  onPress={() => {
                    setSortType(opt.value);
                    setDropdownOpen(false);
                  }}
                >
                  <Text
                    style={[
                      stylesControls.dropdownItemText,
                      { color: selected ? '#fff' : textPrimary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
  header: {
    width: '100%',
    alignItems: 'center',
    marginTop: Math.round(SCREEN_WIDTH * 0.08), // одинаковый верхний отступ
  },
  title: {
    fontSize: Math.round(SCREEN_WIDTH * 0.08),
    fontWeight: '800',
    textAlign: 'center',
    alignSelf: 'center',
    marginBottom: Math.round(SCREEN_WIDTH * 0.05),
  },
  divider: {
    height: 1.5,
    width: Math.round(SCREEN_WIDTH * 0.5),
    alignSelf: 'center',
    opacity: 0.15,
    borderRadius: 1,
    marginBottom: Math.round(SCREEN_WIDTH * 0.08),
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
    width: SCREEN_WIDTH * 0.38, // около 40% экрана
    height: BTN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BTN_RADIUS,
  },
  calendarButtonActive: {
    opacity: 0.92, // simple pressed effect
  },
  button: {
    width: SCREEN_WIDTH * 0.45, // чуть шире
    height: BTN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BTN_RADIUS,
  },
  sortButtonOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: BTN_TEXT,
    textAlign: 'center',
  },
  dropdownContainer: { position: 'relative', alignItems: 'center' },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  selectedItem: {},
  dropdownItemText: {
    fontSize: 14,
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
