import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { colors } from '@/config/theme';
import { Dialog } from '@/shared/components/ui/Dialog';
import { Button } from '@/shared/components/ui/Button';

export interface ApprovalModalCopy {
  readonly title: string;
  readonly detail: string;
  /** Omit to hide the "Preview changes" button entirely — Mapping's own
   *  approval copy (`useApproval.ts`) has no preview concept today. */
  readonly preview?: string;
}

interface ApprovalModalProps {
  readonly visible: boolean;
  /** Caller-computed — Profile's own `approvalCopyFor()` and Mapping's
   *  `useApproval()` both produce this shape, entity-specific computation
   *  stays with each caller rather than living inside the shared modal. */
  readonly copy: ApprovalModalCopy | null;
  /** The one point where this approval becomes a write — Profile's
   *  `applyApproval(label)`, Mapping's `confirmApproval()`. */
  readonly onConfirm: () => void;
  readonly onClose: () => void;
  /** Omit to hide the "Review individually" button — only Profile uses
   *  this stub today. */
  readonly onReviewIndividually?: () => void;
  readonly testID?: string;
}

/**
 * The one shared human-in-the-loop gate every migration-config write goes
 * through (root CLAUDE.md wizard rule #5, "one enforcement point") —
 * reused as-is across Profile and Mapping rather than forked per screen,
 * matching the reference's own single shared approval-modal template.
 * "Preview changes" and "Review individually" are intentionally shallow
 * where a caller supplies them at all — the reference itself only ever
 * shows one static templated sentence for preview (no real diff engine)
 * and stubs "Review individually" with a toast (no actual row-by-row
 * flow), so this doesn't over-build beyond what the reference
 * demonstrates.
 */
export const ApprovalModal = ({ visible, copy, onConfirm, onClose, onReviewIndividually, testID }: ApprovalModalProps): React.JSX.Element => {
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    setPreviewOpen(false);
  }, [copy?.title]);

  const handleApply = (): void => {
    onConfirm();
    onClose();
  };

  const handleReviewIndividually = (): void => {
    onClose();
    onReviewIndividually?.();
  };

  return (
    <Dialog
      visible={visible && copy !== null}
      onClose={onClose}
      testID={testID}
      className="w-[540px] max-w-[92vw] rounded-[14px] shadow-2xl"
    >
      {copy ? (
        <>
          {/* Reference's approval header is two stacked text lines only —
              no close control at all (dismissal is Cancel or backdrop-
              click only). A previous pass added one here by mistakenly
              reusing the *comparison* modal's close-button spec, which
              does have one; this dialog never did. */}
          <Dialog.Header className="border-b border-border px-5 py-[18px]">
            <View className="flex-1">
              <Dialog.Title className="text-base font-bold tracking-tight">{copy.title}</Dialog.Title>
              <Text className="mt-0.5 font-body text-xs text-muted-foreground">{copy.detail}</Text>
            </View>
          </Dialog.Header>
          <Dialog.Content className="px-5 py-4">
            {previewOpen && copy.preview !== undefined ? (
              <View className="mb-3.5 rounded-[10px] border border-border bg-surface px-3.5 py-3">
                <Text className="mb-1.5 font-body text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Preview of change
                </Text>
                <Text className="font-mono text-xs leading-5 text-foreground">{copy.preview}</Text>
              </View>
            ) : null}
            <View className="flex-row items-start gap-2">
              <Lock size={14} color={colors.mutedForeground} style={{ marginTop: 1 }} />
              <Text className="flex-1 font-body text-xs leading-5 text-muted-foreground">
                This modifies your migration configuration. The deterministic engine executes it only after you
                approve — the AI does not apply changes on its own.
              </Text>
            </View>
          </Dialog.Content>
          <Dialog.Footer className={copy.preview !== undefined ? 'justify-between border-t border-border px-5 py-3.5' : 'justify-end border-t border-border px-5 py-3.5'}>
            {/* `bg-card border-border` override: the shared outline
                variant's default (`bg-background border-input`) matches
                the reference in light mode but diverges in dark mode —
                var(--card)/var(--border) is what the reference actually
                specifies. */}
            {copy.preview !== undefined ? (
              <Button variant="outline" size="sm" className="rounded-lg border-border bg-card" onPress={() => setPreviewOpen((v) => !v)} testID={testID ? `${testID}-preview` : undefined}>
                <Text className="text-xs font-medium text-foreground">{previewOpen ? 'Hide preview' : 'Preview changes'}</Text>
              </Button>
            ) : null}
            <View className="flex-row gap-2">
              <Button variant="outline" size="sm" className="rounded-lg border-border bg-card" onPress={onClose} testID={testID ? `${testID}-cancel` : undefined}>
                <Text className="text-xs font-medium text-foreground">Cancel</Text>
              </Button>
              {onReviewIndividually ? (
                <Button variant="outline" size="sm" className="rounded-lg border-border bg-card" onPress={handleReviewIndividually} testID={testID ? `${testID}-review` : undefined}>
                  <Text className="text-xs font-medium text-foreground">Review individually</Text>
                </Button>
              ) : null}
              <Button variant="default" size="sm" className="rounded-lg" onPress={handleApply} testID={testID ? `${testID}-apply` : undefined}>
                <Text className="text-xs font-semibold text-primary-foreground">Apply</Text>
              </Button>
            </View>
          </Dialog.Footer>
        </>
      ) : null}
    </Dialog>
  );
};
