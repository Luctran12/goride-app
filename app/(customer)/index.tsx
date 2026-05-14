import React from 'react';
import { useRouter } from 'expo-router';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const palette = {
  background: '#fcf8ff',
  card: '#ffffff',
  primary: '#1d0796',
  primarySoft: '#f1ecfb',
  primaryMid: '#4b3fc4',
  text: '#111114',
  muted: '#68646e',
  line: '#e8e4ec',
  danger: '#d72828',
  green: '#00b67a',
  greenSoft: '#dff8ef',
};

const shadow = {
  shadowColor: '#7c6da8',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.11,
  shadowRadius: 24,
  elevation: 7,
};

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.profile}>
            <Image
              source={{ uri: 'https://i.pravatar.cc/160?img=11' }}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.hello}>Xin chào,</Text>
              <Text style={styles.name}>Thiện</Text>
            </View>
          </View>

          <TouchableOpacity activeOpacity={0.82} style={styles.bellButton}>
            <Feather name="bell" size={30} color={palette.primary} />
            <View style={styles.bellDot} />
          </TouchableOpacity>
        </View>

        <View style={styles.quickCard}>
          <TouchableOpacity activeOpacity={0.82} style={styles.searchBox} onPress={() => router.push('/map')}>
            <Feather name="search" size={35} color={palette.primary} />
            <Text style={styles.searchText}>Bạn muốn đi đâu?</Text>
          </TouchableOpacity>

          <View style={styles.actionRow}>
            <ActionButton 
                icon="motorbike" 
                label={'Đặt xe\nmáy'} 
                active 
                onPress={() => router.push('/map')}
            />
            <ActionButton 
                icon="car" 
                label="Đặt xe ô tô" 
                active 
                onPress={() => router.push('/map')}
            />
            <ActionButton icon="history" label="Lịch sử" />
            <ActionButton
              icon="cash-multiple"
              label={'Thanh\ntoán'}
              onPress={() => router.push('/billing')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Khuyến mãi cho bạn</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promoScroller}
          >
            <TouchableOpacity activeOpacity={0.9} style={styles.promoCard}>
              <View style={styles.promoOrb} />
              <View style={styles.codePill}>
                <Text style={styles.codeText}>Mã: RYDE50</Text>
              </View>
              <Text style={styles.promoTitle}>Giảm 50% chuyến đầu</Text>
              <Text style={styles.promoText}>Tối đa 30k. HSD: 30/11</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.9} style={styles.smallPromo}>
              <View style={styles.ticketBubble}>
                <Feather name="tag" size={34} color={palette.green} />
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={styles.recentCard}>
          <Text style={styles.recentHeading}>Điểm đến gần đây</Text>
          <RecentPlace
            icon="location-outline"
            title="Landmark 81"
            detail="720A Điện Biên Phủ, Phường 22, Bình Thạnh"
          />
          <View style={styles.divider} />
          <RecentPlace
            icon="home-outline"
            title="Nhà"
            detail="123 Nguyễn Thị Minh Khai, Quận 1"
          />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity activeOpacity={0.84} style={styles.navActive}>
          <Feather name="home" size={33} color="#9a8fee" />
          <Text style={styles.navActiveText}>Home</Text>
        </TouchableOpacity>
        <NavItem icon="history" label="Activity" />
        <NavItem
          icon="cash-multiple"
          label="Payment"
          onPress={() => router.push('/billing')}
        />
        <NavItem
          icon="account-outline"
          label="Profile"
          onPress={() => router.push('/profile')}
        />
      </View>
    </SafeAreaView>
  );
}

