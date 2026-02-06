# Invoice Generator (USA) 🧾

A modern, responsive invoice generator built with Next.js for creating professional invoices and exporting them to PDF. Designed specifically for trucking companies and service-based businesses in the United States.

## 📋 Overview

This application allows users to create professional invoices without requiring a database. It features form validation, automatic calculations, localStorage persistence for company information, and PDF generation with a clean, professional layout.

## ✨ Features

### Core Functionality
- **📄 PDF Generation**: Export invoices to PDF with professional formatting using pdfmake
- **💾 LocalStorage Persistence**: Automatically saves company information and payment details
- **🧮 Automatic Calculations**: Real-time calculation of subtotals, taxes, discounts, and totals
- **✅ Form Validation**: Comprehensive validation using Formik and Yup
- **📱 Fully Responsive**: Mobile-friendly design with adaptive layouts
- **🎨 Modern UI**: Clean interface with Tailwind CSS

### Invoice Sections
1. **Company Information**: Name, address, phone, email, EIN (optional)
2. **Bill To**: Client name, address, email (optional)
3. **Invoice Metadata**: Invoice number (INV-0000), dates, terms, reference
4. **Line Items**: Description, quantity, rate with desktop table and mobile card views
5. **Totals**: Tax rate, discount, automatic calculations
6. **Notes & Payment**: Custom notes and payment/remit instructions

### Smart Features
- **Clear Form Button**: Resets all fields except Company and Payment information
- **Empty State Messages**: Guides users when no line items are added
- **Validation Feedback**: Real-time error messages with visual indicators
- **Date Management**: Automatic date handling with Day.js

## 🛠️ Technologies Used

- **Framework**: [Next.js 16](https://nextjs.org/) with React 19
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Form Management**: [Formik](https://formik.org/)
- **Validation**: [Yup](https://github.com/jquense/yup)
- **PDF Generation**: [pdfmake](http://pdfmake.org/)
- **Date Handling**: [Day.js](https://day.js.org/)
- **Language**: TypeScript
- **Package Manager**: pnpm

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- pnpm (recommended) or npm/yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pro-forma
```

2. Install dependencies:
```bash
pnpm install
```

3. Run the development server:
```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
pnpm build
pnpm start
```

## 📖 How to Use

### First-Time Setup
1. Fill in your **Company Information** (saved to localStorage)
2. Add your default **Payment/Remit To** information (saved to localStorage)
3. Click **Generate PDF** to save these defaults

### Creating an Invoice
1. Fill in **Bill To** section with client information
2. Update **Invoice Meta** (number, dates, terms)
3. Click **+ Add** to add line items
4. Enter description, quantity, and rate for each item
5. Set **Tax Rate** (e.g., 0.07 for 7%) and **Discount** if applicable
6. Add any **Notes** or update payment instructions
7. Click **Generate PDF** to download

### Clearing Data
- Click **Clear Form** to reset all fields except Company and Payment info
- Your company and payment details persist across sessions

## 🧮 Calculation Logic

The invoice follows standard US accounting practices:

1. **Subtotal** = Sum of (Quantity × Rate) for all items
2. **After Discount** = Subtotal - Discount
3. **Tax** = After Discount × Tax Rate
4. **Total** = After Discount + Tax

*Note: Discounts are applied before tax calculation, which is the correct method in US accounting.*

## ✅ Validations

### Required Fields
**Company Section:**
- Company Name ✓
- Address Line 1 ✓
- City, State ZIP ✓
- Phone ✓
- Email ✓ (format validation)
- EIN (optional)

**Bill To Section:**
- Client Name ✓
- Address Line 1 ✓
- City, State ZIP ✓
- Email (optional, format validation)

**Invoice Meta:**
- Invoice Number ✓
- Issue Date ✓
- Due Date ✓
- Terms ✓

**Line Items:**
- At least one item required ✓
- Description ✓
- Quantity ✓ (must be ≥ 0)
- Rate ✓ (must be ≥ 0)

**Totals:**
- Tax Rate (must be ≥ 0)
- Discount (must be ≥ 0)

## 💾 LocalStorage

The application automatically saves to `localStorage`:
- **Company Information**: All company fields
- **Payment/Remit To**: Payment instructions

These are loaded automatically on next visit and persist across sessions.

## 📱 Responsive Design

### Desktop View
- Two-column layout for forms
- Table view for line items
- Side-by-side buttons in header

### Mobile View
- Single-column stacked layout
- Card-based view for line items
- Full-width buttons
- Optimized font sizes and spacing

## 🎨 UI Components

- **Input**: Text input with validation feedback
- **Textarea**: Multi-line text input with validation
- **Card**: Section container with title and optional actions
- **Button**: Primary (blue) and secondary (gray) styles
- **Error Messages**: Red text with validation feedback

## 📁 Project Structure

```
pro-forma/
├── app/
│   ├── globals.css          # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main invoice page
├── public/                   # Static assets
├── eslint.config.mjs         # ESLint configuration
├── next.config.ts            # Next.js configuration
├── package.json              # Dependencies
├── postcss.config.mjs        # PostCSS configuration
├── tailwind.config.ts        # Tailwind configuration
└── tsconfig.json             # TypeScript configuration
```

## 🚢 Deploy on Vercel

The easiest way to deploy this Next.js app is to use the [Vercel Platform](https://vercel.com/new):

1. Push your code to GitHub
2. Import the project in Vercel
3. Deploy with one click

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- PDF generation by [pdfmake](http://pdfmake.org/)
- Form handling by [Formik](https://formik.org/)

---

**Note**: This is a client-side application with no backend. All data is stored locally in the browser's localStorage and no information is sent to any server.
