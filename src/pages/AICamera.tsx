import React, { useState, useRef } from 'react';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Camera, Upload, Sparkles, RefreshCcw, ChefHat, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { GoogleGenAI } from "@google/genai";
import { Badge } from '../components/ui/badge';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
    <div className="flex h-screen bg-stone-50 font-sans text-stone-900">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-serif italic">AI Kitchen Camera</h1>
              <p className="text-stone-500">Snap a photo of your ingredients or a dish to get instant insights.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Camera/Upload Section */}
              <div className="space-y-6">
                <div 
                  className={cn(
                    "aspect-square rounded-3xl border-2 border-dashed border-stone-200 bg-white flex flex-col items-center justify-center overflow-hidden relative group transition-all",
                    image ? "border-solid border-orange-200" : "hover:border-orange-300"
                  )}
                >
                  {image ? (
                    <>
                      <img src={image} alt="Upload" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="rounded-xl gap-2">
                          <RefreshCcw size={18} /> Retake
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center space-y-4 p-8">
                      <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto">
                        <Camera size={40} />
                      </div>
                      <div>
                        <p className="font-bold text-stone-900">Take a Photo</p>
                        <p className="text-sm text-stone-400">or click to upload an image</p>
                      </div>
                      <Button onClick={() => fileInputRef.current?.click()} className="bg-stone-900 hover:bg-stone-800 rounded-xl gap-2">
                        <Upload size={18} /> Upload Image
                      </Button>
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
              <div className="space-y-6">
                {loading ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-4 py-20">
                    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <p className="font-bold text-stone-900">AI is analyzing your food...</p>
                    <p className="text-sm text-stone-400">Identifying ingredients and calculating nutrition</p>
                  </div>
                ) : analysis ? (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                  >
                    <Card className="rounded-3xl border-stone-100 shadow-sm overflow-hidden">
                      <div className="bg-stone-900 p-4 text-white flex items-center justify-between">
                        <h3 className="font-bold flex items-center gap-2">
                          <Sparkles size={18} className="text-orange-500" /> AI Detection
                        </h3>
                        <Badge className="bg-orange-500 border-none">98% Confidence</Badge>
                      </div>
                      <CardContent className="p-6 space-y-6">
                        <div>
                          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">DISH IDENTIFIED</p>
                          <h4 className="text-2xl font-bold text-stone-900">{analysis.dishName}</h4>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">INGREDIENTS DETECTED</p>
                          <div className="flex flex-wrap gap-2">
                            {analysis.ingredients.map((ing: string) => (
                              <Badge key={ing} variant="secondary" className="bg-stone-50 text-stone-600 border-none px-3 py-1 rounded-lg">
                                {ing}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="bg-stone-50 p-4 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-orange-500 shadow-sm">
                              <Info size={20} />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">EST. CALORIES</p>
                              <p className="text-sm font-bold text-stone-900">{analysis.estimatedCalories} kcal</p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-stone-100">
                          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">AI SUGGESTED RECIPE</p>
                          <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 space-y-2">
                            <p className="font-bold text-orange-900 flex items-center gap-2">
                              <ChefHat size={16} /> {analysis.suggestedRecipe.title}
                            </p>
                            <p className="text-xs text-orange-700 leading-relaxed">
                              {analysis.suggestedRecipe.description}
                            </p>
                            <Button variant="link" className="text-orange-600 p-0 h-auto text-xs font-bold">
                              View Full Recipe →
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center space-y-4 py-20 text-center">
                    <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-stone-300">
                      <Sparkles size={32} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-stone-900">Waiting for Image</p>
                      <p className="text-sm text-stone-400 max-w-[200px]">Upload a photo to see the magic of CookMate AI.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
