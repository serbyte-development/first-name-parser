#!/usr/bin/env python3
"""Extract compact benchmark fixtures from the official 2020 Census XLSX files.

Uses only Python's standard library so regenerating the JSON fixtures does not
add a JavaScript dependency to the package.
"""

from __future__ import annotations

import json
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile


ROOT = Path(__file__).resolve().parent
NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def workbook_rows(path: Path) -> list[list[str]]:
    with ZipFile(path) as archive:
        shared_root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
        shared = [
            "".join(node.text or "" for node in item.findall(".//a:t", NS))
            for item in shared_root.findall("a:si", NS)
        ]
        sheet = ET.fromstring(archive.read("xl/worksheets/sheet1.xml"))

    rows: list[list[str]] = []
    for row in sheet.findall(".//a:sheetData/a:row", NS):
        values: list[str] = []
        for cell in row.findall("a:c", NS):
            raw = cell.find("a:v", NS)
            value = "" if raw is None or raw.text is None else raw.text
            if cell.attrib.get("t") == "s" and value:
                value = shared[int(value)]
            values.append(value)
        rows.append(values)
    return rows


def main() -> None:
    first_rows = workbook_rows(ROOT / "Names2020_FirstNames_Sex.xlsx")
    last_rows = workbook_rows(ROOT / "Names2020_LastNames.xlsx")

    first_records = [
        {"name": row[0], "count": int(float(row[2]))}
        for row in first_rows[3:]
        if len(row) >= 3 and row[0] and row[0] != "ALL OTHER NAMES"
    ]
    last_names = [
        row[0]
        for row in last_rows[3:]
        if row and row[0] and row[0] != "ALL OTHER NAMES"
    ]

    if len(first_records) != 53_615:
        raise RuntimeError(f"Expected 53,615 first names, found {len(first_records):,}")
    if len(last_names) != 156_621:
        raise RuntimeError(f"Expected 156,621 last names, found {len(last_names):,}")

    (ROOT / "census-first-name-records.json").write_text(
        json.dumps(first_records, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    (ROOT / "census-first-names.json").write_text(
        json.dumps([record["name"] for record in first_records], separators=(",", ":"))
        + "\n",
        encoding="utf-8",
    )
    (ROOT / "census-last-names.json").write_text(
        json.dumps(last_names, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )

    print(
        json.dumps(
            {
                "firstNames": len(first_records),
                "lastNames": len(last_names),
                "firstNamePopulation": sum(record["count"] for record in first_records),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
