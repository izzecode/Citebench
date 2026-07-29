import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next");
  const next =
    requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/app";
  const supabase = await getSupabaseServerClient();

  if (!code || !supabase) {
    return NextResponse.redirect(
      new URL("/sign-in?error=callback_unavailable", url.origin),
    );
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL("/sign-in?error=magic_link_failed", url.origin),
    );
  }

  await supabase.rpc("accept_pending_invites");
  return NextResponse.redirect(new URL(next, url.origin));
}
