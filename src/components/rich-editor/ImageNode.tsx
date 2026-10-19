import type { ReactElement } from 'react';
import {
  DecoratorNode, type EditorConfig, type NodeKey, type SerializedLexicalNode,
} from 'lexical';

export interface SerializedImage extends SerializedLexicalNode {
  type: 'image';
  version: 1;
  src: string;
  alt: string;
}

/**
 * Lexical DecoratorNode ảnh. Render bằng <img> gọn nhẹ, không cần plugin — mọi
 * ảnh nhúng qua toolbar hoặc paste HTML đều đi qua node này để save/restore
 * đúng dạng.
 */
export class ImageNode extends DecoratorNode<ReactElement> {
  __src: string;
  __alt: string;

  static getType(): string { return 'image'; }
  static clone(node: ImageNode): ImageNode { return new ImageNode(node.__src, node.__alt, node.__key); }

  constructor(src: string, alt = '', key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__alt = alt;
  }

  static importJSON(json: SerializedLexicalNode & Record<string, unknown>): ImageNode {
    const src = typeof json.src === 'string' ? json.src : '';
    const alt = typeof json.alt === 'string' ? json.alt : '';
    return new ImageNode(src, alt);
  }

  exportJSON(): SerializedImage {
    return { type: 'image', version: 1, src: this.__src, alt: this.__alt };
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    span.style.display = 'block';
    return span;
  }
  updateDOM(): false { return false; }

  decorate(): ReactElement {
    return (
      <img
        src={this.__src}
        alt={this.__alt}
        style={{ maxWidth: '100%', height: 'auto', borderRadius: 6 }}
      />
    );
  }

  exportDOM(): { element: HTMLElement } {
    const img = document.createElement('img');
    img.src = this.__src;
    if (this.__alt) img.alt = this.__alt;
    img.style.maxWidth = '100%';
    return { element: img };
  }
}

export function $createImageNode(src: string, alt = ''): ImageNode {
  return new ImageNode(src, alt);
}
