// rrweb 网络录制与时间轴标签支持
// 通过 `rrweb.addCustomEvent('network', payload)` 写入自定义事件后，可在 rrweb-player 的 props.tags 中配置颜色。

import { addCustomEvent } from "rrweb";
import type { NetworkRequestEvent } from "./type";

type RRwebPatchedXHR = XMLHttpRequest & {
  __rrwebNetwork__?: { method?: string; url?: string };
  __rrwebStart__?: number;
  __rrwebRequestBody__?: string | null;
  __rrwebRequestHeaders__?: Record<string, string>;
};

let xhrPatched = false;

let originalOpen: typeof XMLHttpRequest.prototype.open | null = null;
let originalSend: typeof XMLHttpRequest.prototype.send | null = null;
let originalSetRequestHeader:
  | typeof XMLHttpRequest.prototype.setRequestHeader
  | null = null;

// ─── 网络错误监听 (用于哨兵模式) ────────────────────────────
export interface NetworkErrorInfo {
  url: string;
  method: string;
  status: number;
}
type ErrorListener = (info: NetworkErrorInfo) => void;
let errorListener: ErrorListener | null = null;

/** 注册网络错误监听器, 拦截器在 status 命中时回调. 传 null 取消注册. */
export function setNetworkErrorListener(cb: ErrorListener | null) {
  errorListener = cb;
}

//  重写xhr 方法，记录请求头，请求体，响应头，响应体，不影响原来逻辑，仅注入一次
export function installNetworkXHRInterceptor() {
  if (xhrPatched) {
    return;
  }

  xhrPatched = true;

  originalOpen = XMLHttpRequest.prototype.open;
  originalSend = XMLHttpRequest.prototype.send;
  originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  // 重写 open 方法：获取url、method、请求时间
  XMLHttpRequest.prototype.open = function (
    this: RRwebPatchedXHR,
    method: string,
    url: string | URL,
  ) {
    this.__rrwebNetwork__ = { method, url: url.toString() };
    this.__rrwebStart__ = Date.now();

    // 透传其余原始参数（async、user、password）
    return originalOpen && originalOpen.apply(this, arguments as any);
  };

  // 获取请求头
  XMLHttpRequest.prototype.setRequestHeader = function (
    this: RRwebPatchedXHR,
    name: string,
    value: string,
  ) {
    if (!this.__rrwebRequestHeaders__) {
      this.__rrwebRequestHeaders__ = {};
    }

    this.__rrwebRequestHeaders__[name] = value;

    return (
      originalSetRequestHeader &&
      originalSetRequestHeader.apply(this, arguments as any)
    );
  };

  // 获取请求体，响应头和响应体
  XMLHttpRequest.prototype.send = function (
    this: RRwebPatchedXHR,
    body?: XMLHttpRequestBodyInit,
  ) {
    const self = this as RRwebPatchedXHR;
    let requestHeaderContentType;
    let requestBody: string | null = null;

    if (typeof body === "string") {
      requestBody = body;
    } else if (body instanceof FormData) {
      const formObject: Record<string, unknown> = {};

      requestHeaderContentType = "multipart/form-data";

      body.forEach((value, key) => {
        if (value instanceof Blob) {
          formObject[key] = `Blob`;
        } else {
          // 处理数组值，如 `formData.append('key', 'val1'); formData.append('key', 'val2');`
          // 转换为 `{ "key": ["val1", "val2"] }`
          const v = String(value);

          if (Object.prototype.hasOwnProperty.call(formObject, key)) {
            const prev = formObject[key];

            if (Array.isArray(prev)) {
              (prev as string[]).push(v);
            } else {
              formObject[key] = [prev as string, v];
            }
          } else {
            formObject[key] = v;
          }

          try {
            requestBody = JSON.stringify(formObject);
          } catch {
            requestBody = null;
          }
        }
      });
    }

    if (
      requestHeaderContentType &&
      this.__rrwebRequestHeaders__ &&
      !this.__rrwebRequestHeaders__["Content-Type"]
    ) {
      this.__rrwebRequestHeaders__["Content-Type"] = requestHeaderContentType;
    }

    const onReady = function () {
      // 请求完成，成功或失败
      if (self.readyState === 4) {
        let responseBody: string | null = null;

        const start = self.__rrwebStart__ ?? Date.now();
        const end = Date.now();

        // 响应头与类型
        const headersStr = self.getAllResponseHeaders
          ? self.getAllResponseHeaders()
          : "";
        const respHeaders = parseHeaders(headersStr || "");
        const ctKey = Object.keys(respHeaders).find(
          (k) => k.toLowerCase() === "content-type",
        );
        // 服务端返回数据类型
        const contentType = ctKey ? respHeaders[ctKey] : "";
        // 客户端指定返回数据类型
        const type = self.responseType || "";

        // 忽略大体积或二进制响应体，保留类型说明
        const omit =
          type === "blob" ||
          type === "arraybuffer" ||
          /^image\//i.test(contentType) ||
          /^video\//i.test(contentType) ||
          /^audio\//i.test(contentType) ||
          /application\/(pdf|zip|octet-stream)/i.test(contentType);

        if (omit) {
          responseBody = JSON.stringify({
            omitted: "blob",
            responseType: type,
            contentType: contentType,
          });
        } else if (type === "" || type === "text") {
          responseBody = safeFormatToString(self.responseText);
        } else if (type === "json") {
          try {
            responseBody = safeFormatToString(JSON.stringify(self.response));
          } catch {
            responseBody = safeFormatToString(self.response);
          }
        } else {
          // 尝试字符串化其它类型，失败则省略
          try {
            responseBody = safeFormatToString(self.response);
          } catch {
            responseBody = JSON.stringify({
              omitted: "unknown",
              responseType: type,
              contentType: contentType,
            });
          }
        }

        emitNetwork({
          url: self.__rrwebNetwork__?.url,
          method: self.__rrwebNetwork__?.method,
          status: self.status,
          requestHeaders: self.__rrwebRequestHeaders__,
          requestBody,
          responseHeaders: respHeaders,
          responseBody,
          startTime: start,
          endTime: end,
        });

        // 哨兵: 触发错误监听 (默认 >= 400, 由订阅方决定是否过滤)
        if (errorListener) {
          const status = self.status;
          if (status >= 400) {
            try {
              errorListener({
                url: self.__rrwebNetwork__?.url || "",
                method: self.__rrwebNetwork__?.method || "",
                status,
              });
            } catch (e) {
              console.warn("[web-tape] error listener threw:", e);
            }
          }
        }
      }
    };

    self.addEventListener("readystatechange", onReady);

    // 透传其余原始参数（body）
    return originalSend && originalSend.apply(this, arguments as any);
  };
}

