"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { shortfallEntryFor } from "@/constants/ledger";
import { useLotDetail } from "@/features/cutting/hooks/useLotDetail";

/**
 * "/ledger?lot=<id>" (the shortcut on a lot's shortfall panel): loads the lot and hands back a prefilled
 * B-pair draft exactly once, then removes the parameter from the URL so a refresh does not reopen the form.
 */
export function useLedgerShortcut() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lotId = searchParams.get("lot");
  const { lot, isLoading } = useLotDetail(lotId);
  const [draft, setDraft] = useState(null);
  const [consumed, setConsumed] = useState(false);

  useEffect(() => {
    if (!lotId || consumed || isLoading) return;
    setConsumed(true);
    setDraft(shortfallEntryFor(lot) ?? (lot ? { type: "bpair", item: lot.productName, lotId: lot._id } : null));
    router.replace("/ledger");
  }, [lotId, lot, isLoading, consumed, router]);

  return { draft, isResolving: Boolean(lotId) && !consumed, clearDraft: () => setDraft(null) };
}
