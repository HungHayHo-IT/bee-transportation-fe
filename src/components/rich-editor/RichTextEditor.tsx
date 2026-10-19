import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { IconButton, Stack, Tooltip, Divider, Box } from '@mui/material';
import {
  IconBold, IconItalic, IconLink, IconList, IconListNumbers, IconPhotoPlus,
  IconUnderline, IconH1, IconH2,
} from '@tabler/icons-react';
import { $getRoot, $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND } from 'lexical';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { HeadingNode, QuoteNode, $createHeadingNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import {
  ListItemNode, ListNode, INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND,
} from '@lexical/list';
import { LinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $insertNodeToNearestRoot } from '@lexical/utils';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useTranslation } from 'react-i18next';
import { uploadNewsImage } from '@/services/newsService';
import { $createImageNode, ImageNode } from './ImageNode';

/**
 * Nạp HTML ban đầu vào editor MỘT LẦN duy nhất khi mount. KHÔNG re-load khi
 * `html` đổi vì parent nhận HTML từ onChange rồi ghi lại state — nếu re-load
 * theo `value` mới, IME tiếng Việt sẽ bị đá ra sau MỖI keystroke vì editor
 * bị clear và insert lại giữa lúc đang compose "tế", "hôm"...
 *
 * Muốn nạp bài khác thì key toàn bộ RichTextEditor để React unmount/mount lại.
 */
function InitialHtmlPlugin({ html }: { html: string }): null {
  const [editor] = useLexicalComposerContext();
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    editor.update(() => {
      const root = $getRoot();
      root.clear();
      if (!html.trim()) return;
      const parser = new DOMParser();
      const dom = parser.parseFromString(html, 'text/html');
      const nodes = $generateNodesFromDOM(editor, dom);
      root.append(...nodes);
    });
  }, [editor, html]);
  return null;
}

interface ToolbarProps {
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
}

function Toolbar({ onUpload, isUploading }: ToolbarProps): ReactNode {
  const [editor] = useLexicalComposerContext();
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);

  const toggle = (fmt: 'bold' | 'italic' | 'underline'): void => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, fmt);
  };
  const heading = (level: 'h1' | 'h2'): void => {
    editor.update(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) $setBlocksType(sel, () => $createHeadingNode(level));
    });
  };
  const link = (): void => {
    const href = window.prompt(t('richEditor.linkPrompt') ?? 'URL');
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, href && /^https?:/i.test(href) ? href : null);
  };
  const pickImage = (): void => fileRef.current?.click();

  return (
    <Stack
      direction="row" spacing={0.5} alignItems="center"
      sx={{ p: 0.5, borderBottom: '1px solid', borderColor: 'divider', flexWrap: 'wrap' }}
    >
      <Tooltip title={t('richEditor.h1')}><IconButton size="small" onClick={() => heading('h1')}>
        <IconH1 size={18} /></IconButton></Tooltip>
      <Tooltip title={t('richEditor.h2')}><IconButton size="small" onClick={() => heading('h2')}>
        <IconH2 size={18} /></IconButton></Tooltip>
      <Divider flexItem orientation="vertical" sx={{ mx: 0.5 }} />
      <Tooltip title={t('richEditor.bold')}><IconButton size="small" onClick={() => toggle('bold')}>
        <IconBold size={18} /></IconButton></Tooltip>
      <Tooltip title={t('richEditor.italic')}><IconButton size="small" onClick={() => toggle('italic')}>
        <IconItalic size={18} /></IconButton></Tooltip>
      <Tooltip title={t('richEditor.underline')}><IconButton size="small" onClick={() => toggle('underline')}>
        <IconUnderline size={18} /></IconButton></Tooltip>
      <Divider flexItem orientation="vertical" sx={{ mx: 0.5 }} />
      <Tooltip title={t('richEditor.bullet')}>
        <IconButton size="small" onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}>
          <IconList size={18} /></IconButton></Tooltip>
      <Tooltip title={t('richEditor.numbered')}>
        <IconButton size="small" onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}>
          <IconListNumbers size={18} /></IconButton></Tooltip>
      <Divider flexItem orientation="vertical" sx={{ mx: 0.5 }} />
      <Tooltip title={t('richEditor.link')}><IconButton size="small" onClick={link}>
        <IconLink size={18} /></IconButton></Tooltip>
      <Tooltip title={t('richEditor.image')}>
        <IconButton size="small" onClick={pickImage} disabled={isUploading}>
          <IconPhotoPlus size={18} />
        </IconButton>
      </Tooltip>
      <input
        ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) await onUpload(f);
        }}
      />
    </Stack>
  );
}

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
  placeholder?: string;
}

