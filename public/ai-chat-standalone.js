/**
 * AI对话面板核心交互逻辑（原生JS版本）
 *
 * 适用场景：独立HTML页面或需要与现有框架解耦时使用
 * 已适配豆包AI风格HTML/CSS结构
 *
 * 使用方式：
 * 1. 在HTML中引入此JS文件
 * 2. 确保HTML结构包含所需的id和class
 * 3. 调用 window.initAIChat() 初始化
 */

// 防止重复初始化
if (window.aiChatInitialized) {
  console.warn('AI Chat已初始化，请勿重复调用');
} else {
  window.initAIChat = initAIChat;
}

/**
 * 核心初始化函数
 */
function initAIChat() {
  // ========== 1. DOM元素引用 ==========
  const tabs = document.querySelectorAll('.chat-tab');
  const hermesBtns = document.getElementById('hermesBtns');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const messageList = document.getElementById('messageList');

  // 验证必要元素存在
  if (!tabs.length || !chatInput || !sendBtn || !messageList) {
    console.error('缺少必要的DOM元素，请检查HTML结构');
    return;
  }

  // ========== 2. 状态管理 ==========
  let currentMode = 'chat';  // 'chat' | 'hermes' | 'terminal'
  let isProcessing = false;

  // ========== 3. 标签切换逻辑 ==========
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // 移除所有标签激活态
      tabs.forEach(t => t.classList.remove('active'));
      // 激活当前标签
      tab.classList.add('active');

      // 获取标签类型
      currentMode = tab.dataset.tab || 'chat';

      // 显示/隐藏Hermes专属快捷按钮
      if (hermesBtns) {
        hermesBtns.style.display = currentMode === 'hermes' ? 'flex' : 'none';
      }

      // 根据标签类型调整输入框占位符
      updatePlaceholder();

      // 聚焦输入框
      chatInput.focus();
    });
  });

  /**
   * 更新输入框占位符
   */
  function updatePlaceholder() {
    switch (currentMode) {
      case 'terminal':
        chatInput.placeholder = '输入Claude终端命令（如help/simplify），按Enter发送...';
        break;
      case 'hermes':
        chatInput.placeholder = '输入技术需求，如"石油钻采设备精密加工技术研发"...';
        break;
      default:
        chatInput.placeholder = '输入问题，按Enter发送...';
    }
  }

  // ========== 4. 消息发送核心逻辑 ==========

  // 绑定发送事件
  sendBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keydown', handleKeyDown);

  /**
   * 键盘事件处理：Enter发送，Shift+Enter换行
   */
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  /**
   * 核心发送函数
   * 根据当前模式分发处理
   */
  function sendMessage() {
    const content = chatInput.value.trim();
    if (!content || isProcessing) return;

    // 添加用户消息
    addMessage(content, 'user');

    // 清空输入框
    chatInput.value = '';
    chatInput.style.height = '60px'; // 重置高度

    // 根据模式分发处理
    switch (currentMode) {
      case 'chat':
        handleNormalChat(content);
        break;
      case 'hermes':
        handleHermesTask(content);
        break;
      case 'terminal':
        handleTerminalCommand(content);
        break;
    }
  }

  // ========== 5. 消息渲染 ==========

  /**
   * 添加消息到列表
   * @param {string} content - 消息内容
   * @param {string} type - 消息类型: 'user' | 'ai' | 'hermes' | 'terminal' | 'system'
   */
  function addMessage(content, type) {
    const msgDiv = document.createElement('div');

    // 根据类型应用样式类
    switch (type) {
      case 'user':
        msgDiv.className = 'message user-message';
        break;
      case 'hermes':
        msgDiv.className = 'message ai-message hermes-message';
        // Hermes消息添加格式标识
        msgDiv.innerHTML = `<strong>[Hermes任务规划]</strong><br>${escapeHtml(content).replace(/\n/g, '<br>')}`;
        messageList.appendChild(msgDiv);
        scrollToBottom();
        return; // 已处理，直接返回
      case 'terminal':
        msgDiv.className = 'message ai-message terminal-message';
        msgDiv.textContent = content;
        break;
      case 'system':
        msgDiv.className = 'message ai-message';
        msgDiv.style.borderLeft = '3px solid #FF6B6B';
        msgDiv.textContent = content;
        break;
      default: // 'ai'
        msgDiv.className = 'message ai-message';
        msgDiv.textContent = content;
    }

    messageList.appendChild(msgDiv);
    scrollToBottom();
  }

  /**
   * HTML转义（防止XSS）
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 滚动到底部
   */
  function scrollToBottom() {
    messageList.scrollTop = messageList.scrollHeight;
  }

  // ========== 6. 普通AI对话处理 ==========
  // TODO: 替换为真实的Claude API调用
  function handleNormalChat(content) {
    isProcessing = true;

    // 模拟AI响应（800ms延迟模拟网络请求）
    setTimeout(() => {
      const aiResponse = `已收到你的问题：${content}\n\n` +
        `这是AI的回复内容（请替换为真实Claude API调用结果）\n\n` +
        `[模拟模式] 实际调用时请替换 apiGateway.chat()`;

      addMessage(aiResponse, 'ai');
      isProcessing = false;
    }, 800);
  }

  // ========== 7. Hermes任务规划处理 ==========
  // 核心：修复工具名称格式（下划线 → 短横线）
  function handleHermesTask(content) {
    isProcessing = true;

    // 发送处理中提示
    addMessage('🔄 Hermes正在规划任务，请稍候...', 'hermes');

    // 模拟Hermes处理（1500ms延迟）
    setTimeout(() => {
      // 修复工具名称：统一使用短横线格式
      // 错误示例：claude_code, task_planning, web_search
      // 正确示例：claude-code, task-planning, web-search
      const hermesResult = `
【任务主题】
${content}

【执行计划】
1. 任务拆解 → tool: task-planning
2. 需求分析 → tool: demand-analysis
3. 联网调研 → tool: web-search
4. 方案生成 → tool: claude-code
5. 技能执行 → tool: openclaw-skill

【工具名称已修复】
✅ 所有工具ID使用短横线格式（claude-code, task-planning, web-search）
✅ 避免了"未找到工具"错误

[模拟模式] 实际调用时请替换 hermesAgent.executePlan()`;

      addMessage(hermesResult, 'hermes');
      isProcessing = false;
    }, 1500);
  }

  // ========== 8. Claude终端命令处理 ==========
  // TODO: 替换为真实的Claude Code CLI调用
  function handleTerminalCommand(content) {
    isProcessing = true;

    // 发送命令执行提示
    addMessage(`💻 执行命令: ${content}`, 'terminal');

    // 模拟终端响应（1000ms延迟）
    setTimeout(() => {
      let response = '';

      switch (content.toLowerCase()) {
        case 'help':
          response = `可用命令：
  help     - 显示此帮助信息
  chat     - 与AI对话
  plan     - 启动Hermes任务规划
  skills   - 查看可用技能
  clear    - 清空终端
  [其他]    - Claude Code CLI命令`;
          break;

        case 'skills':
          response = `OpenClaw可用技能：
  1. code-review      - 代码审查
  2. requirement     - 需求分析
  3. solution-gen    - 方案生成
  4. document-ai     - 文档处理
  5. web-search      - 联网搜索`;
          break;

        case 'clear':
          messageList.innerHTML = '';
          isProcessing = false;
          return;

        default:
          response = `[模拟模式] 执行命令: ${content}

如需真实Claude Code CLI支持：
1. 安装Claude Code CLI
2. 配置环境变量
3. 替换 handleTerminalCommand() 中的模拟逻辑`;
      }

      addMessage(response, 'terminal');
      isProcessing = false;
    }, 1000);
  }

  // ========== 9. Hermes快捷按钮 ==========
  // 点击填充输入框
  document.querySelectorAll('.hermes-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const btnText = btn.textContent.trim();
      // 格式：【按钮名】+ 原有内容
      const prefix = `【${btnText}】`;
      chatInput.value = chatInput.value ? prefix + chatInput.value : prefix + '请补充具体需求...';
      chatInput.focus();
    });
  });

  // ========== 10. 输入框自动高度调整 ==========
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
  });

  // 标记已初始化
  window.aiChatInitialized = true;
  console.log('AI Chat初始化完成 ✓');
}

// 导出到全局
window.initAIChat = initAIChat;
