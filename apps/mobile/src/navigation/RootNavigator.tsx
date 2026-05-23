import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { AppTabBar } from '../components/ui/AppTabBar';
import type { Drop } from '../types/api';
import { MapScreen } from '../screens/MapScreen';
import { CreateDropScreen } from '../screens/CreateDropScreen';
import { DropDetailsScreen } from '../screens/DropDetailsScreen';
import { AnswerDropScreen } from '../screens/AnswerDropScreen';
import { LiveFeedScreen } from '../screens/LiveFeedScreen';
import { MyQuestionsScreen } from '../screens/MyQuestionsScreen';
import { AboutScreen } from '../screens/AboutScreen';
import { ReportContentScreen } from '../screens/ReportContentScreen';

/** Screens shared between מפה and השאלות שלי flows. */
export type DropFlowParamList = {
  DropDetails: { dropId: string; cachedDrop?: Drop };
  AnswerDrop: { dropId: string; cachedDrop?: Drop };
  ReportContent: { targetType: 'drop' | 'answer'; targetId: string };
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

export type MyStackParamList = {
  MyQuestions: undefined;
  About: undefined;
} & DropFlowParamList;

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
      <MapStackNav.Screen
        name="ReportContent"
        component={ReportContentScreen}
        options={{ title: 'דיווח על תוכן', presentation: 'modal' }}
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
      <MyStackNav.Screen
        name="About"
        component={AboutScreen}
        options={{ title: 'מידע, פרטיות ובטיחות' }}
      />
      <MyStackNav.Screen
        name="ReportContent"
        component={ReportContentScreen}
        options={{ title: 'דיווח על תוכן', presentation: 'modal' }}
      />
    </MyStackNav.Navigator>
  );
}

export function RootNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
      initialRouteName="MapStack"
    >
      <Tab.Screen name="MapStack" component={MapNavigator} />
      <Tab.Screen name="NearbyStack" component={NearbyNavigator} />
      <Tab.Screen name="MyStack" component={MyNavigator} />
    </Tab.Navigator>
  );
}