/**
 * Editor rich text dựng trên Lexical. Nạp/lưu ở dạng HTML — thuận cho render
 * trên landing không cần chuyển đổi. State editor giữ nội bộ; onChange emit
 * HTML mới nhất mỗi lần user gõ.
 */
export function RichTextEditor(props: RichTextEditorProps): ReactNode {
  const { value, onChange, minHeight = 260, placeholder } = props;
  const { t } = useTranslation();
  const [isUploading] = useState(false);

  const initialConfig = {
    namespace: 'news-editor',
    onError: (error: Error): void => { throw error; },
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, ImageNode],
    theme: {
      heading: { h1: 're-h1', h2: 're-h2' },
      list: { ul: 're-ul', ol: 're-ol' },
      link: 're-link',
      text: { bold: 're-b', italic: 're-i', underline: 're-u' },
    },
  };

  return (
    <Box sx={{
      border: '1px solid', borderColor: 'divider', borderRadius: 1.5,
      overflow: 'hidden', bgcolor: 'background.paper',
    }}>
      <LexicalComposer initialConfig={initialConfig}>
        <ImageUploadBridge>
          {(bridgeUpload, uploading) => <Toolbar onUpload={bridgeUpload} isUploading={uploading} />}
        </ImageUploadBridge>
        <Box sx={{
          position: 'relative', px: 2, py: 1.5,
          '& [contenteditable]': { minHeight, outline: 'none', lineHeight: 1.6, fontSize: 14 },
          '& .re-h1': { fontSize: 24, fontWeight: 700, my: 1.5 },
          '& .re-h2': { fontSize: 20, fontWeight: 700, my: 1.25 },
          '& .re-ul, & .re-ol': { pl: 3, my: 1 },
          '& .re-link': { color: 'primary.main', textDecoration: 'underline' },
          '& img': { maxWidth: '100%', height: 'auto', display: 'block', my: 1 },
        }}>
          <RichTextPlugin
            contentEditable={
              <ContentEditable aria-placeholder={placeholder ?? ''} placeholder={
                <Box sx={{
                  position: 'absolute', top: 12, left: 16,
                  color: 'text.disabled', pointerEvents: 'none', fontSize: 14,
                }}>{placeholder}</Box>
              } />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <InitialHtmlPlugin html={value} />
          <OnChangePlugin
            onChange={(state, editor) => {
              state.read(() => {
                const html = $generateHtmlFromNodes(editor, null);
                if (html !== value) onChange(html);
              });
            }}
          />
        </Box>
      </LexicalComposer>
      {isUploading ? (
        <Box sx={{ px: 2, py: 0.5, fontSize: 12, color: 'text.secondary' }}>
          {t('richEditor.uploading')}
        </Box>
      ) : null}
    </Box>
  );
}

/** Cầu nối để Toolbar (bên trong LexicalComposer) upload ảnh rồi chèn Node. */
function ImageUploadBridge(props: {
  children: (upload: (file: File) => Promise<void>, uploading: boolean) => ReactNode;
}): ReactNode {
  const [editor] = useLexicalComposerContext();
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const { url } = await uploadNewsImage(file);
      editor.update(() => {
        const node = $createImageNode(url, file.name);
        $insertNodeToNearestRoot(node);
      });
    } finally {
      setUploading(false);
    }
  }, [editor]);

  return <>{props.children(upload, uploading)}</>;
}
