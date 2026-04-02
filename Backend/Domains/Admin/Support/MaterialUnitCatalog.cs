using System;
using System.Collections.Generic;
using System.Linq;

namespace Backend.Domains.Admin.Support
{
    public static class MaterialUnitCatalog
    {
        private static readonly HashSet<string> FractionalQuantityUnits = new(StringComparer.Ordinal)
        {
            "kg",
            "tấn",
            "m",
            "m²",
            "m³",
            "lít",
        };

        private static readonly Dictionary<string, string> AliasMap = new(StringComparer.OrdinalIgnoreCase)
        {
            ["kg"] = "kg",
            ["kilogram"] = "kg",
            ["tấn"] = "tấn",
            ["tan"] = "tấn",
            ["m"] = "m",
            ["met"] = "m",
            ["mét"] = "m",
            ["m2"] = "m²",
            ["m^2"] = "m²",
            ["m²"] = "m²",
            ["m3"] = "m³",
            ["m^3"] = "m³",
            ["m³"] = "m³",
            ["cây"] = "cây",
            ["cay"] = "cây",
            ["cái"] = "cái",
            ["cai"] = "cái",
            ["viên"] = "viên",
            ["vien"] = "viên",
            ["tấm"] = "tấm",
            ["tam"] = "tấm",
            ["bao"] = "bao",
            ["cuộn"] = "cuộn",
            ["cuon"] = "cuộn",
            ["bộ"] = "bộ",
            ["bo"] = "bộ",
            ["thùng"] = "thùng",
            ["thung"] = "thùng",
            ["lít"] = "lít",
            ["lit"] = "lít",
            ["ống"] = "ống",
            ["ong"] = "ống",
            ["thanh"] = "thanh",
        };

        public static IReadOnlyList<string> AllowedUnits { get; } = AliasMap.Values
            .Distinct(StringComparer.Ordinal)
            .ToList();

        public static bool TryNormalize(string? value, out string normalizedUnit)
        {
            normalizedUnit = string.Empty;

            if (string.IsNullOrWhiteSpace(value))
            {
                return false;
            }

            return AliasMap.TryGetValue(value.Trim(), out normalizedUnit!);
        }

        public static bool AllowsFractionalQuantity(string normalizedUnit)
        {
            return FractionalQuantityUnits.Contains(normalizedUnit);
        }

        public static bool RequiresWholeQuantity(string normalizedUnit)
        {
            return !AllowsFractionalQuantity(normalizedUnit);
        }
    }
}
