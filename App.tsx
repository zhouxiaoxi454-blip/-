import React, { useState, useEffect, useRef } from 'react';
import { Book, Mic, MessageCircle, ArrowRight, Play, RotateCcw, Sparkles, Settings, Search, Volume2, ChevronRight, X, BookOpen, Zap } from 'lucide-react';
import { AppView, Language, DictionaryEntry, ChatMessage, StoryResult } from './types';
import { LANGUAGES } from './constants';
import * as GeminiService from './services/geminiService';

// --- Helper Components ---

const AudioButton = ({ text }: { text: string }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = async () => {
    if (isPlaying) return;
    
    try {
      setIsLoading(true);
      
      // If we already have the audio src, just play it
      if (audioRef.current) {
        audioRef.current.play();
        setIsPlaying(true);
        setIsLoading(false);
        return;
      }

      // Fetch from Gemini
      const audioSrc = await GeminiService.generateAudio(text);
      if (audioSrc) {
        const audio = new Audio(audioSrc);
        audio.onended = () => setIsPlaying(false);
        audioRef.current = audio;
        audio.play();
        setIsPlaying(true);
      }
    } catch (e) {
      console.error("Playback failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={(e) => { e.stopPropagation(); playAudio(); }}
      disabled={isLoading || isPlaying}
      className={`p-2 rounded-full transition-colors ${isPlaying ? 'bg-green-100 text-green-600' : 'bg-gray-100 hover:bg-pop-blue hover:text-white text-gray-600'}`}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <Volume2 size={18} />
      )}
    </button>
  );
};

// --- Main App ---

