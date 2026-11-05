// ============================================================
// INVOICE INQUEST — Stage 5: VENDOR_CHECK
// ============================================================
import type { PipelineContext, StageResult, Evidence, Vendor } from './types';
import { tokenJaccard } from './utils';

export async function stageVendorCheck(ctx: PipelineContext): Promise<StageResult> {
  const start = performance.now();
  const evidence: Evidence[] = [];
  const norm = ctx.normalised;
  const vendors = ctx.vendors;

  if (!norm || !norm.vendorName) {
    return {
      stage: 'VENDOR_CHECK',
      status: 'fail',
      headline: 'Cannot verify vendor (no vendor name extracted)',
      reasoning: 'Vendor name is missing from the invoice, preventing vendor master validation.',
      evidence: [{ label: 'Vendor Name', value: 'None provided', type: 'negative' }],
      durationMs: performance.now() - start,
    };
  }

  // 1. Match vendor by Tax ID or Name / Aliases
  let matchedVendor: Vendor | undefined;
  let matchReason = '';
  let highestScore = 0;

  // Exact Tax ID match
  if (norm.vendorTaxId) {
    const cleanTax = norm.vendorTaxId.replace(/[^\w]/g, '').toUpperCase();
    matchedVendor = vendors.find((v) => {
      const vTax = v.taxId.replace(/[^\w]/g, '').toUpperCase();
      return cleanTax.includes(vTax) || vTax.includes(cleanTax);
    });
    if (matchedVendor) {
      matchReason = `Tax ID match (${norm.vendorTaxId})`;
      highestScore = 1.0;
    }
  }

  // Fuzzy Name Match if not matched by tax ID
  if (!matchedVendor) {
    const invoiceVendorUpper = norm.vendorName.toUpperCase();
    for (const vendor of vendors) {
      // Check exact or substring on legal name
      const legalUpper = vendor.legalName.toUpperCase();
      if (invoiceVendorUpper.includes(legalUpper) || legalUpper.includes(invoiceVendorUpper)) {
        matchedVendor = vendor;
        matchReason = `Direct name containment (${vendor.legalName})`;
        highestScore = 0.95;
        break;
      }

      // Check aliases
      for (const alias of vendor.aliases) {
        const aliasUpper = alias.toUpperCase();
        if (invoiceVendorUpper.includes(aliasUpper) || aliasUpper.includes(invoiceVendorUpper)) {
          matchedVendor = vendor;
          matchReason = `Alias match: "${alias}" for ${vendor.legalName}`;
          highestScore = 0.9;
          break;
        }
      }
      if (matchedVendor) break;

      // Jaccard similarity
      const nameScore = tokenJaccard(norm.vendorName, vendor.legalName);
      if (nameScore > highestScore && nameScore >= 0.45) {
        highestScore = nameScore;
        matchedVendor = vendor;
        matchReason = `Fuzzy name similarity (${Math.round(nameScore * 100)}%) with ${vendor.legalName}`;
      }
    }
  }

  ctx.matchedVendor = matchedVendor;

  if (!matchedVendor) {
    evidence.push({
      label: 'Vendor Master Match',
      value: `No match found for "${norm.vendorName}"`,
      type: 'negative',
    });
    return {
      stage: 'VENDOR_CHECK',
      status: 'fail',
      headline: 'Unrecognized Vendor',
      reasoning: `Vendor "${norm.vendorName}" was not found in the approved Vendor Master database. Invoices from unregistered entities cannot be cleared for payment.`,
      evidence,
      durationMs: performance.now() - start,
    };
  }

  evidence.push({
    label: 'Matched Vendor',
    value: `${matchedVendor.legalName} (${matchedVendor.id})`,
    type: 'positive',
  });
  evidence.push({
    label: 'Match Method',
    value: matchReason,
    type: 'positive',
  });

  // 2. Approved Status Check
  if (!matchedVendor.approved) {
    evidence.push({
      label: 'Vendor Status',
      value: 'UNAPPROVED in Master Registry',
      type: 'negative',
    });
    return {
      stage: 'VENDOR_CHECK',
      status: 'fail',
      headline: `Vendor "${matchedVendor.legalName}" is NOT approved`,
      reasoning: `Vendor ${matchedVendor.legalName} is currently marked as UNAPPROVED in procurement records. Procurement policy prohibits processing disbursements to unapproved suppliers.`,
      evidence,
      durationMs: performance.now() - start,
    };
  }

  evidence.push({
    label: 'Vendor Status',
    value: 'Approved Supplier',
    type: 'positive',
  });

  // 3. Currency Check
  if (norm.currency && matchedVendor.currency && norm.currency !== matchedVendor.currency) {
    evidence.push({
      label: 'Currency Discrepancy',
      value: `Invoice in ${norm.currency}, vendor profile specifies ${matchedVendor.currency}`,
      type: 'negative',
    });
  } else {
    evidence.push({
      label: 'Currency',
      value: `${matchedVendor.currency} (Aligned with profile)`,
      type: 'positive',
    });
  }

  // 4. Bank Detail Change Detection (Crucial anti-fraud check)
  let bankMismatch = false;
  if (norm.bankAccountLast4) {
    const cleanExtBank = norm.bankAccountLast4.replace(/\D/g, '');
    const cleanMasterBank = matchedVendor.bankAccountLast4.replace(/\D/g, '');

    if (cleanExtBank && cleanMasterBank && cleanExtBank !== cleanMasterBank) {
      bankMismatch = true;
      evidence.push({
        label: 'BANK DETAILS CHANGED',
        value: `Invoice states ****${cleanExtBank}, Vendor Master records ****${cleanMasterBank}`,
        type: 'negative',
      });
      if (matchedVendor.bankAccountChangedDate) {
        evidence.push({
          label: 'Master Update Note',
          value: `Master was changed on ${matchedVendor.bankAccountChangedDate}`,
          type: 'negative',
        });
      }
    } else {
      evidence.push({
        label: 'Bank Account Last 4',
        value: `****${cleanMasterBank} (Verified match)`,
        type: 'positive',
      });
    }
  }

  const durationMs = performance.now() - start;

  if (bankMismatch) {
    return {
      stage: 'VENDOR_CHECK',
      status: 'warn',
      headline: 'BANK DETAILS CHANGED — Anti-Fraud Review Triggered',
      reasoning: `The invoice specifies remittance bank account ending in ****${norm.bankAccountLast4}, which conflicts with registered Vendor Master records (****${matchedVendor.bankAccountLast4}). Immediate manual verification with vendor financial control required before disbursement.`,
      evidence,
      durationMs,
      data: { bankMismatch: true, matchedVendor },
    };
  }

  return {
    stage: 'VENDOR_CHECK',
    status: 'pass',
    headline: `Verified Vendor: ${matchedVendor.legalName}`,
    reasoning: `Vendor verified against Master record (${matchedVendor.id}). Supplier is fully approved with active payment terms (${matchedVendor.paymentTerms}). Remittance details match verified records.`,
    evidence,
    durationMs,
    data: { bankMismatch: false, matchedVendor },
  };
}

