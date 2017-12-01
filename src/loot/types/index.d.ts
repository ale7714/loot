import AccountModel from "accounts/models/account";
import CategoryModel from "categories/models/category";
import PayeeModel from "payees/models/payee";
import SecurityModel from "securities/models/security";

export interface Entity {
	id: string,
	name: string,
	closing_balance: number
}

export type NewOrExistingEntity = Entity | string | undefined;

export type EntityModel = AccountModel | PayeeModel | CategoryModel | SecurityModel;

export interface Flushable {
	flush: (id?: string) => void
}