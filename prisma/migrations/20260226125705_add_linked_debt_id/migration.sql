-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "linkedDebtId" INTEGER;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_linkedDebtId_fkey" FOREIGN KEY ("linkedDebtId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
