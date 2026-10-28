import React, { useState, useEffect } from "react";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import { ArrowDownTrayIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
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
  /** GST-inclusive unit selling price as stored on the order line item */
  price: number;
  quantity: number;
  itemDiscount: number;
  /** GST-exclusive taxable value (extracted from inclusive gross) */
  itemTaxableValue: number;
  /** GST-inclusive line total (taxableValue + gstAmount) */
  itemGrossValue: number;
  orderDiscount: number;
  kishanparivarDiscount: number;
  /** null when the GST rate is missing and needs admin review */
  gstPercentage: number | null;
  /** true when the item's GST rate was not recorded — figures need review */
  gstMissing: boolean;
  cgst: number;
  sgst: number;
  igst: number;
  cessRate: number;
  invoiceValue: number;
  invoiceUrl?: string | null;
  itemIndex: number;
}

const fmt = (n: number) => `\u20B9${n.toFixed(2)}`;

const Reports: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("2025-09-01");
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetchInvoiceData();
  }, [startDate, endDate]);

  const fetchInvoiceData = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/reports/invoices", {
        params: { startDate, endDate },
      });
      setInvoices(response.data);
    } catch (error) {
      console.error("Error fetching invoice data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (invoices.length === 0) {
      alert("No data to export");
      return;
    }

    try {
      const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();
      const periodText = `Sales Report of period: ${formatDate(startDate)} to ${formatDate(endDate)}`;

      const headerData = [
        ["Kishan2Kitchen"],
        [periodText],
        [""],
        [
          "Order ID",
          "Invoice Number",
          "Invoice Date",
          "Customer Name",
          "Product Name",
          "Variant",
          "Invoice Value",
          "Kishanparivar Discount (%)",
          "Item Taxable Value",
          "Item Gross Value (incl. GST)",
          "GST (%)",
          "IGST",
          "CGST",
          "SGST",
          "Place",
          "GST Review Needed",
        ],
      ];

      const dataRows = invoices.map((invoice) => [
        invoice.orderId || "",
        invoice.invoiceNumber || "",
        invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : "-",
        invoice.customerName || "",
        invoice.productName || "",
        invoice.variantName || "",
        typeof invoice.invoiceValue === "number" ? fmt(invoice.invoiceValue) : "\u20B90.00",
        typeof invoice.kishanparivarDiscount === "number"
          ? `${invoice.kishanparivarDiscount}%`
          : "0%",
        typeof invoice.itemTaxableValue === "number" ? fmt(invoice.itemTaxableValue) : "\u20B90.00",
        typeof invoice.itemGrossValue === "number" ? fmt(invoice.itemGrossValue) : "\u20B90.00",
        invoice.gstMissing
          ? "MISSING"
          : typeof invoice.gstPercentage === "number"
          ? `${invoice.gstPercentage}%`
          : "0%",
        typeof invoice.igst === "number" ? fmt(invoice.igst) : "\u20B90.00",
        typeof invoice.cgst === "number" ? fmt(invoice.cgst) : "\u20B90.00",
        typeof invoice.sgst === "number" ? fmt(invoice.sgst) : "\u20B90.00",
        invoice.place || "",
        invoice.gstMissing ? "YES — rate not set on variant" : "",
      ]);

      const allData = [...headerData, ...dataRows];

      const worksheet = XLSX.utils.aoa_to_sheet(allData);
      if (worksheet["A1"]) worksheet["A1"].s = { font: { bold: true, sz: 16 } };
      if (worksheet["A2"]) worksheet["A2"].s = { font: { bold: true, sz: 12 } };

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Report");
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const data = new Blob([excelBuffer], { type: "application/octet-stream" });
      saveAs(data, `invoices_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      console.error("Error exporting Excel:", error);
      alert("Error exporting data. Please try again.");
    }
  };

  const missingRateCount = invoices.filter((inv) => inv.gstMissing).length;

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <PageHeader
        title="Sales Reports"
        description="View and export all delivered order invoices"
        actions={
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors cursor-pointer"
            onClick={handleExportExcel}
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export Report
          </button>
        }
      />

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

      {/* GST missing rate warning */}
      {!loading && missingRateCount > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-300 rounded-lg text-amber-800 text-sm">
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0 mt-0.5" />
          <span>
            <strong>{missingRateCount} line item{missingRateCount > 1 ? "s" : ""}</strong> have no
            GST rate recorded on their variant. Taxable value and GST for those rows are
            approximate. Please set <code>gstPercentage</code> on the affected variants and
            regenerate the report.
          </span>
        </div>
      )}

      {loading ? (
        <Loader text="Loading reports data..." />
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KP Discount (%)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Taxable</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Gross</th>
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
                  <tr
                    key={`${invoice.orderId}-${invoice.itemIndex}`}
                    className={`hover:bg-gray-50 ${invoice.gstMissing ? "bg-amber-50" : ""}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.orderId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.invoiceNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.customerName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.productName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.variantName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {typeof invoice.invoiceValue === "number" ? fmt(invoice.invoiceValue) : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.kishanparivarDiscount}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {fmt(invoice.itemTaxableValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {fmt(invoice.itemGrossValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.gstMissing ? (
                        <span className="flex items-center gap-1 text-amber-700 font-medium">
                          <ExclamationTriangleIcon className="h-4 w-4" />
                          Missing
                        </span>
                      ) : (
                        `${invoice.gstPercentage}%`
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fmt(invoice.igst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fmt(invoice.cgst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fmt(invoice.sgst)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.place}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {invoice.invoiceUrl ? (
                        <a
                          href={invoice.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-900"
                        >
                          Download
                        </a>
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
