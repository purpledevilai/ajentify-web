"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function DocsPage() {
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => router.back()}
        className="fixed left-4 top-20 z-50 flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 text-sm font-medium shadow-md backdrop-blur transition-colors hover:bg-secondary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <iframe
        src="https://api.ajentify.com/docs"
        className="fixed inset-0 top-[5.5rem] h-[calc(100vh-5.5rem)] w-full border-0"
        title="Ajentify API Documentation"
        allow="clipboard-write"
      />
    </>
  );
}
