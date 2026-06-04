import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const tabs: Array<{ name: string; label: string; icon: IoniconsName; iconActive: IoniconsName }> = [
  { name: 'index', label: 'AIコーチ', icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
  { name: 'matches', label: '試合記録', icon: 'clipboard-outline', iconActive: 'clipboard' },
  { name: 'stats', label: 'スタッツ', icon: 'bar-chart-outline', iconActive: 'bar-chart' },
  { name: 'analysis', label: '分析', icon: 'trending-up-outline', iconActive: 'trending-up' },
  { name: 'memo', label: 'メモ', icon: 'document-text-outline', iconActive: 'document-text' },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(3,8,16,0.95)',
          borderTopColor: 'rgba(255,255,255,0.1)',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: Colors.cyan,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.45)',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? tab.iconActive : tab.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
