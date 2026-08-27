import { createColumnHelper } from "@tanstack/react-table"

import { type DataTableFeatures } from "./data-table-features"
import type { RouterOutputs } from "@/lib/types";


type School = RouterOutputs['schools']['list']["data"][number];
const columnHelper = createColumnHelper<DataTableFeatures, School>()

export const columns = columnHelper.columns([
    columnHelper.accessor("name", {
        header: "نام",
    }),
    columnHelper.accessor("address", {
        header: "آدرس",
    }),
    columnHelper.accessor("city", {
        header: "شهر",
    }),
    columnHelper.accessor("district", {
        header: "منطقه",
    }),
    columnHelper.accessor("phone", {
        header: "تلفن",
    }),
])