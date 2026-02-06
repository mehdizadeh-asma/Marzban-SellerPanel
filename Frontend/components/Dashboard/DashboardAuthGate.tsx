"use client";

import { useRouter } from "next/navigation";
import type { ReactElement } from "react";
import { useEffect } from "react";

import { useMyContext } from "@/context/MyContext";

export default function DashboardAuthGate(): ReactElement | null {
  const router = useRouter();
  const { user } = useMyContext();

  useEffect(() => {
    if (!user.accessToken) router.push("/seller");
  }, [user.accessToken, router]);

  return null;
}
