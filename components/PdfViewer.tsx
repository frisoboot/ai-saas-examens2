import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, ExternalLink } from 'lucide-react';

interface PdfViewerProps {
  url: string;
  page?: number;
  className?: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ url, page, className = '' }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentPage, setCurrentPage] = useState(page || 1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update page when prop changes (question navigation)
  useEffect(() => {
    if (page && page !== currentPage) {
      setCurrentPage(page);
    }
  }, [page]);

  // Build PDF URL with page parameter
  const getPdfUrl = (pageNum: number) => {
    // Use #page=N for browser PDF viewers
    return `${url}#page=${pageNum}&toolbar=0&navpanes=0`;
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => prev + 1);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div ref={containerRef} className={`flex flex-col h-full ${className}`}>
      {/* PDF Controls Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-300">Tekstboekje</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevPage}
            className="p-1.5 hover:bg-slate-700 rounded transition"
            title="Vorige pagina"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm px-2 min-w-[60px] text-center">
            Pagina {currentPage}
          </span>
          <button
            onClick={handleNextPage}
            className="p-1.5 hover:bg-slate-700 rounded transition"
            title="Volgende pagina"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-slate-700 rounded transition"
            title={isFullscreen ? 'Sluiten' : 'Volledig scherm'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 hover:bg-slate-700 rounded transition"
            title="Openen in nieuw tabblad"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* PDF iframe */}
      <div className="flex-1 bg-slate-200 overflow-hidden">
        <iframe
          ref={iframeRef}
          src={getPdfUrl(currentPage)}
          className="w-full h-full border-0"
          title="Exam PDF Tekstboekje"
        />
      </div>
    </div>
  );
};
