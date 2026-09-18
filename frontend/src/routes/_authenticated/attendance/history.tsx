import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { format } from 'date-fns-jalali';
import { UserCircle, AlertTriangle } from 'lucide-react';
import { DataTableSearch, DataTableToolbar } from '@/components/data-table';
import { DataTable } from '@/components/ui/data-table';
import type { PaginationState } from '@/components/serachable-data-table';
import { guardPermission } from '@/lib/route-guards';
import { useTRPC } from '@/lib/trpc';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// 1. Search Schema
const historySearchSchema = z.object({
  page: z.coerce.number({ error: "شماره صفحه نامعتبر است" }).int({ message: "شماره صفحه باید عدد صحیح باشد" }).positive({ message: "شماره صفحه باید مثبت باشد" }).catch(1).default(1),
  limit: z.coerce.number({ error: "تعداد نامعتبر است" }).int({ message: "تعداد باید عدد صحیح باشد" }).positive({ message: "تعداد باید مثبت باشد" }).catch(15).default(15),
  q: z.string({ error: "متن جستجو نامعتبر است" }).catch("").default(""),
  timeRange: z.enum(['today', 'last_3_days', 'last_week', 'last_month'], { error: "بازه زمانی نامعتبر است" }).catch('today').default('today'),
});

export const Route = createFileRoute('/_authenticated/attendance/history')({
  validateSearch: historySearchSchema,
  beforeLoad: guardPermission({
    anyOf: ['attendance.record.read', 'attendance.record.read.own'],
  }),
  component: AttendanceHistory,
});

function AttendanceHistory() {
  const trpc = useTRPC();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const pagination: PaginationState = {
    pageIndex: search.page - 1,
    pageSize: search.limit,
  };

  const handlePaginationChange = (updater: PaginationState | ((prev: PaginationState) => PaginationState)) => {
    const next = typeof updater === 'function' ? updater(pagination) : updater;
    navigate({
      search: (prev) => ({
        ...prev,
        page: next.pageIndex + 1,
        limit: next.pageSize,
      }),
      replace: true,
    });
  };

  const handleSearchChange = (q: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        q,
        page: 1, // Reset page on search
      }),
      replace: true,
    });
  };

  const handleTimeRangeChange = (val: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        timeRange: val as any,
        page: 1, // Reset page on filter change
      }),
      replace: true,
    });
  };

  // 2. Fetch History Data
  const query = useQuery({
    ...trpc.attendance.punchLogs.history.queryOptions({
      q: search.q,
      timeRange: search.timeRange,
      page: search.page,
      limit: search.limit,
    }),
    placeholderData: keepPreviousData,
  });

  const logs = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  // 3. Define Columns
  const columns = [
    {
      accessorKey: 'studentName',
      header: 'نام دانش‌آموز',
      cell: ({ row }: any) => {
        const studentName = row.original.student?.userSchool?.user?.fullName;
        return (
          <div className="flex items-center gap-3">
            {studentName ? (
              <div className="bg-primary/10 text-primary p-2 rounded-full">
                <UserCircle size={18} />
              </div>
            ) : (
              <div className="bg-amber-500/10 text-amber-500 p-2 rounded-full">
                <AlertTriangle size={18} />
              </div>
            )}
            <span className={`font-medium ${!studentName ? 'text-amber-600' : ''}`}>
              {studentName || 'ناشناس (یافت نشد)'}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'nationalCode',
      header: 'کد ملی',
      cell: ({ row }: any) => {
        const nationalCode = row.original.student?.userSchool?.user?.nationalCode;
        return <span className="font-mono text-muted-foreground">{nationalCode || '---'}</span>;
      },
    },
    {
      accessorKey: 'deviceUserId',
      header: 'شناسه دستگاه',
      cell: ({ row }: any) => {
        return <span className="font-mono text-muted-foreground">{row.original.deviceUserId}</span>;
      },
    },
    {
      accessorKey: 'recordTime',
      header: 'زمان ثبت',
      cell: ({ row }: any) => {
        return (
          <span dir="ltr" className="font-medium">
            {format(new Date(row.original.recordTime), 'yyyy/MM/dd HH:mm:ss')}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'وضعیت',
      cell: ({ row }: any) => {
        const hasStudent = !!row.original.studentId;
        return hasStudent ? (
          <span className="bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full text-xs font-medium border border-emerald-500/20">
            موفق
          </span>
        ) : (
          <span className="bg-amber-500/10 text-amber-600 px-3 py-1 rounded-full text-xs font-medium border border-amber-500/20">
            نیاز به بررسی
          </span>
        );
      },
    },
  ];

  const totalPages = Math.ceil(total / search.limit);
  const tableMeta = {
    totalItems: total,
    totalPages,
    hasPrevPage: search.page > 1,
    hasNextPage: search.page < totalPages,
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">تاریخچه ترددها</h1>
          <p className="text-muted-foreground mt-1">جستجو و فیلتر اطلاعات ثبت شده در دستگاه حضور و غیاب</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <DataTableToolbar>
          <div className="flex flex-1 items-center gap-4 flex-wrap px-4">
            <DataTableSearch
              value={search.q}
              onChange={handleSearchChange}
              placeholder="جستجو با نام یا کد ملی..."
            />

            <div className="w-45">
              <Select value={search.timeRange} onValueChange={handleTimeRangeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="بازه زمانی">
                    {{
                      today: 'امروز',
                      last_3_days: '۳ روز گذشته',
                      last_week: 'هفته گذشته',
                      last_month: 'ماه گذشته',
                    }[search.timeRange] || 'بازه زمانی'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">امروز</SelectItem>
                  <SelectItem value="last_3_days">۳ روز گذشته</SelectItem>
                  <SelectItem value="last_week">هفته گذشته</SelectItem>
                  <SelectItem value="last_month">ماه گذشته</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DataTableToolbar>

        <div className="p-4 border-t">
          <DataTable
            columns={columns as any}
            data={logs}
            meta={tableMeta}
            pagination={pagination}
            onPaginationChange={handlePaginationChange}
            isLoading={query.isLoading}
          />
        </div>
      </div>
    </div>
  );
}