function ActionButton({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.82} style={styles.actionItem} onPress={onPress}>
      <View style={styles.actionCircle}>
        <MaterialCommunityIcons
          name={icon}
          size={35}
          color={active ? palette.primary : '#68646e'}
        />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function RecentPlace({
  icon,
  title,
  detail,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
}) {
  return (
    <TouchableOpacity activeOpacity={0.82} style={styles.placeRow}>
      <View style={styles.placeIcon}>
        <Ionicons name={icon} size={32} color="#68646e" />
      </View>
      <View style={styles.placeCopy}>
        <Text style={styles.placeTitle}>{title}</Text>
        <Text style={styles.placeDetail} numberOfLines={1}>
          {detail}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function NavItem({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.82} style={styles.navItem} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={34} color="#302d39" />
      <Text style={styles.navText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    paddingTop: 42,
    paddingBottom: 26,
  },
  header: {
    marginBottom: 28,
    paddingHorizontal: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: '#d7cff1',
    marginRight: 24,
  },
  hello: {
    color: palette.muted,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '400',
  },
  name: {
    color: palette.text,
    fontSize: 39,
    lineHeight: 48,
    fontWeight: '800',
  },
  bellButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#f7f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: palette.danger,
  },
  quickCard: {
    marginHorizontal: 36,
    padding: 28,
    borderRadius: 24,
    backgroundColor: palette.card,
    marginBottom: 46,
    ...shadow,
  },
  searchBox: {
    height: 120,
    borderRadius: 14,
    backgroundColor: palette.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    marginBottom: 42,
  },
  searchText: {
    marginLeft: 52,
    color: palette.muted,
    fontSize: 29,
    fontWeight: '400',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionItem: {
    width: '23%',
    alignItems: 'center',
  },
  actionCircle: {
    width: 102,
    height: 102,
    borderRadius: 51,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primarySoft,
    marginBottom: 15,
  },
  actionLabel: {
    color: palette.text,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    marginBottom: 58,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 29,
    lineHeight: 37,
    fontWeight: '800',
    paddingHorizontal: 36,
    marginBottom: 26,
  },
  promoScroller: {
    paddingHorizontal: 36,
    gap: 28,
  },
  promoCard: {
    width: 507,
    height: 205,
    borderRadius: 20,
    backgroundColor: palette.primaryMid,
    paddingHorizontal: 29,
    paddingVertical: 34,
    overflow: 'hidden',
    justifyContent: 'center',
    shadowColor: '#1a0c75',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.27,
    shadowRadius: 10,
    elevation: 8,
  },
  promoOrb: {
    position: 'absolute',
    right: -34,
    top: -48,
    width: 164,
    height: 164,
    borderRadius: 82,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  codePill: {
    alignSelf: 'flex-start',
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 15,
    paddingVertical: 9,
    marginBottom: 18,
  },
  codeText: {
    color: '#ffffff',
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '800',
  },
  promoTitle: {
    color: '#ffffff',
    fontSize: 29,
    lineHeight: 37,
    fontWeight: '800',
    marginBottom: 8,
  },
  promoText: {
    color: '#ffffff',
    fontSize: 27,
    lineHeight: 35,
    fontWeight: '400',
  },
  smallPromo: {
    width: 150,
    height: 205,
    borderRadius: 18,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketBubble: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: palette.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentCard: {
    marginHorizontal: 36,
    borderRadius: 22,
    backgroundColor: palette.card,
    paddingHorizontal: 29,
    paddingTop: 31,
    paddingBottom: 31,
    ...shadow,
  },
  recentHeading: {
    color: palette.text,
    fontSize: 29,
    lineHeight: 37,
    fontWeight: '800',
    marginBottom: 34,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeIcon: {
    width: 73,
    height: 73,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primarySoft,
    marginRight: 21,
  },
  placeCopy: {
    flex: 1,
  },
  placeTitle: {
    color: palette.text,
    fontSize: 25,
    lineHeight: 33,
    fontWeight: '700',
  },
  placeDetail: {
    color: palette.muted,
    fontSize: 25,
    lineHeight: 33,
    fontWeight: '400',
  },
  divider: {
    height: 1,
    backgroundColor: palette.line,
    marginLeft: 94,
    marginVertical: 28,
  },
  bottomSpacer: {
    height: 165,
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 128,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: palette.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 13,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  navActive: {
    width: 136,
    height: 92,
    borderRadius: 46,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navActiveText: {
    color: '#9a8fee',
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '600',
    marginTop: 2,
  },
  navItem: {
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    color: '#302d39',
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '500',
    marginTop: 5,
  },
});
