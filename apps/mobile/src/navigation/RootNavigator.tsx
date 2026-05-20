import { Platform, StyleSheet, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { colors } from '../theme/colors';
import type { Drop } from '../types/api';
import { MapScreen } from '../screens/MapScreen';
import { CreateDropScreen } from '../screens/CreateDropScreen';
import { DropDetailsScreen } from '../screens/DropDetailsScreen';
import { AnswerDropScreen } from '../screens/AnswerDropScreen';
import { LiveFeedScreen } from '../screens/LiveFeedScreen';
import { MyQuestionsScreen } from '../screens/MyQuestionsScreen';

/** Screens shared between מפה and השאלות שלי flows. */
export type DropFlowParamList = {
  DropDetails: { dropId: string; cachedDrop?: Drop };
  AnswerDrop: { dropId: string; cachedDrop?: Drop };
};

export type MapStackParamList = {
  Map: {
    newDrop?: Drop;
    toastMessage?: string;
    submittedQuestionSheet?: Drop;
  };
  CreateDrop: { lat: number; lng: number };
} & DropFlowParamList;

export type NearbyStackParamList = {
  NearbyFeed: undefined;
};

export type MyStackParamList = { MyQuestions: undefined } & DropFlowParamList;

export type RootTabParamList = {
  MapStack: NavigatorScreenParams<MapStackParamList>;
  NearbyStack: NavigatorScreenParams<NearbyStackParamList>;
  MyStack: NavigatorScreenParams<MyStackParamList>;
};

/** @deprecated Prefer MapStack types; kept for gradual refactors elsewhere. */
export type RootStackParamList = MapStackParamList;

const Tab = createBottomTabNavigator<RootTabParamList>();
const MapStackNav = createNativeStackNavigator<MapStackParamList>();
const NearbyStackNav = createNativeStackNavigator<NearbyStackParamList>();
const MyStackNav = createNativeStackNavigator<MyStackParamList>();

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.navy },
  headerTintColor: colors.white,
  headerTitleStyle: { fontWeight: '600' as const },
  contentStyle: { backgroundColor: colors.navy },
};

function MapNavigator() {
  return (
    <MapStackNav.Navigator initialRouteName="Map" screenOptions={stackScreenOptions}>
      <MapStackNav.Screen
        name="Map"
        component={MapScreen}
        options={{ headerShown: false }}
      />
      <MapStackNav.Screen
        name="CreateDrop"
        component={CreateDropScreen}
        options={{ title: 'שאלה מהשטח' }}
      />
      <MapStackNav.Screen
        name="DropDetails"
        component={DropDetailsScreen}
        options={{
          title: 'מודיעין מהשטח',
          animation: 'slide_from_bottom',
        }}
      />
      <MapStackNav.Screen
        name="AnswerDrop"
        component={AnswerDropScreen}
        options={{ title: 'תשובה מהמיקום' }}
      />
    </MapStackNav.Navigator>
  );
}

function NearbyNavigator() {
  return (
    <NearbyStackNav.Navigator initialRouteName="NearbyFeed" screenOptions={stackScreenOptions}>
      <NearbyStackNav.Screen
        name="NearbyFeed"
        component={LiveFeedScreen}
        options={{ headerShown: false }}
      />
    </NearbyStackNav.Navigator>
  );
}

function MyNavigator() {
  return (
    <MyStackNav.Navigator initialRouteName="MyQuestions" screenOptions={stackScreenOptions}>
      <MyStackNav.Screen
        name="MyQuestions"
        component={MyQuestionsScreen}
        options={{ headerShown: false }}
      />
      <MyStackNav.Screen
        name="DropDetails"
        component={DropDetailsScreen}
        options={{
          title: 'מודיעין מהשטח',
          animation: 'slide_from_bottom',
        }}
      />
      <MyStackNav.Screen
        name="AnswerDrop"
        component={AnswerDropScreen}
        options={{ title: 'תשובה מהמיקום' }}
      />
    </MyStackNav.Navigator>
  );
}

function tabBarLabel(routeName: keyof RootTabParamList, focused: boolean) {
  const map: Record<keyof RootTabParamList, string> = {
    MapStack: 'מפה',
    NearbyStack: 'בקשות לידך',
    MyStack: 'השאלות שלי',
  };
  return (
    <Text
      style={[
        styles.tabLabel,
        focused ? styles.tabLabelFocused : styles.tabLabelIdle,
      ]}
      numberOfLines={1}
    >
      {map[routeName]}
    </Text>
  );
}

export function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.navyMuted,
          borderTopColor: 'rgba(148,163,184,0.22)',
          height: Platform.select({ ios: 84, default: 72 }),
          paddingBottom: Platform.select({ ios: 26, default: 12 }),
          paddingTop: 6,
        },
        tabBarShowLabel: true,
      }}
      initialRouteName="MapStack"
    >
      <Tab.Screen
        name="MapStack"
        component={MapNavigator}
        options={{
          tabBarLabel: ({ focused }) => tabBarLabel('MapStack', focused),
          tabBarIcon: () => <Text style={styles.tabEmoji}>🗺</Text>,
        }}
      />
      <Tab.Screen
        name="NearbyStack"
        component={NearbyNavigator}
        options={{
          tabBarLabel: ({ focused }) => tabBarLabel('NearbyStack', focused),
          tabBarIcon: () => <Text style={styles.tabEmoji}>⚡️</Text>,
        }}
      />
      <Tab.Screen
        name="MyStack"
        component={MyNavigator}
        options={{
          tabBarLabel: ({ focused }) => tabBarLabel('MyStack', focused),
          tabBarIcon: () => <Text style={styles.tabEmoji}>📥</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 2,
    maxWidth: 120,
    writingDirection: 'rtl',
  },
  tabLabelFocused: { color: colors.electricBright },
  tabLabelIdle: { color: colors.textMuted },
  tabEmoji: {
    fontSize: 22,
    lineHeight: 26,
  },
});
