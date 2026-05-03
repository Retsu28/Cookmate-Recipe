import React, { useEffect, useRef } from 'react';
import { Animated, Easing, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';

function usePulse() {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 760,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 760,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return pulse;
}

export function SkeletonBlock({ colors, style, color }) {
  const pulse = usePulse();

  return (
    <Animated.View
      style={[
        st.block,
        {
          backgroundColor: color || colors.surfaceAlt,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

function MobileHeaderSkeleton({ colors }) {
  return (
    <View style={[st.mobileHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
      <View style={st.mobileHeaderLeft}>
        <SkeletonBlock colors={colors} style={st.logoBlock} />
        <View style={st.brandLines}>
          <SkeletonBlock colors={colors} style={st.brandLineWide} />
          <SkeletonBlock colors={colors} style={st.brandLine} />
        </View>
      </View>
      <View style={st.mobileHeaderRight}>
        <SkeletonBlock colors={colors} style={st.headerIconCircle} />
        <SkeletonBlock colors={colors} style={st.headerIconCircle} />
      </View>
    </View>
  );
}

export function ContentSkeleton({ colors }) {
  return (
    <SafeAreaView style={[st.flex1, { backgroundColor: colors.background }]}>
      <ScrollView
        style={st.flex1}
        contentContainerStyle={st.contentWrap}
        showsVerticalScrollIndicator={false}
      >
        <View style={st.header}>
          <SkeletonBlock colors={colors} style={st.headerTitle} />
          <SkeletonBlock colors={colors} style={st.headerLine} />
        </View>

        <SkeletonBlock colors={colors} style={st.hero} />

        <View style={st.cardGrid}>
          <SkeletonBlock colors={colors} style={st.squareCard} />
          <SkeletonBlock colors={colors} style={st.squareCard} />
        </View>

        {[0, 1, 2].map((item) => (
          <View
            key={item}
            style={[st.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <SkeletonBlock colors={colors} style={st.avatar} />
            <View style={st.listText}>
              <SkeletonBlock colors={colors} style={st.listLineWide} />
              <SkeletonBlock colors={colors} style={st.listLine} />
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export function HomeContentSkeleton({ colors }) {
  return (
    <SafeAreaView
      style={[st.flex1, { backgroundColor: colors.background }]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading home dashboard"
    >
      <MobileHeaderSkeleton colors={colors} />
      <ScrollView
        style={st.flex1}
        contentContainerStyle={st.homeContent}
        showsVerticalScrollIndicator={false}
      >
        <SkeletonBlock colors={colors} style={st.searchPill} />
        <SkeletonBlock colors={colors} style={st.homeHero} />

        <View style={st.sectionGap}>
          <SkeletonBlock colors={colors} style={st.smallLabel} />
          <View style={st.quickRow}>
            <SkeletonBlock colors={colors} style={st.quickBlock} />
            <SkeletonBlock colors={colors} style={st.quickBlock} />
          </View>
        </View>

        <View style={st.sectionGap}>
          <SkeletonBlock colors={colors} style={st.sectionHeading} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[0, 1, 2].map((item) => (
              <View key={item} style={st.recipeCardSkel}>
                <SkeletonBlock colors={colors} style={st.recipeCardImage} />
                <SkeletonBlock colors={colors} style={st.recipeCardTitle} />
                <SkeletonBlock colors={colors} style={st.recipeCardMeta} />
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={st.infoRow}>
          <SkeletonBlock colors={colors} style={st.infoBlock} />
          <SkeletonBlock colors={colors} style={st.infoBlock} />
        </View>

        <View style={st.sectionGap}>
          <SkeletonBlock colors={colors} style={st.smallLabel} />
          <View style={[st.mobilePanel, { borderColor: colors.border }]}>
            {[0, 1, 2].map((item) => (
              <View key={item} style={[st.mobilePanelRow, item < 2 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                <View style={st.listText}>
                  <SkeletonBlock colors={colors} style={st.tinyLine} />
                  <SkeletonBlock colors={colors} style={st.listLineWide} />
                </View>
                <SkeletonBlock colors={colors} style={st.dotBlock} />
              </View>
            ))}
            <SkeletonBlock colors={colors} style={st.fullButtonBlock} />
          </View>
        </View>

        <View style={st.sectionGap}>
          <SkeletonBlock colors={colors} style={st.smallLabel} />
          {[0, 1].map((item) => (
            <View key={item} style={st.recentSkel}>
              <SkeletonBlock colors={colors} style={st.recentImage} />
              <SkeletonBlock colors={colors} style={st.recentTitle} />
              <SkeletonBlock colors={colors} style={st.recentMeta} />
            </View>
          ))}
        </View>

        <View style={st.darkPanel}>
          <SkeletonBlock colors={colors} color="rgba(255,255,255,0.18)" style={st.darkIcon} />
          <SkeletonBlock colors={colors} color="rgba(255,255,255,0.18)" style={st.darkTitle} />
          <SkeletonBlock colors={colors} color="rgba(255,255,255,0.1)" style={st.darkLineWide} />
          <SkeletonBlock colors={colors} color="rgba(255,255,255,0.1)" style={st.darkLine} />
          <SkeletonBlock colors={colors} color="rgba(255,255,255,0.16)" style={st.darkButton} />
        </View>

        <SkeletonBlock colors={colors} style={st.statsBlock} />
      </ScrollView>
    </SafeAreaView>
  );
}

export function ProfileContentSkeleton({ colors }) {
  return (
    <SafeAreaView
      style={[st.flex1, { backgroundColor: colors.background }]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading profile and settings"
    >
      <ScrollView
        style={st.flex1}
        contentContainerStyle={st.profileContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile header card */}
        <View style={[st.profileHeaderBlock, { backgroundColor: colors.surfaceAlt }]}>
          <SkeletonBlock colors={colors} style={st.profileAvatarBlock} />
          <SkeletonBlock colors={colors} style={st.profileNameBlock} />
          <SkeletonBlock colors={colors} style={st.profileEmailBlock} />

          <View style={[st.profileStatsBlock, { borderTopColor: colors.border }]}>
            <View style={st.profileStatBlock}>
              <SkeletonBlock colors={colors} style={st.profileStatNumberBlock} />
              <SkeletonBlock colors={colors} style={st.profileStatLabelBlock} />
            </View>
          </View>
        </View>

        {/* Tab row */}
        <View style={[st.profileTabsBlock, { borderBottomColor: colors.border }]}>
          {[0, 1, 2].map((item) => (
            <SkeletonBlock key={item} colors={colors} style={st.profileTabBlock} />
          ))}
        </View>

        <View style={st.profileBodyBlock}>
          {/* Account Form - Profile Details section */}
          <View style={[st.profileFormSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={st.profileFormHeader}>
              <SkeletonBlock colors={colors} style={st.profileFormIcon} />
              <View style={st.listText}>
                <SkeletonBlock colors={colors} style={st.profileFormTitle} />
                <SkeletonBlock colors={colors} style={st.profileFormCaption} />
              </View>
            </View>
            <SkeletonBlock colors={colors} style={st.profileFormLabel} />
            <SkeletonBlock colors={colors} style={st.profileFormInput} />
            <SkeletonBlock colors={colors} style={st.profileFormLabel} />
            <SkeletonBlock colors={colors} style={st.profileFormTextArea} />
            <SkeletonBlock colors={colors} style={st.profileFormLabel} />
            <SkeletonBlock colors={colors} style={st.profileSkillBtn} />
            <SkeletonBlock colors={colors} style={st.profileSkillBtn} />
            <SkeletonBlock colors={colors} style={st.profileSkillBtn} />
          </View>

          {/* Email section */}
          <View style={[st.profileFormSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={st.profileFormHeader}>
              <SkeletonBlock colors={colors} style={st.profileFormIcon} />
              <View style={st.listText}>
                <SkeletonBlock colors={colors} style={{ width: 60, height: 17 }} />
                <SkeletonBlock colors={colors} style={st.profileFormCaption} />
              </View>
            </View>
            <SkeletonBlock colors={colors} style={st.profileFormLabel} />
            <SkeletonBlock colors={colors} style={st.profileFormInput} />
          </View>

          {/* Password section */}
          <View style={[st.profileFormSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={st.profilePasswordHeader}>
              <View style={{ flex: 1 }}>
                <View style={st.profileFormHeader}>
                  <SkeletonBlock colors={colors} style={st.profileFormIcon} />
                  <View style={st.listText}>
                    <SkeletonBlock colors={colors} style={{ width: 90, height: 17 }} />
                    <SkeletonBlock colors={colors} style={st.profileFormCaption} />
                  </View>
                </View>
              </View>
              <SkeletonBlock colors={colors} style={st.profileEyeBtn} />
            </View>
            <SkeletonBlock colors={colors} style={st.profileFormLabel} />
            <SkeletonBlock colors={colors} style={st.profileFormInput} />
            <SkeletonBlock colors={colors} style={st.profileFormLabel} />
            <SkeletonBlock colors={colors} style={st.profileFormInput} />
            <SkeletonBlock colors={colors} style={st.profileFormLabel} />
            <SkeletonBlock colors={colors} style={st.profileFormInput} />
          </View>

          {/* Save + Discard buttons */}
          <SkeletonBlock colors={colors} style={st.profileSaveBlock} />
          <SkeletonBlock colors={colors} style={st.profileDiscardBlock} />

          {/* Preferences section */}
          <View style={st.profilePrefsSection}>
            <SkeletonBlock colors={colors} style={st.smallLabel} />
            <View style={[st.settingsListBlock, { borderColor: colors.border }]}>
              {[0, 1, 2, 3].map((item) => (
                <View
                  key={item}
                  style={[
                    st.settingRowBlock,
                    item < 3 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <View style={st.settingLeftBlock}>
                    <SkeletonBlock colors={colors} style={st.settingIconBlock} />
                    <SkeletonBlock colors={colors} style={st.settingLabelBlock} />
                  </View>
                  <SkeletonBlock colors={colors} style={item === 0 ? st.settingSwitchBlock : st.settingValueBlock} />
                </View>
              ))}
            </View>
          </View>

          {/* Logout */}
          <SkeletonBlock colors={colors} style={st.profileLogoutBlock} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function SearchContentSkeleton({ colors }) {
  return (
    <SafeAreaView
      style={[st.flex1, { backgroundColor: colors.background }]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading search"
    >
      <ScrollView
        style={st.flex1}
        contentContainerStyle={st.searchContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={st.header}>
          <SkeletonBlock colors={colors} style={st.searchTitleWide} />
          <SkeletonBlock colors={colors} style={st.searchTitle} />
          <SkeletonBlock colors={colors} style={st.headerLine} />
          <SkeletonBlock colors={colors} style={st.headerLineShort} />
        </View>

        <View style={st.sectionGap}>
          <SkeletonBlock colors={colors} style={st.smallLabel} />
          <SkeletonBlock colors={colors} style={st.searchInputBlock} />
          <SkeletonBlock colors={colors} style={st.searchButtonBlock} />
        </View>

        <View style={st.sectionGap}>
          <SkeletonBlock colors={colors} style={st.comboLabelLine} />
          {[0, 1, 2].map((item) => (
            <SkeletonBlock key={item} colors={colors} style={st.comboBlock} />
          ))}
        </View>

        <SearchResultsSkeleton colors={colors} />
      </ScrollView>
    </SafeAreaView>
  );
}

export function SearchResultsSkeleton({ colors }) {
  return (
    <View
      style={st.resultsSkeleton}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading recipe results"
    >
      <View style={[st.resultsHeaderSkel, { borderBottomColor: colors.border }]}>
        <SkeletonBlock colors={colors} style={st.resultsLabelLine} />
        <View style={st.filterRowSkel}>
          <SkeletonBlock colors={colors} style={st.filterBlock} />
          <SkeletonBlock colors={colors} style={st.filterBlockSmall} />
        </View>
      </View>
      <View style={st.resultGridSkel}>
        {[0, 1, 2, 3].map((item) => (
          <View key={item} style={st.resultCardSkel}>
            <SkeletonBlock colors={colors} style={st.resultImageSkel} />
            <SkeletonBlock colors={colors} style={st.resultTitleSkel} />
            <SkeletonBlock colors={colors} style={st.resultMetaSkel} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function MealPlannerContentSkeleton({ colors }) {
  return (
    <SafeAreaView
      style={[st.flex1, { backgroundColor: colors.background }]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading meal planner"
    >
      <ScrollView
        style={st.flex1}
        contentContainerStyle={st.plannerContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Page title + subtitle + Day/Week pill — mirrors web `Meal Planner` header */}
        <View style={st.plannerHeaderBlock}>
          <SkeletonBlock colors={colors} style={st.plannerTitleBlock} />
          <SkeletonBlock colors={colors} style={st.plannerSubtitleBlock} />
          <SkeletonBlock colors={colors} style={st.plannerPillBlock} />
        </View>

        {/* Date navigation card */}
        <View style={[st.plannerDateCardSkel, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={st.plannerDateRowSkel}>
            <SkeletonBlock colors={colors} style={st.plannerChevBlock} />
            <SkeletonBlock colors={colors} style={st.plannerDateRangeBlock} />
            <SkeletonBlock colors={colors} style={st.plannerChevBlock} />
          </View>
          <SkeletonBlock colors={colors} style={st.plannerTodayBlock} />
        </View>

        {/* Horizontal 7-day grid: each column = day-header + 3 meal slots */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.plannerWeekScroll}>
          <View style={st.plannerWeekRow}>
            {[0, 1, 2, 3, 4, 5, 6].map((item) => (
              <View key={item} style={st.plannerDayCol}>
                <SkeletonBlock colors={colors} style={st.plannerDayHeaderBlock} />
                <SkeletonBlock colors={colors} style={st.plannerMealSlotBlock} />
                <SkeletonBlock colors={colors} style={st.plannerMealSlotBlock} />
                <SkeletonBlock colors={colors} style={st.plannerMealSlotBlock} />
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Shopping list dark banner */}
        <View style={st.plannerShoppingHeader}>
          <SkeletonBlock colors={colors} color="rgba(255,255,255,0.18)" style={st.darkLineWide} />
          <SkeletonBlock colors={colors} color="rgba(255,255,255,0.1)" style={st.darkLine} />
          <SkeletonBlock colors={colors} color="rgba(255,255,255,0.18)" style={st.plannerShoppingStatBlock} />
        </View>

        {/* Shopping list white card with categories */}
        <View style={[st.plannerShoppingCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {[0, 1, 2].map((section) => (
            <View key={section} style={st.plannerShoppingSection}>
              <SkeletonBlock colors={colors} style={st.comboLabelLine} />
              {[0, 1].map((item) => (
                <View key={item} style={st.plannerShoppingRow}>
                  <View style={st.plannerShoppingRowLeft}>
                    <SkeletonBlock colors={colors} style={st.checkboxBlock} />
                    <SkeletonBlock colors={colors} style={st.shopTextBlock} />
                  </View>
                  <SkeletonBlock colors={colors} style={st.plannerShoppingQtyBlock} />
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function CameraPermissionSkeleton({ colors }) {
  return (
    <View
      style={[st.flex1, st.cameraBlackCenter]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading camera"
    >
      <SkeletonBlock colors={colors} color="rgba(255,255,255,0.2)" style={st.cameraSpinnerBlock} />
      <SkeletonBlock colors={colors} color="rgba(255,255,255,0.12)" style={st.cameraTextBlock} />
    </View>
  );
}

export function CameraAnalysisSkeleton({ colors }) {
  return (
    <View
      style={[st.mobileAnalysisCard, { backgroundColor: colors.surface }]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading camera analysis"
    >
      <View style={st.mobileAnalysisHeader}>
        <SkeletonBlock colors={colors} color="rgba(255,255,255,0.18)" style={st.darkIconSmall} />
        <View style={st.listText}>
          <SkeletonBlock colors={colors} color="rgba(255,255,255,0.18)" style={st.darkLineWide} />
          <SkeletonBlock colors={colors} color="rgba(255,255,255,0.1)" style={st.darkLine} />
        </View>
      </View>
      <View style={st.badgeSkeletonWrap}>
        {[0, 1, 2, 3].map((item) => (
          <SkeletonBlock key={item} colors={colors} style={st.badgeBlock} />
        ))}
      </View>
      <View style={st.resultActionsSkel}>
        <SkeletonBlock colors={colors} style={st.actionBlock} />
        <SkeletonBlock colors={colors} style={st.actionBlock} />
      </View>
    </View>
  );
}

export function NotificationsContentSkeleton({ colors }) {
  return (
    <SafeAreaView
      style={[st.flex1, { backgroundColor: colors.background }]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading notifications"
    >
      <View style={[st.notificationsHeaderSkel, { borderBottomColor: colors.border }]}>
        <View style={st.titleRowSkel}>
          <SkeletonBlock colors={colors} style={st.backBlock} />
          <SkeletonBlock colors={colors} style={st.notificationTitleBlock} />
          <SkeletonBlock colors={colors} style={st.notificationBadgeBlock} />
        </View>
        <View style={st.filterRowSkel}>
          <SkeletonBlock colors={colors} style={st.actionTextBlock} />
          <SkeletonBlock colors={colors} style={st.actionTextBlock} />
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.filterScrollSkel} contentContainerStyle={st.filterContentSkel}>
        {[0, 1, 2, 3, 4].map((item) => (
          <SkeletonBlock key={item} colors={colors} style={st.filterPillBlock} />
        ))}
      </ScrollView>
      <ScrollView style={st.flex1} contentContainerStyle={st.notificationListSkel} showsVerticalScrollIndicator={false}>
        {[0, 1, 2, 3, 4].map((item) => (
          <View key={item} style={[st.notificationCardSkel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SkeletonBlock colors={colors} style={st.notificationIconBlock} />
            <View style={st.listText}>
              <SkeletonBlock colors={colors} style={st.listLineWide} />
              <SkeletonBlock colors={colors} style={st.listLine} />
              <SkeletonBlock colors={colors} style={st.notificationMessageBlock} />
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export function AIChatTypingSkeleton({ colors }) {
  return (
    <View
      style={[st.typingWrap, { backgroundColor: colors.surfaceAlt }]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading AI response"
    >
      <SkeletonBlock colors={colors} style={st.typingLineWide} />
      <SkeletonBlock colors={colors} style={st.typingLine} />
    </View>
  );
}

export function RecipeDetailSkeleton({ colors }) {
  return (
    <View style={[st.flex1, { backgroundColor: colors.background }]}>
      <ScrollView style={st.flex1} showsVerticalScrollIndicator={false}>
        <View style={st.recipeHero}>
          <SkeletonBlock colors={colors} style={StyleSheet.absoluteFillObject} />
          <View style={st.heroActions}>
            <SkeletonBlock colors={colors} style={st.roundButton} />
            <SkeletonBlock colors={colors} style={st.roundButton} />
          </View>
          <SkeletonBlock colors={colors} style={st.recipeBadge} />
        </View>

        <View style={st.recipeBody}>
          <View style={st.titleRow}>
            <SkeletonBlock colors={colors} style={st.recipeTitle} />
            <SkeletonBlock colors={colors} style={st.rating} />
          </View>
          <SkeletonBlock colors={colors} style={st.bodyLineWide} />
          <SkeletonBlock colors={colors} style={st.bodyLine} />

          <View style={st.infoGrid}>
            {[0, 1, 2, 3].map((item) => (
              <SkeletonBlock key={item} colors={colors} style={st.infoCell} />
            ))}
          </View>

          <SkeletonBlock colors={colors} style={st.sectionLabel} />
          {[0, 1, 2, 3, 4].map((item) => (
            <SkeletonBlock key={item} colors={colors} style={st.rowLine} />
          ))}

          <SkeletonBlock colors={colors} style={st.sectionLabel} />
          {[0, 1, 2].map((item) => (
            <View key={item} style={st.stepRow}>
              <SkeletonBlock colors={colors} style={st.stepNumber} />
              <View style={st.stepText}>
                <SkeletonBlock colors={colors} style={st.stepLineWide} />
                <SkeletonBlock colors={colors} style={st.stepLine} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={[st.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <SkeletonBlock colors={colors} style={st.saveSlot} />
        <SkeletonBlock colors={colors} style={st.cookSlot} />
      </View>
    </View>
  );
}

export function AccountSettingsSkeleton({ colors }) {
  return (
    <SafeAreaView style={[st.flex1, { backgroundColor: colors.background }]}>
      <ScrollView
        style={st.flex1}
        contentContainerStyle={st.accountContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={st.accountHeader}>
          <SkeletonBlock colors={colors} style={st.backSquare} />
          <View style={st.listText}>
            <SkeletonBlock colors={colors} style={st.accountTitle} />
            <SkeletonBlock colors={colors} style={st.accountSubtitle} />
          </View>
        </View>

        <View style={[st.accountSummary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SkeletonBlock colors={colors} style={st.summaryAvatar} />
          <View style={st.listText}>
            <SkeletonBlock colors={colors} style={st.listLineWide} />
            <SkeletonBlock colors={colors} style={st.listLine} />
          </View>
        </View>

        {[0, 1, 2].map((section) => (
          <View
            key={section}
            style={[st.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={st.formHeader}>
              <SkeletonBlock colors={colors} style={st.formIcon} />
              <View style={st.listText}>
                <SkeletonBlock colors={colors} style={st.formTitle} />
                <SkeletonBlock colors={colors} style={st.formCaption} />
              </View>
            </View>
            <SkeletonBlock colors={colors} style={st.inputLine} />
            <SkeletonBlock colors={colors} style={st.inputLine} />
            {section === 0 && <SkeletonBlock colors={colors} style={st.textAreaLine} />}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export function AllRecipesContentSkeleton({ colors }) {
  return (
    <SafeAreaView
      style={[st.flex1, { backgroundColor: colors.background }]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading all recipes"
    >
      <ScrollView
        style={st.flex1}
        contentContainerStyle={st.allRecipesContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back pill */}
        <SkeletonBlock colors={colors} style={st.allRecipesBackPill} />

        {/* Eyebrow */}
        <SkeletonBlock colors={colors} style={st.allRecipesEyebrow} />

        {/* Title row: big title + sort pill */}
        <View style={[st.allRecipesTitleRow, { borderBottomColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <SkeletonBlock colors={colors} style={st.allRecipesTitle} />
            <SkeletonBlock colors={colors} style={st.allRecipesDesc} />
          </View>
          <SkeletonBlock colors={colors} style={st.allRecipesSortPill} />
        </View>

        {/* Category filter section */}
        <View style={[st.allRecipesCategorySection, { borderColor: colors.border }]}>
          <View style={st.allRecipesCatHeader}>
            <View>
              <SkeletonBlock colors={colors} style={st.allRecipesCatEyebrow} />
              <SkeletonBlock colors={colors} style={st.allRecipesCatTitle} />
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[0, 1, 2, 3, 4].map((item) => (
              <SkeletonBlock key={item} colors={colors} style={st.allRecipesCatChip} />
            ))}
          </ScrollView>
        </View>

        {/* Results header */}
        <View style={[st.allRecipesResultsHeader, { borderBottomColor: colors.border }]}>
          <SkeletonBlock colors={colors} style={st.allRecipesResultsLabel} />
        </View>

        {/* Recipe grid: 2 columns of cards */}
        <View style={st.allRecipesGrid}>
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <View key={item} style={st.allRecipesCardSkel}>
              <SkeletonBlock colors={colors} style={st.allRecipesCardImage} />
              <SkeletonBlock colors={colors} style={st.allRecipesCardTitle} />
              <SkeletonBlock colors={colors} style={st.allRecipesCardMeta} />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function NotificationSettingsContentSkeleton({ colors }) {
  return (
    <SafeAreaView
      style={[st.flex1, { backgroundColor: colors.background }]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading notification settings"
    >
      {/* Header bar */}
      <View style={[st.notifSettingsHeader, { borderBottomColor: colors.border }]}>
        <SkeletonBlock colors={colors} style={st.notifSettingsBackIcon} />
        <SkeletonBlock colors={colors} style={st.notifSettingsHeaderTitle} />
      </View>

      <ScrollView
        style={st.flex1}
        contentContainerStyle={st.notifSettingsContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro text */}
        <SkeletonBlock colors={colors} style={st.notifSettingsIntro} />

        {/* Section 1: Delivery (2 toggles) */}
        <View style={[st.notifSettingsSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={st.notifSettingsSectionHeader}>
            <SkeletonBlock colors={colors} style={st.notifSettingsSectionIcon} />
            <View style={st.listText}>
              <SkeletonBlock colors={colors} style={st.notifSettingsSectionTitle} />
              <SkeletonBlock colors={colors} style={st.notifSettingsSectionDesc} />
            </View>
          </View>
          {[0, 1].map((item) => (
            <View key={item} style={[st.notifSettingsToggleRow, { borderColor: colors.border }]}>
              <View style={st.notifSettingsToggleLeft}>
                <SkeletonBlock colors={colors} style={st.notifSettingsToggleIcon} />
                <View style={st.listText}>
                  <SkeletonBlock colors={colors} style={st.notifSettingsToggleTitle} />
                  <SkeletonBlock colors={colors} style={st.notifSettingsToggleDesc} />
                </View>
              </View>
              <SkeletonBlock colors={colors} style={st.notifSettingsSwitch} />
            </View>
          ))}
        </View>

        {/* Section 2: Alert types (3 toggles) */}
        <View style={[st.notifSettingsSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={st.notifSettingsSectionHeader}>
            <SkeletonBlock colors={colors} style={st.notifSettingsSectionIcon} />
            <View style={st.listText}>
              <SkeletonBlock colors={colors} style={{ width: 100, height: 20 }} />
              <SkeletonBlock colors={colors} style={st.notifSettingsSectionDesc} />
            </View>
          </View>
          {[0, 1, 2].map((item) => (
            <View key={item} style={[st.notifSettingsToggleRow, { borderColor: colors.border }]}>
              <View style={st.notifSettingsToggleLeft}>
                <SkeletonBlock colors={colors} style={st.notifSettingsToggleIcon} />
                <View style={st.listText}>
                  <SkeletonBlock colors={colors} style={st.notifSettingsToggleTitle} />
                  <SkeletonBlock colors={colors} style={st.notifSettingsToggleDesc} />
                </View>
              </View>
              <SkeletonBlock colors={colors} style={st.notifSettingsSwitch} />
            </View>
          ))}
        </View>

        {/* Summary card */}
        <View style={[st.notifSettingsSummary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[st.notifSettingsSummaryHeader, { borderBottomColor: colors.border }]}>
            <SkeletonBlock colors={colors} style={st.notifSettingsSummaryIcon} />
            <View style={st.listText}>
              <SkeletonBlock colors={colors} style={{ width: 100, height: 18 }} />
              <SkeletonBlock colors={colors} style={{ width: 170, height: 13 }} />
            </View>
          </View>
          <SkeletonBlock colors={colors} style={st.notifSettingsInfoBox} />
          <SkeletonBlock colors={colors} style={st.notifSettingsSaveBtn} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  flex1: { flex: 1 },
  block: { borderRadius: 10, overflow: 'hidden' },
  contentWrap: { padding: 18, paddingBottom: 40, gap: 16 },
  header: { gap: 8, marginTop: 6, marginBottom: 4 },
  headerTitle: { width: 190, height: 34 },
  headerLine: { width: '72%', height: 14 },
  hero: { width: '100%', aspectRatio: 1, borderRadius: 28 },
  cardGrid: { flexDirection: 'row', gap: 12 },
  squareCard: { flex: 1, height: 112, borderRadius: 10 },
  listCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: { width: 48, height: 48, borderRadius: 12 },
  listText: { flex: 1, minWidth: 0, gap: 8 },
  listLineWide: { width: '78%', height: 14 },
  listLine: { width: '55%', height: 12 },
  recipeHero: { width: '100%', height: 320, position: 'relative', overflow: 'hidden' },
  heroActions: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roundButton: { width: 40, height: 40, borderRadius: 20 },
  recipeBadge: { position: 'absolute', bottom: 20, left: 20, width: 112, height: 28, borderRadius: 0 },
  recipeBody: { padding: 20, gap: 18 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  recipeTitle: { flex: 1, height: 64 },
  rating: { width: 58, height: 26 },
  bodyLineWide: { width: '100%', height: 14 },
  bodyLine: { width: '72%', height: 14 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },
  infoCell: { width: '50%', height: 72, borderRadius: 0 },
  sectionLabel: { width: 150, height: 12, marginTop: 8 },
  rowLine: { width: '100%', height: 48, borderRadius: 0 },
  stepRow: { flexDirection: 'row', gap: 14, paddingVertical: 8 },
  stepNumber: { width: 32, height: 32, borderRadius: 0 },
  stepText: { flex: 1, gap: 8 },
  stepLineWide: { width: '100%', height: 14 },
  stepLine: { width: '64%', height: 14 },
  bottomBar: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1 },
  saveSlot: { width: 52, height: 52, borderRadius: 0 },
  cookSlot: { flex: 1, height: 52, borderRadius: 0 },
  accountContent: { padding: 18, paddingBottom: 40, gap: 14 },
  accountHeader: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 4 },
  backSquare: { width: 42, height: 42 },
  accountTitle: { width: 210, height: 28 },
  accountSubtitle: { width: '86%', height: 13 },
  accountSummary: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryAvatar: { width: 52, height: 52 },
  formSection: { borderWidth: 1, borderRadius: 10, padding: 16, gap: 10 },
  formHeader: { flexDirection: 'row', gap: 12, marginBottom: 6 },
  formIcon: { width: 40, height: 40 },
  formTitle: { width: 150, height: 17 },
  formCaption: { width: '92%', height: 12 },
  inputLine: { width: '100%', height: 48 },
  textAreaLine: { width: '100%', height: 96 },
  mobileHeader: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  mobileHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBlock: { width: 36, height: 36, borderRadius: 12 },
  brandLines: { gap: 6 },
  brandLineWide: { width: 92, height: 14 },
  brandLine: { width: 118, height: 7 },
  mobileHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconCircle: { width: 36, height: 36, borderRadius: 18 },
  homeContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100, gap: 20 },
  searchPill: { width: '100%', height: 42, borderRadius: 999 },
  homeHero: { width: '100%', aspectRatio: 1, borderRadius: 28 },
  sectionGap: { gap: 10 },
  smallLabel: { width: 120, height: 10, borderRadius: 0 },
  quickRow: { flexDirection: 'row', gap: 12 },
  quickBlock: { flex: 1, height: 52, borderRadius: 16 },
  sectionHeading: { width: 160, height: 20 },
  recipeCardSkel: { width: 180, marginRight: 12, gap: 8 },
  recipeCardImage: { width: '100%', height: 118, borderRadius: 16 },
  recipeCardTitle: { width: '86%', height: 15 },
  recipeCardMeta: { width: '58%', height: 11 },
  infoRow: { flexDirection: 'row', gap: 12 },
  infoBlock: { flex: 1, height: 150, borderRadius: 0 },
  mobilePanel: { borderWidth: 1, padding: 16, borderRadius: 0 },
  mobilePanelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  tinyLine: { width: 72, height: 8, borderRadius: 0 },
  dotBlock: { width: 14, height: 14, borderRadius: 7 },
  fullButtonBlock: { width: '100%', height: 46, borderRadius: 0, marginTop: 14 },
  recentSkel: { marginBottom: 6 },
  recentImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: 0, marginBottom: 8 },
  recentTitle: { width: '78%', height: 14 },
  recentMeta: { width: 94, height: 9, marginTop: 6 },
  darkPanel: { backgroundColor: '#24160f', padding: 24, alignItems: 'center', gap: 12 },
  darkIcon: { width: 36, height: 36, borderRadius: 0 },
  darkTitle: { width: 120, height: 17 },
  darkLineWide: { width: '76%', height: 12 },
  darkLine: { width: '58%', height: 12 },
  darkButton: { width: '100%', height: 44, borderRadius: 0 },
  statsBlockRound: { width: '100%', height: 100, borderRadius: 32 },
  // AllRecipes skeleton styles
  allRecipesContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120, gap: 14 },
  allRecipesBackPill: { width: 110, height: 34, borderRadius: 999 },
  allRecipesEyebrow: { width: 180, height: 9 },
  allRecipesTitleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, borderBottomWidth: 1, paddingBottom: 18 },
  allRecipesTitle: { width: 160, height: 74 },
  allRecipesDesc: { width: 220, height: 14, marginTop: 10 },
  allRecipesSortPill: { width: 80, height: 56, borderRadius: 16 },
  allRecipesCategorySection: { borderWidth: 1, borderRadius: 24, padding: 14, gap: 10 },
  allRecipesCatHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  allRecipesCatEyebrow: { width: 130, height: 8 },
  allRecipesCatTitle: { width: 120, height: 20, marginTop: 4 },
  allRecipesCatChip: { width: 130, height: 52, borderRadius: 999, marginRight: 10 },
  allRecipesResultsHeader: { borderBottomWidth: 1, paddingBottom: 10 },
  allRecipesResultsLabel: { width: 200, height: 9 },
  allRecipesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  allRecipesCardSkel: { width: '48%', marginBottom: 22 },
  allRecipesCardImage: { width: '100%', aspectRatio: 1, borderRadius: 24, marginBottom: 10 },
  allRecipesCardTitle: { width: '90%', height: 15 },
  allRecipesCardMeta: { width: '70%', height: 11, marginTop: 6 },
  // NotificationSettings skeleton styles
  notifSettingsHeader: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, gap: 16 },
  notifSettingsBackIcon: { width: 32, height: 32, borderRadius: 8 },
  notifSettingsHeaderTitle: { width: 200, height: 22 },
  notifSettingsContent: { padding: 16, gap: 20, paddingBottom: 40 },
  notifSettingsIntro: { width: '90%', height: 16 },
  notifSettingsSection: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  notifSettingsSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  notifSettingsSectionIcon: { width: 44, height: 44, borderRadius: 12 },
  notifSettingsSectionTitle: { width: 80, height: 20 },
  notifSettingsSectionDesc: { width: '90%', height: 13 },
  notifSettingsToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderWidth: 1, borderRadius: 12 },
  notifSettingsToggleLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 16, gap: 12 },
  notifSettingsToggleIcon: { width: 40, height: 40, borderRadius: 10 },
  notifSettingsToggleTitle: { width: 120, height: 16 },
  notifSettingsToggleDesc: { width: '90%', height: 12 },
  notifSettingsSwitch: { width: 48, height: 28, borderRadius: 14 },
  notifSettingsSummary: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 16 },
  notifSettingsSummaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, paddingBottom: 16 },
  notifSettingsSummaryIcon: { width: 48, height: 48, borderRadius: 12 },
  notifSettingsInfoBox: { width: '100%', height: 52, borderRadius: 12 },
  notifSettingsSaveBtn: { width: '100%', height: 48, borderRadius: 12 },
  statsBlock: { width: '100%', height: 118, borderRadius: 0 },
  profileContent: { paddingBottom: 100 },
  profileHeaderBlock: { paddingTop: 32, paddingBottom: 24, alignItems: 'center' },
  profileAvatarBlock: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  profileNameBlock: { width: 190, height: 24 },
  profileEmailBlock: { width: 220, height: 14, marginTop: 8 },
  profileStatsBlock: { flexDirection: 'row', width: '100%', marginTop: 20, paddingTop: 18, borderTopWidth: 1 },
  profileStatBlock: { flex: 1, alignItems: 'center', gap: 7 },
  profileStatNumberBlock: { width: 42, height: 24 },
  profileStatLabelBlock: { width: 64, height: 8 },
  profileActionRowBlock: { flexDirection: 'row', gap: 10, marginTop: 18, paddingHorizontal: 24 },
  profileEditButtonBlock: { flex: 1, height: 44, borderRadius: 0 },
  profileShareButtonBlock: { width: 44, height: 44, borderRadius: 0 },
  profileTabsBlock: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 16 },
  profileTabBlock: { flex: 1, height: 42, marginVertical: 7 },
  profileBodyBlock: { padding: 16, gap: 24 },
  profileEmptyBlock: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  profileEmptyIconBlock: { width: 40, height: 40, borderRadius: 20 },
  profileEmptyTextBlock: { width: 240, height: 14 },
  settingsListBlock: { borderWidth: 1 },
  settingRowBlock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 16 },
  settingLeftBlock: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingIconBlock: { width: 18, height: 18, borderRadius: 9 },
  settingLabelBlock: { width: 140, height: 14 },
  settingSwitchBlock: { width: 48, height: 28, borderRadius: 14 },
  settingValueBlock: { width: 74, height: 14 },
  profileLogoutBlock: { width: '100%', height: 48, borderRadius: 10 },
  // Profile form skeleton styles
  profileFormSection: { borderWidth: 1, borderRadius: 10, padding: 16, gap: 10 },
  profileFormHeader: { flexDirection: 'row', gap: 12, marginBottom: 6 },
  profileFormIcon: { width: 40, height: 40, borderRadius: 10 },
  profileFormTitle: { width: 130, height: 17 },
  profileFormCaption: { width: '92%', height: 12 },
  profileFormLabel: { width: 100, height: 9, marginTop: 4 },
  profileFormInput: { width: '100%', height: 48 },
  profileFormTextArea: { width: '100%', height: 96 },
  profileSkillBtn: { width: '100%', height: 42 },
  profilePasswordHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 },
  profileEyeBtn: { width: 40, height: 40, borderRadius: 10 },
  profileSaveBlock: { width: '100%', height: 52, borderRadius: 10 },
  profileDiscardBlock: { width: '100%', height: 48, borderRadius: 10 },
  profilePrefsSection: { gap: 12, marginTop: 8 },
  searchContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 86, gap: 16 },
  searchTitleWide: { width: 230, height: 36 },
  searchTitle: { width: 190, height: 36 },
  headerLineShort: { width: '64%', height: 14 },
  searchInputBlock: { width: '100%', height: 56, borderRadius: 0 },
  searchButtonBlock: { width: '100%', height: 52, borderRadius: 0 },
  comboLabelLine: { width: 190, height: 10, borderRadius: 0 },
  comboBlock: { width: '100%', height: 120, borderRadius: 0 },
  resultsSkeleton: { gap: 14 },
  resultsHeaderSkel: { borderBottomWidth: 1, paddingBottom: 10, gap: 10 },
  resultsLabelLine: { width: 210, height: 10, borderRadius: 0 },
  filterRowSkel: { flexDirection: 'row', gap: 8 },
  filterBlock: { width: 118, height: 30, borderRadius: 0 },
  filterBlockSmall: { width: 96, height: 30, borderRadius: 0 },
  resultGridSkel: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  resultCardSkel: { width: '48%', marginBottom: 10, gap: 8 },
  resultImageSkel: { width: '100%', aspectRatio: 1, borderRadius: 16 },
  resultTitleSkel: { width: '92%', height: 14 },
  resultMetaSkel: { width: '72%', height: 11 },
  // Meal planner skeleton — mirrors the new layout (page title + Day/Week pill + date card + 7-day horizontal grid + shopping list)
  plannerContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 110, gap: 24 },
  plannerHeaderBlock: { gap: 10 },
  plannerTitleBlock: { width: 220, height: 36, borderRadius: 8 },
  plannerSubtitleBlock: { width: 240, height: 14, borderRadius: 6 },
  plannerPillBlock: { width: 160, height: 44, borderRadius: 999, marginTop: 8 },
  plannerDateCardSkel: { borderRadius: 28, padding: 18, gap: 14, borderWidth: 1 },
  plannerDateRowSkel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  plannerChevBlock: { width: 44, height: 44, borderRadius: 22 },
  plannerDateRangeBlock: { flex: 1, height: 22, borderRadius: 6 },
  plannerTodayBlock: { width: '100%', height: 46, borderRadius: 999 },
  plannerWeekScroll: { paddingRight: 16 },
  plannerWeekRow: { flexDirection: 'row', gap: 12 },
  plannerDayCol: { width: 108, gap: 12 },
  plannerDayHeaderBlock: { width: '100%', height: 78, borderRadius: 22 },
  plannerMealSlotBlock: { width: '100%', height: 110, borderRadius: 18 },
  plannerShoppingHeader: { backgroundColor: '#24160f', padding: 24, borderRadius: 36, gap: 10, marginTop: 4 },
  plannerShoppingStatBlock: { width: '100%', height: 60, borderRadius: 18, marginTop: 8 },
  plannerShoppingCard: { borderRadius: 36, borderWidth: 1, padding: 22, gap: 22 },
  plannerShoppingSection: { gap: 10 },
  plannerShoppingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  plannerShoppingRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  plannerShoppingQtyBlock: { width: 44, height: 18, borderRadius: 6 },
  checkboxBlock: { width: 22, height: 22, borderRadius: 7 },
  shopTextBlock: { width: 110, height: 14 },
  darkIconSmall: { width: 36, height: 36, borderRadius: 0 },
  cameraBlackCenter: { backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 40 },
  cameraSpinnerBlock: { width: 48, height: 48, borderRadius: 24 },
  cameraTextBlock: { width: 190, height: 13 },
  mobileAnalysisCard: { overflow: 'hidden', borderRadius: 0 },
  mobileAnalysisHeader: { backgroundColor: '#24160f', flexDirection: 'row', alignItems: 'center', padding: 18, gap: 12 },
  badgeSkeletonWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 16 },
  badgeBlock: { width: 86, height: 28, borderRadius: 0 },
  resultActionsSkel: { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 4 },
  actionBlock: { flex: 1, height: 48, borderRadius: 0 },
  notificationsHeaderSkel: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14, borderBottomWidth: 1, gap: 10 },
  titleRowSkel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBlock: { width: 22, height: 22, borderRadius: 11 },
  notificationTitleBlock: { width: 124, height: 30 },
  notificationBadgeBlock: { width: 28, height: 20, borderRadius: 0 },
  actionTextBlock: { width: 108, height: 10, borderRadius: 0 },
  filterScrollSkel: { flexGrow: 0 },
  filterContentSkel: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterPillBlock: { width: 92, height: 34, borderRadius: 0 },
  notificationListSkel: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 86, gap: 12 },
  notificationCardSkel: { borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', gap: 12 },
  notificationIconBlock: { width: 46, height: 46, borderRadius: 14 },
  notificationMessageBlock: { width: '92%', height: 12 },
  typingWrap: { alignSelf: 'flex-start', maxWidth: '85%', padding: 12, borderRadius: 14, gap: 8 },
  typingLineWide: { width: 170, height: 13 },
  typingLine: { width: 118, height: 13 },
});
