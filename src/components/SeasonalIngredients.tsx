import React, { useState, useEffect } from 'react';
import { loadSeasonalData, fetchSeasonalData, type SeasonalData } from '@/data/seasonalData';

export function SeasonalIngredients() {
  const [data, setData] = useState<SeasonalData>(() => loadSeasonalData());
  const month = new Date().getMonth();
  const seasonal = data.byMonth[month] ?? data.byMonth[0] ?? [];

  useEffect(() => {
    fetchSeasonalData().then(setData).catch(() => {});
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {seasonal.map((item) => (
        <div key={item.name} className="bg-white dark:bg-stone-800 p-4 rounded-2xl border border-stone-100 dark:border-stone-700 text-center hover:shadow-md transition-all cursor-pointer group">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center bg-orange-50 dark:bg-orange-950/30 text-3xl group-hover:scale-110 transition-transform">
            {item.emoji}
          </div>
          <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 leading-snug">{item.name}</h4>
          <p className="text-[10px] font-bold text-orange-500 dark:text-orange-400 uppercase tracking-wider mt-1">{item.status}</p>
        </div>
      ))}
    </div>
  );
}
