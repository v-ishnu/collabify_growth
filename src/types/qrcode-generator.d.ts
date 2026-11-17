declare module 'qrcode-generator' {
  type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';
  interface QRCodeInstance {
    addData(data: string, mode?: 'Numeric' | 'Alphanumeric' | 'Byte' | 'Kanji'): void;
    make(): void;
    getModuleCount(): number;
    isDark(row: number, col: number): boolean;
    createSvgTag(cellSize?: number, margin?: number, alt?: string, title?: string): string;
    createDataURL(cellSize?: number, margin?: number): string;
  }
  function qrcode(typeNumber: number, errorCorrectionLevel: ErrorCorrectionLevel): QRCodeInstance;
  export = qrcode;
}

