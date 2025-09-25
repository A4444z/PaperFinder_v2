import React, { useState, useCallback, useMemo } from 'react';
import type { Reference } from './types';
import { searchLiterature, answerFromLiterature } from './services/geminiService';
import Header from './components/Header';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';

const ACADEMIC_SOURCES = ["Google Scholar", "PubMed", "arXiv", "bioRxiv"];
const ITEMS_PER_PAGE = 5;
const CURRENT_YEAR = new Date().getFullYear();

const SearchBar: React.FC<{ onSearch: (query: string) => void; isLoading: boolean }> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="例如：CRISPR 基因编辑最新进展"
        className="w-full px-4 py-3 text-lg bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition duration-200"
        disabled={isLoading}
        aria-label="Search literature"
      />
      <button
        type="submit"
        className="px-6 py-3 text-lg font-semibold text-white bg-slate-800 rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:bg-slate-400 disabled:cursor-not-allowed transition duration-200"
        disabled={isLoading}
      >
        {isLoading ? '搜索中...' : '搜索'}
      </button>
    </form>
  );
};

const SourceSelector: React.FC<{ selected: string[]; onChange: (source: string) => void; }> = ({ selected, onChange }) => {
    return (
        <div className="mt-4">
            <p className="text-sm font-semibold text-slate-600 mb-2">选择文献来源：</p>
            <div className="flex flex-wrap gap-3">
                {ACADEMIC_SOURCES.map(source => (
                    <label key={source} className="flex items-center space-x-2 cursor-pointer p-2 rounded-md hover:bg-slate-200 transition-colors">
                        <input
                            type="checkbox"
                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={selected.includes(source)}
                            onChange={() => onChange(source)}
                        />
                        <span className="text-slate-700">{source}</span>
                    </label>
                ))}
            </div>
        </div>
    );
};

const QABox: React.FC<{ onAsk: (question: string) => void; isLoading: boolean; answer: string | null; selectedCount: number }> = ({ onAsk, isLoading, answer, selectedCount }) => {
  const [question, setQuestion] = useState('');
  const isDisabled = selectedCount === 0 || isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && !isDisabled) {
      onAsk(question.trim());
    }
  };

  return (
    <div className="mt-8 pt-6 border-t border-slate-300">
      <h3 className="text-xl font-bold text-slate-700 mb-3">深入提问</h3>
      <p className="text-sm text-slate-500 mb-4">请在上方参考文献列表中勾选一项或多项，然后针对所选文献提出问题。</p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={selectedCount > 0 ? `针对 ${selectedCount} 篇文献提问...` : '请先选择文献...'}
          className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition duration-200 disabled:bg-slate-100"
          disabled={isDisabled}
          aria-label="Ask a follow-up question"
        />
        <button
          type="submit"
          className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed transition duration-200"
          disabled={isDisabled}
        >
          {isLoading ? '思考中...' : '提问'}
        </button>
      </form>
      {isLoading && <div className="mt-4"><LoadingSpinner message="正在生成回答..." /></div>}
      {answer && !isLoading && (
        <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
          <p className="text-slate-800 whitespace-pre-wrap">{answer}</p>
        </div>
      )}
    </div>
  );
};

