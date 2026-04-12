import { Badge } from "@/components/ui/badge";
import { ContractDto } from "@/services/admin-suppliers";
import React from "react";

export const moneyFormatter = (locale: string) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });

export const quantityFormatter = (locale: string) =>
  new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  });

export const normalizeSearchValue = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

export const formatMoney = (value?: number | null, locale: string = "vi-VN") =>
  value == null ? "—" : moneyFormatter(locale).format(value);

export const formatQuantity = (
  value?: number | null,
  unit?: string | null,
  locale: string = "vi-VN",
) => {
  if (value == null) return "—";
  const suffix = unit ? ` ${unit}` : "";
  return `${quantityFormatter(locale).format(value)}${suffix}`;
};

export const matchesContracts = (contracts: ContractDto[], keyword: string) =>
  contracts.some(
    (contract) =>
      [
        contract.contractCode,
        contract.contractNumber,
        contract.status,
        contract.supplierName,
      ].some((value) => normalizeSearchValue(value).includes(keyword)) ||
      contract.materials.some((material) =>
        [material.code, material.name, material.unit].some((value) =>
          normalizeSearchValue(value).includes(keyword),
        ),
      ),
  );

export const renderContractCountBadge = (
  contracts: ContractDto[],
  t: (s: string) => string,
) => {
  const count = contracts.length;
  if (count === 0)
    return (
      <Badge
        variant="secondary"
        className="bg-slate-100 text-slate-500 font-normal"
      >
        {t("N/A")}
      </Badge>
    );
  return (
    <div className="flex flex-col gap-1">
      <Badge className="w-fit bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100 shadow-none">
        {count} {t("contracts")}
      </Badge>
    </div>
  );
};
