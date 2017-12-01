import {Account} from "accounts/types";
import {Category} from "categories/types";
import {Payee} from "payees/types";
import {Security} from "securities/types";

export type FetchDirection = "prev" | "next";
export type TransactionStatus = "" | "Cleared" | "Reconciled";

export interface Subtransaction {
	account?: Account
	subcategory?: Category,
	category?: Category,
}

export interface Transaction {
	id: string,
	transaction_type: "Basic" | "Split" | "LoanRepayment" | "Payslip" | "Sub" | "Subtransfer" | "Dividend" | "SecurityInvestment",
	transaction_date: Date | string,
	status: TransactionStatus,
	primary_account: Account,
	account?: Account
	payee?: Payee,
	security?: Security,
	subcategory?: Category,
	category?: Category,
	memo: string,
	subtransactions: Subtransaction[],
	amount: number,
	direction: "inflow" | "outflow",
	balance: number,
	showSubtransactions: boolean,
	loadingSubtransactions: boolean,
	parent_id?: number | null
	flag?: string
}

export interface TransactionBatch {
	transactions: Transaction[]
}