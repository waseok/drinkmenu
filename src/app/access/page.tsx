import type { AccessScope } from "@/lib/school-auth";
import AccessForm from "./access-form";

function sanitizeNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/")) {
    return "/admin";
  }

  if (nextPath.startsWith("//")) {
    return "/admin";
  }

  return nextPath;
}

function sanitizeScope(scope: string | null): AccessScope {
  return scope === "admin" ? "admin" : "order";
}

export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; scope?: string }>;
}) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params.next ?? null);
  const scope = sanitizeScope(params.scope ?? null);

  return <AccessForm nextPath={nextPath} scope={scope} />;
}
