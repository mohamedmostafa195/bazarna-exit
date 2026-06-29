import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      brandName: string;
      boothNumber: string;
      entranceType: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    brandName: string;
    boothNumber: string;
    entranceType: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    brandName: string;
    boothNumber: string;
    entranceType: string | null;
  }
}
