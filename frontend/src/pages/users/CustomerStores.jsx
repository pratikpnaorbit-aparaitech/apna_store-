import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Clock, MapPin, Search, Star, Store } from "lucide-react";
import { API } from "../../services/api";

const addressText = (address) => [address?.street, address?.city, address?.state, address?.pincode].filter(Boolean).join(", ");

export default function CustomerStores() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [stores, setStores] = useState([]);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    API.get("/stores/public").then(({ data }) => setStores(data.data || []))
      .catch((requestError) => setError(requestError.response?.data?.message || "Stores could not be loaded"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return stores;
    return stores.filter((store) => [store.name, store.storeType, ...(store.categories || []), addressText(store.address)]
      .filter(Boolean).some((value) => value.toLowerCase().includes(query)));
  }, [search, stores]);

  return <main className="min-h-screen bg-[#f7f7f3] pb-12 text-slate-900">
    <header className="sticky top-0 z-30 bg-gradient-to-r from-green-700 to-green-500 px-4 py-4 text-white shadow-lg"><div className="mx-auto flex max-w-6xl items-center gap-3">
      <button aria-label="Back" onClick={() => navigate(-1)} className="rounded-full bg-white/15 p-2.5 hover:bg-white/25"><ArrowLeft size={20}/></button>
      <div><h1 className="text-xl font-black">Stores near you</h1><p className="text-xs text-green-100">Choose a store and shop its complete catalogue</p></div>
    </div></header>
    <section className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><Search className="text-slate-400" size={19}/><input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Search stores, category, or area…"/></div>
      {loading ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map((item) => <div key={item} className="h-72 animate-pulse rounded-3xl bg-slate-200"/>)}</div>
        : error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">{error}</div>
        : filtered.length === 0 ? <div className="rounded-3xl bg-white p-12 text-center"><Store className="mx-auto mb-3 text-slate-300" size={42}/><h2 className="font-bold">No matching stores</h2><p className="mt-1 text-sm text-slate-500">Try another name, category, or location.</p></div>
        : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((store) => <button key={store._id} onClick={() => navigate(`/shop/${store._id}`)} className="overflow-hidden rounded-3xl border border-slate-100 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
          <div className="relative h-44 bg-gradient-to-br from-green-600 to-green-800">{store.coverImage ? <img src={store.coverImage} alt="" className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center text-6xl">🏪</div>}<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"/><span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/55 px-3 py-1 text-xs font-bold text-white"><Clock size={12}/> 15 min</span><h2 className="absolute bottom-3 left-4 right-4 text-xl font-black text-white">{store.name}</h2></div>
          <div className="p-4"><div className="mb-3 flex flex-wrap gap-1.5">{(store.categories || []).slice(0,3).map((category) => <span key={category} className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">{category}</span>)}</div><div className="flex items-center gap-2 text-sm text-slate-500"><Star size={14} className="fill-amber-400 text-amber-400"/><span className="font-semibold">4.5</span><span>•</span><span>Fast delivery</span></div>{addressText(store.address) && <div className="mt-2 flex items-start gap-2 text-xs text-slate-500"><MapPin size={13} className="mt-0.5 shrink-0"/><span className="line-clamp-2">{addressText(store.address)}</span></div>}</div>
        </button>)}</div>}
    </section>
  </main>;
}
