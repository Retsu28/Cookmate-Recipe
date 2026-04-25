const natural = require('natural');

const TfIdf = natural.TfIdf;

// Mock Recipe Data (same as original server.ts)
const mockRecipes = [
  { id: 1, title: 'Creamy Garlic Chicken', ingredients: ['chicken', 'garlic', 'cream', 'butter', 'onion'], time: '30 min', difficulty: 'Easy', image: 'https://picsum.photos/seed/chicken/600/400' },
  { id: 2, title: 'Garlic Butter Pasta', ingredients: ['pasta', 'garlic', 'butter', 'parmesan', 'parsley'], time: '15 min', difficulty: 'Easy', image: 'https://picsum.photos/seed/pasta/600/400' },
  { id: 3, title: 'Beef Stir Fry', ingredients: ['beef', 'soy sauce', 'ginger', 'garlic', 'broccoli', 'bell pepper'], time: '25 min', difficulty: 'Medium', image: 'https://picsum.photos/seed/beef/600/400' },
  { id: 4, title: 'Tomato Basil Soup', ingredients: ['tomato', 'basil', 'onion', 'garlic', 'cream', 'vegetable broth'], time: '40 min', difficulty: 'Easy', image: 'https://picsum.photos/seed/tomato/600/400' },
  { id: 5, title: 'Mushroom Risotto', ingredients: ['rice', 'mushroom', 'onion', 'garlic', 'white wine', 'parmesan'], time: '50 min', difficulty: 'Hard', image: 'https://picsum.photos/seed/mushroom/600/400' },
];

// TF-IDF recommender
let tfidf = new TfIdf();
mockRecipes.forEach((recipe) => {
  tfidf.addDocument(recipe.ingredients.join(' '));
});

exports.recommendByIngredients = (req, res) => {
  const { ingredients } = req.body;
  if (!ingredients || !Array.isArray(ingredients)) {
    return res.status(400).json({ error: 'Ingredients list is required' });
  }

  const query = ingredients.join(' ');
  const results = [];

  tfidf.tfidfs(query, (i, measure) => {
    if (measure > 0) {
      results.push({
        recipe: mockRecipes[i],
        score: measure,
        matchPercentage: Math.min(Math.round(measure * 100), 100),
      });
    }
  });

  results.sort((a, b) => b.score - a.score);
  res.json({ recommendations: results.slice(0, 5) });
};

exports.camera = (_req, res) => {
  res.json({ message: 'ML Camera endpoint' });
};
