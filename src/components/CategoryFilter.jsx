import React from 'react';

const categories = ['Todos', 'Reliquias', 'Tecnología', 'Oscuro', 'Armas'];

export default function CategoryFilter({ selectedCategory, setSelectedCategory }) {
  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar py-2">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => setSelectedCategory(cat)}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition shadow-sm ${
            selectedCategory === cat 
              ? 'bg-blue-600 text-white shadow-blue-900/30' 
              : 'bg-gray-900 text-gray-400 hover:bg-gray-800 border border-gray-800'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}