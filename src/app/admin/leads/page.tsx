"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Search, Filter, Calendar, MapPin, Phone, Mail, User, ChevronDown, ChevronUp, ExternalLink, CreditCard, Clock, Package } from "lucide-react";

interface Lead {
  date: string;
  type: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  product: string;
  amount: string;
  bookingDate: string;
  bookingSlot: string;
  status: string;
  orderId: string;
}

type DashView = "all" | "upcoming";

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  "Paid Order": { bg: "bg-blue-50", text: "text-blue-700" },
  Installation: { bg: "bg-indigo-50", text: "text-indigo-700" },
  Consultation: { bg: "bg-green-50", text: "text-green-700" },
  Upcoming: { bg: "bg-amber-50", text: "text-amber-700" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Paid: { bg: "bg-green-100", text: "text-green-800" },
  Upcoming: { bg: "bg-blue-100", text: "text-blue-800" },
  Complimentary: { bg: "bg-emerald-100", text: "text-emerald-800" },
};

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [key, setKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [view, setView] = useState<DashView>("upcoming");
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  const fetchLeads = useCallback(async (adminKey: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/leads", {
        headers: { Authorization: `Bearer ${adminKey}` },
        cache: "no-store",
      });
      if (res.status === 401) {
        setError("Invalid key");
        setAuthed(false);
        setLoading(false);
        return;
      }
      if (res.status === 429) {
        setError("Too many attempts — try again in a minute");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setLeads(data.leads || []);
      setAuthed(true);
    } catch {
      setError("Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_key");
    if (stored) {
      setKey(stored);
      fetchLeads(stored);
    } else {
      setLoading(false);
    }
  }, [fetchLeads]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem("admin_key", key);
    fetchLeads(key);
  };

  const filtered = leads.filter((l) => {
    const matchesSearch =
      !search ||
      [l.name, l.email, l.phone, l.address, l.product, l.orderId]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesType = typeFilter === "All" || l.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const types = ["All", ...Array.from(new Set(leads.map((l) => l.type)))];

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <form onSubmit={handleAuth} className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Admin Access</h1>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Enter admin key"
            className="w-full border rounded-xl px-4 py-3 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          <button
            type="submit"
            className="w-full bg-gray-900 text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors"
          >
            {loading ? "Loading..." : "View Dashboard"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-6 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Smart Space Dashboard</h1>
            <p className="text-sm text-gray-500">{leads.length} total records</p>
          </div>
          <button
            onClick={() => fetchLeads(key)}
            disabled={loading}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-medium text-sm px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* View tabs */}
        <div className="inline-flex bg-gray-100 rounded-full p-1 mb-6">
          <button
            onClick={() => setView("upcoming")}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              view === "upcoming" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            Upcoming
          </button>
          <button
            onClick={() => setView("all")}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              view === "all" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            All Records
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Paid Orders", filterType: "Paid Order", count: leads.filter((l) => l.type === "Paid Order").length, color: "border-blue-500" },
            { label: "Installations", filterType: "Installation", count: leads.filter((l) => l.type === "Installation").length, color: "border-indigo-500" },
            { label: "Consultations", filterType: "Consultation", count: leads.filter((l) => l.type === "Consultation").length, color: "border-green-500" },
            {
              label: "Revenue",
              filterType: "Paid Order",
              count: leads
                .filter((l) => l.type === "Paid Order")
                .reduce((sum, l) => sum + parseFloat(l.amount.replace(/[^0-9.]/g, "") || "0"), 0),
              color: "border-amber-500",
              isMoney: true,
            },
          ].map((s) => (
            <button
              key={s.label}
              onClick={() => { setView("all"); setTypeFilter(s.filterType); }}
              className={`bg-white rounded-xl border-l-4 ${s.color} p-4 shadow-sm text-left hover:shadow-md transition-shadow cursor-pointer ${
                view === "all" && typeFilter === s.filterType ? "ring-2 ring-gray-300" : ""
              }`}
            >
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">{s.label}</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {"isMoney" in s && s.isMoney ? `\u20AC${(s.count as number).toFixed(2)}` : s.count}
              </div>
            </button>
          ))}
        </div>

        {/* ── Upcoming View ── */}
        {view === "upcoming" && (() => {
          const upcoming = leads
            .filter((l) => l.status === "Upcoming")
            .filter((l) =>
              !search || [l.name, l.email, l.phone, l.address, l.product].join(" ").toLowerCase().includes(search.toLowerCase())
            );
          return (
            <>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search upcoming by name, email, address..."
                  className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              {upcoming.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
                  No upcoming events
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcoming.map((lead, i) => {
                    const typeColor = TYPE_COLORS[lead.type] || { bg: "bg-gray-50", text: "text-gray-700" };
                    const isExpanded = expandedCard === i;
                    const mapsUrl = lead.address !== "—" ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}` : null;
                    return (
                      <div
                        key={i}
                        className={`bg-white rounded-2xl border shadow-sm transition-all cursor-pointer ${
                          isExpanded ? "border-brand-500 shadow-lg ring-1 ring-brand-500/20" : "border-gray-100 hover:shadow-md"
                        }`}
                      >
                        {/* Card header — always visible, clickable */}
                        <div className="p-5" onClick={() => setExpandedCard(isExpanded ? null : i)}>
                          <div className="flex items-center justify-between mb-3">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${typeColor.bg} ${typeColor.text}`}>
                              {lead.type}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-400">{lead.bookingSlot}</span>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-4 h-4 text-brand-500 flex-shrink-0" />
                            <span className="text-sm font-bold text-gray-900">{lead.bookingDate}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-3">
                            <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-sm font-medium text-gray-700">{lead.product}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="text-sm font-medium text-gray-900">{lead.name}</span>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-3">
                            {/* Payment */}
                            <div className="flex items-center gap-2 text-sm">
                              <CreditCard className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="text-gray-600">Payment:</span>
                              <span className={`font-semibold ${lead.amount === "Complimentary" ? "text-emerald-600" : "text-gray-900"}`}>
                                {lead.amount}
                              </span>
                              {lead.status === "Paid" && (
                                <span className="ml-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Paid</span>
                              )}
                            </div>

                            {/* Time */}
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="text-gray-600">Time:</span>
                              <span className="font-medium text-gray-900">{lead.bookingSlot}</span>
                            </div>

                            {/* Contact details */}
                            <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <a href={`mailto:${lead.email}`} className="text-brand-500 hover:underline truncate">{lead.email}</a>
                              </div>
                              {lead.phone !== "—" && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  <a href={`tel:${lead.phone}`} className="text-brand-500 hover:underline">{lead.phone}</a>
                                </div>
                              )}
                              {lead.address !== "—" && (
                                <div className="flex items-start gap-2 text-sm">
                                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                  <span className="text-gray-700">{lead.address}</span>
                                </div>
                              )}
                            </div>

                            {/* Action buttons */}
                            <div className="flex flex-wrap gap-2 pt-1">
                              {mapsUrl && (
                                <a
                                  href={mapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MapPin className="w-3.5 h-3.5" />
                                  Google Maps
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              {lead.phone !== "—" && (
                                <a
                                  href={`tel:${lead.phone}`}
                                  className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 hover:bg-green-100 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                  Call
                                </a>
                              )}
                              <a
                                href={`mailto:${lead.email}`}
                                className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Mail className="w-3.5 h-3.5" />
                                Email
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}

        {/* ── All Records View ── */}
        {view === "all" && (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, phone, address, product..."
                  className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-white border border-gray-200 rounded-xl pl-10 pr-8 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {types.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Customer</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Address</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Product</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Amount</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Booking</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                          No records found
                        </td>
                      </tr>
                    ) : (
                      filtered.map((lead, i) => {
                        const typeColor = TYPE_COLORS[lead.type] || { bg: "bg-gray-50", text: "text-gray-700" };
                        const statusColor = STATUS_COLORS[lead.status] || { bg: "bg-gray-100", text: "text-gray-700" };
                        return (
                          <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{lead.date}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${typeColor.bg} ${typeColor.text}`}>
                                {lead.type}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{lead.name}</div>
                              <div className="text-xs text-gray-400">{lead.email}</div>
                              {lead.phone !== "—" && <div className="text-xs text-gray-400">{lead.phone}</div>}
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-xs max-w-[180px]">{lead.address !== "—" ? lead.address : ""}</td>
                            <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">{lead.product}</td>
                            <td className="px-4 py-3 font-semibold text-gray-900">{lead.amount}</td>
                            <td className="px-4 py-3 text-gray-600 text-xs">
                              {lead.bookingDate !== "—" && (
                                <>
                                  <div>{lead.bookingDate}</div>
                                  {lead.bookingSlot !== "—" && <div className="text-gray-400">{lead.bookingSlot}</div>}
                                </>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor.bg} ${statusColor.text}`}>
                                {lead.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
