class CreateTransactionHeaders < ActiveRecord::Migration[5.1]
  def change
    create_table :transaction_headers, primary_key: :transaction_id do |t|
			t.references :payee, index: true
			t.references :security, index: true
			t.references :schedule, null: true
			t.date :transaction_date
			t.decimal :quantity
			t.decimal :price
			t.decimal :commission

			t.timestamps
    end
  end
end
