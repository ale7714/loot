# Copyright (c) 2016 Scott O'Hara, oharagroup.net
# frozen_string_literal: true

# Transaction split
class TransactionSplit < ApplicationRecord
	validate :validate_transaction_type_inclusion
	belongs_to :trx, foreign_key: 'transaction_id', class_name: 'Transaction'
	belongs_to :parent, class_name: 'SplitTransaction', foreign_key: 'parent_id', inverse_of: :transaction_splits
	before_destroy :destroy_transaction

	def validate_transaction_type_inclusion
		errors[:base] << "Transaction type #{trx.transaction_type} is not valid in a split transaction" unless %w[Sub Subtransfer].include? trx.transaction_type
	end

	def destroy_transaction
		trx.as_subclass.destroy!
	end
end