// 恢复 xhr 原生方法
export function uninstallNetworkXHRInterceptor() {
  if (!xhrPatched) {
    return;
  }

  if (originalOpen) {
    XMLHttpRequest.prototype.open = originalOpen;
  }

  if (originalSend) {
    XMLHttpRequest.prototype.send = originalSend;
  }

  if (originalSetRequestHeader) {
    XMLHttpRequest.prototype.setRequestHeader = originalSetRequestHeader;
  }

  xhrPatched = false;
  originalOpen = null;
  originalSend = null;
  originalSetRequestHeader = null;
}

// 将原始响应头字符串解析为对象（大小写不统一时保留原字段名）
export function parseHeaders(raw: string) {
  const headers: Record<string, any> = {};

  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const idx = line.indexOf(":");

      if (idx > -1) {
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim();

        if (key) {
          headers[key] = val;
        }
      }
    });

  return headers;
}

function safeFormatToString(text: string | undefined): string | null {
  if (!text && text !== "") {
    return null;
  }

  return String(text);
}

// 自定义事件：network，注入到 rrweb 事件流中
function emitNetwork(event: NetworkRequestEvent) {
  try {
    addCustomEvent("network", event);
  } catch (_) {
    // 兼容性兜底：某些版本可能挂载在全局 rrweb 对象上
    const rr = (window as any).rrweb;

    if (typeof rr?.addCustomEvent === "function") {
      rr.addCustomEvent("network", event);
    }
  }
}
