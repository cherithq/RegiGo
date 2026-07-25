import {
    companyModuleKeys,
    defaultCompanyModules,
    type CompanyModuleKey,
} from "@/lib/company-modules";

export const sidebarModuleKeys =
    companyModuleKeys;

export type SidebarModuleKey =
    CompanyModuleKey;

export type SidebarModuleMap =
    Record<
        SidebarModuleKey,
        boolean
    >;

export const defaultSidebarModules:
    SidebarModuleMap = {
        ...defaultCompanyModules,
    };
