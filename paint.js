/**
 * SKCT Online Practice - Drawing Board (Paint / Whiteboard) Module
 * 
 * Provides an interactive scratchpad/drawing canvas alongside the text notepad.
 * Features:
 * - Tab switching between Notepad and Paint
 * - Question-specific drawings & Global sketchbook
 * - Pen, Highlighter, and Eraser tools
 * - Multiple colors and stroke widths
 * - Smooth stroke interpolation (high-DPI / retina aware)
 * - Multi-level Undo (Ctrl+Z) & Clear
 * - Automatic persistence via localStorage
 * - ResizeObserver support for responsive side-divider resizing
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'skct_drawings_v1';
  const ACTIVE_TOOL_TAB_KEY = 'skct_active_side_tool'; // 'memo' or 'paint'

  // Module State
  let currentQId = 'q_1';
  let currentQNum = 1;
  let activePaintTab = 'question'; // 'question' or 'global'
  let activeTool = 'pen'; // 'pen', 'highlighter', 'eraser'
  let activeColor = '#0f172a';
  let activeSize = 3;

  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let points = [];

  let undoStack = [];
  const MAX_UNDO = 25;

  let drawingsDb = {}; // { [qId]: dataUrl, global: dataUrl }

  // DOM Elements cache
  let canvas = null;
  let ctx = null;
  let canvasWrapper = null;
  let dpr = window.devicePixelRatio || 1;

  // Load persistence
  function loadDrawings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        drawingsDb = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load drawing data:', e);
      drawingsDb = {};
    }
  }

  function saveDrawings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(drawingsDb));
      const indicator = document.getElementById('paint-save-indicator');
      if (indicator) {
        indicator.textContent = '💾 드로잉 자동 저장됨';
        indicator.classList.add('saved');
        setTimeout(() => {
          if (indicator) indicator.classList.remove('saved');
        }, 1500);
      }
    } catch (e) {
      console.warn('Failed to save drawing data:', e);
    }
  }

  // Get current storage key for current canvas view
  function getStorageKey() {
    return activePaintTab === 'global' ? 'global' : currentQId;
  }

  // Save current canvas to DB
  function saveCurrentCanvas() {
    if (!canvas || !ctx) return;
    const key = getStorageKey();

    // Check if canvas is completely empty to save storage
    if (isCanvasBlank()) {
      delete drawingsDb[key];
    } else {
      drawingsDb[key] = canvas.toDataURL('image/png');
    }
    saveDrawings();
  }

  function isCanvasBlank() {
    if (!canvas || !ctx) return true;
    // Fast check: if no undo steps and no saved data
    if (undoStack.length === 0 && !drawingsDb[getStorageKey()]) return true;
    
    // Detailed pixel check on small sample
    try {
      const pixelBuffer = new Uint32Array(
        ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer
      );
      return !pixelBuffer.some(color => color !== 0);
    } catch (_) {
      return false;
    }
  }

  // Restore canvas from DB
  function restoreCanvas() {
    if (!canvas || !ctx) return;
    clearCanvas(false);
    undoStack = [];

    const key = getStorageKey();
    const dataUrl = drawingsDb[key];
    if (dataUrl) {
      const img = new Image();
      img.onload = function () {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // reset scale for direct pixel copy
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      };
      img.src = dataUrl;
    }
  }

  // Clear canvas pixels
  function clearCanvas(pushUndo = true) {
    if (!canvas || !ctx) return;
    if (pushUndo) {
      pushUndoState();
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  // Push state to undo stack
  function pushUndoState() {
    if (!canvas || !ctx) return;
    if (undoStack.length >= MAX_UNDO) {
      undoStack.shift();
    }
    undoStack.push(canvas.toDataURL('image/png'));
  }

  // Undo last stroke
  function undo() {
    if (!canvas || !ctx || undoStack.length === 0) return;
    const previousState = undoStack.pop();
    const img = new Image();
    img.onload = function () {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      saveCurrentCanvas();
    };
    img.src = previousState;
  }

  // Resize canvas to match container with high-DPI scaling
  function resizeCanvas() {
    if (!canvas || !canvasWrapper) return;

    const rect = canvasWrapper.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    dpr = window.devicePixelRatio || 1;
    const newWidth = Math.floor(rect.width * dpr);
    const newHeight = Math.floor(rect.height * dpr);

    if (canvas.width === newWidth && canvas.height === newHeight) return;

    // Backup current image before resize
    let tempBackup = null;
    if (canvas.width > 0 && canvas.height > 0 && !isCanvasBlank()) {
      tempBackup = canvas.toDataURL('image/png');
    }

    canvas.width = newWidth;
    canvas.height = newHeight;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    // Reset transform & scale to dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Restore backup if existed, otherwise reload active drawing
    if (tempBackup) {
      const img = new Image();
      img.onload = function () {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      };
      img.src = tempBackup;
    } else {
      restoreCanvas();
    }
  }

  // Setup Drawing Context properties based on active tool
  function applyToolProperties() {
    if (!ctx) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (activeTool === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = activeSize;
    } else if (activeTool === 'highlighter') {
      ctx.globalCompositeOperation = 'multiply';
      // If color is black or dark, default highlighter to warm yellow
      let hlColor = activeColor;
      if (hlColor === '#0f172a' || hlColor === '#1e293b') {
        hlColor = 'rgba(250, 204, 21, 0.4)';
      } else {
        // Apply 40% transparency to chosen color
        hlColor = hexToRgba(hlColor, 0.4);
      }
      ctx.strokeStyle = hlColor;
      ctx.lineWidth = Math.max(12, activeSize * 4);
    } else if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = Math.max(16, activeSize * 5);
    }

    updateModeLabel();
  }

  function hexToRgba(hex, alpha) {
    if (hex.startsWith('rgba') || hex.startsWith('hsla')) return hex;
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function updateModeLabel() {
    const lbl = document.getElementById('paint-mode-label');
    if (!lbl) return;
    const toolNames = { pen: '✏️ 펜', highlighter: '🖍️ 형광펜', eraser: '🧹 지우개' };
    lbl.textContent = `${toolNames[activeTool] || '그림판'} · ${activeSize}px`;
  }

  // Pointer Events handling
  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function onPointerDown(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return; // only left click
    canvas.setPointerCapture(e.pointerId);

    isDrawing = true;
    pushUndoState();
    applyToolProperties();

    const coords = getCanvasCoords(e);
    lastX = coords.x;
    lastY = coords.y;
    points = [coords];

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    // Draw a single dot in case user just clicks
    ctx.lineTo(lastX + 0.1, lastY + 0.1);
    ctx.stroke();

    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);
    points.push(coords);

    if (points.length >= 3) {
      const p0 = points[points.length - 3];
      const p1 = points[points.length - 2];
      const p2 = points[points.length - 1];

      const mid1X = (p0.x + p1.x) / 2;
      const mid1Y = (p0.y + p1.y) / 2;
      const mid2X = (p1.x + p2.x) / 2;
      const mid2Y = (p1.y + p2.y) / 2;

      ctx.beginPath();
      ctx.moveTo(mid1X, mid1Y);
      ctx.quadraticCurveTo(p1.x, p1.y, mid2X, mid2Y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }

    lastX = coords.x;
    lastY = coords.y;
    e.preventDefault();
  }

  function onPointerUp(e) {
    if (!isDrawing) return;
    isDrawing = false;
    points = [];
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (_) {}

    saveCurrentCanvas();
    e.preventDefault();
  }

  // Switch between Memo and Paint top tabs
  function switchSideTool(tool) {
    const memoPanel = document.getElementById('memo-panel-view');
    const paintPanel = document.getElementById('paint-panel-view');
    const memoTabBtn = document.getElementById('side-tab-memo');
    const paintTabBtn = document.getElementById('side-tab-paint');

    if (tool === 'paint') {
      if (memoPanel) memoPanel.style.display = 'none';
      if (paintPanel) paintPanel.style.display = 'flex';
      if (memoTabBtn) memoTabBtn.classList.remove('active');
      if (paintTabBtn) paintTabBtn.classList.add('active');
      localStorage.setItem(ACTIVE_TOOL_TAB_KEY, 'paint');
      // Delay resize to allow display: flex layout to settle
      requestAnimationFrame(() => {
        resizeCanvas();
      });
    } else {
      if (memoPanel) memoPanel.style.display = 'flex';
      if (paintPanel) paintPanel.style.display = 'none';
      if (memoTabBtn) memoTabBtn.classList.add('active');
      if (paintTabBtn) paintTabBtn.classList.remove('active');
      localStorage.setItem(ACTIVE_TOOL_TAB_KEY, 'memo');
    }
  }

  // Question navigation hook called by app.js / training.js
  function onQuestionChange(qId, qNum) {
    // If currently on a question drawing, save it before switching
    if (activePaintTab === 'question') {
      saveCurrentCanvas();
    }

    currentQId = qId || 'q_' + qNum;
    currentQNum = qNum || 1;

    // Update Question number in paint tab button
    const paintQNumEl = document.getElementById('paint-q-num');
    if (paintQNumEl) {
      paintQNumEl.textContent = currentQNum;
    }

    // If paint view is active, restore the question's drawing
    if (activePaintTab === 'question') {
      restoreCanvas();
    }
  }

  // Initialization
  function init() {
    loadDrawings();

    canvas = document.getElementById('paint-canvas');
    canvasWrapper = document.getElementById('paint-canvas-wrapper');
    if (!canvas || !canvasWrapper) return;

    ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Pointer events on canvas
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    // Prevent touch scrolling on canvas
    canvas.style.touchAction = 'none';

    // Resize observer for responsive divider/window resize
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => {
        if (canvasWrapper.offsetWidth > 0 && canvasWrapper.offsetHeight > 0) {
          resizeCanvas();
        }
      });
      ro.observe(canvasWrapper);
    } else {
      window.addEventListener('resize', resizeCanvas);
    }

    // Top Tool Tabs: Memo vs Paint
    const memoTabBtn = document.getElementById('side-tab-memo');
    const paintTabBtn = document.getElementById('side-tab-paint');

    if (memoTabBtn) memoTabBtn.addEventListener('click', () => switchSideTool('memo'));
    if (paintTabBtn) paintTabBtn.addEventListener('click', () => switchSideTool('paint'));

    // Paint Sub-tabs: Question vs Global
    const tabQPaint = document.getElementById('tab-q-paint');
    const tabGlobalPaint = document.getElementById('tab-global-paint');

    if (tabQPaint) {
      tabQPaint.addEventListener('click', () => {
        if (activePaintTab === 'question') return;
        saveCurrentCanvas();
        activePaintTab = 'question';
        tabQPaint.classList.add('active');
        if (tabGlobalPaint) tabGlobalPaint.classList.remove('active');
        restoreCanvas();
      });
    }

    if (tabGlobalPaint) {
      tabGlobalPaint.addEventListener('click', () => {
        if (activePaintTab === 'global') return;
        saveCurrentCanvas();
        activePaintTab = 'global';
        tabGlobalPaint.classList.add('active');
        if (tabQPaint) tabQPaint.classList.remove('active');
        restoreCanvas();
      });
    }

    // Paint Tools: Pen, Highlighter, Eraser
    document.querySelectorAll('.paint-tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.paint-tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTool = btn.dataset.tool || 'pen';
        applyToolProperties();
      });
    });

    // Color Pickers
    document.querySelectorAll('.color-dot').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.color-dot').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeColor = btn.dataset.color || '#0f172a';
        if (activeTool === 'eraser') {
          // Switch back to pen when picking a color
          activeTool = 'pen';
          document.querySelectorAll('.paint-tool-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tool === 'pen');
          });
        }
        applyToolProperties();
      });
    });

    // Size Pickers
    document.querySelectorAll('.size-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeSize = parseFloat(btn.dataset.size || '3');
        applyToolProperties();
      });
    });

    // Undo & Clear Actions
    const undoBtn = document.getElementById('paint-undo-btn');
    if (undoBtn) undoBtn.addEventListener('click', undo);

    const clearBtn = document.getElementById('paint-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('현재 드로잉을 모두 지우시겠습니까? (되돌리기 가능)')) {
          clearCanvas(true);
          saveCurrentCanvas();
        }
      });
    }

    // Keyboard Shortcuts (only when paint is active or on hotkey)
    document.addEventListener('keydown', (e) => {
      const paintPanel = document.getElementById('paint-panel-view');
      const isPaintVisible = paintPanel && paintPanel.style.display !== 'none';
      if (!isPaintVisible) return;

      // Ignore when typing in input or textarea
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if (e.key.toLowerCase() === 'p') {
        const penBtn = document.getElementById('paint-tool-pen');
        if (penBtn) penBtn.click();
      } else if (e.key.toLowerCase() === 'h') {
        const hlBtn = document.getElementById('paint-tool-highlighter');
        if (hlBtn) hlBtn.click();
      } else if (e.key.toLowerCase() === 'e') {
        const eraserBtn = document.getElementById('paint-tool-eraser');
        if (eraserBtn) eraserBtn.click();
      }
    });

    // Initial tool setup
    applyToolProperties();

    // Restore user preference for active side tool (memo or paint)
    const savedTool = localStorage.getItem(ACTIVE_TOOL_TAB_KEY) || 'memo';
    switchSideTool(savedTool);
  }

  // Expose to window
  window.SKCTPaint = {
    init,
    onQuestionChange,
    switchSideTool,
    undo,
    clear: () => clearCanvas(true),
    saveCurrentCanvas
  };

  // Run init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
