/**
 * NewsScreen — Live RSS from Times of India Business
 * Today/Yesterday/Custom filters + Bookmark to save
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, RefreshControl, Linking, ActivityIndicator,
  ScrollView, Platform,
} from 'react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { apiService } from '@/services/apiService';
import { COLORS, SHADOWS, RADIUS } from '@/styles/theme';

const RSS_URL = 'https://timesofindia.indiatimes.com/rssfeeds/1898055.cms';
const RSS2JSON = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`;

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  thumbnail?: string;
  enclosure?: { link: string };
  publisher?: string;
}

interface SavedNewsItem {
  id: string;
  title: string;
  link: string;
  pubDate?: string;
  publisher?: string;
}

const FILTERS = ['All', 'Today', 'Yesterday'];

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function timeAgo(dateStr: string) {
  try {
    const d = new Date(dateStr.replace(' ', 'T'));
    const h = Math.floor((Date.now() - d.getTime()) / 3_600_000);
    if (h < 1) return 'Just now';
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch { return ''; }
}

function isDateMatch(dateStr: string, filter: string) {
  if (filter === 'All') return true;
  const d = new Date(dateStr.replace(' ', 'T'));
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (filter === 'Today')
    return d.toDateString() === today.toDateString();
  if (filter === 'Yesterday')
    return d.toDateString() === yesterday.toDateString();
  return true;
}

function NewsCard({
  item,
  isSaved,
  onSave,
  onUnsave,
}: {
  item: NewsItem;
  isSaved: boolean;
  onSave: () => void;
  onUnsave: () => void;
}) {
  const thumb = item.thumbnail || item.enclosure?.link;
  const summary = stripHtml(item.description).slice(0, 160);
  const publisher = item.title?.includes(' - ')
    ? item.title.split(' - ').pop() || 'TOI Business'
    : 'TOI Business';
  const cleanTitle = item.title?.includes(' - ')
    ? item.title.split(' - ').slice(0, -1).join(' - ')
    : item.title;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => Linking.openURL(item.link)}
      activeOpacity={0.9}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle} numberOfLines={3}>{cleanTitle}</Text>
          {summary ? (
            <Text style={styles.cardSummary} numberOfLines={2}>{summary}</Text>
          ) : null}
          <View style={styles.cardMeta}>
            <Text style={styles.publisher}>{publisher}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.timeAgo}>{timeAgo(item.pubDate)}</Text>
          </View>
        </View>

        {thumb ? (
          <Image
            source={{ uri: thumb }}
            style={styles.thumb}
            resizeMode="cover"
          />
        ) : null}
      </View>

      <TouchableOpacity
        style={[styles.bookmarkBtn, isSaved && styles.bookmarkActive]}
        onPress={isSaved ? onUnsave : onSave}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[styles.bookmarkIcon, isSaved && styles.bookmarkIconActive]}>
          {isSaved ? '🔖' : '🤍'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function NewsScreen() {
  const { user } = useSelector((s: RootState) => s.auth);
  const entityId  = (user as any)?.entityId || (user as any)?.id;

  const [tab, setTab]           = useState<'latest' | 'saved'>('latest');
  const [filter, setFilter]     = useState('All');
  const [news, setNews]         = useState<NewsItem[]>([]);
  const [saved, setSaved]       = useState<SavedNewsItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState('');

  const fetchNews = async () => {
    try {
      setError('');
      const res = await fetch(RSS2JSON);
      const data = await res.json();
      if (data.status === 'ok') {
        setNews(data.items || []);
      } else {
        setError('Could not load news. Please try again.');
      }
    } catch {
      setError('Network error. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSaved = async () => {
    if (!entityId) return;
    const res = await apiService.news?.getSaved?.();
    if (res?.success && res.data) setSaved(res.data);
  };

  useEffect(() => {
    fetchNews();
    fetchSaved();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNews();
    await fetchSaved();
    setRefreshing(false);
  };

  const handleSave = async (item: NewsItem) => {
    if (!entityId) return;
    const publisher = item.title?.includes(' - ') ? item.title.split(' - ').pop() : 'TOI Business';
    const cleanTitle = item.title?.includes(' - ') ? item.title.split(' - ').slice(0, -1).join(' - ') : item.title;
    const newsObj = {
      title: cleanTitle,
      link: item.link,
      publisher,
      pubDate: item.pubDate ? new Date(item.pubDate.replace(' ', 'T')).toISOString() : undefined,
    };
    const res = await apiService.news?.save?.(newsObj);
    if (res?.success && res.data) setSaved(prev => [res.data, ...prev]);
  };

  const handleUnsave = async (id: string) => {
    const res = await apiService.news?.unsave?.(id);
    if (res?.success) setSaved(prev => prev.filter(s => s.id !== id));
  };

  const filteredNews = news.filter(n => isDateMatch(n.pubDate, filter));
  const savedLinks = new Set(saved.map(s => s.link));

  return (
    <View style={styles.screen}>
      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'latest' && styles.tabBtnActive]}
          onPress={() => setTab('latest')}
        >
          <Text style={[styles.tabTxt, tab === 'latest' && styles.tabTxtActive]}>📰 Latest</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'saved' && styles.tabBtnActive]}
          onPress={() => setTab('saved')}
        >
          <Text style={[styles.tabTxt, tab === 'saved' && styles.tabTxtActive]}>
            🔖 Saved {saved.length > 0 ? `(${saved.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date filters (latest only) */}
      {tab === 'latest' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterTxt, filter === f && styles.filterTxtActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Content */}
      {tab === 'latest' ? (
        loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingTxt}>Fetching top stories...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorTxt}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchNews}>
              <Text style={styles.retryTxt}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredNews}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyTxt}>No news for this period</Text>
              </View>
            }
            renderItem={({ item }) => (
              <NewsCard
                item={item}
                isSaved={savedLinks.has(item.link)}
                onSave={() => handleSave(item)}
                onUnsave={() => {
                  const s = saved.find(sv => sv.link === item.link);
                  if (s) handleUnsave(s.id);
                }}
              />
            )}
          />
        )
      ) : (
        <FlatList
          data={saved}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ fontSize: 48 }}>🔖</Text>
              <Text style={styles.emptyTxt}>No saved articles yet</Text>
              <Text style={styles.emptyHint}>Tap the bookmark on any article to save it</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.savedCard}
              onPress={() => Linking.openURL(item.link)}
              activeOpacity={0.88}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.savedTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.cardMeta}>
                  <Text style={styles.publisher}>{item.publisher}</Text>
                  {item.pubDate ? <><Text style={styles.dot}>·</Text><Text style={styles.timeAgo}>{timeAgo(item.pubDate)}</Text></> : null}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleUnsave(item.id)}
                style={styles.unsaveBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ fontSize: 18 }}>🔖</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: COLORS.background },
  tabRow:    { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabBtn:    { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabTxt:    { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  tabTxtActive: { color: COLORS.primary, fontWeight: '800' },

  filterRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterChip:{ backgroundColor: COLORS.surface, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterTxt: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  filterTxtActive: { color: '#fff' },

  list: { padding: 12, paddingBottom: 32 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    marginBottom: 10,
    padding: 14,
    ...SHADOWS.md,
  },
  cardContent: { flexDirection: 'row', gap: 12 },
  cardText:    { flex: 1 },
  cardTitle:   { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, lineHeight: 22, marginBottom: 6 },
  cardSummary: { fontSize: 13, color: COLORS.textMuted, lineHeight: 19, marginBottom: 8 },
  cardMeta:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  publisher:   { fontSize: 12, fontWeight: '700', color: COLORS.accent },
  dot:         { fontSize: 12, color: COLORS.textLight },
  timeAgo:     { fontSize: 12, color: COLORS.textLight },
  thumb:       { width: 88, height: 88, borderRadius: RADIUS.md, backgroundColor: COLORS.borderLight },
  bookmarkBtn: { alignSelf: 'flex-end', marginTop: 10, padding: 6, backgroundColor: COLORS.background, borderRadius: RADIUS.full },
  bookmarkActive: { backgroundColor: COLORS.primaryLight },
  bookmarkIcon: { fontSize: 18 },
  bookmarkIconActive: {},

  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    marginBottom: 8,
    padding: 14,
    ...SHADOWS.sm,
  },
  savedTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4, lineHeight: 20 },
  unsaveBtn: { padding: 8 },

  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  loadingTxt: { marginTop: 16, fontSize: 14, color: COLORS.textMuted, fontWeight: '500' },
  errorTxt:   { fontSize: 14, color: COLORS.danger, textAlign: 'center', marginBottom: 16, fontWeight: '600' },
  retryBtn:   { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.full },
  retryTxt:   { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyTxt:   { fontSize: 16, fontWeight: '700', color: COLORS.textMuted, marginTop: 12, textAlign: 'center' },
  emptyHint:  { fontSize: 13, color: COLORS.textLight, marginTop: 6, textAlign: 'center' },
});
