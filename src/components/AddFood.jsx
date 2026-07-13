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
  const [capturedImage, setCapturedImage] = useState(null); // Holds image before confirmation
  const [form, setForm] = useState({ foodItem: '', calories: '', protein: '', carbs: '', fats: '', mealType: 'snack' });
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Camera State
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanCount, setScanCount] = useState(initialScanCount);
  
  const fileInputRef = useRef(null);
  const isCameraFullscreen = (isCameraActive || capturedImage) && !preview;

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  // Initialize scan count from prop
  useEffect(() => {
    setScanCount(initialScanCount);
    if (initialScanCount >= MAX_DAILY_SCANS && mode === 'scan') {
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

  const attachStreamToVideo = async (stream) => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;

    try {
      await video.play();
    } catch (playError) {
      console.warn('Video play() failed after stream attach:', playError);
    }

    setIsCameraActive(true);
  };

  const startCamera = async () => {
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API is not available in this browser.');
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
      } catch (preferredError) {
        console.warn('Environment-facing camera unavailable, falling back to default camera.', preferredError);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      await attachStreamToVideo(stream);
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
      
      // Store for confirmation instead of analyzing immediately
      setCapturedImage({ dataUrl, base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
    }
  };

  const confirmImage = () => {
    if (capturedImage) {
      setPreview(capturedImage.dataUrl);
      performAnalysis(capturedImage.base64, capturedImage.mimeType);
      setCapturedImage(null);
    }
  };

  const retakeImage = async () => {
    setError('');
    // Start camera first while still showing the image
    await startCamera();
    // Then clear the captured image to reveal the camera feed
    setCapturedImage(null);
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
    
    try {
      const { base64, mimeType, fullData } = await formatBase64(file);
      // Store for confirmation instead of analyzing immediately
      setCapturedImage({ dataUrl: fullData, base64, mimeType });
    } catch (err) {
      console.error(err);
      setError("Failed to process image.");
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

    setIsSaving(true);
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
      setIsSaving(false);
    }
  };

  // Determine Container Width
  const getContainerWidth = () => {
    if (isCameraFullscreen) return 'max-w-none';
    if (isCameraActive) return 'max-w-5xl'; // Wide for camera
    if (preview && mode === 'scan') return 'max-w-4xl'; // Wide for split view
    return 'max-w-lg'; // Narrow for initial/manual
  };

  const getRootClasses = () => {
    const baseClasses = 'transition-all duration-500 ease-in-out mx-auto bg-card overflow-hidden w-full flex flex-col';

    if (isCameraFullscreen) {
      return `${baseClasses} fixed inset-0 z-50 h-dvh max-w-none rounded-none border-0 md:border-0 md:my-0 md:h-dvh`;
    }

    return `${baseClasses} md:rounded-2xl border-0 md:border border-border ${getContainerWidth()} h-dvh md:h-auto m-0 md:my-auto fixed inset-0 z-50 md:relative md:inset-auto md:z-auto`;
  };

  const isFullScreenMode = isCameraFullscreen;

  return (
    <div 
      className={getRootClasses()}
      onDragOver={onDragOver} 
      onDragLeave={onDragLeave} 
      onDrop={onDrop}
    >
      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-training/10 backdrop-blur-sm border-4 border-training-text border-dashed md:rounded-2xl flex items-center justify-center pointer-events-none">
           <p className="text-training-text font-bold text-xl bg-card px-6 py-3 rounded-xl">Drop image here</p>
        </div>
      )}

      {!isFullScreenMode && (
        <div className="p-6 border-b border-border flex justify-between items-center bg-card z-10">
          <h2 className="text-2xl font-bold text-foreground">Add Meal</h2>
          <button onClick={() => { stopCamera(); onCancel(); }} className="p-2 bg-muted rounded-full hover:bg-muted/80 transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      )}

      <div className={`flex-1 overflow-y-auto md:overflow-visible flex flex-col ${preview && mode === 'scan' ? 'md:flex-row' : ''} transition-all duration-500`}>

        {/* Left Side (Camera/Image/Dropzone) */}
        <div className={`${isFullScreenMode ? 'p-0 h-full min-h-0' : 'p-6'} ${preview && mode === 'scan' ? 'md:w-1/2 border-b md:border-b-0 md:border-r border-border' : 'w-full'} transition-all duration-500`}>

          {/* Tabs */}
          {!isFullScreenMode && (
            <div className="flex p-1 bg-muted rounded-xl mb-6">
              <button 
                onClick={() => { 
                  if (!preview && scanCount < MAX_DAILY_SCANS) {
                    setMode('scan'); 
                    stopCamera(); 
                    setPreview(null); 
                  }
                }}
                disabled={scanCount >= MAX_DAILY_SCANS}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'scan'
                    ? 'bg-card text-training-text '
                    : scanCount >= MAX_DAILY_SCANS
                      ? 'text-faint cursor-not-allowed'
                      : 'text-muted-foreground hover:text-foreground'
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
                    ? 'bg-card text-training-text '
                    : preview
                      ? 'text-faint cursor-not-allowed'
                      : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Manual Entry
              </button>
            </div>
          )}

          {/* Scan Mode UI */}
          {mode === 'scan' && (
            <div className={`flex-1 flex flex-col relative ${isFullScreenMode ? 'h-full min-h-0' : ''}`}>
              
              {/* Main Content Area: Camera, Preview, or Buttons */}
              <div className={`relative overflow-hidden bg-muted flex flex-col items-center justify-center transition-all duration-500
                ${isFullScreenMode
                  ? 'absolute inset-0 w-full h-full rounded-none border-0 min-h-0'
                  : 'rounded-2xl border-2 border-dashed border-training-soft-border min-h-[40vh] md:min-h-[400px]'
                }`}>
                
                {/* 1. Camera View */}
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  className={`absolute inset-0 w-full h-full object-cover ${isCameraActive && !preview && !capturedImage ? 'block' : 'hidden'}`}
                />
                
                {/* 2. Captured/Uploaded Preview */}
                {preview && <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-cover z-10" />}
                {capturedImage && <img src={capturedImage.dataUrl} alt="Captured" className="absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-300" />}
                
                {/* 3. Loading Overlay */}
                {analyzing && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-white">
                    <Loader2 className="w-10 h-10 animate-spin mb-3" />
                    <p className="font-medium">Analyzing with Gemini...</p>
                  </div>
                )}

                {/* Close Button for Full Screen Mode */}
                {isFullScreenMode && (
                  <button 
                    onClick={() => { stopCamera(); setCapturedImage(null); }} 
                    className="absolute top-6 right-6 p-3 bg-black/40 text-white rounded-full backdrop-blur-md z-30 hover:bg-black/60 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                )}

                {/* 4. Initial Buttons (Visible if no camera active & no preview & no captured image) */}
                {!isCameraActive && !preview && !capturedImage && !analyzing && (
                  <div className="flex flex-col gap-4 w-full px-8 text-center">
                    <button 
                      onClick={startCamera}
                      disabled={scanCount >= MAX_DAILY_SCANS}
                      className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-colors ${
                        scanCount >= MAX_DAILY_SCANS
                          ? 'bg-muted text-faint cursor-not-allowed '
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 '
                      }`}
                    >
                      <Camera className="w-6 h-6" />
                      {scanCount >= MAX_DAILY_SCANS ? 'Daily Limit Reached' : `Use Camera (${MAX_DAILY_SCANS - scanCount} left)`}
                    </button>
                    <div className="relative flex py-1 items-center">
                      <div className="grow border-t border-training-soft-border"></div>
                      <span className="shrink mx-4 text-training-text/50 text-xs uppercase font-bold">Or</span>
                      <div className="grow border-t border-training-soft-border"></div>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={scanCount >= MAX_DAILY_SCANS}
                      className={`w-full py-4 border rounded-2xl font-bold flex items-center justify-center gap-3 transition-colors ${
                        scanCount >= MAX_DAILY_SCANS
                          ? 'bg-muted text-faint border-border cursor-not-allowed'
                          : 'bg-card text-training-text border-training-soft-border hover:bg-training-soft'
                      }`}
                    >
                      <Upload className="w-6 h-6" />
                      Upload Image
                    </button>
                    <p className="text-xs text-faint mt-2">
                        Drag & Drop or Paste (Ctrl+V)
                    </p>
                  </div>
                )}

                {/* 5. Shutter Button (Visible only when camera active) */}
                {isCameraActive && !preview && (
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">
                    <button 
                      onClick={captureImage}
                      className="w-16 h-16 bg-card rounded-full border-4 border-training-text flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                    >
                      <div className="w-12 h-12 bg-indigo-600 rounded-full"></div>
                    </button>
                  </div>
                )}

                {/* 6. Confirmation Buttons */}
                {capturedImage && !analyzing && (
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 z-20 px-6">
                    <button
                      onClick={retakeImage}
                      className="flex-1 max-w-xs py-3 bg-card/90 backdrop-blur-md text-foreground font-bold rounded-xl hover:bg-card transition-all flex items-center justify-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      Retake
                    </button>
                    <button 
                      onClick={confirmImage}
                      className="flex-1 max-w-xs py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      Analyze
                    </button>
                  </div>
                )}

                {/* 7. Close Preview Button */}
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
                <label className="block text-sm font-medium text-foreground mb-2">Meal Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm({...form, mealType: type})}
                      className={`py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                        form.mealType === type
                          ? 'bg-indigo-600 text-white '
                          : 'bg-muted text-faint hover:bg-muted/80'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Food Name</label>
                <input
                  type="text"
                  value={form.foodItem}
                  onChange={e => setForm({...form, foodItem: e.target.value})}
                  placeholder="e.g., Grilled Chicken Salad"
                  className="w-full px-4 py-3 rounded-xl border border-border focus:border-ring focus:ring-2 focus:ring-ring transition-all outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Calories</label>
                <input
                  type="number"
                  value={form.calories}
                  onChange={e => setForm({...form, calories: e.target.value})}
                  placeholder="e.g., 450"
                  className="w-full px-4 py-3 rounded-xl border border-border focus:border-ring focus:ring-2 focus:ring-ring transition-all outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Protein (g)</label>
                  <input
                    type="number"
                    value={form.protein}
                    onChange={e => setForm({...form, protein: e.target.value})}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-border focus:border-deficit focus:ring-2 focus:ring-ring outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Carbs (g)</label>
                  <input
                    type="number"
                    value={form.carbs}
                    onChange={e => setForm({...form, carbs: e.target.value})}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-border focus:border-carb focus:ring-2 focus:ring-ring outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Fats (g)</label>
                  <input
                    type="number"
                    value={form.fats}
                    onChange={e => setForm({...form, fats: e.target.value})}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-border focus:border-fat focus:ring-2 focus:ring-ring outline-none transition-all"
                  />
                </div>
              </div>

              {error && <p className="text-destructive-text text-sm">{error}</p>}

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all mt-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                {isSaving ? 'Saving...' : 'Save Entry'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