const ResultsDisplay: React.FC<{ 
    references: Reference[]; 
    onSelect: (ref: Reference) => void;
    selectedURIs: string[];
}> = ({ references, onSelect, selectedURIs }) => {
  return (
    <ul className="space-y-4">
      {references.map((ref) => (
        <li key={ref.uri} className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm transition duration-200 flex items-start gap-4">
          <input 
            type="checkbox"
            className="h-5 w-5 mt-1.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0"
            checked={selectedURIs.includes(ref.uri)}
            onChange={() => onSelect(ref)}
            aria-labelledby={`title-${ref.uri}`}
          />
          <div className="flex-grow">
            <a
              id={`title-${ref.uri}`}
              href={ref.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-semibold text-blue-700 hover:underline"
            >
              {ref.title}
            </a>
            <div className="text-sm text-slate-600 mt-2 space-y-1">
               {ref.authors && ref.authors.length > 0 && (
                  <p><span className="font-semibold">作者：</span>{ref.authors.join(', ')}</p>
               )}
               {ref.publicationDate && (
                  <p><span className="font-semibold">发布日期：</span>{ref.publicationDate}</p>
               )}
               {ref.abstract && (
                  <p className="mt-2 pt-2 border-t border-slate-200 text-slate-500 leading-normal">{ref.abstract}</p>
               )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};

const Pagination: React.FC<{ currentPage: number; totalPages: number; onPageChange: (page: number) => void; }> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    return (
        <div className="flex justify-center items-center gap-4 mt-6">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="px-4 py-2 bg-white border border-slate-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">上一页</button>
            <span className="text-slate-600 font-medium">第 {currentPage} 页 / 共 {totalPages} 页</span>
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-4 py-2 bg-white border border-slate-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">下一页</button>
        </div>
    )
}

const App: React.FC = () => {
  const [summary, setSummary] = useState<string | null>(null);
  const [references, setReferences] = useState<Reference[]>([]);
  const [originalQuery, setOriginalQuery] = useState<string>('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [selectedSources, setSelectedSources] = useState<string[]>(["Google Scholar", "bioRxiv"]);
  
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isSearchingOlder, setIsSearchingOlder] = useState<boolean>(false);
  const [isAnswering, setIsAnswering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [sortOrder, setSortOrder] = useState<'relevance' | 'date'>('relevance');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReferencesForQA, setSelectedReferencesForQA] = useState<Reference[]>([]);
  const selectedReferenceURIs = useMemo(() => selectedReferencesForQA.map(r => r.uri), [selectedReferencesForQA]);

  const [nextDateRange, setNextDateRange] = useState<{ start: number, end: number} | null>(null);

  const handleSourceChange = (source: string) => {
    setSelectedSources(prev => 
        prev.includes(source) 
            ? prev.filter(s => s !== source) 
            : [...prev, source]
    );
  };

  const handleSelectReference = (ref: Reference) => {
    setSelectedReferencesForQA(prev => 
      prev.find(r => r.uri === ref.uri)
        ? prev.filter(r => r.uri !== ref.uri)
        : [...prev, ref]
    );
  };

  const handleSearch = useCallback(async (query: string) => {
    setIsSearching(true);
    setError(null);
    setSummary(null);
    setReferences([]);
    setAnswer(null);
    setOriginalQuery(query);
    setCurrentPage(1);
    setSortOrder('relevance');
    setSelectedReferencesForQA([]);
    setNextDateRange(null);

    try {
      const result = await searchLiterature(query, selectedSources, { startYear: 2021, endYear: CURRENT_YEAR });
      setSummary(result.summary);
      setReferences(result.references);
      setNextDateRange({ start: 2015, end: 2020 });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSearching(false);
    }
  }, [selectedSources]);
  
  const handleSearchOlder = useCallback(async () => {
    if (!originalQuery || !nextDateRange) return;

    setIsSearchingOlder(true);
    setError(null);

    try {
        const result = await searchLiterature(originalQuery, selectedSources, { startYear: nextDateRange.start, endYear: nextDateRange.end });
        
        // Merge and de-duplicate references
        const allRefs = [...references, ...result.references];
        const uniqueRefs = Array.from(new Map(allRefs.map(ref => [ref.uri, ref])).values());
        
        setReferences(uniqueRefs);
        
        // Set up the next date range for even older search
        setNextDateRange({ start: nextDateRange.start - 6, end: nextDateRange.end - 6 });

    } catch (e: any) {
        setError(e.message);
    } finally {
        setIsSearchingOlder(false);
    }
  }, [originalQuery, selectedSources, references, nextDateRange]);

  const handleAsk = useCallback(async (question: string) => {
      if (!originalQuery || selectedReferencesForQA.length === 0) return;

      setIsAnswering(true);
      setError(null);
      setAnswer(null);

      try {
        const result = await answerFromLiterature(originalQuery, selectedReferencesForQA, question);
        setAnswer(result);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsAnswering(false);
      }
  }, [originalQuery, selectedReferencesForQA]);

  const sortedReferences = useMemo(() => {
    if (sortOrder === 'relevance') {
      return references; // Default order from API is by relevance
    }
    return [...references].sort((a, b) => {
      return (b.publicationDate || '').localeCompare(a.publicationDate || '');
    });
  }, [references, sortOrder]);

  const totalPages = Math.ceil(sortedReferences.length / ITEMS_PER_PAGE);
  const paginatedReferences = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedReferences.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedReferences, currentPage]);

  const isAnyLoading = isSearching || isSearchingOlder;

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-6 max-w-4xl">
        <div className="p-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200">
            <SearchBar onSearch={handleSearch} isLoading={isSearching} />
            <SourceSelector selected={selectedSources} onChange={handleSourceChange} />
        </div>
        
        <div className="mt-6">
          {error && <ErrorMessage message={error} />}
          {isSearching && <LoadingSpinner message="正在搜索最新文献 (2021至今)..." />}
          
          {summary && references.length > 0 && (
            <div className="bg-slate-50 p-4 sm:p-6 rounded-xl shadow-lg border border-slate-200">
              <div>
                <h3 className="text-xl font-bold text-slate-700 mb-3">AI 文献摘要</h3>
                <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{summary}</p>
                </div>
              </div>
              
              <div className="mt-6">
                <div className="flex flex-col sm:flex-row justify-between items-baseline mb-4">
                    <h3 className="text-xl font-bold text-slate-700">参考文献 ({references.length})</h3>
                    <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        <span className="text-sm font-semibold text-slate-600">排序:</span>
                        <button onClick={() => setSortOrder('relevance')} className={`px-3 py-1 text-sm rounded-full ${sortOrder === 'relevance' ? 'bg-slate-800 text-white' : 'bg-white hover:bg-slate-200'}`}>相关度</button>
                        <button onClick={() => setSortOrder('date')} className={`px-3 py-1 text-sm rounded-full ${sortOrder === 'date' ? 'bg-slate-800 text-white' : 'bg-white hover:bg-slate-200'}`}>时间</button>
                    </div>
                </div>
                {nextDateRange && !isSearching && (
                    <div className="my-4 text-center">
                        <button onClick={handleSearchOlder} disabled={isAnyLoading} className="px-5 py-2.5 font-medium text-white bg-green-600 rounded-lg hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 disabled:bg-green-300 disabled:cursor-not-allowed transition duration-200">
                            {isSearchingOlder ? '搜索中...' : `继续搜索 ${nextDateRange.start}-${nextDateRange.end} 年文献`}
                        </button>
                    </div>
                )}
                {isSearchingOlder && <LoadingSpinner message={`正在搜索 ${nextDateRange?.start}-${nextDateRange?.end} 年文献...`} />}
                <ResultsDisplay references={paginatedReferences} onSelect={handleSelectReference} selectedURIs={selectedReferenceURIs} />
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </div>

              <QABox onAsk={handleAsk} isLoading={isAnswering} answer={answer} selectedCount={selectedReferencesForQA.length}/>
            </div>
          )}

          {!isSearching && !summary && (
              <div className="text-center p-10 bg-white rounded-xl shadow-lg border border-slate-200 mt-6">
                  <h2 className="text-xl font-semibold text-slate-700">准备开始您的学术探索之旅</h2>
                  <p className="text-slate-500 mt-2">在上方搜索框中输入您感兴趣的研究领域，选择来源后即可开始探索！</p>
              </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;