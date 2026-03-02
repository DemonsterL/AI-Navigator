(function () {
  'use strict';

  let navPanel = null;
  let scrollContainer = null;
  let searchInput = null;
  let tooltip = null;
  let currentActiveIndex = -1;
  let lastQuestionCount = 0;
  let currentPlatform = null;
  let currentSearchTerm = '';
  let isFirstLoad = true;

  // 拖动相关状态
  let isDragging = false;
  let dragStartY = 0;
  let panelStartTop = 0;
  let currentEdge = 'right'; // 'left' | 'right'
  let panelTopPercent = 15; // 面板垂直位置百分比 (15% 替代 原先的 50%)
  let panelExpandTime = 0; // 面板展开时间戳
  let isPinned = false; // 是否固定面板
  let panelOpacity = 0.4; // 面板透明度 (0.1 - 1.0)

  // 缩放状态
  let panelHeight = null;
  let isResizingTop = false;
  let isResizingBottom = false;
  let resizeStartMouseY = 0;
  let resizeStartHeight = 0;
  let resizeStartTop = 0;

  // 平台配置

  // 各平台上下文Token限制配置
  const CONTEXT_LIMITS = {
    chatgpt: 128000,      // GPT-4 Turbo
    gemini: 1000000,       // Gemini Pro
    kimi: 200000,          // Kimi
    qianwen: 8000,         // 通义千问
    doubao: 4000,          // 豆包
    claude: 200000,        // Claude
    khoj: 128000          // Khoj (使用OpenAI模型)
  };

  // 估算文本的token数量（简单估算：中文约1字=1token，英文约4字符=1token）
  function estimateTokens(text) {
    if (!text) return 0;
    // 中文字符
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    // 英文单词和数字
    const englishTokens = Math.ceil((text.length - chineseChars) / 4);
    return chineseChars + englishTokens;
  }

  // 获取当前上下文使用情况
  function getContextUsage() {
    const questions = getQuestions();
    const platform = PLATFORM_CONFIG[currentPlatform];
    const contextLimit = CONTEXT_LIMITS[currentPlatform] || 8000;
    
    let totalTokens = 0;
    
    // 遍历所有问题，估算每个问题的token
    questions.forEach((q, index) => {
      let text = '';
      if (platform && platform.getTextContent) {
        text = platform.getTextContent(q);
      } else {
        text = q.innerText || q.textContent || '';
      }
      totalTokens += estimateTokens(text);
    });
    
    const percentage = Math.min(100, Math.round((totalTokens / contextLimit) * 100));
    
    return {
      used: totalTokens,
      limit: contextLimit,
      percentage: percentage
    };
  }
  const PLATFORM_CONFIG = {
    chatgpt: {
      name: 'ChatGPT',
      hostPatterns: ['chat.openai.com', 'chatgpt.com'],
      selectors: [
        '[data-message-author-role="user"]',
        '.text-base[data-message-author-role="user"]',
        '[class*="agent-turn"] [data-message-author-role="user"]'
      ],
      themeClass: 'chatgpt-theme',
      maxItems: 40,
      contextLimit: 128000, // gpt-4o 上下文限制
      getTextContent: (el) => {
        const img = el.querySelector('img');
        if (img && !el.innerText?.trim()) return '[图片]';
        const textEl = el.querySelector('.whitespace-pre-wrap') || el;
        return textEl.innerText || textEl.textContent || '';
      }
    },
    gemini: {
      name: 'Gemini',
      hostPatterns: ['gemini.google.com'],
      selectors: [
        '.user-query-bubble-with-background',
        '[data-message-author="user"]',
        '.query-content'
      ],
      themeClass: 'gemini-theme',
      maxItems: 80,
      contextLimit: 1000000, // Gemini 1.5 Pro 上下文限制
      getTextContent: (el) => {
        const img = el.querySelector('img');
        if (img && !el.innerText?.trim()) return '[图片]';
        return el.innerText || el.textContent || '';
      }
    },
    kimi: {
      name: 'Kimi',
      hostPatterns: ['kimi.moonshot.cn', 'kimi.com', 'www.kimi.com'],
      selectors: [
        '.user-content'
      ],
      themeClass: 'kimi-theme',
      maxItems: 200,
      contextLimit: 200000, // Kimi 上下文限制
      getTextContent: (el) => {
        const img = el.querySelector('img');
        if (img && !el.innerText?.trim()) return '[图片]';
        return el.innerText || el.textContent || '';
      }
    },
    qianwen: {
      name: '通义千问',
      hostPatterns: ['tongyi.aliyun.com', 'qianwen.aliyun.com', 'qianwen.com', 'www.qianwen.com'],
      selectors: [
        '[class*="bubble"][class*="right"]',
        '[class*="message-right"]',
        '[class*="self-message"]',
        '[class*="user-msg"]',
        '[class*="chatItem"][class*="user"]',
        '[class*="userMessage"]',
        '[data-role="user"]',
        '.chat-item-user',
        '[class*="questionItem"]',
        '[class*="human"]'
      ],
      themeClass: 'qianwen-theme',
      maxItems: 100,
      contextLimit: 128000, // 通义千问上下文限制
      getTextContent: (el) => {
        const img = el.querySelector('img');
        if (img && !el.innerText?.trim()) return '[图片]';
        return el.innerText || el.textContent || '';
      }
    },
    doubao: {
      name: '豆包',
      hostPatterns: ['doubao.com', 'www.doubao.com'],
      selectors: [
        '[data-testid="send_message_container"]',
        '[data-testid="message_text_content"]:not(.flow-markdown-body):not([class*="markdown"])'
      ],
      themeClass: 'doubao-theme',
      maxItems: 60,
      contextLimit: 128000, // 豆包上下文限制
      getTextContent: (el) => {
        const img = el.querySelector('img');
        if (img) {
          const text = el.innerText?.trim();
          return text ? text.substring(0, 30) : '[图片]';
        }
        return el.innerText || el.textContent || '';
      }
    },
    claude: {
      name: 'Claude',
      hostPatterns: ['claude.ai'],
      selectors: [
        '[data-testid="user-message"]',
        '[class*="user-message"]',
        '.flex.flex-col.items-end',
        '.font-user-message',
        '[data-is-user="true"]'
      ],
      filterElements: (elements) => {
        return Array.from(elements).filter(el => {
          if (el.getAttribute?.('data-is-user') === 'true') return true;
          if (el.getAttribute?.('data-testid') === 'user-message') return true;
          if (el.className?.includes('user-message')) return true;
          if (el.className?.includes('assistant-message')) return false;
          return false;
        });
      },
      themeClass: 'claude-theme',
      maxItems: 100,
      contextLimit: 200000, // Claude 上下文限制
      getTextContent: (el) => {
        const img = el.querySelector('img');
        if (img && !el.innerText?.trim()) return '[图片]';
        return el.innerText || el.textContent || '';
      }
    },
    khoj: {
      name: 'Khoj',
      hostPatterns: ['app.khoj.dev'],
      selectors: [
        'div[data-created]'
      ],
      filterElements: (elements) => {
        // 用户消息的 wrapper 没有 border-l- 类，khoj 回复有
        return Array.from(elements).filter(el => {
          const wrapper = el.querySelector('div[class*="chatMessageWrapper"]');
          if (!wrapper) return false;
          return !wrapper.className.includes('border-l-');
        });
      },
      themeClass: 'khoj-theme',
      maxItems: 80,
      contextLimit: 128000, // Khoj 上下文限制
      getTextContent: (el) => {
        const messageEl = el.querySelector('.chatMessage') || el;
        const img = el.querySelector('img');
        let rawText = messageEl.innerText || messageEl.textContent || '';
        if (!rawText.trim() && img) return '[图片]';
        return rawText.trim();
      }
    }
  };

  // 各平台聊天输入框选择器
  const INPUT_SELECTORS = {
    chatgpt: ['#prompt-textarea', 'textarea[data-id="root"]', 'form textarea'],
    gemini: ['rich-textarea', '.ql-editor', '[contenteditable="true"]'],
    kimi: ['[class*="editor"]', '[contenteditable="true"]', 'textarea'],
    qianwen: ['textarea', '[contenteditable="true"]', '[class*="input"]'],
    doubao: ['[data-testid="chat_input_input"]', 'textarea', '[contenteditable="true"]'],
    claude: ['[contenteditable="plaintext-only"]', '[contenteditable="true"]'],
    khoj: ['textarea#message', 'textarea', '[contenteditable="true"]']
  };

  function setupInputFocusListener() {
    const selectors = INPUT_SELECTORS[currentPlatform] || [];
    const handleFocus = () => {
      if (navPanel && !isPinned) {
        navPanel.classList.add('collapsed');
        navPanel.classList.remove('expanded');
      }
    };

    // 使用事件委托监听整个文档
    document.addEventListener('focusin', (e) => {
      for (const selector of selectors) {
        if (e.target.matches && e.target.matches(selector)) {
          handleFocus();
          return;
        }
        // 检查是否是子元素
        if (e.target.closest && e.target.closest(selector)) {
          handleFocus();
          return;
        }
      }
    });

    // 也监听点击事件，以防某些平台的输入框不触发focus
    document.addEventListener('click', (e) => {
      for (const selector of selectors) {
        if (e.target.matches && e.target.matches(selector)) {
          handleFocus();
          return;
        }
        if (e.target.closest && e.target.closest(selector)) {
          handleFocus();
          return;
        }
      }
    });
  }

  function detectPlatform() {
    const hostname = window.location.hostname;
    for (const [key, config] of Object.entries(PLATFORM_CONFIG)) {
      if (config.hostPatterns.some(pattern => hostname.includes(pattern))) {
        return key;
      }
    }
    return null;
  }

  // 创建自定义 tooltip
  function createTooltip() {
    if (tooltip) return tooltip;
    tooltip = document.createElement('div');
    tooltip.id = 'ai-nav-tooltip';
    document.body.appendChild(tooltip);
    return tooltip;
  }

  function showTooltip(text, targetEl) {
    if (!tooltip) createTooltip();
    tooltip.textContent = text;

    // 计算需要等待的时间：如果面板刚展开，等待1秒确保布局稳定
    const timeSinceExpand = Date.now() - panelExpandTime;
    const animationDuration = 1000;
    const delay = timeSinceExpand < animationDuration ? (animationDuration - timeSinceExpand) : 0;

    // 先完全隐藏，不添加visible类
    tooltip.style.visibility = 'hidden';
    tooltip.style.left = '-9999px';
    tooltip.style.top = '-9999px';
    tooltip.style.transform = 'none';
    tooltip.classList.remove('visible');

    // 等待面板动画完成后再计算位置并显示
    setTimeout(() => {
      requestAnimationFrame(() => {
        const tooltipRect = tooltip.getBoundingClientRect();
        const rect = targetEl.getBoundingClientRect();

        // 根据面板位置决定 tooltip 显示方向
        if (currentEdge === 'right') {
          tooltip.style.left = (rect.left - tooltipRect.width - 8) + 'px';
        } else {
          tooltip.style.left = (rect.right + 8) + 'px';
        }
        tooltip.style.top = (rect.top + rect.height / 2 - tooltipRect.height / 2) + 'px';

        // 恢复transform，添加visible类并显示
        tooltip.style.transform = '';
        tooltip.style.visibility = 'visible';
        tooltip.classList.add('visible');
      });
    }, delay);
  }

  function hideTooltip() {
    if (tooltip) {
      tooltip.classList.remove('visible');
    }
  }

  // 设置拖动功能
  function setupDrag() {
    const dragHandle = navPanel.querySelector('#ai-nav-drag-handle');
    if (!dragHandle) return;

    dragHandle.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragStartY = e.clientY;
      panelStartTop = panelTopPercent;
      panelStartTop = navPanel.offsetTop; // Use current offsetTop for dragging
      navPanel.classList.add('dragging');
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (isResizingTop) {
        const deltaY = e.clientY - resizeStartMouseY;
        const newHeight = resizeStartHeight - deltaY;
        const newTop = resizeStartTop + deltaY;
        if (newHeight >= 150) { // 最小高度限制
          navPanel.style.height = `${newHeight}px`;
          panelTopPercent = (newTop / window.innerHeight) * 100;
          navPanel.style.top = `${panelTopPercent}%`;
        }
        return;
      }

      if (isResizingBottom) {
        const deltaY = e.clientY - resizeStartMouseY;
        const newHeight = resizeStartHeight + deltaY;
        if (newHeight >= 150) {
          navPanel.style.height = `${newHeight}px`;
        }
        return;
      }

      if (isDragging) {
        // 拖动时临时移除过渡动画，保证跟手
        navPanel.style.transition = 'none';

        const newTop = e.clientY - dragStartY;
        // 限制在屏幕范围内
        const percent = (newTop / window.innerHeight) * 100;
        panelTopPercent = Math.max(0, Math.min(100, percent));

        navPanel.style.top = `${panelTopPercent}%`;
        updatePanelPosition();
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (isResizingTop || isResizingBottom) {
        isResizingTop = false;
        isResizingBottom = false;
        document.body.style.cursor = '';
        try {
          localStorage.setItem('jumpai_height', navPanel.style.height);
          localStorage.setItem('jumpai_top', panelTopPercent.toString());
        } catch (err) { }
      }

      if (isDragging) {
        isDragging = false;

        // 恢复所有动画
        navPanel.style.transition = '';
        navPanel.classList.remove('dragging');

        // 计算当前中心点决定吸附边缘
        const currentLeft = navPanel.getBoundingClientRect().left;
        const centerX = currentLeft + navPanel.offsetWidth / 2;
        const windowCenterX = window.innerWidth / 2;

        // 吸附边缘
        if (centerX < windowCenterX) {
          currentEdge = 'left';
        } else {
          currentEdge = 'right';
        }
        try {
          localStorage.setItem('jumpai_edge', currentEdge);
          localStorage.setItem('jumpai_top', panelTopPercent.toString());
        } catch (err) { }
        updatePanelPosition();
      }
    });

    // 双击切换左右边缘
    dragHandle.addEventListener('dblclick', () => {
      currentEdge = currentEdge === 'right' ? 'left' : 'right';
      try {
        localStorage.setItem('jumpai_edge', currentEdge);
      } catch (err) { }
      updatePanelPosition();
    });
  }

  function updatePanelPosition() {
    navPanel.style.top = panelTopPercent + '%';

    if (currentEdge === 'right') {
      navPanel.classList.remove('edge-left');
      navPanel.classList.add('edge-right');
    } else {
      navPanel.classList.remove('edge-right');
      navPanel.classList.add('edge-left');
    }
  }

  function createPanel() {
    if (navPanel) return navPanel;

    const platform = PLATFORM_CONFIG[currentPlatform];
    const platformKey = currentPlatform; // Use currentPlatform as platformKey

    navPanel = document.createElement('div');
    navPanel.id = 'ai-nav-panel';
    navPanel.className = `${platformKey}-theme edge-${currentEdge} ${isPinned ? 'expanded' : 'collapsed'}`;
    navPanel.style.top = `${panelTopPercent}%`;
    if (panelHeight) {
      navPanel.style.height = panelHeight;
    }
    document.body.appendChild(navPanel);

    // 添加上下拖拽手柄
    const resizeTop = document.createElement('div');
    resizeTop.className = 'ai-nav-resize-handle top';

    const resizeBottom = document.createElement('div');
    resizeBottom.className = 'ai-nav-resize-handle bottom';

    navPanel.appendChild(resizeTop);
    navPanel.appendChild(resizeBottom);

    // 标题栏（含拖动手柄、搜索框、固定按钮）
    const header = document.createElement('div');
    header.id = 'ai-nav-header';

    const dragHandle = document.createElement('div');
    dragHandle.id = 'ai-nav-drag-handle';
    // 行列点阵图标
    dragHandle.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9,3H11V5H9V3M13,3H15V5H13V3M9,7H11V9H9V7M13,7H15V9H13V7M9,11H11V13H9V11M13,11H15V13H13V11M9,15H11V17H9V15M13,15H15V17H13V15M9,19H11V21H9V19M13,19H15V21H13V19Z"/></svg>';
    dragHandle.title = '拖动移动 / 双击切换左右';
    header.appendChild(dragHandle);

    searchInput = document.createElement('input');
    searchInput.id = 'ai-nav-search';
    searchInput.type = 'text';
    searchInput.placeholder = '搜索...';
    searchInput.addEventListener('input', (e) => {
      currentSearchTerm = e.target.value.toLowerCase();
      rebuildNavigation(getQuestions());
    });
    header.appendChild(searchInput);

    // 设置按钮 (使用齿轮图标代替图钉)
    const settingsIconSVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/></svg>';

    const settingsBtn = document.createElement('div');
    settingsBtn.id = 'ai-nav-settings-btn';
    settingsBtn.innerHTML = settingsIconSVG;
    settingsBtn.title = '设置';
    if (isPinned) {
      settingsBtn.classList.add('pinned');
    }

    const settingsPopover = document.createElement('div');
    settingsPopover.id = 'ai-nav-settings-popover';

    // 固定面板 Switch
    const pinRow = document.createElement('div');
    pinRow.className = 'ai-nav-settings-row';
    pinRow.innerHTML = `
      <span>固定面板</span>
      <label class="ai-nav-switch">
        <input type="checkbox" id="ai-nav-pin-toggle" ${isPinned ? 'checked' : ''}>
        <span class="ai-nav-slider"></span>
      </label>
    `;

    // 透明度 Slider
    const opacityRow = document.createElement('div');
    opacityRow.className = 'ai-nav-settings-row opacity-row';
    opacityRow.innerHTML = `
      <div class="opacity-label">
        <span>面板透明度</span>
        <span id="ai-nav-opacity-value">${Math.round(panelOpacity * 100)}%</span>
      </div>
      <input type="range" id="ai-nav-opacity-range" min="10" max="100" value="${Math.round(panelOpacity * 100)}">
    `;

    settingsPopover.appendChild(pinRow);
    settingsPopover.appendChild(opacityRow);

    // 上下文用量显示
    const contextRow = document.createElement('div');
    contextRow.className = 'ai-nav-settings-row context-row';
    contextRow.innerHTML = `
      <div class="context-label">
        <span>上下文用量</span>
        <span id="ai-nav-context-text">0% (0/0)</span>
      </div>
      <div class="context-bar-container">
        <div id="ai-nav-context-bar" class="context-bar low"></div>
      </div>
    `;
    settingsPopover.appendChild(contextRow);
    settingsPopover.appendChild(contextRow);


    settingsBtn.appendChild(settingsPopover);
    header.appendChild(settingsBtn);

    navPanel.appendChild(header);

    // 吸附边缘初始化
    const applyEdge = (edge) => {
      currentEdge = edge;
      try {
        localStorage.setItem('jumpai_edge', edge);
      } catch (e) { }
      navPanel.className = `${platformKey}-theme edge-${edge} ${isPinned ? 'expanded' : 'collapsed'}`;
      if (isPinned) {
        navPanel.classList.add('pinned');
      }
    };

    // 绑定缩放事件
    resizeTop.addEventListener('mousedown', (e) => {
      isResizingTop = true;
      resizeStartMouseY = e.clientY;
      resizeStartHeight = navPanel.offsetHeight;
      resizeStartTop = navPanel.offsetTop;
      document.body.style.cursor = 'ns-resize';
      e.preventDefault();
      e.stopPropagation();
    });

    resizeBottom.addEventListener('mousedown', (e) => {
      isResizingBottom = true;
      resizeStartMouseY = e.clientY;
      resizeStartHeight = navPanel.offsetHeight;
      document.body.style.cursor = 'ns-resize';
      e.preventDefault();
      e.stopPropagation();
    });

    // 绑定设置事件
    const pinToggle = settingsPopover.querySelector('#ai-nav-pin-toggle');
    pinToggle.addEventListener('change', (e) => {
      isPinned = e.target.checked;
      try {
        localStorage.setItem('jumpai_pinned', isPinned ? 'true' : 'false');
      } catch (err) { }

      if (isPinned) {
        settingsBtn.classList.add('pinned');
        navPanel.classList.add('expanded');
        navPanel.classList.remove('collapsed');
      } else {
        settingsBtn.classList.remove('pinned');
      }
    });

    const opacityRange = settingsPopover.querySelector('#ai-nav-opacity-range');
    const opacityValue = settingsPopover.querySelector('#ai-nav-opacity-value');

    // 设置初始 CSS Variable
    // 使用非线性缩放：当透明度在 10% 时，blur 为 0px (完全透视)；当 100% 时，blur 最大 30px
    const calcBlur = (op) => Math.max(0, (op - 0.1) / 0.9 * 30) + 'px';

    document.documentElement.style.setProperty('--ai-nav-panel-opacity', panelOpacity);
    document.documentElement.style.setProperty('--ai-nav-panel-blur', calcBlur(panelOpacity));

    opacityRange.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      opacityValue.textContent = val + '%';
      panelOpacity = val / 100;
      document.documentElement.style.setProperty('--ai-nav-panel-opacity', panelOpacity);
      document.documentElement.style.setProperty('--ai-nav-panel-blur', calcBlur(panelOpacity));

      try {
        localStorage.setItem('jumpai_opacity', panelOpacity.toString());
      } catch (err) { }
    });

    // 点击设置按钮展开/收起 Popover
    settingsBtn.addEventListener('click', (e) => {
      // 防止点击内部元素关闭
      if (e.target.closest('#ai-nav-settings-popover')) return;
      settingsPopover.classList.toggle('show');
      // 展开时更新上下文用量显示
      if (settingsPopover.classList.contains('show')) {
        updateContextDisplay();
      }
      // 展开时更新上下文用量显示
      if (settingsPopover.classList.contains('show')) {
        updateContextDisplay();
      }
    });

    // 点击外部关闭 Popover
    document.addEventListener('click', (e) => {
      if (!settingsBtn.contains(e.target)) {
        settingsPopover.classList.remove('show');
      }
    });

    scrollContainer = document.createElement('div');
    scrollContainer.id = 'ai-nav-scroll';
    navPanel.appendChild(scrollContainer);

    // 创建 tooltip
    createTooltip();

    navPanel.addEventListener('mouseenter', () => {
      navPanel.classList.remove('collapsed');
      navPanel.classList.add('expanded');
      panelExpandTime = Date.now(); // 记录展开时间
    });

    navPanel.addEventListener('mouseleave', () => {
      if (!isPinned) {
        navPanel.classList.remove('expanded');
        hideTooltip();
      }
    });

    // 监听聊天输入框点击，收缩面板
    setupInputFocusListener();

    scrollContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      scrollContainer.scrollTop += e.deltaY;
    }, { passive: false });

    // 设置拖动
    setupDrag();
    updatePanelPosition();

    return navPanel;
  }

  function getQuestions() {
    const platform = PLATFORM_CONFIG[currentPlatform];
    if (!platform) return [];

    for (const selector of platform.selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        // 如果平台定义了 filterElements，使用它来过滤元素
        if (platform.filterElements) {
          return platform.filterElements(elements);
        }
        return elements;
      }
    }
    return [];
  }

  function updateActiveState() {
    const items = scrollContainer.querySelectorAll('.ai-nav-item');
    items.forEach(item => {
      const index = parseInt(item.dataset.index, 10);
      if (index === currentActiveIndex) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  // 获取问题的完整文本
  function getQuestionText(q) {
    const platform = PLATFORM_CONFIG[currentPlatform];
    let text = '';
    if (platform && platform.getTextContent) {
      text = platform.getTextContent(q);
    } else {
      text = q.innerText || q.textContent || '';
    }
    return text.trim().replace(/\s+/g, ' ');
  }

  function rebuildNavigation(questions, scrollToBottom = false) {
    scrollContainer.innerHTML = '';

    const platform = PLATFORM_CONFIG[currentPlatform];
    const maxItems = platform ? (platform.maxItems || 50) : 50;

    if (questions.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'ai-nav-empty';
      empty.textContent = '暂无对话';
      scrollContainer.appendChild(empty);
      lastQuestionCount = 0;
      return;
    }

    lastQuestionCount = questions.length;
    let visibleCount = 0;

    // 根据各个平台的上下文长度上限截取最新的标题（舍弃因超过上下文而遗忘的老对话）
    const questionsArray = Array.from(questions);
    const startIndex = Math.max(0, questionsArray.length - maxItems);
    const validQuestions = questionsArray.slice(startIndex);

    validQuestions.forEach((q, mappedIndex) => {
      // 保持源 index 使 currentActiveIndex 与 DOM query 匹配
      const originalIndex = startIndex + mappedIndex;
      const text = getQuestionText(q);

      // 搜索过滤
      if (currentSearchTerm && !text.toLowerCase().includes(currentSearchTerm)) {
        return;
      }

      visibleCount++;
      // 完全依赖 CSS text-overflow: ellipsis 实现自适应长度截断
      const displayText = text;

      const item = document.createElement('div');
      item.className = 'ai-nav-item';
      item.dataset.index = originalIndex;
      item.dataset.fullText = text;
      if (originalIndex === currentActiveIndex) {
        item.classList.add('active');
      }

      const textSpan = document.createElement('span');
      textSpan.className = 'ai-nav-item-text';
      textSpan.textContent = displayText || `对话 ${originalIndex + 1}`;

      item.addEventListener('click', () => {
        currentActiveIndex = originalIndex;
        if (intersectionObserver) {
          intersectionObserver.disconnect();
        }
        // 使用 scrollIntoView + scroll-margin-top 来避免被导航栏遮挡
        q.style.scrollMarginTop = '100px';
        q.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => {
          setupScrollObserver();
        }, 800);
        updateActiveState();
      });

      // 悬停显示完整文字 tooltip（所有项都显示）
      item.addEventListener('mouseenter', () => {
        showTooltip(text, item);
      });

      item.addEventListener('mouseleave', () => {
        hideTooltip();
      });

      item.appendChild(textSpan);
      scrollContainer.appendChild(item);
    });

    // 无搜索结果提示
    if (visibleCount === 0 && currentSearchTerm) {
      const empty = document.createElement('div');
      empty.className = 'ai-nav-empty';
      empty.textContent = '无匹配结果';
      scrollContainer.appendChild(empty);
    }

    if (scrollToBottom) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }

  let intersectionObserver = null;

  function setupScrollObserver() {
    const questions = getQuestions();
    if (questions.length === 0) return;

    if (intersectionObserver) {
      intersectionObserver.disconnect();
    }

    intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const questions = getQuestions();
            const index = Array.from(questions).indexOf(entry.target);
            if (index !== -1 && index !== currentActiveIndex) {
              currentActiveIndex = index;
              updateActiveState();
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    questions.forEach((q) => intersectionObserver.observe(q));
  }

  // 简单的token估算函数（近似值）
  function estimateTokens(text) {
    if (!text) return 0;
    // 粗略估算：中文约1字1token，英文约4字母1token
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const nonChineseChars = text.replace(/[\u4e00-\u9fa5]/g, '').length;
    return Math.ceil(chineseChars + nonChineseChars / 4);
  }

  // 获取AI回复元素（用于计算上下文）
  function getAIResponses() {
    const platform = PLATFORM_CONFIG[currentPlatform];
    if (!platform) return [];

    const selectors = {
      chatgpt: '[data-message-author-role="assistant"]',
      gemini: '[data-message-author="model"], .model-response-content',
      kimi: '.assistant-content, [class*="assistant"] .content',
      qianwen: '[class*="bubble"][class*="left"], [class*="message-left"], [data-role="assistant"]',
      doubao: '[class*="assistant"], [data-testid="message_text_content"].flow-markdown-body',
      claude: '[data-testid="assistant-message"], [class*="assistant-message"]',
      khoj: 'div[data-created]'
    };

    const selector = selectors[currentPlatform];
    if (!selector) return [];

    const elements = document.querySelectorAll(selector);
    if (platform.filterElements && currentPlatform === 'khoj') {
      return Array.from(elements).filter(el => {
        const wrapper = el.querySelector('div[class*="chatMessageWrapper"]');
        if (!wrapper) return false;
        return wrapper.className.includes('border-l-');
      });
    }

    return Array.from(elements);
  }

  // 计算当前对话的上下文token用量
  function calculateContextUsage() {
    const questions = getQuestions();
    const responses = getAIResponses();
    let totalTokens = 0;

    // 计算用户提问的token
    questions.forEach(q => {
      const text = getQuestionText(q);
      totalTokens += estimateTokens(text);
    });

    // 计算AI回复的token
    responses.forEach(r => {
      const text = r.innerText || r.textContent || '';
      totalTokens += estimateTokens(text);
    });

    return totalTokens;
  }

  // 获取当前平台的上下文限制
  function getContextLimit() {
    return CONTEXT_LIMITS[currentPlatform] || 128000;
  }

  // 更新上下文用量显示
  function updateContextDisplay() {
    const contextBar = document.querySelector('#ai-nav-context-bar');
    const contextText = document.querySelector('#ai-nav-context-text');
    if (!contextBar || !contextText) return;

    const used = calculateContextUsage();
    const limit = getContextLimit();
    const percentage = Math.min(100, (used / limit) * 100);

    contextBar.style.width = percentage + '%';
    contextText.textContent = `${Math.round(percentage)}% (${formatNumber(used)}/${formatNumber(limit)})`;

    // 根据使用量改变颜色
    contextBar.classList.remove('low', 'medium', 'high', 'critical');
    if (percentage < 30) {
      contextBar.classList.add('low');
    } else if (percentage < 60) {
      contextBar.classList.add('medium');
    } else if (percentage < 85) {
      contextBar.classList.add('high');
    } else {
      contextBar.classList.add('critical');
    }
  }

  // 格式化数字显示
  function formatNumber(num) {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + 'w';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  }

  function checkForNewMessages() {
    const questions = getQuestions();
    const currentCount = questions.length;

    if (currentCount !== lastQuestionCount) {
      rebuildNavigation(questions, currentCount > lastQuestionCount);
      setupScrollObserver();
    }
    // 无论消息数量是否变化，都更新上下文用量显示
    updateContextDisplay();
  }

  // 调试函数 - 在控制台输入 window.aiNavDebug() 可以帮助找到选择器
  window.aiNavDebug = function () {
    console.log('%c[JumpAI 调试助手]', 'color: #10a37f; font-weight: bold; font-size: 14px;');
    console.log('当前平台:', currentPlatform);
    console.log('当前域名:', window.location.hostname);

    const platform = PLATFORM_CONFIG[currentPlatform];
    if (platform) {
      console.log('正在尝试的选择器:');
      platform.selectors.forEach((sel, i) => {
        const count = document.querySelectorAll(sel).length;
        console.log(`  ${i + 1}. ${sel} → 找到 ${count} 个元素`);
      });
    }

    console.log('\n%c提示：请在页面上右键点击你发送的消息 → 检查，然后查看元素的 class 属性', 'color: orange;');
    console.log('找到后在控制台测试: document.querySelectorAll("你的选择器")');
    return '调试信息已输出';
  };

  function init() {
    currentPlatform = detectPlatform();

    if (!currentPlatform) {
      console.log('[JumpAI] 未识别的平台');
      return;
    }

    console.log('[JumpAI] 如需调试，请在控制台输入: aiNavDebug()');
    
    // 输出当前平台的所有选择器匹配结果，方便调试
    const platform = PLATFORM_CONFIG[currentPlatform];
    if (platform) {
      console.log('\n%c[JumpAI 选择器检测]', 'color: #10a37f; font-weight: bold;');
      platform.selectors.forEach((sel, i) => {
        const count = document.querySelectorAll(sel).length;
        const status = count > 0 ? '✅' : '❌';
        console.log(`  ${status} ${i+1}. ${sel} → ${count} 个元素`);
      });
    }

    try {
      isPinned = localStorage.getItem('jumpai_pinned') === 'true';
      const savedOpacity = localStorage.getItem('jumpai_opacity');
      if (savedOpacity) {
        panelOpacity = parseFloat(savedOpacity);
      }
      const savedTop = localStorage.getItem('jumpai_top');
      if (savedTop) {
        panelTopPercent = parseFloat(savedTop);
      }
      const savedHeight = localStorage.getItem('jumpai_height');
      if (savedHeight) {
        panelHeight = savedHeight;
      }
      const savedEdge = localStorage.getItem('jumpai_edge');
      if (savedEdge) {
        currentEdge = savedEdge;
      }
    } catch (e) { }

    createPanel();
    const questions = getQuestions();
    rebuildNavigation(questions);
    setupScrollObserver();
    // 初始化上下文用量显示
    setTimeout(() => updateContextDisplay(), 100);

    // 如果已固定或首次加载，则展开
    if (isPinned || isFirstLoad) {
      navPanel.classList.add('expanded');
      navPanel.classList.remove('collapsed');

      if (isFirstLoad && !isPinned) {
        isFirstLoad = false;
        setTimeout(() => {
          if (!isPinned) {
            navPanel.classList.remove('expanded');
          }
        }, 2500);
      }
    }

    // 定时检测新消息
    setInterval(checkForNewMessages, 1000);

    // 监听 URL 变化（SPA 导航）
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        currentActiveIndex = -1;
        setTimeout(() => {
          const questions = getQuestions();
          rebuildNavigation(questions);
          setupScrollObserver();
        }, 500);
      }
    }).observe(document, { subtree: true, childList: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 1500));
  } else {
    setTimeout(init, 1500);
  }
})();
