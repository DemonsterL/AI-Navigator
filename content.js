(function () {
  'use strict';

  console.log('[Gemini Nav] Side Browser ContentScript loaded');

  // --- 配置层 ---
  const MAX_DISPLAY_COUNT = 12;
  const ITEM_HEIGHT = 44;

  // --- 状态层 ---
  let navPanel = null;
  let scrollContainer = null;
  let hiddenIndices = new Set();
  let currentActiveIndex = -1;
  let lastDataSize = 0;
  let currentUrl = window.location.href;
  let mutationObserver = null;

  // --- 调试工具层 ---
  function addDebugMarker() {
    if (document.getElementById('debug-marker')) return;
    const marker = document.createElement('div');
    marker.id = 'debug-marker';
    marker.style.cssText = 'position:fixed; top:0; left:50%; transform:translateX(-50%); width:100px; height:20px; background:blueviolet; z-index:100000; color:white; font-size:10px; text-align:center; line-height:20px;';
    marker.textContent = 'NAV DEBUG ACTIVE';
    document.body.appendChild(marker);
    console.log('[Gemini Nav] Debug marker added');
  }

  function scanGrokDOM() {
    console.log('[Gemini Nav] Scanning DOM for Grok...');
    const mainContainers = document.querySelectorAll('[role="main"], main');
    mainContainers.forEach((container, i) => {
      console.log(`[Gemini Nav] Container ${i} (role="main"):`, {
        id: container.id,
        className: container.className,
        tagName: container.tagName
      });
      // 打印前三层结构摘要
      const children = Array.from(container.children).slice(0, 3);
      children.forEach((child, j) => {
        console.log(`  L1 Child ${j}:`, child.tagName, child.id, child.className);
      });
    });
  }

  // --- 异步工具层 ---
  async function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          resolve(el);
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  // --- 多站点适配层 ---
  const SiteParsers = {
    gemini: {
      match: () => window.location.hostname.includes('gemini.google.com'),
      getQuestions: () => document.querySelectorAll('.user-query-bubble-with-background'),
      containerSelector: 'main'
    },
    khoj: {
      match: () => window.location.hostname.includes('khoj.dev'),
      getQuestions: () => document.querySelectorAll('[class*="chatMessage_you__"]'),
      containerSelector: '[class*="chatHistory_chatHistory__"]'
    },
    chatgpt: {
      match: () => window.location.hostname.includes('chatgpt.com'),
      getQuestions: () => document.querySelectorAll('article [data-message-author-role="user"], div[data-testid^="conversation-turn-"] .user-message'),
      containerSelector: 'main'
    },
    grok: {
      // 强制绕过严格 URL 检查：只要包含 grok 就激活
      match: () => window.location.href.includes('grok'),
      getQuestions: () => document.querySelectorAll('[id^="response-"].items-end'),
      containerSelector: '[role="main"], main'
    }
  };

  const currentParser = Object.values(SiteParsers).find(p => p.match()) || SiteParsers.gemini;

  // --- UI 构建层 ---
  function createPanel() {
    if (navPanel) return navPanel;

    navPanel = document.createElement('div');
    navPanel.id = 'gemini-nav-panel';
    navPanel.className = 'idle';
    document.body.appendChild(navPanel);

    scrollContainer = document.createElement('div');
    scrollContainer.id = 'gemini-nav-scroll';
    scrollContainer.className = 'directory-container';
    navPanel.appendChild(scrollContainer);

    navPanel.addEventListener('mouseenter', () => {
      navPanel.classList.remove('idle');
      navPanel.classList.add('visible');
    });

    navPanel.addEventListener('mouseleave', () => {
      navPanel.classList.remove('visible');
      navPanel.classList.add('idle');
    });

    return navPanel;
  }

  // --- 核心逻辑：Map 对象重构 ---
  function rebuildNavigation(rawElements, scrollToBottom = false) {
    if (!scrollContainer) return;

    const directoryMap = new Map();
    rawElements.forEach((el) => {
      const textNode = el.querySelector('p') || el;
      const title = textNode.innerText.trim().replace(/\s+/g, ' ');

      if (title && !directoryMap.has(title)) {
        directoryMap.set(title, { title, element: el });
      }
    });

    const allItems = Array.from(directoryMap.values());
    const displayedItems = allItems.slice(0, MAX_DISPLAY_COUNT);
    const hasMore = allItems.length > MAX_DISPLAY_COUNT;

    scrollContainer.innerHTML = '';
    lastDataSize = allItems.length;

    if (displayedItems.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'gemini-nav-empty';
      empty.textContent = '暂无对话';
      scrollContainer.appendChild(empty);
      return;
    }

    if (displayedItems.length >= MAX_DISPLAY_COUNT) {
      scrollContainer.classList.add('has-mask');
    } else {
      scrollContainer.classList.remove('has-mask');
    }

    displayedItems.forEach((itemData, index) => {
      if (hiddenIndices.has(index)) return;

      const { title, element } = itemData;
      const displayText = title.length > 12 ? title.substring(0, 12) + '...' : title;

      const item = document.createElement('div');
      item.className = 'gemini-nav-item directory-item';
      item.dataset.index = index;
      if (index === currentActiveIndex) item.classList.add('active');

      const textSpan = document.createElement('span');
      textSpan.className = 'gemini-nav-item-text';
      textSpan.textContent = displayText;

      const removeBtn = document.createElement('span');
      removeBtn.className = 'gemini-nav-item-remove';
      removeBtn.textContent = '−';

      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hiddenIndices.add(index);
        rebuildNavigation(currentParser.getQuestions());
      });

      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        executeJump(element, index);
      });

      item.appendChild(textSpan);
      item.appendChild(removeBtn);
      scrollContainer.appendChild(item);
    });

    if (hasMore) {
      const hint = document.createElement('div');
      hint.className = 'gemini-nav-limit-hint';
      hint.textContent = `仅显示最近的 ${MAX_DISPLAY_COUNT} 个对话`;
      scrollContainer.appendChild(hint);
    }

    if (scrollToBottom) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }

  function executeJump(targetElement, index) {
    if (targetElement) {
      currentActiveIndex = index;
      setTimeout(() => {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        updateActiveState();
      }, 100);
    }
  }

  function updateActiveState() {
    const items = scrollContainer.querySelectorAll('.gemini-nav-item');
    items.forEach(item => {
      const index = parseInt(item.dataset.index, 10);
      item.classList.toggle('active', index === currentActiveIndex);
    });
  }

  let intersectionObserver = null;
  function setupScrollObserver(allElements) {
    if (allElements.length === 0) return;
    if (intersectionObserver) intersectionObserver.disconnect();
    intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const qs = Array.from(allElements);
          const idx = qs.indexOf(entry.target);
          if (idx !== -1 && idx !== currentActiveIndex && idx < MAX_DISPLAY_COUNT) {
            currentActiveIndex = idx;
            updateActiveState();
          }
        }
      });
    }, { threshold: 0.5 });
    Array.from(allElements).slice(0, MAX_DISPLAY_COUNT).forEach(q => intersectionObserver.observe(q));
  }

  async function setupMutationObserver() {
    if (mutationObserver) mutationObserver.disconnect();
    const target = await waitForElement(currentParser.containerSelector);
    if (!target) return;

    mutationObserver = new MutationObserver(() => {
      const questions = currentParser.getQuestions();
      if (questions.length !== lastDataSize) {
        rebuildNavigation(questions, questions.length > lastDataSize);
        setupScrollObserver(questions);
      }
    });
    mutationObserver.observe(target, { childList: true, subtree: true });
  }

  function handleContextReset() {
    hiddenIndices.clear();
    currentActiveIndex = -1;
    lastDataSize = 0;
    setTimeout(init, 500);
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'URL_CHANGE' && msg.url !== currentUrl) {
      currentUrl = msg.url;
      handleContextReset();
    }
  });

  async function init() {
    if (window.location.href.includes('grok')) {
      addDebugMarker();
      scanGrokDOM();
    }

    createPanel();

    // 处理渲染延迟：针对 Grok 使用轮询初始化
    let retryCount = 0;
    const maxRetries = 20; // 10秒
    const pollInit = setInterval(() => {
      const questions = currentParser.getQuestions();
      if (questions.length > 0 || retryCount > maxRetries) {
        clearInterval(pollInit);
        rebuildNavigation(questions);
        setupScrollObserver(questions);
        setupMutationObserver();
        console.log(`[Gemini Nav] Initialization complete after ${retryCount} retries`);
      }
      retryCount++;
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
  } else {
    setTimeout(init, 500);
  }
})();
