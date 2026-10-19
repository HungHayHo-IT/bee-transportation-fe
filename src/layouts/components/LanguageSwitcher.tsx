import { useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import { IconLanguage } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '@/locales';
import { writeLanguagePreference } from '@/utils/storage';

export function LanguageSwitcher(): ReactNode {
  const { t, i18n } = useTranslation();
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);

  const handleOpen = (event: MouseEvent<HTMLElement>): void => setAnchorElement(event.currentTarget);
  const handleClose = (): void => setAnchorElement(null);

  const handleSelect = (language: string): void => {
    void i18n.changeLanguage(language);
    writeLanguagePreference(language);
    handleClose();
  };

  return (
    <>
      <Tooltip title={t('common.language.label')}>
        <IconButton onClick={handleOpen} size="small" color="inherit">
          <IconLanguage size={20} stroke={1.7} />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorElement} open={anchorElement !== null} onClose={handleClose}>
        {SUPPORTED_LANGUAGES.map((language) => (
          <MenuItem
            key={language}
            selected={i18n.resolvedLanguage === language}
            onClick={() => handleSelect(language)}
          >
            {t(`common.language.${language}`)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
