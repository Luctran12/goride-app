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
import { rf, rs, rvs } from '@/constants/responsive';

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
            <Feather name="bell" size={rs(30)} color={palette.primary} />
            <View style={styles.bellDot} />
          </TouchableOpacity>
        </View>

        <View style={styles.quickCard}>
          <TouchableOpacity activeOpacity={0.82} style={styles.searchBox} onPress={() => router.push('/(customer)/booking/pickup')}>
            <Feather name="search" size={rs(35)} color={palette.primary} />
            <Text style={styles.searchText}>Bạn muốn đi đâu?</Text>
          </TouchableOpacity>

          <View style={styles.actionRow}>
            <ActionButton 
                icon="motorbike" 
                label={'Đặt xe\nmáy'} 
                active 
                onPress={() => router.push('/(customer)/booking/pickup')}
            />
            <ActionButton 
                icon="car" 
                label="Đặt xe ô tô" 
                active 
                onPress={() => router.push('/(customer)/booking/pickup')}
            />
            <ActionButton icon="history" label="Lịch sử" onPress={() => router.push('/(customer)/activity')} />
            <ActionButton
              icon="cash-multiple"
              label={'Thanh\ntoán'}
              onPress={() => router.push('/(customer)/billing')}
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
                <Feather name="tag" size={rs(34)} color={palette.green} />
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
          <Feather name="home" size={rs(33)} color="#9a8fee" />
          <Text style={styles.navActiveText}>Home</Text>
        </TouchableOpacity>
        <NavItem icon="history" label="Activity" onPress={() => router.push('/(customer)/activity')} />
        <NavItem
          icon="cash-multiple"
          label="Payment"
          onPress={() => router.push('/(customer)/billing')}
        />
        <NavItem
          icon="account-outline"
          label="Profile"
          onPress={() => router.push('/(customer)/profile')}
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
          size={rs(35)}
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
        <Ionicons name={icon} size={rs(32)} color="#68646e" />
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
      <MaterialCommunityIcons name={icon} size={rs(34)} color="#302d39" />
      <Text style={styles.navText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
    marginTop: StatusBar.currentHeight,
  },
  content: {
    paddingTop: rvs(42),
    paddingBottom: rvs(26),
  },
  header: {
    marginBottom: rvs(28),
    paddingHorizontal: rs(36),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: rs(88),
    height: rs(88),
    borderRadius: rs(44),
    borderWidth: rs(4),
    borderColor: '#d7cff1',
    marginRight: rs(24),
  },
  hello: {
    color: palette.muted,
    fontSize: rf(28),
    lineHeight: rf(36),
    fontWeight: '400',
  },
  name: {
    color: palette.text,
    fontSize: rf(39),
    lineHeight: rf(48),
    fontWeight: '800',
  },
  bellButton: {
    width: rs(76),
    height: rs(76),
    borderRadius: rs(38),
    backgroundColor: '#f7f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: rs(15),
    right: rs(15),
    width: rs(15),
    height: rs(15),
    borderRadius: rs(8),
    backgroundColor: palette.danger,
  },
  quickCard: {
    marginHorizontal: rs(36),
    padding: rs(28),
    borderRadius: rs(24),
    backgroundColor: palette.card,
    marginBottom: rvs(46),
    ...shadow,
  },
  searchBox: {
    minHeight: rvs(120),
    borderRadius: rs(14),
    backgroundColor: palette.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(28),
    marginBottom: rvs(42),
  },
  searchText: {
    marginLeft: rs(52),
    color: palette.muted,
    fontSize: rf(29),
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
    width: rs(102),
    height: rs(102),
    borderRadius: rs(51),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primarySoft,
    marginBottom: rvs(15),
  },
  actionLabel: {
    color: palette.text,
    fontSize: rf(23),
    lineHeight: rf(29),
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    marginBottom: rvs(58),
  },
  sectionTitle: {
    color: palette.text,
    fontSize: rf(29),
    lineHeight: rf(37),
    fontWeight: '800',
    paddingHorizontal: rs(36),
    marginBottom: rvs(26),
  },
  promoScroller: {
    paddingHorizontal: rs(36),
    gap: rs(28),
  },
  promoCard: {
    width: rs(507),
    minHeight: rvs(205),
    borderRadius: rs(20),
    backgroundColor: palette.primaryMid,
    paddingHorizontal: rs(29),
    paddingVertical: rvs(34),
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
    right: rs(-34),
    top: rvs(-48),
    width: rs(164),
    height: rs(164),
    borderRadius: rs(82),
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  codePill: {
    alignSelf: 'flex-start',
    borderRadius: rs(7),
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: rs(15),
    paddingVertical: rvs(9),
    marginBottom: rvs(18),
  },
  codeText: {
    color: '#ffffff',
    fontSize: rf(21),
    lineHeight: rf(26),
    fontWeight: '800',
  },
  promoTitle: {
    color: '#ffffff',
    fontSize: rf(29),
    lineHeight: rf(37),
    fontWeight: '800',
    marginBottom: rvs(8),
  },
  promoText: {
    color: '#ffffff',
    fontSize: rf(27),
    lineHeight: rf(35),
    fontWeight: '400',
  },
  smallPromo: {
    width: rs(150),
    minHeight: rvs(205),
    borderRadius: rs(18),
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketBubble: {
    width: rs(86),
    height: rs(86),
    borderRadius: rs(43),
    backgroundColor: palette.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentCard: {
    marginHorizontal: rs(36),
    borderRadius: rs(22),
    backgroundColor: palette.card,
    paddingHorizontal: rs(29),
    paddingTop: rvs(31),
    paddingBottom: rvs(31),
    ...shadow,
  },
  recentHeading: {
    color: palette.text,
    fontSize: rf(29),
    lineHeight: rf(37),
    fontWeight: '800',
    marginBottom: rvs(34),
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeIcon: {
    width: rs(73),
    height: rs(73),
    borderRadius: rs(37),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primarySoft,
    marginRight: rs(21),
  },
  placeCopy: {
    flex: 1,
  },
  placeTitle: {
    color: palette.text,
    fontSize: rf(25),
    lineHeight: rf(33),
    fontWeight: '700',
  },
  placeDetail: {
    color: palette.muted,
    fontSize: rf(25),
    lineHeight: rf(33),
    fontWeight: '400',
  },
  divider: {
    height: 1,
    backgroundColor: palette.line,
    marginLeft: rs(94),
    marginVertical: rvs(28),
  },
  bottomSpacer: {
    height: rvs(165),
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: rvs(128),
    borderTopLeftRadius: rs(16),
    borderTopRightRadius: rs(16),
    backgroundColor: palette.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: rvs(13),
    paddingHorizontal: rs(20),
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  navActive: {
    width: rs(136),
    height: rvs(92),
    borderRadius: rs(46),
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navActiveText: {
    color: '#9a8fee',
    fontSize: rf(23),
    lineHeight: rf(29),
    fontWeight: '600',
    marginTop: 2,
  },
  navItem: {
    minWidth: rs(100),
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    color: '#302d39',
    fontSize: rf(23),
    lineHeight: rf(29),
    fontWeight: '500',
    marginTop: 5,
  },
});
