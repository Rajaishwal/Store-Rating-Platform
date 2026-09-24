import { Card } from './ui'

/**
 * One sortable table used by every admin listing.
 *
 * Written once because the store listing, the user listing, and anything added
 * later all need identical sorting, loading, and empty behaviour. Duplicating
 * that logic per screen is how the three listings drift apart.
 *
 * columns: [{ key, label, sortable, render?, className?, headerClassName? }]
 */
export default function DataTable({
  columns,
  rows,
  rowKey,
  sort,
  onSort,
  loading = false,
  emptyMessage = 'Nothing to show.',
  onRowClick,
  minWidth = 760,
}) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth }}>
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              {columns.map((column) => {
                const active = sort?.by === column.key
                const arrow = active ? (sort.order === 'asc' ? '↑' : '↓') : '↕'

                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      active ? (sort.order === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 ${
                      column.headerClassName ?? ''
                    }`}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => onSort(column.key)}
                        className={`flex items-center gap-1.5 uppercase transition ${
                          active ? 'text-slate-900' : 'hover:text-slate-800'
                        }`}
                      >
                        {column.label}
                        <span aria-hidden="true" className={active ? '' : 'text-slate-400'}>
                          {arrow}
                        </span>
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>

          {/* While refetching, existing rows stay on screen and dim rather than
              being replaced by a spinner. Filtering is debounced but still
              refetches as the user types, and blanking the table on each
              keystroke makes the page flicker and lose the reader's place. */}
          <tbody
            aria-busy={loading}
            className={`divide-y divide-slate-100 transition-opacity ${
              loading && rows.length > 0 ? 'opacity-50' : ''
            }`}
          >
            {loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-500">
                  Loading...
                </td>
              </tr>
            )}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            )}

            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? 'cursor-pointer hover:bg-slate-50' : 'hover:bg-slate-50/60'}
              >
                {columns.map((column) => (
                  <td key={column.key} className={`px-4 py-3 text-sm ${column.className ?? ''}`}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/** Page controls, rendered only when there is more than one page. */
export function Pagination({ pagination, onPage, noun = 'records' }) {
  if (!pagination || pagination.totalPages <= 1) return null

  const { page, totalPages, total } = pagination

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-600">
        Page {page} of {totalPages} &middot; {total} {noun}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium
            text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium
            text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}
