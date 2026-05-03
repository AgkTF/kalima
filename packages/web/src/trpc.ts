import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "server/router";

export const trpc = createTRPCReact<AppRouter>();

export function createClient() {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: "/trpc",
      }),
    ],
  });
}