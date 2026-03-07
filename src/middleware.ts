import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Allow all authenticated users through — page-level permission checks happen in components
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/masters/:path*",
    "/orders/:path*",
    "/production/:path*",
    "/procurement/:path*",
    "/qc/:path*",
    "/shipping/:path*",
    "/invoices/:path*",
    "/payments/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/api/masters/:path*",
    "/api/orders/:path*",
    "/api/production/:path*",
    "/api/procurement/:path*",
  ],
};
