import { proxy } from "./src/proxy";

export const middleware = proxy;

export const config = {
  matcher: ["/chat/:path*", "/chat", "/login", "/register"],
};

