import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { plannerApi } from '../api/api';
import { getMealPlansCached, offlineCache } from '../offline/cacheService';
import { OFFLINE_MESSAGE } from '../offline/network';
import { syncPlannerLocalNotifications } from '../notifications/plannerNotifications';

export default function useMealPlannerData({ isOnline }) {
  const [plannedMeals, setPlannedMeals] = useState([]);
  const [savedLists, setSavedLists] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(false);

  const loadPlans = useCallback(async ({ showLoader = true } = {}) => {
    if (showLoader) setLoadingPlans(true);
    try {
      const response = await getMealPlansCached(() => plannerApi.getPlan());
      const nextPlans = response?.data?.plans || [];
      setPlannedMeals(nextPlans);
      syncPlannerLocalNotifications(nextPlans).catch(() => {});
    } catch (err) {
      console.error('Failed to load meal plans', err);
      setPlannedMeals([]);
    } finally {
      if (showLoader) setLoadingPlans(false);
    }
  }, []);

  const loadSavedLists = useCallback(async () => {
    if (!isOnline) return;
    setLoadingSaved(true);
    try {
      const response = await plannerApi.listSavedGroceryLists();
      setSavedLists(response?.data?.saved || []);
    } catch (err) {
      const isNetworkErr = !err?.response && (err?.message === 'Network Error' || err?.code === 'ERR_NETWORK');
      if (!isNetworkErr) console.warn('Failed to load saved grocery lists', err?.message || err);
    } finally {
      setLoadingSaved(false);
    }
  }, [isOnline]);

  const updatePlan = useCallback(async (plan, data, onSuccess) => {
    if (!isOnline) {
      Alert.alert('You are offline', OFFLINE_MESSAGE);
      return;
    }
    try {
      const res = await plannerApi.updateMeal(plan.id, data);
      const updated = res?.plan || res;
      setPlannedMeals((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      if (onSuccess) onSuccess();
    } catch (err) {
      Alert.alert('Update failed', err?.message || 'Please try again.');
    }
  }, [isOnline]);

  const removePlan = useCallback(async (plan) => {
    if (!isOnline) {
      Alert.alert('You are offline', OFFLINE_MESSAGE);
      return;
    }
    try {
      await plannerApi.deleteMeal(plan.id);
      setPlannedMeals((current) => current.filter((item) => item.id !== plan.id));
      await offlineCache.mealPlans.delete(plan.id);
    } catch (err) {
      Alert.alert('Remove failed', err?.message || 'Please try again.');
    }
  }, [isOnline]);

  const confirmRemoveSavedList = useCallback((saved, { savedListState, setSavedListState, setGroceryList, setCheckedItems }) => {
    Alert.alert(
      'Delete saved list?',
      `"${saved.name}" will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await plannerApi.deleteSavedGroceryList(saved.id);
              setSavedLists((current) => current.filter((item) => item.id !== saved.id));
              setSavedListState((s) => ({
                ...s,
                expandedId: s.expandedId === saved.id ? null : s.expandedId,
                currentId: s.currentId === saved.id ? null : s.currentId,
              }));
              if (savedListState.currentId === saved.id) {
                setGroceryList(null);
                setCheckedItems({});
              }
            } catch (err) {
              Alert.alert('Delete failed', err?.message || 'Please try again.');
            }
          },
        },
      ]
    );
  }, []);

  return {
    plannedMeals,
    setPlannedMeals,
    savedLists,
    setSavedLists,
    loadingPlans,
    loadingSaved,
    loadPlans,
    loadSavedLists,
    updatePlan,
    removePlan,
    confirmRemoveSavedList,
  };
}
