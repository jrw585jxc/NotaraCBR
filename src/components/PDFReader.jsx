import { useEffect, useRef, useState } from 'react';

export default function PDFReader({ filePath, currentPage, onPageChange, fitMode, zoom }) {
  const canvasRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [rendering, setRendering] = useState(false);
  const renderTask = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function loadPDF() {
      try {
        // Dynamically import pdf.js
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        const doc = await pdfjsLib.getDocument(`file://${filePath}`).promise;
        if (cancelled) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        onPageChange(Math.min(currentPage, doc.numPages - 1), doc.numPages);
      } catch (e) {
        console.error('PDF load error:', e);
      }
    }
    loadPDF();
    return () => { cancelled = true; };
  }, [filePath]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;

    async function renderPage() {
      if (renderTask.current) {
        renderTask.current.cancel();
      }
      setRendering(true);
      try {
        const page = await pdfDoc.getPage(currentPage + 1);
        if (cancelled) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        const containerWidth = canvas.parentElement?.clientWidth || 800;
        const containerHeight = canvas.parentElement?.clientHeight || 600;
        const viewport = page.getViewport({ scale: 1 });

        let scale = zoom;
        if (fitMode === 'height') scale = (containerHeight / viewport.height) * zoom;
        else if (fitMode === 'width') scale = (containerWidth / viewport.width) * zoom;

        const scaledViewport = page.getViewport({ scale });
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        renderTask.current = page.render({ canvasContext: context, viewport: scaledViewport });
        await renderTask.current.promise;
      } catch (e) {
        if (e?.name !== 'RenderingCancelledException') console.error('Render error:', e);
      } finally {
        if (!cancelled) setRendering(false);
      }
    }

    renderPage();
    return () => { cancelled = true; };
  }, [pdfDoc, currentPage, fitMode, zoom]);

  return (
    <div className="flex items-start justify-center w-full h-full overflow-auto p-4">
      {rendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      )}
      <canvas ref={canvasRef} style={{ maxWidth: '100%', display: 'block' }} />
    </div>
  );
}
