"use client";

import { useEffect } from "react";

export default function StoreRedirect({ url }: { url: string }) {
  useEffect(() => {
    window.location.replace(url);
  }, [url]);
  return null;
}
