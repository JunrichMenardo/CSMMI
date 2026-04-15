'use client';

import { useEffect, useState } from 'react';
import { Stock } from '@/types';
import { fetchStocksByContainer } from '@/lib/api';
import { Package } from 'lucide-react';

interface StockMonitoringProps {
  containerId: string;
  containerName: string;
}

export const StockMonitoring: React.FC<StockMonitoringProps> = ({
  containerId,
  containerName,
}) => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStocks = async () => {
      try {
        const data = await fetchStocksByContainer(containerId);
        setStocks(data);
      } catch (err) {
        console.error('Failed to load stocks:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStocks();
  }, [containerId]);

  const totalItems = stocks.reduce((sum, stock) => sum + stock.quantity, 0);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-5 h-5 text-black" />
        <h3 className="text-lg font-semibold text-black">Stock: {containerName}</h3>
      </div>

      {loading ? (
        <p className="text-black">Loading stocks...</p>
      ) : stocks.length === 0 ? (
        <p className="text-center text-black py-8">No stocks in this container</p>
      ) : (
        <>
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              Total Items: <span className="font-bold">{totalItems}</span>
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-black">Item Name</th>
                  <th className="px-3 py-2 text-right font-semibold text-black">Quantity</th>
                  <th className="px-3 py-2 text-left font-semibold text-black">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stocks.map((stock) => (
                  <tr key={stock.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-black">{stock.item_name}</td>
                    <td className="px-3 py-2 text-right font-medium text-black">
                      {stock.quantity}
                    </td>
                    <td className="px-3 py-2 text-black">{stock.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
