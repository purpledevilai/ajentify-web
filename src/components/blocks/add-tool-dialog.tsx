"use client";

import { useIsMobile } from "@/lib/hooks/use-media-query";
import { AddToolDialogDesktop } from "@/components/blocks/add-tool-dialog-desktop";
import { AddToolDialogMobile } from "@/components/blocks/add-tool-dialog-mobile";
import type { AddToolDialogProps } from "@/components/blocks/add-tool-picker-shared";

export type { AddToolDialogProps } from "@/components/blocks/add-tool-picker-shared";

/** Responsive add-tool picker — full-screen sheet on mobile, sidebar tabs on desktop. */
export function AddToolDialog(props: AddToolDialogProps) {
  const isMobile = useIsMobile();
  if (isMobile) return <AddToolDialogMobile {...props} />;
  return <AddToolDialogDesktop {...props} />;
}
