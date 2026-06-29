import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      brandName: string;
      boothNumber: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    brandName: string;
    boothNumber: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    brandName: string;
    boothNumber: string;
  }
}
