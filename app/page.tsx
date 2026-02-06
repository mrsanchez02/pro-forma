"use client";

import dayjs from "dayjs";
import { useFormik } from "formik";
import React, { useMemo } from "react";
import * as Yup from "yup";
// @ts-expect-error - pdfmake types
import pdfMake from "pdfmake/build/pdfmake";
// @ts-expect-error - pdfmake fonts
import pdfFonts from "pdfmake/build/vfs_fonts";

pdfMake.vfs = pdfFonts.vfs;

type InvoiceItem = {
  description: string;
  qty: number;
  rate: number;
};

type InvoiceData = {
  company: {
    name: string;
    address1: string;
    address2: string; // City, State ZIP
    phone: string;
    email: string;
    ein: string;
  };
  client: {
    name: string;
    address1: string;
    address2: string;
    email: string;
  };
  meta: {
    invoiceNo: string;
    issueDate: string; // YYYY-MM-DD
    dueDate: string; // YYYY-MM-DD
    terms: string; // Net 15 / Net 30
    reference: string; // Load ID / PO / Ref
  };
  items: InvoiceItem[];
  notes: string;
  payment: string;
  taxRate: number; // 0.07 => 7%
  discount: number; // USD
};

function money(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

const validationSchema = Yup.object({
  company: Yup.object({
    name: Yup.string().required("Company name is required"),
    address1: Yup.string().required("Address is required"),
    address2: Yup.string().required("City, State ZIP is required"),
    phone: Yup.string().required("Phone is required"),
    email: Yup.string().email("Invalid email").required("Email is required"),
    ein: Yup.string(), // Optional
  }),
  client: Yup.object({
    name: Yup.string().required("Client name is required"),
    address1: Yup.string().required("Address is required"),
    address2: Yup.string().required("City, State ZIP is required"),
    email: Yup.string().email("Invalid email"), // Optional
  }),
  meta: Yup.object({
    invoiceNo: Yup.string().required("Invoice number is required"),
    issueDate: Yup.string().required("Issue date is required"),
    dueDate: Yup.string().required("Due date is required"),
    terms: Yup.string().required("Terms are required"),
    reference: Yup.string(),
  }),
  items: Yup.array()
    .of(
      Yup.object({
        description: Yup.string().required("Description is required"),
        qty: Yup.number().min(0, "Quantity must be positive").required("Quantity is required"),
        rate: Yup.number().min(0, "Rate must be positive").required("Rate is required"),
      })
    )
    .min(1, "At least one item is required"),
  notes: Yup.string(),
  payment: Yup.string(),
  taxRate: Yup.number().min(0, "Tax rate must be positive"),
  discount: Yup.number().min(0, "Discount must be positive"),
});

export default function Page() {
  // Cargar datos guardados de localStorage
  const loadSavedData = () => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem('invoiceDefaults');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const savedData = loadSavedData();

  const formik = useFormik<InvoiceData>({
    initialValues: {
      company: savedData?.company || {
        name: "",
        address1: "",
        address2: "",
        phone: "",
        email: "",
        ein: "",
      },
      client: {
        name: "",
        address1: "",
        address2: "",
        email: "",
      },
      meta: {
        invoiceNo: "INV-0000",
        issueDate: dayjs().format("YYYY-MM-DD"),
        dueDate: dayjs().add(14, "day").format("YYYY-MM-DD"),
        terms: "",
        reference: "",
      },
      items: [],
      notes: "",
      payment: savedData?.payment || "",
      taxRate: 0,
      discount: 0,
    },
    validationSchema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: (values) => {
      // This will be called when generating PDF
      console.log("Form submitted", values);
    },
  });

  const data = formik.values;

  const subtotal = useMemo(
    () => formik.values.items.reduce((acc, it) => acc + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0),
    [formik.values.items]
  );

  const afterDiscount = useMemo(
    () => Math.max(0, subtotal - (Number(formik.values.discount) || 0)),
    [subtotal, formik.values.discount]
  );

  const tax = useMemo(
    () => afterDiscount * (Number(formik.values.taxRate) || 0),
    [afterDiscount, formik.values.taxRate]
  );

  const total = useMemo(() => afterDiscount + tax, [afterDiscount, tax]);

  function update(path: string, value: any) {
    formik.setFieldValue(path, value);
    formik.setFieldTouched(path, true, false);
  }

  function addItem() {
    formik.setFieldValue("items", [...formik.values.items, { description: "", qty: 1, rate: 0 }]);
  }

  function removeItem(index: number) {
    formik.setFieldValue("items", formik.values.items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, patch: Partial<InvoiceItem>) {
    const items = [...formik.values.items];
    items[index] = { ...items[index], ...patch };
    formik.setFieldValue("items", items);
    formik.setFieldTouched(`items.${index}`, true, false);
  }

  function clearForm() {
    // Guardar Company y Payment antes de limpiar
    const company = formik.values.company;
    const payment = formik.values.payment;
    
    // Resetear el formulario
    formik.resetForm({
      values: {
        company, // Mantener Company
        client: {
          name: "",
          address1: "",
          address2: "",
          email: "",
        },
        meta: {
          invoiceNo: "INV-0000",
          issueDate: dayjs().format("YYYY-MM-DD"),
          dueDate: dayjs().add(14, "day").format("YYYY-MM-DD"),
          terms: "",
          reference: "",
        },
        items: [],
        notes: "",
        payment, // Mantener Payment
        taxRate: 0,
        discount: 0,
      },
    });
  }

  function generatePdf() {
    // Validar que haya items
    if (data.items.length === 0) {
      alert('Please add at least one line item before generating the PDF.');
      return;
    }

    // Guardar Company y Payment en localStorage
    try {
      localStorage.setItem('invoiceDefaults', JSON.stringify({
        company: data.company,
        payment: data.payment,
      }));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }

    const itemsBody = [
      [
        { text: "Description", bold: true },
        { text: "Qty", bold: true, alignment: "right" },
        { text: "Rate", bold: true, alignment: "right" },
        { text: "Amount", bold: true, alignment: "right" },
      ],
      ...data.items.map((it) => {
        const qty = Number(it.qty) || 0;
        const rate = Number(it.rate) || 0;
        const amount = qty * rate;
        return [
          { text: it.description || "-", margin: [0, 4, 0, 4] },
          { text: String(qty), alignment: "right", margin: [0, 4, 0, 4] },
          { text: money(rate), alignment: "right", margin: [0, 4, 0, 4] },
          { text: money(amount), alignment: "right", margin: [0, 4, 0, 4] },
        ];
      }),
    ];

    const docDefinition: any = {
      pageSize: "LETTER",
      pageMargins: [40, 40, 40, 60],
      content: [
        {
          columns: [
            [
              { text: data.company.name, fontSize: 16, bold: true },
              { text: data.company.address1 },
              { text: data.company.address2 },
              { text: `${data.company.phone} • ${data.company.email}` },
              data.company.ein ? { text: `EIN: ${data.company.ein}` } : {},
            ],
            [
              { text: "INVOICE", fontSize: 22, bold: true, alignment: "right" },
              {
                table: {
                  widths: ["*", "*"],
                  body: [
                    ["Invoice #", data.meta.invoiceNo],
                    ["Issue Date", data.meta.issueDate],
                    ["Due Date", data.meta.dueDate],
                    ["Terms", data.meta.terms],
                    ["Reference", data.meta.reference || "-"],
                  ],
                },
                layout: "lightHorizontalLines",
                margin: [0, 10, 0, 0],
              },
            ],
          ],
        },

        { text: " ", margin: [0, 8, 0, 0] },

        {
          columns: [
            {
              width: "50%",
              stack: [
                { text: "Bill To", bold: true, margin: [0, 0, 0, 6] },
                { text: data.client.name, bold: true },
                { text: data.client.address1 },
                { text: data.client.address2 },
                data.client.email ? { text: data.client.email } : {},
              ],
            },
          ],
        },

        { text: " ", margin: [0, 10, 0, 0] },

        {
          table: { widths: ["*", 40, 80, 90], body: itemsBody },
          layout: "lightHorizontalLines",
        },

        { text: " ", margin: [0, 10, 0, 0] },

        {
          columns: [
            { width: "*", text: "" },
            {
              width: 220,
              table: {
                widths: ["*", "auto"],
                body: [
                  ["Subtotal", money(subtotal)],
                  ["Discount", money(Number(data.discount) || 0)],
                  ["Tax", money(tax)],
                  [{ text: "Total", bold: true }, { text: money(total), bold: true }],
                ],
              },
              layout: "lightHorizontalLines",
            },
          ],
        },

        { text: " ", margin: [0, 14, 0, 0] },

        { text: "Notes", bold: true },
        { text: data.notes || "-", margin: [0, 4, 0, 10] },

        { text: "Payment / Remit To", bold: true },
        { text: data.payment || "-", margin: [0, 4, 0, 0] },
      ],
      footer: (currentPage: number, pageCount: number) => ({
        columns: [
          { text: "Generated by Invoice Zeros", margin: [40, 0, 0, 0], fontSize: 9, color: "#666" },
          { text: `Page ${currentPage} of ${pageCount}`, alignment: "right", margin: [0, 0, 40, 0], fontSize: 9, color: "#666" },
        ],
      }),
      defaultStyle: { fontSize: 10 },
    };

    pdfMake.createPdf(docDefinition).download(`${data.meta.invoiceNo}.pdf`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoice Generator (USA)</h1>
            <p className="text-sm text-gray-600 mt-1">No DB • Fill fields • Generate PDF</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button 
              onClick={clearForm}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-lg shadow-md transition-colors duration-200 flex items-center justify-center gap-2 border-2 border-gray-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear Form
            </button>
            <button 
              onClick={generatePdf} 
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generate PDF
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          <Card title="Company">
            <Input 
              label="Company Name" 
              value={data.company.name} 
              onChange={(v) => update("company.name", v)} 
              error={formik.errors.company?.name}
              touched={formik.touched.company?.name}
            />
            <Input 
              label="Address line 1" 
              value={data.company.address1} 
              onChange={(v) => update("company.address1", v)} 
              error={formik.errors.company?.address1}
              touched={formik.touched.company?.address1}
            />
            <Input 
              label="City, State ZIP" 
              value={data.company.address2} 
              onChange={(v) => update("company.address2", v)} 
              error={formik.errors.company?.address2}
              touched={formik.touched.company?.address2}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Input 
                label="Phone" 
                value={data.company.phone} 
                onChange={(v) => update("company.phone", v)} 
                error={formik.errors.company?.phone}
                touched={formik.touched.company?.phone}
              />
              <Input 
                label="Email" 
                value={data.company.email} 
                onChange={(v) => update("company.email", v)} 
                error={formik.errors.company?.email}
                touched={formik.touched.company?.email}
              />
            </div>
            <Input 
              label="EIN (optional)" 
              value={data.company.ein} 
              onChange={(v) => update("company.ein", v)} 
              error={formik.errors.company?.ein}
              touched={formik.touched.company?.ein}
            />
          </Card>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card title="Bill To">
            <Input 
              label="Client Name" 
              value={data.client.name} 
              onChange={(v) => update("client.name", v)} 
              error={formik.errors.client?.name}
              touched={formik.touched.client?.name}
            />
            <Input 
              label="Address line 1" 
              value={data.client.address1} 
              onChange={(v) => update("client.address1", v)} 
              error={formik.errors.client?.address1}
              touched={formik.touched.client?.address1}
            />
            <Input 
              label="City, State ZIP" 
              value={data.client.address2} 
              onChange={(v) => update("client.address2", v)} 
              error={formik.errors.client?.address2}
              touched={formik.touched.client?.address2}
            />
            <Input 
              label="Email (optional)" 
              value={data.client.email} 
              onChange={(v) => update("client.email", v)} 
              error={formik.errors.client?.email}
              touched={formik.touched.client?.email}
            />
          </Card>

          <Card title="Invoice Meta">
            <div className="grid gap-3 md:grid-cols-2">
              <Input 
                label="Invoice #" 
                value={data.meta.invoiceNo} 
                onChange={(v) => update("meta.invoiceNo", v)} 
                error={formik.errors.meta?.invoiceNo}
                touched={formik.touched.meta?.invoiceNo}
              />
              <Input 
                label="Terms" 
                value={data.meta.terms} 
                onChange={(v) => update("meta.terms", v)} 
                error={formik.errors.meta?.terms}
                touched={formik.touched.meta?.terms}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input 
                label="Issue Date" 
                value={data.meta.issueDate} 
                onChange={(v) => update("meta.issueDate", v)} 
                error={formik.errors.meta?.issueDate}
                touched={formik.touched.meta?.issueDate}
              />
              <Input 
                label="Due Date" 
                value={data.meta.dueDate} 
                onChange={(v) => update("meta.dueDate", v)} 
                error={formik.errors.meta?.dueDate}
                touched={formik.touched.meta?.dueDate}
              />
            </div>
            <Input 
              label="Reference (Load ID / PO)" 
              value={data.meta.reference} 
              onChange={(v) => update("meta.reference", v)} 
              error={formik.errors.meta?.reference}
              touched={formik.touched.meta?.reference}
            />
          </Card>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-1">
          <Card
            title="Line Items"
            right={
              <button 
                onClick={addItem} 
                className="bg-green-50 hover:bg-green-100 text-green-700 font-medium px-3 sm:px-4 py-1.5 sm:py-2 rounded-md border-2 border-green-300 transition-colors duration-200 text-sm"
              >
                + Add
              </button>
            }
          >
            {/* Vista Desktop: Tabla */}
            <div className="hidden lg:block overflow-x-auto">
              {data.items.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V13a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-600 font-medium mb-2">No items added yet</p>
                  <p className="text-gray-500 text-sm">Click "+ Add" button to add your first line item</p>
                </div>
              ) : (
              <table className="w-full">
                <thead className="bg-gray-100 border-b-2 border-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Description</th>
                    <th className="w-[110px] px-4 py-3 text-right text-sm font-bold text-gray-700">Qty</th>
                    <th className="w-[150px] px-4 py-3 text-right text-sm font-bold text-gray-700">Rate</th>
                    <th className="w-[160px] px-4 py-3 text-right text-sm font-bold text-gray-700">Amount</th>
                    <th className="w-[120px] px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((it, idx) => {
                    const qty = Number(it.qty) || 0;
                    const rate = Number(it.rate) || 0;
                    const amount = qty * rate;

                    return (
                      <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200 text-black font-medium"
                            value={it.description}
                            onChange={(e) => updateItem(idx, { description: e.target.value })}
                            placeholder="e.g. Freight delivery – City, ST → City, ST"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200 text-right text-black font-medium"
                            type="number"
                            value={it.qty}
                            onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200 text-right text-black font-medium"
                            type="number"
                            value={it.rate}
                            onChange={(e) => updateItem(idx, { rate: Number(e.target.value) })}
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">{money(amount)}</td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            onClick={() => removeItem(idx)} 
                            className="bg-red-50 hover:bg-red-100 text-red-700 font-medium px-3 py-1.5 rounded-md border-2 border-red-300 transition-colors duration-200 text-sm"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              )}
            </div>

            {/* Vista Mobile: Cards */}
            <div className="lg:hidden space-y-4">
              {data.items.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V13a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-600 font-medium mb-2">No items added yet</p>
                  <p className="text-gray-500 text-sm">Click "+ Add" button to add your first line item</p>
                </div>
              ) : (
                <>
                  {data.items.map((it, idx) => {
                const qty = Number(it.qty) || 0;
                const rate = Number(it.rate) || 0;
                const amount = qty * rate;

                return (
                  <div key={idx} className="bg-white border-2 border-gray-300 rounded-lg p-4 space-y-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-gray-800">Item #{idx + 1}</span>
                      <button 
                        onClick={() => removeItem(idx)} 
                        className="bg-red-50 hover:bg-red-100 text-red-700 font-medium px-2 py-1 rounded border-2 border-red-300 transition-colors duration-200 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-gray-900 mb-1">Description</label>
                      <input
                        className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200 text-sm text-black font-medium"
                        value={it.description}
                        onChange={(e) => updateItem(idx, { description: e.target.value })}
                        placeholder="e.g. Freight delivery"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-900 mb-1">Qty</label>
                        <input
                          className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200 text-right text-sm text-black font-medium"
                          type="number"
                          value={it.qty}
                          onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-900 mb-1">Rate</label>
                        <input
                          className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200 text-right text-sm text-black font-medium"
                          type="number"
                          value={it.rate}
                          onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t-2 border-gray-300">
                      <span className="text-sm font-semibold text-gray-800">Amount</span>
                      <span className="text-lg font-bold text-blue-600">{money(amount)}</span>
                    </div>
                  </div>
                );
              })}
                </>
              )}
            </div>
          </Card>

          <Card title="Totals">
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Tax rate (0.07 = 7%)"
                type="number"
                step="0.01"
                value={String(data.taxRate)}
                onChange={(v) => {
                  const num = v === '' ? 0 : parseFloat(v);
                  update("taxRate", isNaN(num) ? 0 : num);
                }}
                error={formik.errors.taxRate}
                touched={formik.touched.taxRate}
              />
              <Input
                label="Discount (USD)"
                type="number"
                step="0.01"
                value={String(data.discount)}
                onChange={(v) => {
                  const num = v === '' ? 0 : parseFloat(v);
                  update("discount", isNaN(num) ? 0 : num);
                }}
                error={formik.errors.discount}
                touched={formik.touched.discount}
              />
            </div>

            <div className="border-t-2 border-gray-300 my-4" />

            <div className="space-y-3 bg-gray-50 p-4 rounded-md border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-medium">Subtotal</span>
                <span className="font-semibold text-gray-900">{money(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-medium">Tax</span>
                <span className="font-semibold text-gray-900">{money(tax)}</span>
              </div>
              <div className="flex items-center justify-between text-lg pt-2 border-t-2 border-gray-300">
                <span className="font-bold text-gray-900">Total</span>
                <span className="font-extrabold text-blue-600">{money(total)}</span>
              </div>
            </div>
          </Card>

          <Card title="Notes & Payment">
            <Textarea 
              label="Notes" 
              value={data.notes} 
              onChange={(v) => update("notes", v)} 
              error={formik.errors.notes}
              touched={formik.touched.notes}
            />
            <div className="mt-3" />
            <Textarea 
              label="Payment / Remit To" 
              value={data.payment} 
              onChange={(v) => update("payment", v)} 
              error={formik.errors.payment}
              touched={formik.touched.payment}
            />
          </Card>
        </div>

        <div className="mt-8 flex justify-center">
          <button 
            onClick={generatePdf} 
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg shadow-md transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generate PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function Card(props: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <div className="p-4 sm:p-6">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">{props.title}</h2>
          {props.right}
        </div>
        <div className="space-y-4">
          {props.children}
        </div>
      </div>
    </div>
  );
}

function Input(props: { label: string; value: string; onChange: (v: string) => void; error?: string; touched?: boolean; type?: string; step?: string }) {
  const hasError = props.touched && props.error;
  return (
    <div className="w-full">
      <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
        {props.label}
      </label>
      <input 
        type={props.type || "text"}
        step={props.step}
        className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white border-2 rounded-md focus:ring-2 focus:outline-none transition-all duration-200 text-black text-sm sm:text-base font-medium ${
          hasError 
            ? "border-red-500 focus:border-red-500 focus:ring-red-200" 
            : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
        }`}
        value={props.value} 
        onChange={(e) => props.onChange(e.target.value)} 
      />
      {hasError && (
        <p className="mt-1 text-xs text-red-600 font-medium">{props.error}</p>
      )}
    </div>
  );
}

function Textarea(props: { label: string; value: string; onChange: (v: string) => void; error?: string; touched?: boolean }) {
  const hasError = props.touched && props.error;
  return (
    <div className="w-full">
      <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
        {props.label}
      </label>
      <textarea
        className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white border-2 rounded-md focus:ring-2 focus:outline-none transition-all duration-200 min-h-[120px] whitespace-pre-wrap text-black text-sm sm:text-base font-medium ${
          hasError 
            ? "border-red-500 focus:border-red-500 focus:ring-red-200" 
            : "border-gray-300 focus:border-blue-500 focus:ring-blue-200"
        }`}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
      {hasError && (
        <p className="mt-1 text-xs text-red-600 font-medium">{props.error}</p>
      )}
    </div>
  );
}