"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardHomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/app/agents");
  }, [router]);
  return null;
}
