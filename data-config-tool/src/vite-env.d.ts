/// <reference types="vite/client" />

interface PanelXSdk {
  api: {
    callButton: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
    queryFormDataList: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
    queryFormData: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };
  getSdkEndpoint: (path: string) => string;
  request: (url: string, options?: RequestInit) => Promise<Response>;
  ensureLogin: (credentials: { userName: string; password: string }) => Promise<void>;
}

declare global {
  interface Window {
    panelxSdk: PanelXSdk | undefined;
    sdkLoggedIn: boolean | undefined;
    sdkLoadFailed: boolean | undefined;
    SDK_CONFIG: {
      devDefaultBaseUrl: string;
      busDomainCode: string;
      dataSourcePanelCode: string;
      tablePanelCode: string;
    };
  }
  // eslint-disable-next-line no-var
  var PanelXSdk: new (config: { devDefaultBaseUrl: string; busDomainCode: string }) => PanelXSdk;
}

export {};
