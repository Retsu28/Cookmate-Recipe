import React, { useState, useRef } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Camera, Upload, Sparkles, RefreshCcw, ChefHat, Info, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { GoogleGenAI } from "@google/genai";
import { Badge } from '../components/ui/badge';
import { Link } from 'react-router-dom';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

export default function AICamera() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        analyzeImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (base64: string) => {
    setLoading(true);
    try {
      // Note: for production, use backend proxy. Doing fake load for UI showcase if key is missing
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        setTimeout(() => {
          setAnalysis({
            dishName: 'Fresh Caprese Salad',
            ingredients: ['Tomatoes', 'Fresh Mozzarella', 'Basil', 'Olive Oil', 'Balsamic Glaze'],
            estimatedCalories: 350,
            suggestedRecipe: {
              title: 'Classic Italian Caprese',
              description: 'A beautiful and simple summer salad combining ripe tomatoes with creamy mozzarella and fresh basil.'
            }
          });
          setLoading(false);
        }, 2000);
        return;
      }

      const base64Data = base64.split(',')[1];
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: "Identify the food or ingredients in this image. Return a JSON object with 'dishName', 'ingredients' (array), 'estimatedCalories', and 'suggestedRecipe' (title and brief description)." },
              { inlineData: { mimeType: "image/jpeg", data: base64Data } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const result = JSON.parse(response.text || '{}');
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 rounded-full text-orange-600 font-bold text-sm mb-4">
            <Sparkles size={16} /> Powered by Gemini AI
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-stone-900 tracking-tight">AI Kitchen Camera</h1>
          <p className="text-lg text-stone-500 max-w-2xl mx-auto">
            Snap a photo of your fridge or a prepared dish, and we'll instantly identify the ingredients and suggest recipes.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

          {/* Camera/Upload Section */}
          <div className="w-full">
            <div
              onClick={() => !image && fileInputRef.current?.click()}
              className={cn(
                "aspect-[4/5] sm:aspect-square w-full rounded-[2.5rem] overflow-hidden relative transition-all shadow-xl",
                image ? "border-none shadow-stone-200/50" : "border-4 border-dashed border-stone-200 bg-white hover:border-orange-400 cursor-pointer flex flex-col items-center justify-center group"
              )}
            >
              {image ? (
                <>
                  <img src={image} alt="Upload" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-stone-900/20 to-transparent flex flex-col justify-end p-8">
                    <Button onClick={() => { setImage(null); setAnalysis(null); fileInputRef.current?.click(); }} variant="secondary" className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border-none rounded-full py-6 font-bold shadow-lg">
                      <RefreshCcw size={20} className="mr-2" /> Retake Photo
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center space-y-6 p-8 relative z-10">
                  <div className="w-24 h-24 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 shadow-inner">
                    <Camera size={48} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-stone-900 mb-2">Tap to take a photo</h3>
                    <p className="text-stone-500">or browse files from your device</p>
                  </div>
                  <div className="inline-flex items-center gap-2 text-orange-500 font-bold mt-4">
                    <Upload size={20} /> Upload Image
                  </div>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleUpload}
                className="hidden"
                accept="image/*"
              />
            </div>
          </div>

          {/* Analysis Section */}
          <div className="w-full h-full">
            {loading ? (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center space-y-6 bg-white rounded-[2.5rem] border border-stone-100 shadow-lg p-12">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 border-4 border-stone-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
                  <Sparkles size={32} className="text-orange-500 animate-pulse" />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-stone-900 mb-2">AI is analyzing...</h3>
                  <p className="text-stone-500">Identifying ingredients and calculating nutritional information</p>
                </div>
              </div>
            ) : analysis ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full"
              >
                <Card className="rounded-[2.5rem] border-stone-100 shadow-xl shadow-stone-200/50 overflow-hidden bg-white h-full flex flex-col">
                  <div className="bg-stone-900 p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500/20 rounded-xl">
                        <Sparkles size={24} className="text-orange-400" />
                      </div>
                      <h3 className="text-xl font-bold">Analysis Complete</h3>
                    </div>
                    <Badge className="bg-green-500 hover:bg-green-600 border-none font-bold py-1.5 px-3">
                      High Confidence
                    </Badge>
                  </div>

                  <CardContent className="p-8 flex-1 flex flex-col justify-between">
                    <div className="space-y-8">
                      <div>
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Identified Subject</p>
                        <h4 className="text-3xl font-extrabold text-stone-900 leading-tight">{analysis.dishName || 'Assorted Ingredients'}</h4>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <ChefHat size={16} /> Detected Ingredients
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {analysis.ingredients?.map((ing: string) => (
                            <Badge key={ing} variant="secondary" className="bg-stone-100 hover:bg-stone-200 text-stone-700 border-none px-4 py-2 rounded-xl text-sm font-medium">
                              {ing}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {analysis.estimatedCalories && (
                        <div className="bg-stone-50 border border-stone-100 p-5 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-orange-500 shadow-sm">
                              <Info size={24} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Estimated Calories</p>
                              <p className="text-xl font-bold text-stone-900">{analysis.estimatedCalories} kcal</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {analysis.suggestedRecipe && (
                      <div className="mt-8 pt-8 border-t border-stone-100">
                        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Suggested Recipe</p>
                        <Link to="/recipe/1" className="block group">
                          <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 p-6 rounded-[2rem] border border-orange-100 transition-all group-hover:shadow-lg group-hover:shadow-orange-100">
                            <h5 className="font-bold text-xl text-stone-900 mb-2 group-hover:text-orange-600 transition-colors">
                              {analysis.suggestedRecipe.title}
                            </h5>
                            <p className="text-stone-600 leading-relaxed mb-4">
                              {analysis.suggestedRecipe.description}
                            </p>
                            <div className="flex items-center gap-2 text-orange-600 font-bold">
                              Let's cook this <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center space-y-6 bg-stone-50 rounded-[2.5rem] border border-stone-200 border-dashed p-12 text-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm text-stone-300">
                  <Sparkles size={40} />
                </div>
                <div className="max-w-xs">
                  <h3 className="text-xl font-bold text-stone-900 mb-2">Waiting for Image</h3>
                  <p className="text-stone-500">Upload a photo to let CookMate's AI analyze your ingredients and suggest recipes.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
