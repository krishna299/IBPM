import "next-auth";

interface Permission {
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canExport: boolean;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      roleId: string;
      permissions: Permission[];
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    roleId: string;
    permissions: Permission[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    roleId: string;
    permissions: Permission[];
  }
}
