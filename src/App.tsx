/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Book, 
  ChevronRight, 
  Sparkles, 
  Save, 
  Trash2, 
  ChevronLeft, 
  BookOpen, 
  PenTool,
  Loader2,
  X,
  Menu,
  Wand2,
  Download,
  Eye,
  Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { Novel, Chapter } from './types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default function App() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [isCreatingNovel, setIsCreatingNovel] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  const [newNovelData, setNewNovelData] = useState({ title: '', author: '', description: '' });
  const [chapterContent, setChapterContent] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');

  useEffect(() => {
    fetchNovels();
  }, []);

  const fetchNovels = async () => {
    try {
      const res = await fetch('/api/novels');
      if (!res.ok) throw new Error('Failed to fetch novels');
      const data = await res.json();
      setNovels(data);
    } catch (error) {
      console.error("Error fetching novels:", error);
    }
  };

  const fetchNovelDetails = async (id: number) => {
    try {
      const res = await fetch(`/api/novels/${id}`);
      if (!res.ok) throw new Error('Failed to fetch novel details');
      const data = await res.json();
      setSelectedNovel(data);
      if (data.chapters && data.chapters.length > 0) {
        handleSelectChapter(data.chapters[0]);
      } else {
        setSelectedChapter(null);
        setChapterContent('');
        setChapterTitle('');
      }
    } catch (error) {
      console.error("Error fetching novel details:", error);
    }
  };

  const handleCreateNovel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/novels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNovelData)
      });
      if (!res.ok) throw new Error('Failed to create novel');
      const data = await res.json();
      setIsCreatingNovel(false);
      setNewNovelData({ title: '', author: '', description: '' });
      fetchNovels();
      fetchNovelDetails(data.id);
    } catch (error) {
      console.error("Error creating novel:", error);
    }
  };

  const handleCreateChapter = async () => {
    if (!selectedNovel) return;
    try {
      const newIndex = (selectedNovel.chapters?.length || 0) + 1;
      const res = await fetch(`/api/novels/${selectedNovel.id}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `الفصل ${newIndex}`,
          content: '',
          order_index: newIndex
        })
      });
      if (!res.ok) throw new Error('Failed to create chapter');
      const data = await res.json();
      await fetchNovelDetails(selectedNovel.id);
      const newChapter = { id: data.id, novel_id: selectedNovel.id, title: `الفصل ${newIndex}`, content: '', order_index: newIndex, created_at: new Date().toISOString() };
      handleSelectChapter(newChapter);
    } catch (error) {
      console.error("Error creating chapter:", error);
    }
  };

  const handleSelectChapter = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setChapterContent(chapter.content || '');
    setChapterTitle(chapter.title);
  };

  const handleSaveChapter = async () => {
    if (!selectedChapter) return;
    await fetch(`/api/chapters/${selectedChapter.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: chapterTitle, content: chapterContent })
    });
    // Refresh novel details to update chapter list
    if (selectedNovel) {
      try {
        const res = await fetch(`/api/novels/${selectedNovel.id}`);
        if (res.ok) {
          const data = await res.json();
          setSelectedNovel(data);
        }
      } catch (error) {
        console.error("Error refreshing novel details:", error);
      }
    }
  };

  const handleDeleteNovel = async (id: number) => {
    console.log("Attempting to delete novel:", id);
    if (!window.confirm('هل أنت متأكد من حذف هذه الرواية بالكامل؟')) return;
    try {
      const res = await fetch(`/api/novels/${id}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      console.log("Delete novel response status:", res.status);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete novel');
      }
      setSelectedNovel(null);
      setSelectedChapter(null);
      fetchNovels();
    } catch (error: any) {
      console.error("Error deleting novel:", error);
      alert(`فشل حذف الرواية: ${error.message}`);
    }
  };

  const handleDeleteChapter = async (id: number) => {
    console.log("Attempting to delete chapter:", id);
    if (!window.confirm('هل أنت متأكد من حذف هذا الفصل؟')) return;
    try {
      const res = await fetch(`/api/chapters/${id}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      console.log("Delete chapter response status:", res.status);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete chapter');
      }
      
      if (selectedChapter?.id === id) {
        setSelectedChapter(null);
        setChapterContent('');
        setChapterTitle('');
      }
      
      if (selectedNovel) {
        fetchNovelDetails(selectedNovel.id);
      }
    } catch (error: any) {
      console.error("Error deleting chapter:", error);
      alert(`فشل حذف الفصل: ${error.message}`);
    }
  };

  const handleDownloadNovel = () => {
    if (!selectedNovel) return;
    
    const sortedChapters = [...(selectedNovel.chapters || [])].sort((a, b) => a.order_index - b.order_index);
    
    let htmlContent = `
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; padding: 50px; }
          h1 { text-align: center; color: #065f46; font-size: 32pt; }
          .author { text-align: center; font-size: 18pt; margin-bottom: 50px; color: #666; }
          .description { margin-bottom: 50px; font-style: italic; border-bottom: 1px solid #eee; padding-bottom: 20px; }
          h2 { color: #065f46; border-bottom: 1px solid #065f46; padding-bottom: 10px; margin-top: 50px; page-break-before: always; }
          .content { white-space: pre-wrap; font-size: 14pt; }
        </style>
      </head>
      <body>
        <h1>${selectedNovel.title}</h1>
        <div class="author">بواسطة: ${selectedNovel.author || 'كاتب مجهول'}</div>
        <div class="description">${selectedNovel.description || ''}</div>
        
        ${sortedChapters.map(chapter => `
          <div class="chapter">
            <h2>${chapter.title}</h2>
            <div class="content">${chapter.content}</div>
          </div>
        `).join('')}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedNovel.title}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateAIContent = async () => {
    if (!selectedNovel || !selectedChapter) return;
    
    const wordCount = chapterContent.trim().split(/\s+/).filter(word => word.length > 0).length;
    if (wordCount < 3) {
      alert("يرجى كتابة 3 كلمات على الأقل لكي يتمكن الذكاء الاصطناعي من فهم فكرتك وتوليد فصل كامل.");
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = `أنت كاتب روايات محترف ومبدع. 
      عنوان الرواية: ${selectedNovel.title}
      وصف الرواية: ${selectedNovel.description}
      عنوان الفصل الحالي: ${chapterTitle}
      
      الفكرة أو البداية التي قدمها المستخدم:
      ${chapterContent}
      
      المهمة: بناءً على الفكرة أعلاه، اكتب فصلاً كاملاً ومفصلاً بأسلوب أدبي رفيع. 
      يجب أن يكون الفصل غنياً بالوصف والحوارات وتطور الأحداث.
      استخدم تنسيق Markdown (مثل استخدام **للخط العريض** أو *للخط المائل* عند الحاجة للتأكيد الدرامي).
      اكتب باللغة العربية الفصحى.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const generatedText = response.text || '';
      setChapterContent(generatedText);
    } catch (error) {
      console.error("AI Generation failed:", error);
      alert("فشل توليد المحتوى بالذكاء الاصطناعي. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans selection:bg-emerald-100" dir="rtl">
      {/* Header */}
      <header className="h-16 border-b border-black/5 flex items-center justify-between px-6 sticky top-0 bg-white/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <BookOpen size={22} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-emerald-900">روايتي <span className="text-emerald-500 font-light">AI</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
          {selectedNovel && (
            <button 
              onClick={() => setSelectedNovel(null)}
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              العودة للمكتبة
            </button>
          )}
          <button 
            onClick={() => setIsCreatingNovel(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-emerald-100"
          >
            <Plus size={18} />
            رواية جديدة
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {!selectedNovel ? (
            <motion.div 
              key="library"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {novels.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
                  <Book size={64} strokeWidth={1} className="mb-4 opacity-20" />
                  <p className="text-lg">لا توجد روايات بعد. ابدأ بكتابة قصتك الأولى!</p>
                </div>
              ) : (
                novels.map((novel) => (
                  <motion.div 
                    key={novel.id}
                    whileHover={{ y: -4 }}
                    className="group bg-white border border-black/5 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer relative overflow-hidden"
                    onClick={() => fetchNovelDetails(novel.id)}
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500 opacity-50" />
                    
                    <div className="relative">
                      <h3 className="text-xl font-bold mb-2 group-hover:text-emerald-700 transition-colors">{novel.title}</h3>
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2">{novel.description || 'لا يوجد وصف...'}</p>
                      
                      <div className="flex items-center justify-between mt-6">
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                          بواسطة: {novel.author || 'كاتب مجهول'}
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNovel(novel.id);
                          }}
                          className="p-2 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 relative z-20"
                          title="حذف الرواية"
                        >
                          <Trash2 size={16} className="pointer-events-none" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-160px)]"
            >
              {/* Sidebar - Chapters */}
              <div className={`lg:w-72 bg-white border border-black/5 rounded-2xl flex flex-col overflow-hidden transition-all ${sidebarOpen ? 'w-full' : 'w-0 lg:w-0 overflow-hidden'}`}>
                <div className="p-4 border-b border-black/5 flex items-center justify-between bg-gray-50/50">
                  <h2 className="font-bold text-gray-700">الفصول</h2>
                  <button 
                    onClick={handleCreateChapter}
                    className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {selectedNovel.chapters?.map((chapter) => (
                    <div key={chapter.id} className="group/item relative">
                      <button
                        onClick={() => handleSelectChapter(chapter)}
                        className={`w-full text-right px-4 py-3 rounded-xl text-sm transition-all flex items-center justify-between group ${
                          selectedChapter?.id === chapter.id 
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' 
                            : 'hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        <span className="truncate pr-2">{chapter.title}</span>
                        <ChevronLeft size={14} className={selectedChapter?.id === chapter.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChapter(chapter.id);
                        }}
                        className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all z-20 ${
                          selectedChapter?.id === chapter.id 
                            ? 'text-emerald-200 hover:text-white hover:bg-emerald-500' 
                            : 'text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/item:opacity-100'
                        }`}
                        title="حذف الفصل"
                      >
                        <Trash2 size={14} className="pointer-events-none" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Editor Area */}
              <div className="flex-1 flex flex-col bg-white border border-black/5 rounded-2xl shadow-sm overflow-hidden relative">
                {selectedChapter ? (
                  <>
                    <div className="p-4 border-b border-black/5 flex items-center justify-between bg-white sticky top-0 z-10">
                      <div className="flex items-center gap-4 flex-1">
                        <button 
                          onClick={() => setSidebarOpen(!sidebarOpen)}
                          className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
                        >
                          <Menu size={20} />
                        </button>
                        <input 
                          type="text" 
                          value={chapterTitle}
                          onChange={(e) => setChapterTitle(e.target.value)}
                          className="text-lg font-bold bg-transparent border-none focus:ring-0 w-full placeholder:text-gray-300"
                          placeholder="عنوان الفصل..."
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setIsPreviewMode(!isPreviewMode)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 ${
                            isPreviewMode ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          title={isPreviewMode ? "العودة للتعديل" : "معاينة التنسيق"}
                        >
                          {isPreviewMode ? <Edit3 size={18} /> : <Eye size={18} />}
                          <span className="hidden sm:inline">{isPreviewMode ? "تعديل" : "معاينة"}</span>
                        </button>
                        <button 
                          onClick={handleDownloadNovel}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-all active:scale-95"
                          title="تحميل الرواية"
                        >
                          <Download size={18} />
                          <span className="hidden sm:inline">تحميل</span>
                        </button>
                        <button 
                          onClick={generateAIContent}
                          disabled={isGenerating}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-indigo-200 transition-all disabled:opacity-50 active:scale-95"
                        >
                          {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                          <span className="hidden sm:inline">أكمل بالذكاء الاصطناعي</span>
                        </button>
                        <button 
                          onClick={handleSaveChapter}
                          className="flex items-center gap-2 px-4 py-2 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-all active:scale-95"
                        >
                          <Save size={18} />
                          <span className="hidden sm:inline">حفظ</span>
                        </button>
                        <button 
                          onClick={() => handleDeleteNovel(selectedNovel.id)}
                          className="flex items-center gap-2 px-4 py-2 border border-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-all active:scale-95"
                          title="حذف الرواية بالكامل"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 relative overflow-hidden flex flex-col">
                      {isPreviewMode ? (
                        <div className="flex-1 overflow-y-auto p-8 prose prose-emerald max-w-none prose-lg">
                          <ReactMarkdown>{chapterContent || '*لا يوجد محتوى بعد...*'}</ReactMarkdown>
                        </div>
                      ) : (
                        <textarea 
                          value={chapterContent}
                          onChange={(e) => setChapterContent(e.target.value)}
                          className="w-full h-full p-8 resize-none focus:ring-0 border-none text-lg leading-relaxed text-gray-700 placeholder:text-gray-200"
                          placeholder="ابدأ بكتابة فصلك هنا... يمكنك استخدام تنسيق Markdown."
                        />
                      )}
                      
                      {isGenerating && (
                        <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center z-20">
                          <div className="bg-white p-6 rounded-2xl shadow-2xl border border-black/5 flex flex-col items-center gap-4">
                            <div className="relative">
                              <Loader2 size={40} className="text-indigo-600 animate-spin" />
                              <Sparkles size={20} className="text-violet-400 absolute -top-1 -right-1 animate-pulse" />
                            </div>
                            <p className="font-medium text-indigo-900">جاري توليد المحتوى الإبداعي...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-12 text-center">
                    <PenTool size={64} strokeWidth={1} className="mb-4 opacity-20" />
                    <h3 className="text-xl font-bold text-gray-600 mb-2">اختر فصلاً للبدء</h3>
                    <p className="max-w-xs">يمكنك اختيار فصل من القائمة الجانبية أو إنشاء فصل جديد للبدء في كتابة روايتك.</p>
                    <button 
                      onClick={handleCreateChapter}
                      className="mt-6 flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                    >
                      <Plus size={20} />
                      إنشاء أول فصل
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Create Novel Modal */}
      <AnimatePresence>
        {isCreatingNovel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreatingNovel(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-black/5 flex items-center justify-between bg-gray-50">
                <h2 className="text-xl font-bold text-gray-800">رواية جديدة</h2>
                <button onClick={() => setIsCreatingNovel(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleCreateNovel} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">عنوان الرواية</label>
                  <input 
                    required
                    type="text" 
                    value={newNovelData.title}
                    onChange={(e) => setNewNovelData({...newNovelData, title: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none"
                    placeholder="مثلاً: رحلة في أعماق النجوم"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">اسم الكاتب</label>
                  <input 
                    type="text" 
                    value={newNovelData.author}
                    onChange={(e) => setNewNovelData({...newNovelData, author: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none"
                    placeholder="اسمك أو اسم مستعار"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">وصف قصير</label>
                  <textarea 
                    value={newNovelData.description}
                    onChange={(e) => setNewNovelData({...newNovelData, description: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none h-24 resize-none"
                    placeholder="عن ماذا تدور الرواية؟"
                  />
                </div>
                
                <button 
                  type="submit"
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all active:scale-[0.98] mt-4"
                >
                  ابدأ الكتابة الآن
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating AI Helper (Optional) */}
      {selectedNovel && selectedChapter && !isGenerating && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={generateAIContent}
          className="fixed bottom-8 left-8 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-indigo-200 z-40 group"
        >
          <Wand2 size={24} />
          <span className="absolute right-full mr-4 bg-indigo-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            اطلب مساعدة ذكية
          </span>
        </motion.button>
      )}
    </div>
  );
}
