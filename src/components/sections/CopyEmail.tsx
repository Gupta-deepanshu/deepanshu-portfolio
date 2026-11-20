'use client';

/**
 * "Copy email": a site pill button plus Kokonut UI's Promise Toast, which fits
 * naturally because navigator.clipboard.writeText() returns a promise.
 */
import { Toaster, usePromiseToast } from '@/components/kokonutui/promise-toast';
import { PillSlot } from '@/components/ui/PillLink';

export function CopyEmail({ email }: { email: string }) {
  const toaster = usePromiseToast();
  return (
    <>
      <button
        type="button"
        className="pill pill-lg"
        onClick={() =>
          toaster.show(() => navigator.clipboard.writeText(email), {
            loading: 'Copying…',
            success: ['Email copied', email],
            error: ['Couldn’t copy', 'Select the address and copy it instead'],
          })
        }
      >
        <PillSlot>Copy email</PillSlot>
      </button>
      <Toaster toaster={toaster} className="fixed bottom-6 right-4 z-[80] w-[min(22rem,calc(100vw-2rem))]" />
    </>
  );
}
