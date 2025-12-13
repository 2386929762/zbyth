;(function () {
  /**
   * 基于URL逐步探查的方式自动确定baseURL
   * Modified version for preload.js
   * 1. baseUrlCache uses localStorage
   * 2. Validates cached URL before use
   * 3. Probe order: from current path backwards to root
   */
  function autoDetermineBaseUrl() {
    var origin = window.location.origin
    var pathname = window.location.pathname
    // 使用带前缀的key避免冲突
    var cacheKey = 'SDK_BASE_URL_' + origin + pathname
    var testSuffix = 'wp-core/api/ping'  // 用于测试的端点

    // ==========================================
    // 2. baseUrlCache 要改成使用 local storage
    // ==========================================
    var cachedBaseUrl = localStorage.getItem(cacheKey)

    // ==========================================
    // 3. 如果 baseUrlCache[cacheKey] 存在，不能直接返回，
    //    要请求一把是否真的能用，不行的话，就回归到原本的模式
    // ==========================================
    if (cachedBaseUrl) {
      console.log('[PanelX Preload] 发现缓存baseURL:', cachedBaseUrl)
      try {
        var testUrl = cachedBaseUrl + testSuffix
        // 验证缓存
        var xhr = new XMLHttpRequest()
        xhr.open('GET', testUrl, false) // 同步
        xhr.send(null)

        if (xhr.status === 200 && xhr.responseText === 'pong') {
          console.log('[PanelX Preload] 缓存验证成功,直接使用')
          return cachedBaseUrl  // 返回 baseUrl
        } else {
          console.warn('[PanelX Preload] 缓存验证失败，重新探查...')
          localStorage.removeItem(cacheKey)
        }
      } catch (e) {
        console.warn('[PanelX Preload] 缓存验证异常:', e)
        localStorage.removeItem(cacheKey)
      }
    }

    console.log('[PanelX Preload] 开始探查baseURL...')

    var pathParts = pathname.split('/').filter(function (p) {
      return p.length > 0
    })

    // ==========================================
    // 4. 从当前完整路径开始,逐级向上(去掉最后一级),直到根路径
    // ==========================================
    // 从 length 到 0
    for (var i = pathParts.length; i >= 0; i--) {
      var currentPathParts = pathParts.slice(0, i)
      var baseUrl = origin

      if (currentPathParts.length > 0) {
        baseUrl += '/' + currentPathParts.join('/')
      }

      // 确保 baseUrl 总是以 / 结尾
      if (!baseUrl.endsWith('/')) {
        baseUrl += '/'
      }

      var testUrl = baseUrl + testSuffix

      try {
        console.log('[PanelX Preload] 尝试探查:', testUrl)

        // 使用同步XMLHttpRequest
        var xhr = new XMLHttpRequest()
        xhr.open('GET', testUrl, false) // false表示同步
        xhr.send(null)

        // 检查是否成功
        if (xhr.status === 200 && xhr.responseText === 'pong') {
          console.log('[PanelX Preload] ✓ 找到有效的baseURL:', baseUrl)
          // 缓存结果到 localStorage
          localStorage.setItem(cacheKey, baseUrl)
          return baseUrl  // 返回 baseUrl
        }
      } catch (error) {
        // 忽略所有错误（如网络、CORS等），继续尝试下一个路径
        console.log('[PanelX Preload] × 探查失败，继续尝试...')
      }
    }

    // 循环结束，没有找到
    console.warn('[PanelX Preload] 未能通过探查找到有效的baseURL')
    return null
  }



  // 获取当前脚本元素
  var currentScript = document.currentScript
  
  // SDK 路径配置
  var sdkPath = 'wp-core/api/getPanelXSdk'  // 实际的 SDK 路径
  
  // 判断是否为开发环境
  var isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  var sdkUrl

  if (isDev) {
    // 开发环境：从 script 标签的 devSdkUrl 属性读取
    var devSdkUrl = currentScript ? currentScript.getAttribute('devSdkUrl') : null
    if (!devSdkUrl) {
      throw new Error('[PanelX Preload] Development mode requires "devSdkUrl" attribute on preload.js script tag')
    }
    sdkUrl = devSdkUrl
    console.log('[PanelX Preload] Detected development environment, using devSdkUrl:', sdkUrl)
  } else {
    // 生产环境：使用 autoDetermineBaseUrl + sdkPath
    var baseUrl = autoDetermineBaseUrl()
    if (baseUrl) {
      sdkUrl = baseUrl + sdkPath
      console.log('[PanelX Preload] Production environment, SDK URL:', sdkUrl)
    } else {
      sdkUrl = null
    }
    
    // 从 script 标签中删除 devSdkUrl 属性，避免暴露
    if (currentScript && currentScript.hasAttribute('devSdkUrl')) {
      currentScript.removeAttribute('devSdkUrl')
    }
  }
  
  // 直接通过同步 XHR 加载并执行 SDK 代码
  if (sdkUrl) {
    console.log('[PanelX Preload] Loading SDK synchronously from:', sdkUrl)
    try {
      var xhr = new XMLHttpRequest()
      xhr.open('GET', sdkUrl, false) // false = 同步请求
      xhr.send(null)
      
      if (xhr.status === 200) {
        console.log('[PanelX Preload] SDK code fetched, executing...')
        // 使用 eval 或 Function 来执行代码
        // 使用 (1, eval) 或 window.eval 确保在全局作用域执行
        ;(1, eval)(xhr.responseText)
        console.log('[PanelX Preload] SDK loaded and executed successfully')
      } else {
        console.error('[PanelX Preload] Failed to fetch SDK, status:', xhr.status)
      }
    } catch (error) {
      console.error('[PanelX Preload] Error loading SDK:', error)
    }
  } else {
    console.error('[PanelX Preload] Failed to determine SDK URL, cannot load SDK.')
  }
})()
