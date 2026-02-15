// ── Halaxy API types ──

export interface HalaxyInvoice {
  id: string
  identifier: string        // invoice number (e.g. "INV-1234")
  date: string              // YYYY-MM-DD
  status: string            // "active", "cancelled", etc.
  payorType: string         // "Patient", "Medicare", etc.
  title: string             // patient name
  practitionerRef: string
  totalNet: number
  totalGross: number
  totalBalance: number
  totalTax: number
  totalPaid: number
}

export interface HalaxyPayment {
  id: string
  created: string           // ISO date-time
  method: string            // "Braintree", "Cash", "EFT", etc.
  type: string              // "Payment", "Failed", "Refund"
  amount: number
  invoiceId: string         // extracted from invoice.reference URL
  invoiceNumber?: string    // looked up from invoice
  patientName?: string      // looked up from invoice title
}

export interface HalaxySyncGap {
  missingFromXero: HalaxyPayment[]    // paid in Halaxy, no Xero clearing txn
  notFromHalaxy: string[]             // Xero clearing transaction IDs with no matching Halaxy payment
}
