/// <reference types="vite/client" />

declare module 'jsbarcode' {
  export default function JsBarcode(
    element: string | HTMLElement | SVGSVGElement | HTMLCanvasElement,
    text: string,
    options?: Record<string, unknown>
  ): void
}

