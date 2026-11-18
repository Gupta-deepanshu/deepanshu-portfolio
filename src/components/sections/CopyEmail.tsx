'use client';

/**
 * "Copy email" uses Kokonut UI's Attract Button (a field of filings that turns
 * toward the pointer) and Promise Toast, which fits naturally because
 * navigator.clipboard.writeText() returns a promise.
 */
import AttractButton from '@/components/kokonutui/attract-button';
import { Toaster, usePromiseToast } from '@/components/kokonutui/promise-toast';

export function CopyEmail({ email }: { email: string }) {
  const toaster = usePromiseToast();
  return (
    <>
      <AttractButton
        className="h-11 rounded-full bg-raised px-5 text-fg ring-1 ring-line hover:bg-fg hover:text-bg dark:bg-raised dark:text-fg dark:hover:bg-fg dark:hover:text-bg"
        onClick={() =>
          toaster.show(() => navigator.clipboard.writeText(email), {
            loading: 'Copying…',
            success: ['Email copied', email],
            error: ['Couldn’t copy', 'Select the address and copy it instead'],
          })
        }
      >
        Copy email
      </AttractButton>
      <Toaster toaster={toaster} className="fixed bottom-6 right-4 z-[80] w-[min(22rem,calc(100vw-2rem))]" />
    </>
  );
}
