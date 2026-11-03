/**
 * DeepSeek 3D Whale Companion Floating Widget UI
 * Features:
 * - Deep-ocean sapphire & cyan glassmorphism palette
 * - Real-time LLM speech bubble with live speaking indicator
 * - 3D Whale Girl stage (Canvas 3D + external GLTF/GLB model slot)
 * - Rhythmic wooden-fish accompaniment controls & unified settings modal
 */
import { formatMeritCount, formatTokenCount, formatTokenLabel, formatWhaleWeight, formatWeightDelta } from '../format.js';
import { WhaleStage3D } from './whale-stage-3d.js';
let activeWhaleInstanceUnmount = null;
export function createWhaleFloatingPet(options) {
    if (activeWhaleInstanceUnmount) {
        try {
            activeWhaleInstanceUnmount();
        }
        catch { }
        activeWhaleInstanceUnmount = null;
    }
    const existing = document.getElementById('dsh-whale-floating-pet');
    if (existing) {
        existing.remove();
    }
    const container = document.createElement('div');
    container.id = 'dsh-whale-floating-pet';
    container.className = 'dsh-whale-pet-root';
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', '深度求索 3D 鲸鱼娘伴侣挂件');
    let isCollapsed = false;
    let voiceEnabled = options.initialVoiceEnabled ?? true;
    let soundEnabled = options.initialSoundEnabled ?? true;
    let currentSettingsTab = 'speech';
    const sparkTimers = new Set();
    const style = document.createElement('style');
    style.textContent = `
    .dsh-whale-pet-root {
      --whale-bg-surface: rgba(11, 25, 48, 0.94);
      --whale-bg-elevated: #0f2140;
      --whale-border: rgba(86, 180, 255, 0.45);
      --whale-text-primary: #e6f4ff;
      --whale-text-secondary: #94cbff;
      --whale-accent: #38bdf8;
      position: fixed;
      right: 28px;
      bottom: 36px;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      align-items: center;
      user-select: none;
      -webkit-user-select: none;
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
      transition: transform 0.18s ease;
    }

    .dsh-whale-header-anchor {
      position: relative;
      width: 236px;
      min-height: 70px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;
      margin-bottom: 6px;
      pointer-events: none;
      transition: width 0.2s ease, min-height 0.2s ease;
    }
    .dsh-whale-pet-root.is-collapsed .dsh-whale-header-anchor {
      width: 180px;
      min-height: 48px;
      margin-bottom: 4px;
    }

    .dsh-whale-top-bar {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 4px;
    }

    .dsh-whale-drag-handle {
      cursor: grab;
      background: var(--whale-bg-surface);
      color: var(--whale-text-secondary);
      font-size: 10.5px;
      padding: 2px 10px;
      border-radius: 999px;
      border: 1px solid var(--whale-border);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
      display: inline-flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
      transition: border-color 0.15s, color 0.15s;
    }
    .dsh-whale-drag-handle:hover {
      border-color: rgba(56, 189, 248, 0.8);
      color: var(--whale-accent);
    }

    .dsh-whale-collapse-pill {
      cursor: pointer;
      background: var(--whale-bg-surface);
      color: var(--whale-text-secondary);
      font-size: 10.5px;
      padding: 2px 7px;
      border-radius: 999px;
      border: 1px solid var(--whale-border);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
      line-height: 1.3;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }
    .dsh-whale-collapse-pill:hover {
      background: rgba(28, 64, 120, 0.95);
      color: var(--whale-accent);
      border-color: rgba(56, 189, 248, 0.75);
    }

    .dsh-whale-bubble {
      pointer-events: auto;
      max-width: 230px;
      min-height: 26px;
      max-height: 52px;
      overflow: hidden;
      padding: 5px 11px;
      border-radius: 11px;
      background: var(--whale-bg-surface);
      border: 1px solid var(--whale-border);
      color: var(--whale-text-primary);
      font-size: 11.5px;
      line-height: 1.38;
      text-align: center;
      box-shadow: 0 6px 16px rgba(3, 12, 28, 0.55);
      backdrop-filter: blur(8px);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .dsh-whale-bubble.is-speaking {
      border-color: rgba(56, 189, 248, 0.9);
      box-shadow: 0 0 14px rgba(56, 189, 248, 0.35), 0 6px 16px rgba(3, 12, 28, 0.55);
    }
    .dsh-whale-pet-root.is-collapsed .dsh-whale-bubble {
      max-width: 176px;
      min-height: 20px;
      max-height: 34px;
      padding: 3px 8px;
      font-size: 10px;
      line-height: 1.3;
      border-radius: 9px;
    }

    /* 3D Whale Girl Stage */
    .dsh-whale-stage {
      position: relative;
      width: 144px;
      height: 108px;
      border-radius: 26px;
      background: radial-gradient(circle at 50% 38%, rgba(37, 99, 235, 0.42), rgba(10, 22, 46, 0.96));
      border: 1.5px solid var(--whale-border);
      box-shadow: 0 10px 26px rgba(2, 10, 24, 0.68), inset 0 1px 8px rgba(125, 211, 252, 0.28);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      overflow: visible;
      transition: transform 0.12s ease, width 0.2s ease, height 0.2s ease;
    }
    .dsh-whale-pet-root.is-collapsed .dsh-whale-stage {
      width: 74px;
      height: 58px;
      border-radius: 18px;
    }

    .dsh-whale-merit-badge {
      position: absolute;
      bottom: -8px;
      background: linear-gradient(135deg, #1d4ed8, #0f296b);
      color: #e0f2fe;
      border: 1px solid rgba(125, 211, 252, 0.65);
      border-radius: 999px;
      padding: 1px 9px;
      font-size: 10.5px;
      font-weight: 600;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
      white-space: nowrap;
      z-index: 6;
    }
    .dsh-whale-pet-root.is-collapsed .dsh-whale-merit-badge {
      font-size: 9.5px;
      padding: 0px 7px;
      bottom: -7px;
    }

    .dsh-whale-dock-card {
      margin-top: 11px;
      background: var(--whale-bg-surface);
      border: 1px solid var(--whale-border);
      border-radius: 12px;
      padding: 4px;
      box-shadow: 0 6px 18px rgba(2, 10, 24, 0.55);
      backdrop-filter: blur(8px);
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 3px;
    }
    .dsh-whale-pet-root.is-collapsed .dsh-whale-dock-card {
      display: none;
    }

    .dsh-whale-toolbar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      white-space: nowrap;
    }

    .dsh-whale-btn {
      background: rgba(255, 255, 255, 0.04);
      color: var(--whale-text-secondary);
      border: 1px solid transparent;
      border-radius: 8px;
      padding: 3px 8px;
      font-size: 11px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }
    .dsh-whale-btn:hover, .dsh-whale-btn:focus-visible {
      background: rgba(56, 189, 248, 0.18);
      color: var(--whale-accent);
      border-color: rgba(56, 189, 248, 0.5);
      outline: none;
    }
    .dsh-whale-btn.is-active {
      background: rgba(56, 189, 248, 0.2);
      color: #7dd3fc;
      border-color: rgba(56, 189, 248, 0.65);
      font-weight: 600;
    }

    .dsh-whale-token-bar {
      font-size: 9.5px;
      color: #7dd3fc;
      border-top: 1px solid rgba(86, 180, 255, 0.2);
      padding: 2px 6px 1px;
      text-align: center;
      white-space: nowrap;
      cursor: pointer;
    }

    .dsh-whale-sparkle {
      position: fixed;
      transform: translate(-50%, -10px);
      color: #7dd3fc;
      font-size: 13px;
      font-weight: 700;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.85), 0 0 8px rgba(56, 189, 248, 0.65);
      pointer-events: none;
      z-index: 1000001;
      animation: dsh-whale-float-up 0.85s ease-out forwards;
      white-space: nowrap;
    }

    @keyframes dsh-whale-float-up {
      0% { opacity: 1; transform: translate(-50%, -6px) scale(0.92); }
      100% { opacity: 0; transform: translate(-50%, -44px) scale(1.08); }
    }

    .dsh-whale-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(2, 8, 20, 0.65);
      z-index: 1000000;
      display: none;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(3px);
    }

    .dsh-whale-modal-card {
      width: 356px;
      max-width: 90vw;
      max-height: 78vh;
      background: var(--whale-bg-elevated);
      border: 1px solid var(--whale-border);
      border-radius: 14px;
      box-shadow: 0 16px 42px rgba(0, 0, 0, 0.75);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      color: var(--whale-text-primary);
    }

    .dsh-whale-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 11px 16px;
      border-bottom: 1px solid rgba(86, 180, 255, 0.24);
      font-weight: 600;
      font-size: 13.5px;
      color: var(--whale-accent);
    }

    .dsh-whale-modal-close {
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      color: var(--whale-text-secondary);
      padding: 2px 6px;
      border-radius: 6px;
    }

    .dsh-whale-tabs {
      display: flex;
      gap: 4px;
      padding: 8px 12px 0;
      border-bottom: 1px solid rgba(86, 180, 255, 0.18);
      background: rgba(0, 0, 0, 0.2);
    }

    .dsh-whale-tab-btn {
      flex: 1;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: #8ab4d8;
      font-size: 11.5px;
      font-weight: 500;
      padding: 6px 2px 8px;
      cursor: pointer;
    }
    .dsh-whale-tab-btn.active {
      color: var(--whale-accent);
      border-bottom-color: var(--whale-accent);
      font-weight: 600;
    }

    .dsh-whale-modal-body {
      padding: 12px 16px;
      overflow-y: auto;
      font-size: 12px;
    }

    .dsh-whale-list-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 9px 11px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(86, 180, 255, 0.2);
      margin-bottom: 8px;
      cursor: pointer;
    }
    .dsh-whale-list-item:hover, .dsh-whale-list-item.active {
      background: rgba(56, 189, 248, 0.16);
      border-color: rgba(56, 189, 248, 0.65);
    }
  `;
    container.appendChild(style);
    // 1. Header Anchor (Drag Handle + Collapse Pill + Sound Pill + LLM Speech Bubble)
    const headerAnchor = document.createElement('div');
    headerAnchor.className = 'dsh-whale-header-anchor';
    const topBar = document.createElement('div');
    topBar.className = 'dsh-whale-top-bar';
    const dragHandle = document.createElement('div');
    dragHandle.className = 'dsh-whale-drag-handle';
    dragHandle.setAttribute('role', 'button');
    dragHandle.setAttribute('tabindex', '0');
    dragHandle.setAttribute('aria-label', '按住拖动鲸鱼娘挂件位置');
    dragHandle.textContent = '🐋 深度求索鲸鱼娘';
    topBar.appendChild(dragHandle);
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'dsh-whale-collapse-pill';
    toggleBtn.setAttribute('aria-label', '收起或展开鲸鱼娘面板');
    toggleBtn.textContent = '收起';
    topBar.appendChild(toggleBtn);
    const soundBtn = document.createElement('button');
    soundBtn.type = 'button';
    soundBtn.className = 'dsh-whale-collapse-pill dsh-whale-sound-pill';
    soundBtn.setAttribute('aria-label', '切换伴奏木鱼音效开关');
    soundBtn.title = soundEnabled ? '伴奏木鱼音效：开' : '伴奏木鱼音效：静音';
    soundBtn.setAttribute('aria-pressed', String(soundEnabled));
    soundBtn.textContent = soundEnabled ? '🔔' : '🔕';
    topBar.appendChild(soundBtn);
    headerAnchor.appendChild(topBar);
    const speechBubble = document.createElement('div');
    speechBubble.className = 'dsh-whale-bubble';
    speechBubble.textContent = '你好呀，我是深度求索鲸鱼娘！随时准备为你播报 LLM 回复并敲木鱼伴奏~';
    headerAnchor.appendChild(speechBubble);
    container.appendChild(headerAnchor);
    // 2. 3D Whale Girl Stage
    const stage = document.createElement('div');
    stage.className = 'dsh-whale-stage';
    stage.setAttribute('role', 'button');
    stage.setAttribute('tabindex', '0');
    stage.setAttribute('aria-label', '点击投喂白米饭，给 3D 鲸鱼娘增重');
    const stage3D = new WhaleStage3D({ modelUrl: options.initialModelUrl });
    stage3D.mount(stage);
    const meritBadge = document.createElement('div');
    meritBadge.className = 'dsh-whale-merit-badge';
    meritBadge.textContent = '体重 0kg';
    meritBadge.title = '点击查看鲸鱼娘体重簿与每日增重';
    meritBadge.style.cursor = 'pointer';
    stage.appendChild(meritBadge);
    container.appendChild(stage);
    // 3. Consolidated Dock Card
    const dockCard = document.createElement('div');
    dockCard.className = 'dsh-whale-dock-card';
    const toolbar = document.createElement('div');
    toolbar.className = 'dsh-whale-toolbar';
    const autoBtn = document.createElement('button');
    autoBtn.type = 'button';
    autoBtn.className = 'dsh-whale-btn';
    autoBtn.setAttribute('aria-label', '切换常驻木鱼伴奏');
    autoBtn.textContent = '▶ 伴奏';
    toolbar.appendChild(autoBtn);
    const voiceBtn = document.createElement('button');
    voiceBtn.type = 'button';
    voiceBtn.className = `dsh-whale-btn ${voiceEnabled ? 'is-active' : ''}`;
    voiceBtn.setAttribute('aria-label', '切换 LLM 语音播报开关');
    voiceBtn.textContent = voiceEnabled ? '🔊 朗读' : '🔇 朗读';
    toolbar.appendChild(voiceBtn);
    const settingsBtn = document.createElement('button');
    settingsBtn.type = 'button';
    settingsBtn.className = 'dsh-whale-btn';
    settingsBtn.setAttribute('aria-label', '打开鲸鱼娘伴奏与 3D 模型设置');
    settingsBtn.textContent = '⚙ 鲸鱼设置';
    toolbar.appendChild(settingsBtn);
    const meritBtn = document.createElement('button');
    meritBtn.type = 'button';
    meritBtn.className = 'dsh-whale-btn';
    meritBtn.setAttribute('aria-label', '查看鲸鱼娘体重簿与每日增重');
    meritBtn.textContent = '⚖️ 体重簿';
    toolbar.appendChild(meritBtn);
    dockCard.appendChild(toolbar);
    const tokenBar = document.createElement('div');
    tokenBar.className = 'dsh-whale-token-bar';
    tokenBar.title = '点击查看体重与 Token 投喂详情';
    tokenBar.textContent = '⚡ 投喂: 0 Tokens · 体重: 0kg';
    dockCard.appendChild(tokenBar);
    container.appendChild(dockCard);
    // 4. Modal Sheet
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'dsh-whale-modal-backdrop';
    modalBackdrop.setAttribute('role', 'dialog');
    modalBackdrop.setAttribute('aria-modal', 'true');
    const modalCard = document.createElement('div');
    modalCard.className = 'dsh-whale-modal-card';
    const modalHeader = document.createElement('div');
    modalHeader.className = 'dsh-whale-modal-header';
    const modalTitle = document.createElement('span');
    modalTitle.textContent = '鲸鱼设置';
    const modalClose = document.createElement('button');
    modalClose.type = 'button';
    modalClose.className = 'dsh-whale-modal-close';
    modalClose.setAttribute('aria-label', '关闭弹窗');
    modalClose.textContent = '×';
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(modalClose);
    const modalTabs = document.createElement('div');
    modalTabs.className = 'dsh-whale-tabs';
    modalTabs.style.display = 'none';
    const modalBody = document.createElement('div');
    modalBody.className = 'dsh-whale-modal-body';
    modalCard.appendChild(modalHeader);
    modalCard.appendChild(modalTabs);
    modalCard.appendChild(modalBody);
    modalBackdrop.appendChild(modalCard);
    container.appendChild(modalBackdrop);
    const closeModal = () => {
        modalBackdrop.style.display = 'none';
    };
    modalClose.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop)
            closeModal();
    });
    stage.addEventListener('mousemove', (e) => {
        const rect = stage.getBoundingClientRect();
        const normX = ((e.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
        const normY = ((e.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
        stage3D.setPointerLook(normX, -normY);
    });
    stage.addEventListener('mouseleave', () => {
        stage3D.setPointerLook(0, 0);
    });
    function animateKnock() {
        stage3D.triggerKnockWave();
        stage.style.transform = 'scale(0.95)';
        const t = setTimeout(() => {
            sparkTimers.delete(t);
            stage.style.transform = 'scale(1)';
        }, 110);
        sparkTimers.add(t);
    }
    const triggerUserKnock = () => {
        animateKnock();
        triggerKnockEffect('🍚 投喂白米饭 +1kg');
        if (options.onKnock) {
            options.onKnock();
        }
    };
    stage.addEventListener('click', triggerUserKnock);
    stage.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            triggerUserKnock();
        }
    });
    // Dragging
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialLeft = 0;
    let initialTop = 0;
    dragHandle.addEventListener('pointerdown', (e) => {
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        const rect = container.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        container.style.right = 'auto';
        container.style.bottom = 'auto';
        container.style.left = `${initialLeft}px`;
        container.style.top = `${initialTop}px`;
    });
    const onWindowPointerMove = (e) => {
        if (!isDragging)
            return;
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        container.style.left = `${initialLeft + dx}px`;
        container.style.top = `${initialTop + dy}px`;
    };
    const onWindowPointerUp = () => {
        isDragging = false;
    };
    const onWindowKeyDown = (e) => {
        if (e.key === 'Escape' && modalBackdrop.style.display === 'flex') {
            closeModal();
        }
    };
    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('keydown', onWindowKeyDown);
    autoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        options.onToggleAuto?.();
    });
    voiceBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        voiceEnabled = !voiceEnabled;
        voiceBtn.textContent = voiceEnabled ? '🔊 朗读' : '🔇 朗读';
        voiceBtn.className = `dsh-whale-btn ${voiceEnabled ? 'is-active' : ''}`;
        options.onToggleVoice?.(voiceEnabled);
    });
    soundBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        soundEnabled = !soundEnabled;
        soundBtn.textContent = soundEnabled ? '🔔' : '🔕';
        soundBtn.title = soundEnabled ? '伴奏木鱼音效：开' : '伴奏木鱼音效：静音';
        soundBtn.setAttribute('aria-pressed', String(soundEnabled));
        options.onToggleSound?.(soundEnabled);
    });
    const renderSettingsTabContent = () => {
        modalBody.replaceChildren();
        if (currentSettingsTab === 'speech') {
            const tipBox = document.createElement('div');
            tipBox.style.cssText = 'font-size: 11px; color: #bae6fd; margin-bottom: 10px; padding: 6px 10px; background: rgba(56,189,248,0.14); border-radius: 6px; border: 1px solid rgba(56,189,248,0.3); line-height: 1.5;';
            tipBox.textContent = '🐋 完全替换模式：当 LLM 返回新回复时，鲸鱼娘会自动通过 Web Speech 逐句朗读，并按下方节拍自动敲击木鱼伴奏。';
            modalBody.appendChild(tipBox);
            // Accompaniment tempo control
            const currentInterval = options.getAccompanimentIntervalMs ? options.getAccompanimentIntervalMs() : 1200;
            const tempoLabel = document.createElement('div');
            tempoLabel.style.cssText = 'font-size: 12px; color: #94cbff; margin-bottom: 6px;';
            tempoLabel.textContent = `朗读伴奏节拍间隔：${currentInterval} ms`;
            modalBody.appendChild(tempoLabel);
            const tempoRow = document.createElement('div');
            tempoRow.style.cssText = 'display: flex; gap: 6px; margin-bottom: 12px;';
            for (const presetMs of [600, 900, 1200, 1800]) {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = `dsh-whale-btn ${presetMs === currentInterval ? 'is-active' : ''}`;
                b.textContent = `${presetMs}ms`;
                b.addEventListener('click', (e) => {
                    e.stopPropagation();
                    options.onSetAccompanimentIntervalMs?.(presetMs);
                    renderSettingsTabContent();
                });
                tempoRow.appendChild(b);
            }
            modalBody.appendChild(tempoRow);
            // Quick test speech input
            const testInput = document.createElement('input');
            testInput.type = 'text';
            testInput.placeholder = '输入试听台词，让鲸鱼娘朗读并伴奏…';
            testInput.value = '深海波光粼粼，今天的代码一定能一次跑通！';
            testInput.style.cssText = 'width: 100%; box-sizing: border-box; background: #09152b; color: #e6f4ff; border: 1px solid rgba(86,180,255,0.4); border-radius: 8px; padding: 7px 9px; font-size: 12px; margin-bottom: 8px;';
            modalBody.appendChild(testInput);
            const testBtn = document.createElement('button');
            testBtn.type = 'button';
            testBtn.className = 'dsh-whale-btn is-active';
            testBtn.style.cssText = 'width: 100%; justify-content: center; padding: 7px; margin-bottom: 10px;';
            testBtn.textContent = '🔊 立即试听鲸鱼娘播报 + 木鱼伴奏';
            testBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (testInput.value.trim()) {
                    options.onTestSpeak?.(testInput.value.trim());
                }
            });
            modalBody.appendChild(testBtn);
            const recent = options.getRecentSpeeches ? options.getRecentSpeeches() : [];
            if (recent.length > 0) {
                const histTitle = document.createElement('div');
                histTitle.style.cssText = 'font-weight: 600; color: #94cbff; margin-bottom: 6px;';
                histTitle.textContent = '💬 最近 LLM 播报队列';
                modalBody.appendChild(histTitle);
                for (const seg of recent.slice(-5).reverse()) {
                    const row = document.createElement('div');
                    row.className = 'dsh-whale-list-item';
                    row.textContent = seg.text;
                    row.addEventListener('click', () => {
                        options.onTestSpeak?.(seg.text);
                    });
                    modalBody.appendChild(row);
                }
            }
            return;
        }
        if (currentSettingsTab === 'sound') {
            const presets = options.getSoundPresets ? options.getSoundPresets() : [];
            const currentSound = options.getCurrentSoundId ? options.getCurrentSoundId() : 'sandalwood';
            presets.forEach((preset) => {
                const item = document.createElement('div');
                const isCurrent = preset.id === currentSound;
                item.className = `dsh-whale-list-item ${isCurrent ? 'active' : ''}`;
                const leftCol = document.createElement('div');
                const titleDiv = document.createElement('div');
                titleDiv.style.cssText = 'font-weight: 600; color: #bae6fd;';
                titleDiv.textContent = `${preset.name} ${isCurrent ? '👉 (使用中)' : ''}`;
                const descDiv = document.createElement('div');
                descDiv.style.cssText = 'font-size: 11px; color: #8ab4d8; margin-top: 2px;';
                descDiv.textContent = preset.description;
                leftCol.appendChild(titleDiv);
                leftCol.appendChild(descDiv);
                const rightCol = document.createElement('div');
                rightCol.style.cssText = 'font-size: 12px; color: #38bdf8; white-space: nowrap; margin-left: 8px;';
                rightCol.textContent = isCurrent ? '已选' : '试听选择';
                item.appendChild(leftCol);
                item.appendChild(rightCol);
                item.addEventListener('click', () => {
                    options.onSelectSound?.(preset.id);
                    renderSettingsTabContent();
                });
                modalBody.appendChild(item);
            });
            return;
        }
        if (currentSettingsTab === 'voice') {
            const voices = options.getVoiceList ? options.getVoiceList() : [];
            const currentId = options.getCurrentVoiceId ? options.getCurrentVoiceId() : '';
            if (voices.length === 0) {
                const emptyTip = document.createElement('div');
                emptyTip.style.cssText = 'color: #8ab4d8; text-align: center; padding: 16px 0;';
                emptyTip.textContent = '当前浏览器正在加载系统语音包，请稍后再试';
                modalBody.appendChild(emptyTip);
            }
            else {
                voices.forEach((v) => {
                    const item = document.createElement('div');
                    const isCurrent = v.id === currentId;
                    item.className = `dsh-whale-list-item ${isCurrent ? 'active' : ''}`;
                    const leftCol = document.createElement('div');
                    const nameDiv = document.createElement('div');
                    nameDiv.style.cssText = 'font-weight: 600; color: #bae6fd;';
                    nameDiv.textContent = `${v.name} ${isCurrent ? '👉 (使用中)' : ''}`;
                    const descDiv = document.createElement('div');
                    descDiv.style.cssText = 'font-size: 11px; color: #8ab4d8; margin-top: 2px;';
                    descDiv.textContent = `${v.description} · ${v.lang}`;
                    leftCol.appendChild(nameDiv);
                    leftCol.appendChild(descDiv);
                    const rightCol = document.createElement('div');
                    rightCol.style.cssText = 'font-size: 12px; color: #38bdf8; white-space: nowrap; margin-left: 8px;';
                    rightCol.textContent = isCurrent ? '已选' : '选择';
                    item.appendChild(leftCol);
                    item.appendChild(rightCol);
                    item.addEventListener('click', () => {
                        options.onSelectVoice?.(v.id);
                        renderSettingsTabContent();
                    });
                    modalBody.appendChild(item);
                });
            }
            return;
        }
        if (currentSettingsTab === 'model') {
            const currentUrl = options.getModelUrl ? options.getModelUrl() : stage3D.getModelUrl();
            const tip = document.createElement('div');
            tip.style.cssText = 'font-size: 11px; color: #bae6fd; margin-bottom: 10px; padding: 6px 10px; background: rgba(56,189,248,0.14); border-radius: 6px; border: 1px solid rgba(56,189,248,0.3); line-height: 1.5;';
            tip.textContent = '默认使用内置程序化 3D 深度求索鲸鱼娘模型。当你准备好自定义 .glb / .gltf 模型文件时，可在下方填入 URL 即时切换。';
            modalBody.appendChild(tip);
            const urlInput = document.createElement('input');
            urlInput.type = 'text';
            urlInput.placeholder = '例如: /assets/models/deepseek-whale.glb（留空使用内置 3D 鲸鱼娘）';
            urlInput.value = currentUrl;
            urlInput.style.cssText = 'width: 100%; box-sizing: border-box; background: #09152b; color: #e6f4ff; border: 1px solid rgba(86,180,255,0.4); border-radius: 8px; padding: 8px; font-size: 12px; margin-bottom: 8px;';
            modalBody.appendChild(urlInput);
            const saveModelBtn = document.createElement('button');
            saveModelBtn.type = 'button';
            saveModelBtn.className = 'dsh-whale-btn is-active';
            saveModelBtn.style.cssText = 'width: 100%; justify-content: center; padding: 8px;';
            saveModelBtn.textContent = '应用 3D 模型设置';
            saveModelBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const nextUrl = urlInput.value.trim();
                stage3D.loadExternalModel(nextUrl);
                options.onSetModelUrl?.(nextUrl);
            });
            modalBody.appendChild(saveModelBtn);
            return;
        }
        if (currentSettingsTab === 'token') {
            const currentStep = options.getTokensPerMerit ? options.getTokensPerMerit() : 10000;
            const tipBox = document.createElement('div');
            tipBox.style.cssText = 'font-size: 11px; color: #bae6fd; margin-bottom: 12px; padding: 6px 10px; background: rgba(56,189,248,0.14); border-radius: 6px; border: 1px solid rgba(56,189,248,0.3); line-height: 1.5;';
            tipBox.textContent = '正数：每 N Tokens 投喂增重 1kg；负数：每 |N| Tokens 减重 1kg。范围 ±1 ~ ±10,000,000。';
            modalBody.appendChild(tipBox);
            const currentLine = document.createElement('div');
            currentLine.style.cssText = 'font-size: 12px; color: #94cbff; margin-bottom: 8px;';
            currentLine.textContent = `当前设置：${formatMeritCount(currentStep)} Tokens / 增重 1kg`;
            modalBody.appendChild(currentLine);
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'dsh-whale-token-input';
            input.value = String(currentStep);
            input.style.cssText = 'width: 100%; box-sizing: border-box; background: #09152b; color: #e6f4ff; border: 1px solid rgba(86,180,255,0.45); border-radius: 8px; padding: 8px; font-size: 14px; margin-bottom: 8px;';
            modalBody.appendChild(input);
            const status = document.createElement('div');
            status.style.cssText = 'font-size: 11px; color: #7dd3fc; min-height: 16px; margin-bottom: 8px;';
            modalBody.appendChild(status);
            const presets = document.createElement('div');
            presets.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;';
            for (const preset of [1000, 10000, 100000, -10000]) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'dsh-whale-btn';
                btn.textContent = preset > 0 ? `${formatTokenCount(preset)}/1kg` : `减 ${formatTokenCount(Math.abs(preset))}/1kg`;
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    input.value = String(preset);
                });
                presets.appendChild(btn);
            }
            modalBody.appendChild(presets);
            const saveBtn = document.createElement('button');
            saveBtn.type = 'button';
            saveBtn.className = 'dsh-whale-btn is-active';
            saveBtn.textContent = '保存 Token 设置';
            saveBtn.style.cssText = 'width: 100%; justify-content: center; padding: 8px;';
            saveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = Number(input.value);
                if (!Number.isFinite(value) || value === 0 || Math.abs(value) > 10000000) {
                    status.textContent = '请输入非零值，范围 ±1 ~ ±10,000,000';
                    return;
                }
                const res = options.onSetTokensPerMerit?.(Math.trunc(value));
                if (res && typeof res.then === 'function') {
                    ;
                    res.then(ok => {
                        status.textContent = ok ? '已保存' : '保存失败';
                        currentLine.textContent = `当前设置：${formatMeritCount(Math.trunc(value))} Tokens / 增重 1kg`;
                    });
                }
                else {
                    status.textContent = '已保存';
                    currentLine.textContent = `当前设置：${formatMeritCount(Math.trunc(value))} Tokens / 增重 1kg`;
                }
            });
            modalBody.appendChild(saveBtn);
        }
    };
    const openSettingsModal = (initialTab = 'speech') => {
        currentSettingsTab = initialTab;
        modalTitle.textContent = '⚙ 深度求索鲸鱼娘设置';
        modalTabs.style.display = 'flex';
        modalTabs.replaceChildren();
        const tabs = [
            { id: 'speech', label: '💬 播报伴奏' },
            { id: 'sound', label: '🔔 木鱼音色' },
            { id: 'voice', label: '🎙️ 发音人' },
            { id: 'model', label: '🧊 3D模型' },
            { id: 'token', label: '⚡ Token' }
        ];
        tabs.forEach((tab) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `dsh-whale-tab-btn ${currentSettingsTab === tab.id ? 'active' : ''}`;
            btn.textContent = tab.label;
            btn.addEventListener('click', () => {
                currentSettingsTab = tab.id;
                Array.from(modalTabs.children).forEach((child, idx) => {
                    child.className = `dsh-whale-tab-btn ${tabs[idx].id === currentSettingsTab ? 'active' : ''}`;
                });
                renderSettingsTabContent();
            });
            modalTabs.appendChild(btn);
        });
        renderSettingsTabContent();
        modalBackdrop.style.display = 'flex';
    };
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openSettingsModal(currentSettingsTab);
    });
    const openMeritModal = (e) => {
        e.stopPropagation();
        options.onOpenMerit?.();
        modalTitle.textContent = '⚖️ 鲸鱼娘体重簿';
        modalTabs.style.display = 'none';
        modalBody.replaceChildren();
        const stats = options.getMeritRecords();
        const summaryBox = document.createElement('div');
        summaryBox.style.cssText = `
      display: flex;
      justify-content: space-around;
      background: #0a1830;
      border: 1px solid rgba(86, 180, 255, 0.35);
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 14px;
      text-align: center;
    `;
        const makeCol = (label, weightVal, subLabel) => {
            const col = document.createElement('div');
            const l = document.createElement('div');
            l.style.cssText = 'font-size: 11px; color: #94cbff;';
            l.textContent = label;
            const m = document.createElement('div');
            m.style.cssText = 'font-size: 20px; font-weight: bold; color: #38bdf8; margin-top: 2px;';
            m.textContent = weightVal;
            const t = document.createElement('div');
            t.style.cssText = 'font-size: 9px; color: #7dd3fc; margin-top: 2px;';
            t.textContent = subLabel;
            col.appendChild(l);
            col.appendChild(m);
            col.appendChild(t);
            return col;
        };
        summaryBox.appendChild(makeCol('今日增重', formatWeightDelta(stats.todayMerit), `⚡ 消耗 ${formatTokenLabel(stats.todayTokens ?? 0)}`));
        summaryBox.appendChild(makeCol('当前总体重', formatWhaleWeight(stats.totalMerit), `累计 ${formatTokenLabel(stats.totalTokens ?? 0)}`));
        modalBody.appendChild(summaryBox);
        const histTitle = document.createElement('div');
        histTitle.style.cssText = 'font-weight: 600; color: #94cbff; margin-bottom: 8px;';
        histTitle.textContent = '📅 每日投喂增重记录';
        modalBody.appendChild(histTitle);
        if (stats.records && stats.records.length > 0) {
            stats.records.forEach((rec) => {
                const item = document.createElement('div');
                item.className = 'dsh-whale-list-item';
                const left = document.createElement('div');
                left.textContent = `${rec.displayDate} (${rec.dateKey})`;
                if (rec.tokens && rec.tokens > 0) {
                    const tokSpan = document.createElement('div');
                    tokSpan.style.cssText = 'font-size: 10px; color: #7dd3fc; margin-top: 2px;';
                    tokSpan.textContent = `⚡ 投喂 ${formatTokenLabel(rec.tokens)}`;
                    left.appendChild(tokSpan);
                }
                const right = document.createElement('div');
                right.style.cssText = 'font-size: 13px; font-weight: bold; color: #38bdf8;';
                right.textContent = formatWeightDelta(rec.count);
                item.appendChild(left);
                item.appendChild(right);
                modalBody.appendChild(item);
            });
        }
        else {
            const emptyTip = document.createElement('div');
            emptyTip.style.cssText = 'color: #8ab4d8; text-align: center; padding: 14px 0;';
            emptyTip.textContent = '今日尚无投喂记录，点击鲸鱼娘投喂白米饭吧~';
            modalBody.appendChild(emptyTip);
        }
        modalBackdrop.style.display = 'flex';
    };
    meritBtn.addEventListener('click', openMeritModal);
    tokenBar.addEventListener('click', openMeritModal);
    meritBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        openMeritModal(e);
    });
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isCollapsed = !isCollapsed;
        container.classList.toggle('is-collapsed', isCollapsed);
        toggleBtn.textContent = isCollapsed ? '展开' : '收起';
    });
    function triggerKnockEffect(text = '🍚 投喂白米饭 +1kg') {
        const rect = stage.getBoundingClientRect();
        const spark = document.createElement('div');
        spark.className = 'dsh-whale-sparkle';
        spark.textContent = text;
        spark.style.left = `${rect.left + rect.width / 2}px`;
        spark.style.top = `${rect.top}px`;
        container.appendChild(spark);
        const timer = setTimeout(() => {
            sparkTimers.delete(timer);
            spark.remove();
        }, 850);
        sparkTimers.add(timer);
    }
    const unmount = () => {
        window.removeEventListener('pointermove', onWindowPointerMove);
        window.removeEventListener('pointerup', onWindowPointerUp);
        window.removeEventListener('keydown', onWindowKeyDown);
        for (const timer of sparkTimers) {
            clearTimeout(timer);
        }
        sparkTimers.clear();
        stage3D.dispose();
        container.remove();
        if (activeWhaleInstanceUnmount === unmount) {
            activeWhaleInstanceUnmount = null;
        }
    };
    activeWhaleInstanceUnmount = unmount;
    return {
        mount(target = document.body) {
            target.appendChild(container);
        },
        unmount,
        update(merit, speechText, isAutoRunning, tokenStats, isSpeaking) {
            meritBadge.textContent = `体重 ${formatWhaleWeight(merit)}`;
            speechBubble.textContent = speechText;
            speechBubble.classList.toggle('is-speaking', !!isSpeaking);
            if (typeof isAutoRunning === 'boolean') {
                autoBtn.textContent = isAutoRunning ? '⏹ 停止' : '▶ 伴奏';
                autoBtn.className = `dsh-whale-btn ${isAutoRunning ? 'is-active' : ''}`;
            }
            if (tokenStats) {
                tokenBar.textContent = `⚡ 投喂: ${formatTokenLabel(tokenStats.todayTokens)} · 体重: ${formatWhaleWeight(merit)}`;
            }
        },
        setSpeaking(active, level) {
            speechBubble.classList.toggle('is-speaking', active);
            stage3D.setSpeaking(active, level);
        },
        pulseSpeechSyllable() {
            stage3D.pulseSpeechSyllable();
        },
        loadExternalModel(url) {
            stage3D.loadExternalModel(url);
        },
        triggerKnockEffect,
        animateKnock
    };
}
//# sourceMappingURL=widget-ui.js.map