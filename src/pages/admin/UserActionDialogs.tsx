import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { OrganisationUser } from '@/types/organisation';
import { TempPasswordDialog } from './TempPasswordDialog';

export interface UserActionDialogsProps {
  statusTarget: OrganisationUser | null;
  resetTarget: OrganisationUser | null;
  /** Shown once after a reset; the backend never hands it out again. */
  issuedPassword: string | null;
  onConfirmStatus: () => void;
  onConfirmReset: () => void;
  onCloseStatus: () => void;
  onCloseReset: () => void;
  onClosePassword: () => void;
}

/** The three confirmations behind the row actions: lock/unlock, reset, and its result. */
export function UserActionDialogs({
  statusTarget,
  resetTarget,
  issuedPassword,
  onConfirmStatus,
  onConfirmReset,
  onCloseStatus,
  onCloseReset,
  onClosePassword,
}: UserActionDialogsProps): ReactNode {
  const { t } = useTranslation();
  const isLocking = statusTarget?.isActive === true;

  return (
    <>
      <ConfirmDialog
        isOpen={statusTarget !== null}
        title={isLocking ? t('admin.users.lock') : t('admin.users.unlock')}
        description={isLocking ? t('admin.users.lockHint') : t('admin.users.unlockHint')}
        isDestructive={isLocking}
        onConfirm={onConfirmStatus}
        onClose={onCloseStatus}
      />

      <ConfirmDialog
        isOpen={resetTarget !== null}
        title={t('admin.users.resetPassword')}
        description={t('admin.users.resetPasswordHint')}
        onConfirm={onConfirmReset}
        onClose={onCloseReset}
      />

      <TempPasswordDialog password={issuedPassword} onClose={onClosePassword} />
    </>
  );
}
