import natural from 'natural';

const TfIdf = natural.TfIdf;

export class RecipeRecommender {
  private tfidf: any;
  private recipes: any[] = [];

  constructor() {
    this.tfidf = new TfIdf();
  }

  // Train the model with recipe data
  train(recipes: any[]) {
    this.recipes = recipes;
    this.tfidf = new TfIdf();
    
    recipes.forEach((recipe, index) => {
      // Combine ingredients into a single string for vectorization
      const ingredientString = recipe.ingredients.join(' ');
      this.tfidf.addDocument(ingredientString);
    });
  }

  // Recommend recipes based on input ingredients
  recommend(inputIngredients: string[], topN: number = 5) {
    const query = inputIngredients.join(' ');
    const results: any[] = [];

    this.tfidf.tfidfs(query, (i: number, measure: number) => {
      if (measure > 0) {
        results.push({
          recipe: this.recipes[i],
          score: measure,
          matchPercentage: Math.min(Math.round(measure * 100), 100)
        });
      }
    });

    // Sort by score descending
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }
}

export const recommender = new RecipeRecommender();
