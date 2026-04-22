import React from 'react';
import { PlayCircle, BookOpen } from 'lucide-react';

const skills = [
  { title: 'Knife Skills 101', type: 'Video', duration: '12 min', level: 'Beginner', image: 'https://picsum.photos/seed/knife/400/250' },
  { title: 'Mastering Sauces', type: 'Course', duration: '45 min', level: 'Intermediate', image: 'https://picsum.photos/seed/sauce/400/250' },
  { title: 'Perfect Sourdough', type: 'Guide', duration: '20 min', level: 'Advanced', image: 'https://picsum.photos/seed/bread/400/250' },
];

export function CookingSkillContent() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {skills.map((skill) => (
        <div key={skill.title} className="bg-white rounded-2xl overflow-hidden border border-stone-100 group cursor-pointer shadow-sm hover:shadow-md transition-all">
          <div className="h-32 relative">
            <img 
              src={skill.image} 
              alt={skill.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {skill.type === 'Video' ? <PlayCircle className="text-white" size={32} /> : <BookOpen className="text-white" size={32} />}
            </div>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">{skill.type}</span>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{skill.level}</span>
            </div>
            <h4 className="font-bold text-stone-900 mb-2">{skill.title}</h4>
            <p className="text-xs text-stone-400 font-medium">{skill.duration}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
