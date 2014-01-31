class DividendTransaction < SecurityTransaction
	validates :amount, :presence => true
	validates :quantity, :absence => true
	has_one :investment_transaction_account, :class_name => 'TransactionAccount', :foreign_key => 'transaction_id', :dependent => :destroy
	has_one :investment_account, -> { where :account_type => 'investment' }, :class_name => 'Account', :through => :investment_transaction_account, :source => :account 
	has_one :cash_transaction_account, :class_name => 'TransactionAccount', :foreign_key => 'transaction_id', :dependent => :destroy
	has_one :cash_account, -> { where :account_type => 'bank' }, :class_name => 'Account', :through => :cash_transaction_account, :source => :account  
	after_initialize do |t|
		t.transaction_type = 'Dividend'
	end
end
