import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Box, Tooltip } from '@mui/material';

export interface EllipsisCellProps {
  text: string;
  maxWidth?: number | string;
}

/** One-line cell that only shows a tooltip when the text is actually truncated. */
export function EllipsisCell({ text, maxWidth = '100%' }: EllipsisCellProps): ReactNode {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    setIsTruncated(element !== null && element.scrollWidth > element.clientWidth);
  }, [text]);

  const content = (
    <Box
      component="span"
      ref={textRef}
      sx={{
        display: 'block',
        maxWidth,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </Box>
  );

  if (!isTruncated) return content;
  return <Tooltip title={text}>{content}</Tooltip>;
}