export default function App() {
  // State
  const [view, setView] = useState<AppView>(AppView.SETUP);
  const [sourceLang, setSourceLang] = useState<Language>(LANGUAGES[0]);
  const [targetLang, setTargetLang] = useState<Language>(LANGUAGES[1]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<DictionaryEntry | null>(null);
  const [notebook, setNotebook] = useState<DictionaryEntry[]>([]);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  // Story State
  const [storyResult, setStoryResult] = useState<StoryResult | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);

  // Load Notebook from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('lingopop-notebook');
    if (saved) setNotebook(JSON.parse(saved));
  }, []);

  // Save Notebook
  useEffect(() => {
    localStorage.setItem('lingopop-notebook', JSON.stringify(notebook));
  }, [notebook]);

  const handleSearch = async (term: string) => {
    if (!term.trim()) return;
    setIsSearching(true);
    setView(AppView.RESULT);
    setChatMessages([]); // Reset chat for new word

    try {
      // Parallel fetch: Data + Image
      const [data, image] = await Promise.all([
        GeminiService.lookupTerm(term, sourceLang, targetLang),
        GeminiService.generateVisualization(term, targetLang.name)
      ]);

      const newEntry: DictionaryEntry = {
        id: Date.now().toString(),
        term: term,
        definition: data.definition || "Definition unavailable",
        examples: data.examples || [],
        explanation: data.explanation || "No explanation available.",
        imageUrl: image,
        sourceLang,
        targetLang,
        timestamp: Date.now()
      };

      setCurrentEntry(newEntry);
    } catch (error) {
      alert("Oops! Couldn't find that word. Try again.");
      setView(AppView.HOME);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveToNotebook = () => {
    if (currentEntry && !notebook.find(n => n.term === currentEntry.term)) {
      setNotebook(prev => [currentEntry, ...prev]);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || !currentEntry) return;
    
    const userMsg: ChatMessage = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatting(true);

    const response = await GeminiService.chatWithBuddy(chatMessages, chatInput, currentEntry.term);
    
    if (response) {
      setChatMessages(prev => [...prev, { role: 'model', text: response }]);
    }
    setIsChatting(false);
  };

  const handleGenerateStory = async () => {
    if (notebook.length < 3) {
      alert("Save at least 3 words to generate a story!");
      return;
    }
    setIsGeneratingStory(true);
    setView(AppView.STORY);
    try {
      // Pick last 5 words or random 5
      const wordsToUse = notebook.slice(0, 5).map(n => n.term);
      const result = await GeminiService.generateStory(wordsToUse, sourceLang.name, targetLang.name);
      setStoryResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingStory(false);
    }
  };

  // --- Views ---

  const SetupView = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-pop-yellow to-pop-orange text-white">
      <div className="bg-white text-pop-dark p-8 rounded-3xl shadow-2xl w-full max-w-md text-center">
        <h1 className="text-4xl font-bold mb-2 text-pop-purple">LingoPop</h1>
        <p className="text-gray-500 mb-8">Your engaging AI language buddy.</p>
        
        <div className="space-y-6">
          <div>
            <label className="block text-left text-sm font-semibold mb-2 text-gray-600">I speak (Mother Tongue)</label>
            <select 
              className="w-full p-4 bg-gray-50 rounded-xl border-2 border-gray-100 focus:border-pop-blue outline-none text-lg"
              value={sourceLang.code}
              onChange={(e) => setSourceLang(LANGUAGES.find(l => l.code === e.target.value) || LANGUAGES[0])}
            >
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
            </select>
          </div>

          <div className="flex justify-center">
             <ArrowRight className="text-gray-300 rotate-90" />
          </div>

          <div>
            <label className="block text-left text-sm font-semibold mb-2 text-gray-600">I want to learn</label>
            <select 
              className="w-full p-4 bg-gray-50 rounded-xl border-2 border-gray-100 focus:border-pop-blue outline-none text-lg"
              value={targetLang.code}
              onChange={(e) => setTargetLang(LANGUAGES.find(l => l.code === e.target.value) || LANGUAGES[1])}
            >
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
            </select>
          </div>

          <button 
            onClick={() => setView(AppView.HOME)}
            className="w-full bg-pop-blue text-white font-bold py-4 rounded-xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-200 text-xl"
          >
            Let's Go!
          </button>
        </div>
      </div>
    </div>
  );

  const ResultView = () => {
    if (isSearching) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white">
          <div className="animate-bounce text-4xl mb-4">🤔</div>
          <p className="text-xl font-semibold text-gray-600">Thinking...</p>
        </div>
      );
    }

    if (!currentEntry) return null;

    const isSaved = notebook.some(n => n.term === currentEntry.term);

    return (
      <div className="pb-24">
        {/* Header Image */}
        <div className="relative w-full h-64 bg-gray-100 overflow-hidden">
          {currentEntry.imageUrl ? (
            <img src={currentEntry.imageUrl} alt={currentEntry.term} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <span className="text-4xl">🎨</span>
            </div>
          )}
          <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-white to-transparent"></div>
        </div>

        <div className="px-6 -mt-12 relative z-10">
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-6 border border-gray-100">
            <div className="flex justify-between items-start mb-2">
              <h1 className="text-4xl font-black text-pop-dark tracking-tight">{currentEntry.term}</h1>
              <button 
                onClick={handleSaveToNotebook}
                className={`p-2 rounded-full ${isSaved ? 'bg-pop-yellow text-white' : 'bg-gray-100 text-gray-400'}`}
              >
                <Book size={24} fill={isSaved ? "currentColor" : "none"} />
              </button>
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <AudioButton text={currentEntry.term} />
              <span className="text-lg text-pop-purple font-medium">{currentEntry.definition}</span>
            </div>

            {/* Fun Explanation */}
            <div className="bg-blue-50 p-4 rounded-2xl mb-6">
              <div className="flex items-center gap-2 mb-2 text-pop-blue font-bold text-sm uppercase tracking-wide">
                <Sparkles size={16} />
                <span>The Vibe</span>
              </div>
              <p className="text-gray-700 leading-relaxed">{currentEntry.explanation}</p>
            </div>

            {/* Examples */}
            <h3 className="font-bold text-gray-900 mb-3 text-lg">Examples</h3>
            <div className="space-y-4">
              {currentEntry.examples.map((ex, idx) => (
                <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <p className="font-medium text-gray-800 text-lg">{ex.original}</p>
                    <AudioButton text={ex.original} />
                  </div>
                  <p className="text-gray-500">{ex.translation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Section */}
          <div className="bg-white rounded-3xl shadow-lg p-6 mb-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="text-pop-orange" />
              <h3 className="font-bold text-lg">Have a question?</h3>
            </div>
            
            <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-pop-dark text-white' : 'bg-gray-100 text-gray-800'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isChatting && <div className="text-sm text-gray-400 italic">LingoPop is typing...</div>}
            </div>

            <div className="flex gap-2">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Ask about "${currentEntry.term}"...`}
                className="flex-1 bg-gray-50 border-0 rounded-full px-4 py-3 focus:ring-2 focus:ring-pop-orange outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
              />
              <button 
                onClick={handleChatSend}
                className="bg-pop-orange text-white p-3 rounded-full shadow-md hover:bg-orange-600"
              >
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const NotebookView = () => (
    <div className="p-6 pb-24 min-h-screen bg-white">
      <h2 className="text-3xl font-black mb-6">My Notebook</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button 
          onClick={() => setView(AppView.FLASHCARDS)}
          className="bg-gradient-to-r from-pop-blue to-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-100 flex flex-col items-center justify-center gap-2"
        >
          <Zap size={32} />
          <span className="font-bold">Flashcards</span>
        </button>
        <button 
          onClick={handleGenerateStory}
          className="bg-gradient-to-r from-pop-purple to-purple-600 text-white p-4 rounded-2xl shadow-lg shadow-purple-100 flex flex-col items-center justify-center gap-2"
        >
          <BookOpen size={32} />
          <span className="font-bold">Story Mode</span>
        </button>
      </div>

      <div className="space-y-3">
        {notebook.length === 0 ? (
          <div className="text-center text-gray-400 py-10">
            <p>Your notebook is empty.</p>
            <p>Go search for some cool words!</p>
          </div>
        ) : (
          notebook.map(entry => (
            <div 
              key={entry.id} 
              onClick={() => { setCurrentEntry(entry); setView(AppView.RESULT); }}
              className="flex items-center bg-gray-50 p-4 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 mr-4 flex-shrink-0">
                {entry.imageUrl && <img src={entry.imageUrl} className="w-full h-full object-cover" alt="" />}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-lg">{entry.term}</h4>
                <p className="text-sm text-gray-500 truncate">{entry.definition}</p>
              </div>
              <ChevronRight className="text-gray-300" />
            </div>
          ))
        )}
      </div>
    </div>
  );

  const FlashcardView = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    if (notebook.length === 0) return <div className="p-10 text-center">Add words first!</div>;
    
    const card = notebook[currentIndex];

    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6 relative">
        <button onClick={() => setView(AppView.NOTEBOOK)} className="absolute top-6 left-6 p-2 bg-white rounded-full shadow">
           <X size={24} />
        </button>

        <div className="w-full max-w-sm h-96 perspective-1000 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
          <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
            
            {/* Front */}
            <div className="absolute w-full h-full backface-hidden bg-white rounded-3xl shadow-2xl flex flex-col items-center justify-center p-6 border-b-8 border-pop-blue">
              {card.imageUrl && (
                <img src={card.imageUrl} alt="Visual" className="w-32 h-32 rounded-full object-cover mb-6 shadow-inner" />
              )}
              <h2 className="text-4xl font-black text-center break-words">{card.term}</h2>
              <p className="mt-4 text-gray-400 text-sm font-semibold uppercase tracking-widest">Tap to Flip</p>
            </div>

            {/* Back */}
            <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-white rounded-3xl shadow-2xl flex flex-col items-center justify-center p-8 border-b-8 border-pop-yellow">
              <h3 className="text-2xl font-bold text-pop-purple mb-4 text-center">{card.definition}</h3>
              <div className="bg-gray-50 p-4 rounded-xl w-full text-center">
                <p className="text-gray-800 font-medium mb-2">"{card.examples[0]?.original}"</p>
                <p className="text-gray-500 text-sm italic">{card.examples[0]?.translation}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 mt-8">
          <button 
            disabled={currentIndex === 0}
            onClick={() => { setIsFlipped(false); setCurrentIndex(c => c - 1); }}
            className="p-4 bg-white rounded-full shadow-lg disabled:opacity-30"
          >
            <ArrowRight className="rotate-180" />
          </button>
          <span className="font-bold text-gray-400">{currentIndex + 1} / {notebook.length}</span>
          <button 
            disabled={currentIndex === notebook.length - 1}
            onClick={() => { setIsFlipped(false); setCurrentIndex(c => c + 1); }}
            className="p-4 bg-white rounded-full shadow-lg disabled:opacity-30"
          >
            <ArrowRight />
          </button>
        </div>
      </div>
    );
  };

  const StoryView = () => {
     if (isGeneratingStory) {
         return (
             <div className="min-h-screen flex flex-col items-center justify-center bg-pop-purple text-white p-6 text-center">
                 <div className="animate-spin text-6xl mb-6">✍️</div>
                 <h2 className="text-2xl font-bold">Weaving your story...</h2>
                 <p className="opacity-80 mt-2">Using your favorite words.</p>
             </div>
         )
     }

     return (
         <div className="min-h-screen bg-white p-6 pb-24">
             <button onClick={() => setView(AppView.NOTEBOOK)} className="mb-6 flex items-center gap-2 text-gray-500">
                 <ArrowRight className="rotate-180" size={16}/> Back
             </button>
             
             <h2 className="text-3xl font-black mb-4 text-pop-purple">Story Time</h2>
             
             {storyResult ? (
                <div className="space-y-6">
                    <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100">
                        <div className="flex justify-between items-start mb-4">
                            <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-purple-600 shadow-sm uppercase tracking-wide">Target Language</span>
                            <AudioButton text={storyResult.story} />
                        </div>
                        <p className="text-lg leading-relaxed font-medium text-gray-800">{storyResult.story}</p>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                        <span className="block mb-4 bg-white w-fit px-3 py-1 rounded-full text-xs font-bold text-gray-600 shadow-sm uppercase tracking-wide">Translation</span>
                        <p className="text-gray-600 leading-relaxed">{storyResult.translation}</p>
                    </div>
                </div>
             ) : (
                 <div className="text-center mt-20 text-gray-400">Something went wrong. Try again!</div>
             )}
         </div>
     )
  };

  // --- Top Navigation (Sticky for Search) ---
  
  const TopBar = () => (
    <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex gap-3 items-center">
       <div className="flex-1 relative">
         <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Type in ${targetLang.name}...`}
            className="w-full bg-gray-100 rounded-full pl-10 pr-4 py-3 focus:bg-white focus:ring-2 focus:ring-pop-blue outline-none transition-all"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchTerm)}
         />
         <Search className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
       </div>
       <button 
         onClick={() => handleSearch(searchTerm)}
         className="bg-pop-dark text-white p-3 rounded-full shadow hover:bg-gray-800"
       >
        <ArrowRight size={20} />
       </button>
    </div>
  );

  // --- Bottom Navigation ---

  const BottomNav = () => (
    <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex justify-around items-center p-3 pb-5 z-50">
       <button onClick={() => setView(AppView.HOME)} className={`flex flex-col items-center gap-1 ${view === AppView.HOME || view === AppView.RESULT ? 'text-pop-blue' : 'text-gray-400'}`}>
          <Search size={24} />
          <span className="text-[10px] font-bold">Search</span>
       </button>
       <button onClick={() => setView(AppView.NOTEBOOK)} className={`flex flex-col items-center gap-1 ${view === AppView.NOTEBOOK || view === AppView.STORY || view === AppView.FLASHCARDS ? 'text-pop-blue' : 'text-gray-400'}`}>
          <Book size={24} />
          <span className="text-[10px] font-bold">Notebook</span>
       </button>
       <button onClick={() => setView(AppView.SETUP)} className="flex flex-col items-center gap-1 text-gray-400">
          <Settings size={24} />
          <span className="text-[10px] font-bold">Lang</span>
       </button>
    </div>
  );

  // --- Rendering Switch ---

  if (view === AppView.SETUP) return <SetupView />;

  return (
    <div className="font-sans antialiased min-h-screen bg-white">
       {view !== AppView.FLASHCARDS && view !== AppView.STORY && <TopBar />}
       
       <main>
         {view === AppView.HOME && (
            <div className="flex flex-col items-center justify-center pt-20 px-6 text-center">
                <div className="w-32 h-32 bg-pop-yellow rounded-full flex items-center justify-center mb-6 shadow-xl animate-pulse">
                    <span className="text-6xl">👋</span>
                </div>
                <h2 className="text-2xl font-bold mb-2">Ready to learn {targetLang.name}?</h2>
                <p className="text-gray-400">Type a word above to get started!</p>
            </div>
         )}
         {view === AppView.RESULT && <ResultView />}
         {view === AppView.NOTEBOOK && <NotebookView />}
         {view === AppView.FLASHCARDS && <FlashcardView />}
         {view === AppView.STORY && <StoryView />}
       </main>

       <BottomNav />
    </div>
  );
}