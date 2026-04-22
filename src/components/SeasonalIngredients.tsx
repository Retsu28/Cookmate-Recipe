import React from 'react';

const seasonal = [
  { name: 'Asparagus', status: 'Peak Season', image: 'https://picsum.photos/seed/asparagus/100/100' },
  { name: 'Strawberries', status: 'Just In', image: 'https://picsum.photos/seed/strawberry/100/100' },
  { name: 'Rhubarb', status: 'Limited Time', image: 'https://picsum.photos/seed/rhubarb/100/100' },
];

export function SeasonalIngredients() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {seasonal.map((item) => (
        <div key={item.name} className="bg-white p-4 rounded-2xl border border-stone-100 text-center hover:shadow-md transition-all cursor-pointer group">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full overflow-hidden border-2 border-stone-50 group-hover:border-orange-200 transition-colors">
            <img 
              src={item.image} 
              alt={item.name} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <h4 className="font-bold text-sm text-stone-900">{item.name}</h4>
          <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider mt-1">{item.status}</p>
        </div>
      ))}
    </div>
  );
}
