import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { format } from 'date-fns';
import * as Notifications from 'expo-notifications';
import { plannerApi } from '../api/api';
import { getGroceryListCached, offlineCache } from '../offline/cacheService';
import { OFFLINE_MESSAGE } from '../offline/network';

export default function useGroceryList({ isOnline, selectedSlots, plansByDateAndType }) {
  const [groceryList, setGroceryList] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});
  const [savedListState, setSavedListState] = useState({ expandedId: null, currentId: null });
  const [loadingGrocery, setLoadingGrocery] = useState(false);
  const [savingGrocery, setSavingGrocery] = useState(false);

  const hydrateCachedGroceryList = useCallback(async () => {
    const cached = await offlineCache.groceryList.get('latest');
    if (cached?.data?.groceryList) {
      setGroceryList(cached.data.groceryList);
    }
  }, []);

  const generateGroceryList = useCallback(async () => {
    if (selectedSlots.size === 0) {
      Alert.alert('Select meals first', 'Tap a Breakfast, Lunch, or Dinner slot to select it before generating.');
      return;
    }
    if (!isOnline) {
      try {
        const response = await getGroceryListCached(() => plannerApi.getGroceryList());
        setGroceryList(response?.data?.groceryList || null);
        setSavedListState((s) => ({ ...s, currentId: null }));
      } catch {
        Alert.alert('You are offline', 'Generate a grocery list once online before viewing it offline.');
      }
      return;
    }
    setLoadingGrocery(true);
    try {
      const response = await getGroceryListCached(() => plannerApi.getGroceryList());
      const list = response?.data?.groceryList || null;
      setGroceryList(list);
      setSavedListState((s) => ({ ...s, currentId: null }));
      setCheckedItems({});
      if (list && list.totalItems > 0) {
        Notifications.scheduleNotificationAsync({
          content: {
            title: 'Grocery list ready',
            body: `${list.totalItems} ingredient${list.totalItems === 1 ? '' : 's'} grouped for your planned meals.`,
            data: { route: 'Planner' },
            sound: true,
          },
          trigger: null,
        }).catch(() => {});
      }
    } catch (err) {
      Alert.alert('Grocery list failed', err?.message || 'Please try again.');
    } finally {
      setLoadingGrocery(false);
    }
  }, [isOnline, selectedSlots]);

  const saveCurrentGroceryList = useCallback(async (displayedGroceryList, setSavedLists) => {
    if (!displayedGroceryList || !displayedGroceryList.items?.length) {
      Alert.alert('Nothing to save', 'Generate a grocery list first.');
      return;
    }
    if (!isOnline) {
      Alert.alert('You are offline', OFFLINE_MESSAGE);
      return;
    }
    setSavingGrocery(true);
    try {
      const defaultName = `Grocery list - ${format(new Date(), 'MMM d, yyyy')}`;
      const response = await plannerApi.saveGroceryList({
        name: defaultName,
        grocery_list: displayedGroceryList,
      });
      const saved = response?.data?.saved;
      if (saved) {
        setSavedLists((current) => [saved, ...current]);
        setSavedListState((s) => ({ ...s, currentId: saved.id }));
        Alert.alert('Saved to My Saves', saved.name);
      }
    } catch (err) {
      Alert.alert('Save failed', err?.message || 'Please try again.');
    } finally {
      setSavingGrocery(false);
    }
  }, [isOnline]);

  const clearGroceryList = useCallback(async (setSavedLists) => {
    if (savedListState.currentId) {
      if (!isOnline) {
        Alert.alert('You are offline', OFFLINE_MESSAGE);
        return;
      }
      try {
        await plannerApi.deleteSavedGroceryList(savedListState.currentId);
        setSavedLists((current) => current.filter((item) => item.id !== savedListState.currentId));
        setSavedListState((s) => ({ ...s, expandedId: s.expandedId === savedListState.currentId ? null : s.expandedId }));
      } catch (err) {
        Alert.alert('Delete failed', err?.message || 'Please try again.');
        return;
      }
    }
    setGroceryList(null);
    setCheckedItems({});
    setSavedListState((s) => ({ ...s, currentId: null }));
    await offlineCache.groceryList.delete('latest');
  }, [isOnline, savedListState.currentId]);

  const loadSavedIntoView = useCallback((saved) => {
    setGroceryList(saved.grocery_list);
    setCheckedItems({});
    setSavedListState((s) => ({ ...s, currentId: saved.id }));
  }, []);

  const toggleGroceryItem = useCallback((id) => {
    setCheckedItems((current) => ({ ...current, [id]: !current[id] }));
  }, []);

  const getDisplayedGroceryList = useCallback(() => {
    if (!groceryList) return null;
    if (selectedSlots.size === 0) return groceryList;

    const selectedRecipeIds = new Set();
    selectedSlots.forEach((slotKey) => {
      const slotPlans = plansByDateAndType.get(slotKey) || [];
      slotPlans.forEach((p) => {
        if (p.recipe?.id) selectedRecipeIds.add(p.recipe.id);
        else if (p.recipe_id) selectedRecipeIds.add(p.recipe_id);
      });
    });

    if (selectedRecipeIds.size === 0) {
      return { ...groceryList, items: [], groups: [], totalItems: 0 };
    }

    const filteredGroups = groceryList.groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.recipes?.some((r) => selectedRecipeIds.has(r.id))),
      }))
      .filter((group) => group.items.length > 0);

    return {
      ...groceryList,
      groups: filteredGroups,
      items: filteredGroups.flatMap((g) => g.items),
      totalItems: filteredGroups.reduce((sum, g) => sum + g.items.length, 0),
    };
  }, [groceryList, selectedSlots, plansByDateAndType]);

  return {
    groceryList,
    setGroceryList,
    checkedItems,
    setCheckedItems,
    savedListState,
    setSavedListState,
    loadingGrocery,
    savingGrocery,
    hydrateCachedGroceryList,
    generateGroceryList,
    saveCurrentGroceryList,
    clearGroceryList,
    loadSavedIntoView,
    toggleGroceryItem,
    getDisplayedGroceryList,
  };
}
