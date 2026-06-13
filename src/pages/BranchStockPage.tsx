import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { find, Collections } from '../lib/api';
import type { Branch, BranchStock, Product } from '../lib/types';
import { Search, Package } from 'lucide-react';

interface StockWithProduct extends BranchStock {
  product: Product;
}

export default function BranchStockPage() {
  const { user } = useAuth();
  const [branches, setBranches]         = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState(user?.branchId || '');
  const [stock, setStock]               = useState<StockWithProduct[]>([]);
  const [loading, setLoading]           = useState(false);
  const [search, setSearch]             = useState('');

  useEffect(() => {
    find(Collections.BRANCHES, { isActive: true }, { sort: { name: 1 } }).then(data => {
      setBranches(data as Branch[]);
      if (!selectedBranch && data[0]) setSelectedBranch((data[0] as Branch)._id);
    });
  }, []);

  useEffect(() => {
    if (selectedBranch) fetchStock();
  }, [selectedBranch]);

  async function fetchStock() {
    setLoading(true);
    const [stockData, productData] = await Promise.all([
      find(Collections.BRANCH_STOCK, { branchId: selectedBranch }),
      find(Collections.PRODUCTS, { isActive: true }),
    ]);
    const productMap = Object.fromEntries((productData as Product[]).map(p => [p._id, p]));
    const merged = (stockData as BranchStock[])
      .map(s => ({ ...s, product: productMap[s.productId] }))
      .filter(s => s.product) as StockWithProduct[];
    setStock(merged);
    setLoading(false);
  }

  const filtered = stock.filter(s =>
    s.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
    (s.product?.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const branchName = branches.find(b => b._id === selectedBranch)?.name || '';
  const fmt = (n: number) => `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Branch Stock</h1>
        <p className="text-slate-500 text-sm mt-1">Current inventory at each branch</p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}
            disabled={user?.role !== 'admin'}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-50">
            {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
        </div>

        {branchName && (
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-500" />
            {branchName} — {filtered.length} products
          </h3>
        )}

        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>No stock records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200">
                  <th className="pb-3 font-medium text-slate-600">Product</th>
                  <th className="pb-3 font-medium text-slate-600">Category</th>
                  <th className="pb-3 font-medium text-slate-600">Unit</th>
                  <th className="pb-3 font-medium text-slate-600 text-right">Quantity</th>
                  <th className="pb-3 font-medium text-slate-600 text-right">Current Price</th>
                  <th className="pb-3 font-medium text-slate-600">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(item => (
                  <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-medium text-slate-800">{item.product?.name}</td>
                    <td className="py-3 text-slate-500">{item.product?.category || '-'}</td>
                    <td className="py-3 text-slate-500">{item.product?.unit}</td>
                    <td className={`py-3 text-right font-semibold ${Number(item.quantity) <= 5 ? 'text-red-600' : Number(item.quantity) <= 20 ? 'text-amber-600' : 'text-green-600'}`}>
                      {Number(item.quantity).toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-slate-600">{fmt(item.product?.unitPrice || 0)}</td>
                    <td className="py-3 text-slate-400 text-xs">{new Date(item.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
