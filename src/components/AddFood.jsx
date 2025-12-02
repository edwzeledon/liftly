'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Loader2, Check, Upload } from 'lucide-react';
import { analyzeImageWithGemini, addLog, getDailyStats } from '@/lib/api';

const MAX_DAILY_SCANS = 5;

const formatBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Remove data URL prefix for API
      const base64 = reader.result.split(',')[1];
      const mimeType = reader.result.split(';')[0].split(':')[1];
      resolve({ base64, mimeType, fullData: reader.result });
    };
    reader.onerror = error => reject(error);
  });
};

export default function AddFood({ user, onSuccess, onCancel, initialScanCount = 0 }) {
  const [mode, setMode] = useState('scan'); // 'scan' or 'manual'
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({ foodItem: '', calories: '', protein: '', carbs: '', fats: '', mealType: 'snack' });
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  // Camera State
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanCount, setScanCount] = useState(initialScanCount);
  
  const fileInputRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  // Initialize scan count from prop
  useEffect(() => {
    setScanCount(initialScanCount);
    if (initialScanCount >= 3 && mode === 'scan') {
      setMode('manual');
    }
  }, [initialScanCount]);

  // Paste Handler
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          processFile(file);
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  const startCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error(err);
      setError("Camera access denied or unavailable. Please use upload.");
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Match canvas to video size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      stopCamera();
      setPreview(dataUrl);
      
      // Extract base64 and analyze
      const base64 = dataUrl.split(',')[1];
      performAnalysis(base64, 'image/jpeg');
    }
  };

  const performAnalysis = async (base64, mimeType) => {
    setAnalyzing(true);
    setForm(prev => ({ ...prev, foodItem: '', calories: '', protein: '', carbs: '', fats: '' }));
    
    try {
      // Call Server Action
      const json = await analyzeImageWithGemini(base64, mimeType);
      
      setForm(prev => ({ 
        ...prev,
        foodItem: json.foodItem, 
        calories: String(json.calories),
        protein: String(json.protein || 0),
        carbs: String(json.carbs || 0),
        fats: String(json.fats || 0)
      }));

      // Increment scan count locally after successful analysis
      setScanCount(prev => prev + 1);

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to analyze image. Please try again or enter manually.");
    } finally {
      setAnalyzing(false);
    }
  };

  const processFile = async (file) => {
    if (!file) return;
    setError('');
    setAnalyzing(true);
    setForm(prev => ({ ...prev, foodItem: '', calories: '', protein: '', carbs: '', fats: '' }));
    
    try {
      const { base64, mimeType, fullData } = await formatBase64(file);
      setPreview(fullData);
      performAnalysis(base64, mimeType);
    } catch (err) {
      console.error(err);
      setError("Failed to process image.");
      setAnalyzing(false);
    }
  };

  const handleFileChange = (e) => {
    processFile(e.target.files[0]);
  };

  // Drag Handlers
  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const onDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.foodItem || !form.calories) return;
    if (!user) return;

    try {
      await addLog(user.id, {
        foodItem: form.foodItem,
        calories: parseInt(form.calories),
        protein: parseInt(form.protein) || 0,
        carbs: parseInt(form.carbs) || 0,
        fats: parseInt(form.fats) || 0,
        mealType: form.mealType,
        method: mode === 'scan' ? 'ai-scan' : 'manual'
      });
      onSuccess();
    } catch (err) {
      console.error(err);
      setError("Failed to save entry.");
    }
  };

  // Determine Container Width
  const getContainerWidth = () => {
    if (isCameraActive) return 'max-w-5xl'; // Wide for camera
    if (preview && mode === 'scan') return 'max-w-4xl'; // Wide for split view
    return 'max-w-lg'; // Narrow for initial/manual
  };

  return (
    <div 
      className={`transition-all duration-500 ease-in-out mx-auto bg-white md:rounded-3xl shadow-xl border-0 md:border border-slate-100 overflow-hidden ${getContainerWidth()} w-full h-dvh md:h-auto m-0 md:my-auto fixed inset-0 z-50 md:relative md:inset-auto md:z-auto flex flex-col`}
      onDragOver={onDragOver} 
      onDragLeave={onDragLeave} 
      onDrop={onDrop}
    >
      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-indigo-500/10 backdrop-blur-sm border-4 border-indigo-500 border-dashed md:rounded-3xl flex items-center justify-center pointer-events-none">
           <p className="text-indigo-600 font-bold text-xl bg-white px-6 py-3 rounded-xl shadow-lg">Drop image here</p>
        </div>
      )}

      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
        <h2 className="text-2xl font-bold text-slate-800">Add Meal</h2>
        <button onClick={onCancel} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
          <X className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      <div className={`flex-1 overflow-y-auto md:overflow-visible flex flex-col ${preview && mode === 'scan' ? 'md:flex-row' : ''} transition-all duration-500`}>
        
        {/* Left Side (Camera/Image/Dropzone) */}
        <div className={`p-6 ${preview && mode === 'scan' ? 'md:w-1/2 border-b md:border-b-0 md:border-r border-slate-100' : 'w-full'} transition-all duration-500`}>
          
          {/* Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
            <button 
              onClick={() => { 
                if (!preview && scanCount < 3) {
                  setMode('scan'); 
                  stopCamera(); 
                  setPreview(null); 
                }
              }}
              disabled={scanCount >= 3}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'scan' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : scanCount >= 3
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {scanCount >= MAX_DAILY_SCANS ? `Scan Limit (${MAX_DAILY_SCANS}/${MAX_DAILY_SCANS})` : `AI Scan (${MAX_DAILY_SCANS - scanCount} left)`}
            </button>
            <button 
              onClick={() => { 
                if (!preview) {
                  setMode('manual'); 
                  stopCamera(); 
                  setPreview(null); 
                }
              }}
              disabled={!!preview}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'manual' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : preview 
                    ? 'text-slate-300 cursor-not-allowed' 
                    : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Manual Entry
            </button>
          </div>

          {/* Scan Mode UI */}
          {mode === 'scan' && (
            <div className="flex-1 flex flex-col relative">
              
              {/* Main Content Area: Camera, Preview, or Buttons */}
              <div className={`relative rounded-3xl overflow-hidden shadow-sm bg-slate-50 flex flex-col items-center justify-center border-2 border-dashed border-indigo-100 transition-all duration-500 ${isCameraActive ? 'min-h-[60vh] md:min-h-[500px]' : 'min-h-[40vh] md:min-h-[400px]'}`}>
                
                {/* 1. Camera View */}
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className={`absolute inset-0 w-full h-full object-cover ${isCameraActive && !preview ? 'block' : 'hidden'}`}
                />
                
                {/* 2. Captured/Uploaded Preview */}
                {preview && <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-cover z-10" />}
                
                {/* 3. Loading Overlay */}
                {analyzing && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-white">
                    <Loader2 className="w-10 h-10 animate-spin mb-3" />
                    <p className="font-medium">Analyzing with Gemini...</p>
                  </div>
                )}

                {/* 4. Initial Buttons (Visible if no camera active & no preview) */}
                {!isCameraActive && !preview && !analyzing && (
                  <div className="flex flex-col gap-4 w-full px-8 text-center">
                    <button 
                      onClick={startCamera}
                      disabled={scanCount >= 3}
                      className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-colors shadow-lg ${
                        scanCount >= 3 
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                      }`}
                    >
                      <Camera className="w-6 h-6" />
                      {scanCount >= MAX_DAILY_SCANS ? 'Daily Limit Reached' : `Use Camera (${MAX_DAILY_SCANS - scanCount} left)`}
                    </button>
                    <div className="relative flex py-1 items-center">
                      <div className="grow border-t border-indigo-200"></div>
                      <span className="shrink mx-4 text-indigo-300 text-xs uppercase font-bold">Or</span>
                      <div className="grow border-t border-indigo-200"></div>
                    </div>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={scanCount >= 3}
                      className={`w-full py-4 border rounded-2xl font-bold flex items-center justify-center gap-3 transition-colors ${
                        scanCount >= 3
                          ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                          : 'bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50'
                      }`}
                    >
                      <Upload className="w-6 h-6" />
                      Upload Image
                    </button>
                    <p className="text-xs text-slate-400 mt-2">
                        Drag & Drop or Paste (Ctrl+V)
                    </p>
                  </div>
                )}

                {/* 5. Shutter Button (Visible only when camera active) */}
                {isCameraActive && !preview && (
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">
                    <button 
                      onClick={captureImage}
                      className="w-16 h-16 bg-white rounded-full border-4 border-indigo-500 shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                    >
                      <div className="w-12 h-12 bg-indigo-600 rounded-full"></div>
                    </button>
                    <button 
                      onClick={stopCamera}
                      className="absolute right-6 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full backdrop-blur-md"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {/* 6. Close Preview Button */}
                {preview && !analyzing && (
                  <button 
                    onClick={() => { setPreview(null); setForm({foodItem: '', calories: '', protein: '', carbs: '', fats: '', mealType: 'snack'}); }} 
                    className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full backdrop-blur-md z-20 hover:bg-black/70 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <canvas ref={canvasRef} className="hidden" />
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </div>
          )}
        </div>

        {/* Right Side (Form) - Only visible if manual or preview exists */}
        { (mode === 'manual' || (mode === 'scan' && preview)) && (
          <div className={`p-6 ${preview && mode === 'scan' ? 'md:w-1/2' : 'w-full'} animate-in slide-in-from-right-4 duration-500`}>
            <form onSubmit={handleSubmit} className="space-y-4 h-full flex flex-col justify-center">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Meal Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm({...form, mealType: type})}
                      className={`py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                        form.mealType === type 
                          ? 'bg-indigo-600 text-white shadow-md' 
                          : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Food Name</label>
                <input 
                  type="text" 
                  value={form.foodItem}
                  onChange={e => setForm({...form, foodItem: e.target.value})}
                  placeholder="e.g., Grilled Chicken Salad"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Calories</label>
                <input 
                  type="number" 
                  value={form.calories}
                  onChange={e => setForm({...form, calories: e.target.value})}
                  placeholder="e.g., 450"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Protein (g)</label>
                  <input 
                    type="number" 
                    value={form.protein}
                    onChange={e => setForm({...form, protein: e.target.value})}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Carbs (g)</label>
                  <input 
                    type="number" 
                    value={form.carbs}
                    onChange={e => setForm({...form, carbs: e.target.value})}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Fats (g)</label>
                  <input 
                    type="number" 
                    value={form.fats}
                    onChange={e => setForm({...form, fats: e.target.value})}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 outline-none transition-all"
                  />
                </div>
              </div>
              
              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button 
                type="submit"
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200 mt-4 flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Save Entry
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
