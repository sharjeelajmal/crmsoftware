"use client";

import { BUSINESS } from "@/constants/brand";

/** Bank accounts grid and the Urdu note printed at the bottom of the on-screen invoice. */
export function PaymentDetails() {
  return (
    <>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-left mb-3">Payment Details</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
          {BUSINESS.bankAccounts.map((account) => (
            <div key={account.accountNumber}>
              <p>
                <span className="font-semibold">Bank Name:</span> {account.bank}
              </p>
              <p>
                <span className="font-semibold">Account Name:</span> {account.accountName}
              </p>
              <p>
                <span className="font-semibold">Account Number:</span> {account.accountNumber}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="text-center text-md text-white p-2 rounded-lg mb-6 bg-primary font-urdu">
        {BUSINESS.invoiceNoteUrdu}
      </div>
    </>
  );
}

export default PaymentDetails;
