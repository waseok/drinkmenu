"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface LogoutButtonProps {
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  className?: string;
}

export function LogoutButton({
  variant = "outline",
  size = "sm",
  className,
}: LogoutButtonProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleLogout() {
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/school-access", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("로그아웃에 실패했습니다.");
      }

      toast.success("로그아웃되었습니다.");
      router.replace("/access");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "로그아웃에 실패했습니다."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleLogout}
      disabled={submitting}
    >
      <LogOutIcon className="mr-1.5 size-4" />
      {submitting ? "처리 중..." : "로그아웃"}
    </Button>
  );
}
