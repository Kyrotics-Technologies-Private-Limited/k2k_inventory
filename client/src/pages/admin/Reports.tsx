import React, { useState, useEffect } from "react";
import { ArrowDownTrayIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../services/api/api";

interface InvoiceData {
  orderId: string;
  customerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  place: string;
    productName: string;
  variantName: string;
  price: number;
    quantity: number;
  itemDiscount: number;
  itemTaxableValue: number;
  orderDiscount: number;
  kishanparivarDiscount: number;
  gstPercentage: number;
  cgst: number;
  sgst: number;
  igst: number;
  cessRate: number;
  invoiceValue: number;
  invoiceUrl?: string | null;
  itemIndex: number;
}

const Reports: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('2025-09-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchInvoiceData();
  }, [startDate, endDate]);

  const fetchInvoiceData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/reports/invoices', {
        params: {
          startDate,
          endDate
        }
      });
      setInvoices(response.data);
      console.log('Fetched invoice data:', response.data);
    } catch (error) {
      console.error('Error fetching invoice data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    console.log('Export button clicked, invoices length:', invoices.length);
    
    if (invoices.length === 0) {
      alert('No data to export');
      return;
    }

    try {
      console.log('Sample invoice data:', invoices[0]);
      console.log('All invoices GST data:', invoices.map(inv => ({
        orderId: inv.orderId,
        productName: inv.productName,
        gstPercentage: inv.gstPercentage,
        cgst: inv.cgst,
        sgst: inv.sgst
      })));

      // Create period text
      const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();
      const periodText = `Sales Report of period: ${formatDate(startDate)} to ${formatDate(endDate)}`;
      
      // Create header data
      const headerData = [
        ['Kishan2Kitchen'],
        [periodText],
        [''], // Empty row for spacing
        // Column headers
        ['Order ID', 'Invoice Number', 'Invoice Date', 'Customer Name', 'Product Name', 'Variant', 'Invoice Value', 'Kishanparivar Discount (%)', 'Item Taxable', 'GST(%)', 'IGST', 'CGST', 'SGST', 'Place']
      ];
      
      // Create data rows
      const dataRows = invoices.map(invoice => [
        invoice.orderId || '',
        invoice.invoiceNumber || '',
        invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : '-',
        invoice.customerName || '',
        invoice.productName || '',
        invoice.variantName || '',
        typeof invoice.invoiceValue === 'number' ? `₹${invoice.invoiceValue.toFixed(2)}` : '₹0.00',
        typeof invoice.kishanparivarDiscount === 'number' ? `${invoice.kishanparivarDiscount}%` : '0%',
        typeof invoice.itemTaxableValue === 'number' ? `₹${invoice.itemTaxableValue.toFixed(2)}` : '₹0.00',
        typeof invoice.gstPercentage === 'number' ? `${invoice.gstPercentage}%` : '0%',
        typeof invoice.igst === 'number' ? `₹${invoice.igst.toFixed(2)}` : '₹0.00',
        typeof invoice.cgst === 'number' ? `₹${invoice.cgst.toFixed(2)}` : '₹0.00',
        typeof invoice.sgst === 'number' ? `₹${invoice.sgst.toFixed(2)}` : '₹0.00',
        invoice.place || ''
      ]);

      // Combine header and data
      const allData = [...headerData, ...dataRows];

      console.log('Export data prepared:', allData.slice(0, 5));
      
      const worksheet = XLSX.utils.aoa_to_sheet(allData);
      
      // Style the header rows
      if (worksheet['A1']) worksheet['A1'].s = { font: { bold: true, sz: 16 } };
      if (worksheet['A2']) worksheet['A2'].s = { font: { bold: true, sz: 12 } };
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Report');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
      
      console.log('Excel file created, size:', data.size);
    saveAs(data, `invoices_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
      
      console.log('Export completed successfully');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Error exporting data. Please try again.');
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Reports</h1>
          <p className="mt-2 text-sm text-gray-700">
            View and export all delivered order invoices
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            onClick={handleExportExcel}
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center p-12">
          <ArrowPathIcon className="h-12 w-12 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-green-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kishanparivar Discount (%)</th>
                  
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Taxable</th>
                  
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GST(%)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IGST</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CGST</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SGST</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Place</th>
                  
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={`${invoice.orderId}-${invoice.itemIndex}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.orderId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.invoiceNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.customerName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.productName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.variantName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{invoice.invoiceValue}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.kishanparivarDiscount}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{invoice.itemTaxableValue.toFixed(2)}</td>
                
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.gstPercentage}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{invoice.igst}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{invoice.cgst}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{invoice.sgst}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.place}</td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {invoice.invoiceUrl ? (
                        <a href={invoice.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-900">Download</a>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;