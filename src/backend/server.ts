import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import cors from 'cors';

// Import routers
// import authRouter from './routers/auth';
// ... other routers

import { recommender } from '../ml/recommender';

// Mock Recipe Data
const mockRecipes = [
  { id: 1, title: 'Creamy Garlic Chicken', ingredients: ['chicken', 'garlic', 'cream', 'butter', 'onion'], time: '30 min', difficulty: 'Easy', image: 'https://picsum.photos/seed/chicken/600/400' },
  { id: 2, title: 'Garlic Butter Pasta', ingredients: ['pasta', 'garlic', 'butter', 'parmesan', 'parsley'], time: '15 min', difficulty: 'Easy', image: 'https://picsum.photos/seed/pasta/600/400' },
  { id: 3, title: 'Beef Stir Fry', ingredients: ['beef', 'soy sauce', 'ginger', 'garlic', 'broccoli', 'bell pepper'], time: '25 min', difficulty: 'Medium', image: 'https://picsum.photos/seed/beef/600/400' },
  { id: 4, title: 'Tomato Basil Soup', ingredients: ['tomato', 'basil', 'onion', 'garlic', 'cream', 'vegetable broth'], time: '40 min', difficulty: 'Easy', image: 'https://picsum.photos/seed/tomato/600/400' },
  { id: 5, title: 'Mushroom Risotto', ingredients: ['rice', 'mushroom', 'onion', 'garlic', 'white wine', 'parmesan'], time: '50 min', difficulty: 'Hard', image: 'https://picsum.photos/seed/mushroom/600/400' },
];

import { testDbConnection } from './db';

// Train recommender with mock data
recommender.train(mockRecipes);

async function startServer() {
  await testDbConnection();
  const app = express();
  const PORT = Number(process.env.PORT) || 3001;

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'CookMate API is running' });
  });

  // Router skeletons
  const apiRouter = express.Router();
  
  apiRouter.use('/auth', (req, res) => res.json({ message: 'Auth endpoint' }));
  apiRouter.use('/recipes', (req, res) => res.json({ message: 'Recipes endpoint' }));
  apiRouter.use('/ingredients', (req, res) => res.json({ message: 'Ingredients endpoint' }));
  apiRouter.use('/meal-planner', (req, res) => res.json({ message: 'Meal Planner endpoint' }));
  apiRouter.use('/shopping-list', (req, res) => res.json({ message: 'Shopping List endpoint' }));
  apiRouter.use('/notifications', (req, res) => res.json({ message: 'Notifications endpoint' }));
  apiRouter.use('/profile', (req, res) => res.json({ message: 'Profile endpoint' }));
  
  // ML Recommender Endpoint
  apiRouter.post('/ml/recommend/by-ingredients', (req, res) => {
    const { ingredients } = req.body;
    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({ error: 'Ingredients list is required' });
    }
    const recommendations = recommender.recommend(ingredients);
    res.json({ recommendations });
  });

  apiRouter.use('/ml/camera', (req, res) => res.json({ message: 'ML Camera endpoint' }));

  app.use('/api', apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CookMate server running at http://localhost:${PORT}`);
  });
}

startServer();
