import {Entity} from "loot/types";

export interface Category extends Entity {
	parent?: Category
}