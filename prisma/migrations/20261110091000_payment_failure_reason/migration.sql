-- Why a payment attempt failed, as Pesapal reports it (10 Nov 2026), for following up in Admin > Payments.
ALTER TABLE "payments" ADD COLUMN "failureReason" TEXT;
