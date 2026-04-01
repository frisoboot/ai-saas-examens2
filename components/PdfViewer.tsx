import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, ExternalLink, ZoomIn, ZoomOut } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
  page?: number;
  className?: string;
  label?: string;
}

// Detect iOS/iPadOS - Safari on these platforms cannot render PDFs in iframes
const getIsIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  // iPad with iPadOS 13+ reports as Macintosh, so also check touch support
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isIPadOS = navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1;
  return isIOS || isIPadOS;
};

const isIOS = getIsIOS();

export const PdfViewer: React.FC<PdfViewerProps> = ({ url, page, className = '', label = 'Tekstboekje' }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentPage, setCurrentPage] = useState(page || 1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1.0);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // Update page when prop changes (question navigation)
  useEffect(() => {
    if (page && page !== currentPage) {
      setCurrentPage(page);
    }
  }, [page]);

  // Track container width for responsive PDF rendering
  useEffect(() => {
    if (!isIOS || !pdfContainerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(pdfContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Build PDF URL with page parameter (for iframe mode)
  const getPdfUrl = (pageNum: number) => {
    return `${url}#page=${pageNum}&toolbar=0&navpanes=0`;
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => {
      if (numPages && prev >= numPages) return prev;
      return prev + 1;
    });
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(3.0, prev + 0.25));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.25));
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

  const onDocumentLoadSuccess = useCallback(({ numPages: total }: { numPages: number }) => {
    setNumPages(total);
  }, []);

  return (
    <div ref={containerRef} className={`flex flex-col h-full ${className}`}>
      {/* PDF Controls Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-300">{label}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-1.5 hover:bg-slate-700 rounded transition disabled:opacity-40"
            title="Vorige pagina"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm px-2 min-w-[60px] text-center">
            Pagina {currentPage}{numPages ? ` / ${numPages}` : ''}
          </span>
          <button
            onClick={handleNextPage}
            disabled={numPages !== null && currentPage >= numPages}
            className="p-1.5 hover:bg-slate-700 rounded transition disabled:opacity-40"
            title="Volgende pagina"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {isIOS && (
            <>
              <button
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-slate-700 rounded transition"
                title="Uitzoomen"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400 min-w-[40px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-slate-700 rounded transition"
                title="Inzoomen"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </>
          )}
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

      {/* PDF Content */}
      <div ref={pdfContainerRef} className="flex-1 bg-slate-200 overflow-auto">
        {isIOS ? (
          // Canvas-based rendering for iOS/iPadOS (Safari can't render PDFs in iframes)
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center h-full">
                <div className="text-slate-500">PDF laden...</div>
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
                <p className="text-slate-500 text-sm text-center">
                  PDF kon niet worden geladen.
                </p>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  Open PDF in nieuw tabblad
                </a>
              </div>
            }
          >
            <Page
              pageNumber={currentPage}
              width={containerWidth > 0 ? containerWidth * scale : undefined}
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
        ) : (
          // iframe-based rendering for desktop browsers
          <iframe
            ref={iframeRef}
            src={getPdfUrl(currentPage)}
            className="w-full h-full border-0"
            title={label}
          />
        )}
      </div>
    </div>
  );
};
