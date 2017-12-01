import {Entity} from "loot/types";

export type AccountType =	"Asset" | "Bank" | "Cash" | "Credit" | "Investment" | "Liability" | "Loan";

export type AccountStatus = "Open" | "Closed";

interface InvestmentRelatedAccount {
	opening_balance: number
}

export interface Account extends Entity {
	account_type: AccountType,
	status: AccountStatus,
	favourite: boolean,
	related_account: Account | InvestmentRelatedAccount | null,
	opening_balance: number,
	num_transactions: number
}

export interface Accounts {
	[account_type: string]: {
		accounts: Account[]
		total: number
	}
}